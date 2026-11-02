import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { queryRows } from '@/server/db/clickhouse';
import type {
  BossSkill,
  BossTimelineEvent,
  FilterOptions,
  FlowRow,
  MonsterDetail,
  MonsterFilter,
  MonsterRow,
  PatchRisk,
  SkillWindow,
  TimelineWindow,
} from '@/types/monsters';

// Read-only access to the ClickHouse mart tables (spec: 분석 저장소 docs/backend/api_spec.md).
// The screen never aggregates raw `events`; analysts precompute every mart row.
//
// Caching: every function is 'use cache' + cacheTag('mart'). Its arguments are part of the
// cache key, so each filter combination is cached separately. After a mart reload,
// POST /api/revalidate drops all of them at once (src/app/api/revalidate/route.ts).

const MART_TAG = 'mart';

/** Shared WHERE for the optional role/stage filter. Values still go through params. */
function summaryFilter(filter: MonsterFilter) {
  const conditions = ['s.period = {period:String}', 's.heavy = {heavy:String}'];
  const params: Record<string, unknown> = { period: filter.period, heavy: filter.heavy };
  if (filter.role) {
    conditions.push('m.role = {role:String}');
    params.role = filter.role;
  }
  if (filter.stage !== undefined) {
    conditions.push('m.dungeon_stage = {stage:UInt8}');
    params.stage = filter.stage;
  }
  return { where: conditions.join(' AND '), params };
}

const MONSTER_COLUMNS = `
  m.monster_id AS id,
  m.role AS role,
  m.grade AS grade,
  m.dungeon_stage AS stage,
  toBool(m.is_boss) AS isBoss,
  toString(s.period_from) AS periodFrom,
  toString(s.period_to) AS periodTo,
  s.encounters AS encounters,
  s.deaths AS deaths,
  s.expected_risk_ratio AS riskRatio,
  s.risk_rank AS riskRank`;

/** Filter bar choices (role, grade, dungeon stage). Same for every filter. */
export async function getFilterOptions(): Promise<FilterOptions> {
  'use cache';

  cacheTag(MART_TAG);
  cacheLife('hours');

  const rows = await queryRows<{ role: string; grade: string; stage: number }>(
    'SELECT DISTINCT role, grade, dungeon_stage AS stage FROM dim_monster',
  );
  const unique = <T>(values: T[]) => [...new Set(values)];
  return {
    roles: unique(rows.map((row) => row.role)).sort(),
    grades: unique(rows.map((row) => row.grade)).sort(),
    stages: unique(rows.map((row) => row.stage)).sort((a, b) => a - b),
  };
}

/**
 * Every monster for the scatter, the risk-ordered list and the detail sidebar.
 * Only ~36 rows, so the screen sorts and narrows it without refetching.
 */
export async function getMonsterList(filter: MonsterFilter): Promise<MonsterRow[]> {
  'use cache';

  cacheTag(MART_TAG);
  cacheLife('hours');

  const { where, params } = summaryFilter(filter);
  return queryRows<MonsterRow>(
    `SELECT ${MONSTER_COLUMNS}
     FROM mart_monster_summary AS s
     INNER JOIN dim_monster AS m ON m.monster_id = s.monster_id
     WHERE ${where}
     ORDER BY s.risk_rank`,
    params,
  );
}

/** Header, profile pentagon, H1 readiness and the aux panels for one monster. */
export async function getMonsterDetail(
  id: string,
  filter: MonsterFilter,
): Promise<MonsterDetail | null> {
  'use cache';

  cacheTag(MART_TAG);
  cacheLife('hours');

  const key = { id, period: filter.period, heavy: filter.heavy };
  const byKey = 'monster_id = {id:String} AND period = {period:String} AND heavy = {heavy:String}';

  const [summary, profile, readiness, aux] = await Promise.all([
    queryRows<MonsterRow>(
      `SELECT ${MONSTER_COLUMNS}
       FROM mart_monster_summary AS s
       INNER JOIN dim_monster AS m ON m.monster_id = s.monster_id
       WHERE s.monster_id = {id:String} AND s.period = {period:String} AND s.heavy = {heavy:String}
       LIMIT 1`,
      key,
    ),
    queryRows<MonsterDetail['profile'][number]>(
      `SELECT axis, value, peer_median AS peerMedian, z
       FROM mart_profile WHERE ${byKey} ORDER BY axis`,
      key,
    ),
    queryRows<MonsterDetail['readiness'][number]>(
      `SELECT condition,
              killer_share AS killerShare, death_share AS deathShare, diff_pp AS diffPp,
              rate_ratio AS rateRatio, enc_cond AS encCond, death_cond AS deathCond
       FROM mart_h1_readiness WHERE ${byKey} ORDER BY condition`,
      key,
    ),
    queryRows<MonsterDetail['aux']>(
      `SELECT unanswered_deaths AS unansweredDeaths, deaths,
              big_hit_enc AS bigHitEnc, damaged_enc AS damagedEnc
       FROM mart_aux WHERE ${byKey} LIMIT 1`,
      key,
    ),
  ]);

  const [row] = summary;
  if (!row) {
    return null;
  }
  return {
    ...row,
    profile,
    readiness,
    aux: aux[0] ?? { unansweredDeaths: 0, deaths: 0, bigHitEnc: null, damagedEnc: null },
  };
}

/** Sankey (level → weapon → armor → monster group). A few hundred rows, sent whole. */
export async function getFlow(filter: MonsterFilter): Promise<FlowRow[]> {
  'use cache';

  cacheTag(MART_TAG);
  cacheLife('hours');

  return queryRows<FlowRow>(
    `SELECT level_bucket AS levelBucket, weapon_bucket AS weaponBucket,
            armor_bucket AS armorBucket, monster_group AS monsterGroup, encounters, deaths
     FROM mart_flow
     WHERE period = {period:String} AND heavy = {heavy:String}`,
    { period: filter.period, heavy: filter.heavy },
  );
}

interface PatchRow {
  patchId: string;
  appliedAt: string;
  title: string;
  status: PatchRisk['status'];
  intentCheck: number;
  preEnc: number;
  preRisk: number;
  prePer100: number;
  postEnc: number;
  postRisk: number;
  postPer100: number;
  adjRatio: number | null;
  adjLo: number | null;
  adjHi: number | null;
  groupRatio: number | null;
}

/**
 * H2: risk before and after one patch, plus the daily trend line.
 * The patch defines the period, so `filter.period` is not used here.
 */
export async function getPatchRisk(
  id: string,
  patchId: string,
  filter: MonsterFilter,
): Promise<PatchRisk | null> {
  'use cache';

  cacheTag(MART_TAG);
  cacheLife('hours');

  const [summary, daily] = await Promise.all([
    queryRows<PatchRow>(
      `SELECT p.patch_id AS patchId, toString(d.applied_at) AS appliedAt, d.title AS title,
              p.status AS status, p.intent_check AS intentCheck,
              p.pre_enc AS preEnc, p.pre_risk AS preRisk, p.pre_per100 AS prePer100,
              p.post_enc AS postEnc, p.post_risk AS postRisk, p.post_per100 AS postPer100,
              p.adj_ratio AS adjRatio, p.adj_lo AS adjLo, p.adj_hi AS adjHi,
              p.group_ratio AS groupRatio
       FROM mart_h2_patch AS p
       INNER JOIN dim_patch AS d ON d.patch_id = p.patch_id
       WHERE p.monster_id = {id:String} AND p.patch_id = {patchId:String}
         AND p.heavy = {heavy:String}
       LIMIT 1`,
      { id, patchId, heavy: filter.heavy },
    ),
    queryRows<PatchRisk['daily'][number]>(
      `SELECT toString(day) AS day, encounters, risk_events AS riskEvents
       FROM mart_h2_daily
       WHERE monster_id = {id:String} AND heavy = {heavy:String}
       ORDER BY day`,
      { id, heavy: filter.heavy },
    ),
  ]);

  const [row] = summary;
  if (!row) {
    return null;
  }
  const hasAdj = row.adjRatio !== null && row.adjLo !== null && row.adjHi !== null;
  return {
    patch: { id: row.patchId, appliedAt: row.appliedAt, title: row.title },
    status: row.status,
    intentCheck: row.intentCheck === 1,
    pre: { enc: row.preEnc, risk: row.preRisk, per100: row.prePer100 },
    post: { enc: row.postEnc, risk: row.postRisk, per100: row.postPer100 },
    adj: hasAdj ? { ratio: row.adjRatio ?? 0, lo: row.adjLo ?? 0, hi: row.adjHi ?? 0 } : null,
    groupRatio: row.groupRatio,
    daily,
  };
}

interface SkillRow extends SkillWindow {
  skillId: string;
  windowSec: number;
}

const EMPTY_WINDOW: SkillWindow = {
  deathWith: 0,
  deathTotal: 0,
  survWith: 0,
  survTotal: 0,
  diffPp: 0,
  status: 'low_sample',
};

/** H3 (bosses only): share of deaths right after each skill, 5s and 2s windows together. */
export async function getBossSkills(id: string, filter: MonsterFilter): Promise<BossSkill[]> {
  'use cache';

  cacheTag(MART_TAG);
  cacheLife('hours');

  const rows = await queryRows<SkillRow>(
    `SELECT skill_id AS skillId, window_sec AS windowSec,
            death_with AS deathWith, death_total AS deathTotal,
            surv_with AS survWith, surv_total AS survTotal, diff_pp AS diffPp, status
     FROM mart_h3_skill
     WHERE boss_id = {id:String} AND heavy = {heavy:String}
     ORDER BY skill_id`,
    { id, heavy: filter.heavy },
  );

  const bySkill = new Map<string, BossSkill>();
  rows.forEach(({ skillId, windowSec, ...window }) => {
    const skill = bySkill.get(skillId) ?? { skillId, w5: EMPTY_WINDOW, w2: EMPTY_WINDOW };
    if (windowSec === 5) skill.w5 = window;
    if (windowSec === 2) skill.w2 = window;
    bySkill.set(skillId, skill);
  });
  return [...bySkill.values()];
}

/** Skills seen in the last `window` seconds before each boss death. */
export async function getBossTimeline(
  id: string,
  window: TimelineWindow,
  filter: MonsterFilter,
): Promise<BossTimelineEvent[]> {
  'use cache';

  cacheTag(MART_TAG);
  cacheLife('hours');

  return queryRows<BossTimelineEvent>(
    `SELECT death_seq AS deathSeq, skill_id AS skillId, offset_ms AS offsetMs
     FROM mart_h3_timeline
     WHERE boss_id = {id:String} AND heavy = {heavy:String}
       AND offset_ms >= {minOffset:Int32}
     ORDER BY death_seq, offset_ms`,
    { id, heavy: filter.heavy, minOffset: -window * 1000 },
  );
}
