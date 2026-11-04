// Return shapes for the monster balance board (계산 명세 5장 API, 3장 변수 이름 그대로).
// Matches the supplied base tables and precomputed JSON. Missing batch values remain null.

/** High-activity accounts included (default) or excluded. */
export type Heavy = 'include' | 'exclude';

/** "현재 수치" drops pre-patch entities of changed monsters (DATA_SPEC 2장); "전체" keeps them. */
export type Period = 'current' | 'all';

export type MonsterRole = 'boss' | 'midboss' | 'mob';

/** 3-1: deaths above the Poisson 95% point → signal, above 99.8% → strong. */
export type DeathSignal = 'signal' | 'strong' | 'none';

/** 3-2 */
export type H1State = 'unk' | 'yes' | 'no';
/** 3-3 */
export type H2State = 'sample_short' | 'no_comparator' | 'changed_ok' | 'unchanged_ok';
/** 3-4 */
export type H3State = 'sample_short' | 'signal' | 'none';

/** GET /monsters: one main-table row (monsters with enc ≥ MIN_ENC_MAIN). */
export interface MonsterMainRow {
  monster: string;
  role: MonsterRole;
  /** Grade as stored in the base table, including 'none'. */
  grade: string;
  mainStage: number;
  enc: number;
  deaths: number;
  /** Encounters ending in death or near death; distinct from player death records. */
  danger: number;
  deathsPer100: number;
  /** Precomputed (4장). null until the batch has run. */
  riskVsExpected: number | null;
  signal: DeathSignal;
  /** Monster-level rank from pentagon.json. */
  pentagonRank: number | null;
  h2State: H2State | null;
  h2IntentCheck: boolean;
  /** Bosses only. */
  h3State: H3State | null;
  h3State2: H3State | null;
  h3CriterionEffect: boolean;
}

/** 4장 pentagon axis; the batch can leave unavailable measurements null. */
export interface PentagonAxis {
  axis: string;
  value: number | null;
  peerMedian: number | null;
  z: number | null;
}

export type H1Condition = 'lowLevel' | 'noWeapon' | 'woodenWeapon' | 'noArmor';

/** 3-2, one row per condition. */
export interface H1Readiness {
  condition: H1Condition;
  /** Share of deaths under the condition (0..1). */
  dead: number;
  /** Share of wins (kills) under the condition (0..1). */
  win: number;
  pp: number;
  /** null when the comparison rate is 0. */
  ratio: number | null;
  encN: number;
  deadN: number;
  /** Denominator of `dead` (all deaths to this monster). Optional for older callers. */
  deadTotal?: number;
  /** Numerator and denominator of `win`. Optional for older callers. */
  winN?: number;
  winTotal?: number;
  otherEncN: number;
  encDeadN: number;
  otherDeadN: number;
  state: H1State;
}

/** 3-3, before or after one patch. */
export interface H2Period {
  enc: number;
  deaths: number;
  near: number;
  events: number;
  risk100: number;
  players: number;
}

export interface H2Daily extends H2Period {
  /** Calendar day in Asia/Seoul, matching patch timestamps. */
  date: string;
  period: 'before' | 'after';
}

/** 3-3, one patch. */
export interface H2Patch {
  /** Corresponds to patches.json and the model's patch key. */
  patchId: string;
  before: H2Period;
  after: H2Period;
  daily: H2Daily[];
  sampleOk: boolean;
  /** Precomputed logistic-regression ratio (4장), only when sampleOk. */
  sameCondition: { or: number; lo: number; hi: number } | null;
  /** Precomputed, changed monsters with a comparator only. */
  netOfComparator: number | null;
  state: H2State;
  intentCheck: boolean;
  /** Unavailable until the analysis spec supplies a group calculation or batch value. */
  groupReference: number | null;
}

/** 3-5 */
export interface Aux1Unanswered {
  unanswered: number;
  deaths: number;
  unansweredShare: number;
  sampleShort: boolean;
}

/** 3-6 (screen shows bosses only) */
export interface Aux2BigHit {
  hitEnc: number;
  bigHit: number;
  bigHitShare: number;
  sampleShort: boolean;
}

/** 3-4, one window (5 s or 2 s). Spec names carry a _w suffix per window; here the window is the key. */
export interface H3Window {
  deathsWithAbility: number;
  deathsTotal: number;
  deathShare: number;
  survEncWithAbility: number;
  survEncTotal: number;
  survShare: number;
  diffPP: number;
  /** null = infinite (survShare is 0), which counts as passing. */
  ratio: number | null;
  state: H3State;
}

/** 3-4, one boss ability with both windows, so the 5 s/2 s slider never refetches. */
export interface BossSkill {
  abilityId: string;
  /** abilityId without the "<boss>_" prefix. */
  ability: string;
  windows: { 5: H3Window; 2: H3Window };
  /** First window (5 s) state. */
  state: H3State;
  /** 2 s state. */
  state2: H3State;
  /** Signal in only one of the two windows. */
  criterionEffect: boolean;
}

/** GET /monsters/{monster} */
export interface MonsterDetail {
  monster: string;
  enc: number;
  deaths: number;
  riskVsExpected: number | null;
  pentagonRank: number | null;
  pentagon: PentagonAxis[];
  H1_readiness: H1Readiness[];
  H2_patch: H2Patch[];
  aux1_unanswered: Aux1Unanswered;
  aux2_bigHit: Aux2BigHit;
  /** Bosses only. */
  H3_bossSkill: BossSkill[] | null;
}
