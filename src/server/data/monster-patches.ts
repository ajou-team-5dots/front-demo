import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { H2_MIN_ENC, H2_MIN_EVENTS, H2_STAGE_OVERLAP } from '@/server/config/criteria';
import { query } from '@/server/db/query';
import type { H2Daily, H2Patch, H2Period, H2State, Heavy, MonsterRole } from '@/types/monsters';

import { GAME_EVENTS_TAG } from './game-events';
import type { HeavyResults, MonsterPatch, PatchModel } from './monster-precomputed';
import { PRECOMPUTED_TAG, readPrecomputed } from './precomputed';

interface PatchCounts extends H2Period {
  monster: string;
  role: MonsterRole;
  afterPatch: number;
  stages: [number, number][];
  days: [string, number, number, number, number][];
}

interface MonsterPeriods {
  monster: string;
  role: MonsterRole;
  before: H2Period;
  after: H2Period;
  stages: [number, number][];
  daily: H2Daily[];
}

export interface MonsterPatchRisk {
  monster: string;
  patch: H2Patch;
}

const emptyPeriod = (): H2Period => ({
  enc: 0,
  deaths: 0,
  near: 0,
  events: 0,
  risk100: 0,
  players: 0,
});

const sampleOk = ({ before, after }: MonsterPeriods): boolean =>
  [before, after].every((period) => period.enc >= H2_MIN_ENC && period.events >= H2_MIN_EVENTS);

const stageOverlap = (a: MonsterPeriods, b: MonsterPeriods): number => {
  const aTotal = a.before.enc + a.after.enc;
  const bTotal = b.before.enc + b.after.enc;
  if (aTotal === 0 || bTotal === 0) return 0;
  const bStages = new Map(b.stages);
  return a.stages.reduce(
    (sum, [stage, n]) => sum + Math.min(n / aTotal, (bStages.get(stage) ?? 0) / bTotal),
    0,
  );
};

/** Only aggregated periods, stage counts and daily counts leave ClickHouse. */
async function getPeriods(
  heavy: Heavy,
  from: number,
  patchTs: number,
  to: number,
): Promise<MonsterPeriods[]> {
  const rows = await query<PatchCounts>(
    `WITH base AS (
      SELECT monster_id, role, stage, player_seq, died, near20,
        toUInt8(start_ts >= {patchTs:Int64}) AS after_patch,
        toString(toDate(fromUnixTimestamp64Milli(start_ts), 'Asia/Seoul')) AS day
      FROM encounters
      WHERE start_ts >= {from:Int64} AND start_ts < {to:Int64}
        AND ({heavy:String} = 'include' OR NOT heavy_account)
    ), stage_counts AS (
      SELECT monster_id, stage, count() AS n FROM base GROUP BY monster_id, stage
    ), stages AS (
      SELECT monster_id, groupArray((stage, toUInt32(n))) AS counts
      FROM stage_counts GROUP BY monster_id
    ), day_counts AS (
      SELECT monster_id, after_patch, day, toUInt32(count()) AS enc,
        toUInt32(countIf(died)) AS deaths, toUInt32(countIf(near20)) AS near,
        toUInt32(uniqExact(player_seq)) AS players
      FROM base GROUP BY monster_id, after_patch, day
    ), days AS (
      SELECT monster_id, after_patch, groupArray((day, enc, deaths, near, players)) AS counts
      FROM day_counts GROUP BY monster_id, after_patch
    ), periods AS (
      SELECT monster_id, any(role) AS role, after_patch,
        toUInt32(count()) AS enc, toUInt32(countIf(died)) AS deaths,
        toUInt32(countIf(near20)) AS near, toUInt32(uniqExact(player_seq)) AS players
      FROM base GROUP BY monster_id, after_patch
    )
    SELECT p.monster_id AS monster, p.role AS role, p.after_patch AS afterPatch,
      p.enc AS enc, p.deaths AS deaths, p.near AS near,
      p.deaths + p.near AS events, (p.deaths + p.near) / p.enc * 100 AS risk100,
      p.players AS players, s.counts AS stages, d.counts AS days
    FROM periods AS p
    LEFT JOIN stages AS s ON s.monster_id = p.monster_id
    LEFT JOIN days AS d ON d.monster_id = p.monster_id AND d.after_patch = p.after_patch
    ORDER BY monster, afterPatch`,
    { heavy, from, patchTs, to },
  );
  const monsters = new Map<string, MonsterPeriods>();
  rows.forEach((row) => {
    const current = monsters.get(row.monster) ?? {
      monster: row.monster,
      role: row.role,
      before: emptyPeriod(),
      after: emptyPeriod(),
      stages: row.stages,
      daily: [],
    };
    const period = row.afterPatch ? 'after' : 'before';
    current[period] = {
      enc: row.enc,
      deaths: row.deaths,
      near: row.near,
      events: row.events,
      risk100: row.risk100,
      players: row.players,
    };
    current.daily.push(
      ...row.days.map<H2Daily>(([date, enc, deaths, near, players]) => ({
        date,
        period,
        enc,
        deaths,
        near,
        events: deaths + near,
        risk100: enc === 0 ? 0 : ((deaths + near) / enc) * 100,
        players,
      })),
    );
    monsters.set(row.monster, current);
  });
  return [...monsters.values()];
}

/** H2 includes pre-patch entities; no encounter reconstruction or model fitting here. */
export async function getMonsterPatches(heavy: Heavy): Promise<MonsterPatchRisk[]> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG, PRECOMPUTED_TAG);
  cacheLife('hours');

  const [patchList, models] = await Promise.all([
    readPrecomputed<MonsterPatch[]>('patches'),
    readPrecomputed<HeavyResults<Record<string, PatchModel | null>>>('h2-same-condition'),
  ]);
  const patches = patchList
    .filter((patch) => patch.kind === 'monster')
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const results = await Promise.all(
    patches.map(async (patch, index): Promise<MonsterPatchRisk[]> => {
      const from = index === 0 ? Number.MIN_SAFE_INTEGER : Date.parse(patches[index - 1].ts);
      const to =
        index === patches.length - 1 ? Number.MAX_SAFE_INTEGER : Date.parse(patches[index + 1].ts);
      const periods = await getPeriods(heavy, from, Date.parse(patch.ts), to);
      return periods.map((current) => {
        const enough = sampleOk(current);
        const changed = Object.hasOwn(patch.changed ?? {}, current.monster);
        const hasComparator =
          changed &&
          enough &&
          periods.some(
            (candidate) =>
              candidate.monster !== current.monster &&
              candidate.role === current.role &&
              !Object.hasOwn(patch.changed ?? {}, candidate.monster) &&
              sampleOk(candidate) &&
              stageOverlap(current, candidate) >= H2_STAGE_OVERLAP,
          );
        let state: H2State = 'unchanged_ok';
        if (!enough) state = 'sample_short';
        else if (changed && !hasComparator) state = 'no_comparator';
        else if (changed) state = 'changed_ok';
        const model = enough ? (models[heavy][patch.id]?.[current.monster] ?? null) : null;
        return {
          monster: current.monster,
          patch: {
            patchId: patch.id,
            before: current.before,
            after: current.after,
            daily: current.daily.sort((a, b) => a.date.localeCompare(b.date)),
            sampleOk: enough,
            sameCondition: model ? { or: model.or, lo: model.lo, hi: model.hi } : null,
            netOfComparator: hasComparator ? (model?.netOfComparator ?? null) : null,
            state,
            intentCheck: changed && model !== null && model.lo > 1,
            // The supplied spec and JSON do not define a group model or its aggregation.
            // Keep unavailable rather than inventing a statistically different ratio.
            groupReference: null,
          },
        };
      });
    }),
  );
  return results.flat();
}
