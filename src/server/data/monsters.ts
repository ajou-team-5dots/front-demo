import 'server-only';

import type { BossSkill, H2Patch, Heavy, MonsterDetail, MonsterMainRow } from '@/types/monsters';

// Screen functions for the monster balance board. The backend developer fills in the SQL
// and logic; connections are already done:
//   query(sql, params)      ClickHouse (direct locally, Lambda when deployed)  src/server/db/query.ts
//   readPrecomputed(name)   Python batch JSON (local folder or S3)             ./precomputed.ts
// Thresholds come from src/server/config/criteria.ts, never literals in SQL.
// Spec: 계산 명세 (분석 허브 아티팩트 x_api 페이지, 원문 DataSet/beta_analysis/explore/API_SPEC.md).
// Expected values to check against: tests/expected.test.ts.
//
// When implementing, wrap each function with:
//   'use cache'; cacheTag(GAME_EVENTS_TAG); cacheLife('hours');
// and never SELECT actorId, sourceActor or chat text.

class NotImplementedError extends Error {
  constructor(fn: string, args: Record<string, unknown>) {
    super(
      `${fn}(${JSON.stringify(args)})는 아직 구현되지 않았습니다 (src/server/data/monsters.ts)`,
    );
    this.name = 'NotImplementedError';
  }
}

/**
 * GET /monsters: main table rows (enc ≥ MIN_ENC_MAIN).
 *
 * TODO(query): encounters per 2-2 (ENC_GAP_S, ENC_PAD_S, excluding pre-patch entities and,
 *   when heavy = 'exclude', the high-activity account), then per monster:
 *   role, grade, mainStage, enc, deaths, deathsPer100, signal (Poisson vs expDeathsStage, 3-1),
 *   h3State / h3State2 / h3CriterionEffect (bosses, 3-4).
 * TODO(readPrecomputed): riskVsExpected, pentagonRank (4장),
 *   h2State / h2IntentCheck need sameCondition from the H2 batch (3-3, 4장).
 */
export async function getMonsterList(heavy: Heavy): Promise<MonsterMainRow[]> {
  throw new NotImplementedError('getMonsterList', { heavy });
}

/**
 * GET /monsters/{monster}: detail panels.
 *
 * TODO(query): H1_readiness (3-2: dead, win, pp, ratio, encN, deadN, state per condition),
 *   aux1_unanswered (3-5), aux2_bigHit (3-6), H3_bossSkill via getBossSkills for bosses.
 * TODO(readPrecomputed): pentagon (4장: axis value, peer median, z, rank).
 * TODO(both): H2_patch via getPatchRisk.
 * Returns null for an unknown monster.
 */
export async function getMonsterDetail(
  monster: string,
  heavy: Heavy,
): Promise<MonsterDetail | null> {
  throw new NotImplementedError('getMonsterDetail', { monster, heavy });
}

/**
 * GET /monsters/{monster}/h3: per-ability rows for a boss, 5 s and 2 s windows together.
 *
 * TODO(query): for each ability and window in H3_WINDOWS (3-4):
 *   deaths side  player deaths by this boss with the ability in [t − w, t]
 *   survive side encounters with damage taken and no death, window before the largest hit
 *   diffPP, ratio (null = infinite), state from H3_PP, H3_RATIO, MIN_DEATHS,
 *   H3_MIN_SURV_ENC, H3_MIN_ABILITY_DEATHS; criterionEffect = signal in only one window.
 *   Ability events: monster_action and monster_ability_phase_changed (phase = 'execute').
 */
export async function getBossSkills(monster: string, heavy: Heavy): Promise<BossSkill[]> {
  throw new NotImplementedError('getBossSkills', { monster, heavy });
}

/**
 * H2: before/after each monster patch (3-3). Includes pre-patch entities, unlike the rest.
 *
 * TODO(query): per patch (kind = 'monster'): before/after enc, deaths, near, events,
 *   risk100, players; sampleOk (H2_MIN_ENC, H2_MIN_EVENTS); comparator search
 *   (same role, unchanged, sampleOk, stage overlap ≥ H2_STAGE_OVERLAP); state order:
 *   sample_short → no_comparator → changed_ok → unchanged_ok.
 * TODO(readPrecomputed): sameCondition (logistic regression or/lo/hi), netOfComparator,
 *   intentCheck needs sameCondition.lo > 1.
 * TODO: where the patch list lives (GET /patches) — table or precomputed file.
 */
export async function getPatchRisk(monster: string, heavy: Heavy): Promise<H2Patch[]> {
  throw new NotImplementedError('getPatchRisk', { monster, heavy });
}
