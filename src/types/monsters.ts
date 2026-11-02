// Return shapes for the monster balance board (계산 명세 5장 API, 3장 변수 이름 그대로).
// Fields marked TODO are inferred: 5장 says the detail shape should match
// out/screen_data/detail_<monster>.json, which we do not have yet. Confirm with analysts.

/** High-activity accounts included (default) or excluded. */
export type Heavy = 'include' | 'exclude';

export type MonsterRole = 'boss' | 'midboss' | 'mob';

/** 3-1: deaths above the Poisson 95% point → signal, above 99.8% → strong. */
export type DeathSignal = 'signal' | 'strong' | 'none'; // TODO: 'none' 값 이름 확인

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
  grade: string; // TODO: 값 목록 확인 (weak/medium/strong?)
  mainStage: number;
  enc: number;
  deaths: number;
  deathsPer100: number;
  /** Precomputed (4장). null until the batch has run. */
  riskVsExpected: number | null;
  signal: DeathSignal;
  /** Precomputed (4장). TODO: 순위의 기준(오각형 종합?) 확인 */
  pentagonRank: number | null;
  h2State: H2State | null;
  h2IntentCheck: boolean;
  /** Bosses only. */
  h3State: H3State | null;
  h3State2: H3State | null;
  h3CriterionEffect: boolean;
}

/** 4장 pentagon axis, precomputed. TODO: 축 키 이름 확인 */
export interface PentagonAxis {
  axis: string;
  value: number;
  peerMedian: number;
  z: number;
  rank: number;
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

/** 3-3, one patch. */
export interface H2Patch {
  patchId: string; // TODO: 패치 목록(GET /patches)의 id 형식 확인
  before: H2Period;
  after: H2Period;
  sampleOk: boolean;
  /** Precomputed logistic-regression ratio (4장), only when sampleOk. */
  sameCondition: { or: number; lo: number; hi: number } | null;
  /** Precomputed, changed monsters with a comparator only. */
  netOfComparator: number | null;
  state: H2State;
  intentCheck: boolean;
  /** Group value sent along when a changed monster is sample_short. TODO: 모양 확인 */
  groupReference: number | null;
}

/** 3-5 */
export interface Aux1Unanswered {
  unanswered: number;
  deaths: number;
  unansweredShare: number;
  sampleShort: boolean; // TODO: 응답에서 sample_short를 어떻게 표시하는지 확인
}

/** 3-6 (screen shows bosses only) */
export interface Aux2BigHit {
  hitEnc: number;
  bigHit: number;
  bigHitShare: number;
  sampleShort: boolean; // TODO: 위와 같음
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
  pentagon: PentagonAxis[];
  H1_readiness: H1Readiness[];
  H2_patch: H2Patch[];
  aux1_unanswered: Aux1Unanswered;
  aux2_bigHit: Aux2BigHit;
  /** Bosses only. */
  H3_bossSkill: BossSkill[] | null;
}
