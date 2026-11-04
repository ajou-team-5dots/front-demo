import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { query } from '@/server/db/query';
import type {
  DailyPoint,
  DataRange,
  FlowColumn,
  FlowData,
  FlowPick,
  FlowRow,
  PatchInfo,
  Period,
} from '@/types/board';
import type { Heavy } from '@/types/monsters';

import {
  ARMOR_EXPR,
  CATALOG_SQL,
  DAY_TZ,
  FLOW_COLUMNS,
  GROUP_EXPR,
  groupOfRow,
  LEVEL_EXPR,
  PICK_WHERE,
  pickParams,
  UNKNOWN_LEVEL,
  WEAPON_EXPR,
} from './board-sql';
import { GAME_EVENTS_TAG } from './game-events';
import { getMonsterCounts, SCOPE_FILTER, scopeParams } from './monster-counts';
import { readMeta, readMonsterPatches } from './monster-precomputed';
import { isMonsterId } from './monsters';
import { PRECOMPUTED_TAG } from './precomputed';

// Board-only reads that the analysis spec does not name: flow (sankey), per-day trend,
// patch list and data range. Base tables and precomputed JSON only, never raw game_events.

interface FlowCountRow {
  lv: string;
  wp: string;
  ar: string;
  grp: string;
  n: number;
}

/**
 * Sankey rows: level → weapon → armor → monster group, with encounters and deaths.
 * Deaths use the player's state at death and the killer's group. Rows whose level is not
 * known are left out of the flow (a tiny bucket where deaths outnumbered encounters); their
 * counts come back in `excluded` for the summary caption.
 */
export async function getFlow(heavy: Heavy, period: Period): Promise<FlowData> {
  'use cache';

  cacheTag(GAME_EVENTS_TAG);
  cacheLife('hours');

  const params = scopeParams(heavy, period);
  const [enc, deaths] = await Promise.all([
    query<FlowCountRow>(
      `SELECT ${LEVEL_EXPR} AS lv, ${WEAPON_EXPR} AS wp, ${ARMOR_EXPR} AS ar, ${GROUP_EXPR} AS grp,
              toUInt32(count()) AS n
       FROM encounters WHERE ${SCOPE_FILTER}
       GROUP BY lv, wp, ar, grp`,
      params,
    ),
    query<FlowCountRow>(
      `SELECT ${LEVEL_EXPR} AS lv, ${WEAPON_EXPR} AS wp, ${ARMOR_EXPR} AS ar, ${GROUP_EXPR} AS grp,
              toUInt32(count()) AS n
       FROM (
         SELECT d.level AS level, d.weapon_tier AS weapon_tier, d.armor_count AS armor_count,
                c.role AS role, c.grade AS grade
         FROM player_deaths AS d
         LEFT JOIN (${CATALOG_SQL}) AS c ON c.monster_id = d.monster_id
         WHERE d.monster_id != '' AND ${SCOPE_FILTER}
       )
       GROUP BY lv, wp, ar, grp`,
      params,
    ),
  ]);

  // A Map, not an object: bucket labels come from data and must never hit prototype keys.
  const rows = new Map<string, FlowRow>();
  const add = (r: FlowCountRow, field: 'enc' | 'deaths') => {
    const k = `${r.lv}|${r.wp}|${r.ar}|${r.grp}`;
    const row = rows.get(k) ?? { lv: r.lv, wp: r.wp, ar: r.ar, grp: r.grp, enc: 0, deaths: 0 };
    row[field] += r.n;
    rows.set(k, row);
  };
  enc.forEach((r) => add(r, 'enc'));
  deaths.forEach((r) => add(r, 'deaths'));
  const all = [...rows.values()];
  const unknown = all.filter((r) => r.lv === UNKNOWN_LEVEL);
  const excluded = {
    enc: unknown.reduce((s, r) => s + r.enc, 0),
    deaths: unknown.reduce((s, r) => s + r.deaths, 0),
  };
  const columns: FlowColumn[] = FLOW_COLUMNS.map((c) => ({ ...c, values: [...c.values] }));
  return { columns, rows: all.filter((r) => r.lv !== UNKNOWN_LEVEL), excluded };
}

interface DayRow {
  day: string;
  enc: number;
  danger: number;
  deaths: number;
}

const dayList = (from: string, to: string): string[] => {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
};

/**
 * Per-day (Seoul days) encounters/deaths/danger for one monster, every day of the data range
 * (missing days are zero). H2 trend: pre-patch entities included. pick narrows encounters and
 * deaths to the picked level/weapon/armor buckets; a group pick that is not this monster's
 * group gives all zeros.
 */
export async function getMonsterTrend(
  monster: string,
  heavy: Heavy,
  pick: FlowPick,
): Promise<DailyPoint[]> {
  'use cache';

  if (!isMonsterId(monster)) return [];

  cacheTag(GAME_EVENTS_TAG, PRECOMPUTED_TAG);
  cacheLife('hours');

  const [counts, meta] = await Promise.all([getMonsterCounts(heavy, 'all'), readMeta()]);
  const entry = counts.find((row) => row.monster === monster);
  const groupMatches =
    !pick.grp || (entry !== undefined && groupOfRow(entry.role, entry.grade) === pick.grp);

  const rows = groupMatches
    ? await query<DayRow>(
        `WITH
           e AS (
             SELECT toDate(fromUnixTimestamp64Milli(start_ts), '${DAY_TZ}') AS d,
                    count() AS enc, countIf(danger) AS danger
             FROM encounters
             WHERE monster_id = {monster:String} AND ${SCOPE_FILTER} AND ${PICK_WHERE}
             GROUP BY d
           ),
           x AS (
             SELECT toDate(fromUnixTimestamp64Milli(ts), '${DAY_TZ}') AS d, count() AS deaths
             FROM player_deaths
             WHERE monster_id = {monster:String} AND ${SCOPE_FILTER} AND ${PICK_WHERE}
             GROUP BY d
           )
         SELECT toString(d) AS day, toUInt32(e.enc) AS enc, toUInt32(e.danger) AS danger,
                toUInt32(x.deaths) AS deaths
         FROM e FULL OUTER JOIN x USING (d)
         ORDER BY d`,
        { ...scopeParams(heavy, 'all'), ...pickParams(pick), monster },
      )
    : [];

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const days = new Set([...dayList(meta.dataFrom, meta.dataTo), ...byDay.keys()]);
  return [...days].sort().map((day) => {
    const r = byDay.get(day);
    return { day, enc: r?.enc ?? 0, deaths: r?.deaths ?? 0, danger: r?.danger ?? 0 };
  });
}

/** Monster patches from data/precomputed/patches.json, oldest first. */
export async function getPatches(): Promise<PatchInfo[]> {
  'use cache';

  cacheTag(PRECOMPUTED_TAG);
  cacheLife('hours');

  const patches = await readMonsterPatches();
  return patches.map((p) => ({
    id: p.id,
    ts: Date.parse(p.ts),
    label: p.label,
    changed: Object.keys(p.changed ?? {}),
  }));
}

/** Data range of the current batch (meta.json), as YYYY-MM-DD. */
export async function getDataRange(): Promise<DataRange> {
  'use cache';

  cacheTag(PRECOMPUTED_TAG);
  cacheLife('hours');

  const meta = await readMeta();
  return { from: meta.dataFrom.slice(0, 10), to: meta.dataTo.slice(0, 10) };
}
