// Return shapes of src/server/data/monsters.ts (spec: 분석 저장소 docs/backend/api_spec.md 3장).
// Only numbers and status codes: wording ("맞음/틀림") is the screen's job.

export type Period = 'current' | 'all';
/** Whether high-activity accounts are included. */
export type Heavy = 'incl' | 'excl';

export interface MonsterFilter {
  period: Period;
  heavy: Heavy;
  role?: string;
  stage?: number;
}

export interface FilterOptions {
  roles: string[];
  grades: string[];
  stages: number[];
}

export interface MonsterRow {
  id: string;
  role: string;
  grade: string;
  stage: number;
  isBoss: boolean;
  /** YYYY-MM-DD */
  periodFrom: string;
  periodTo: string;
  encounters: number;
  deaths: number;
  /** Risk relative to expectation (scatter y, list order). */
  riskRatio: number;
  riskRank: number;
}

export type ProfileAxis = 'race_med' | 'hits_med' | 'hpcost_mean' | 'escape_rate' | 'avoid_rate';

export type ReadinessCondition = 'low_level' | 'no_weapon' | 'wood_weapon' | 'no_armor';

export interface MonsterDetail extends MonsterRow {
  profile: { axis: ProfileAxis; value: number; peerMedian: number; z: number }[];
  readiness: {
    condition: ReadinessCondition;
    killerShare: number;
    deathShare: number;
    diffPp: number;
    /** null when the ready group has no encounters. */
    rateRatio: number | null;
    encCond: number;
    deathCond: number;
  }[];
  aux: {
    unansweredDeaths: number;
    deaths: number;
    /** Bosses only; null otherwise. */
    bigHitEnc: number | null;
    damagedEnc: number | null;
  };
}

export interface FlowRow {
  levelBucket: 'low' | 'mid' | 'high';
  weaponBucket: 'none' | 'wood' | 'other';
  armorBucket: 'none' | 'some';
  monsterGroup: string;
  encounters: number;
  deaths: number;
}

export type PatchStatus = 'changed' | 'unchanged' | 'low_sample' | 'no_control';

export interface PatchRisk {
  patch: { id: string; appliedAt: string; title: string };
  status: PatchStatus;
  intentCheck: boolean;
  pre: { enc: number; risk: number; per100: number };
  post: { enc: number; risk: number; per100: number };
  /** null when the sample is too small. */
  adj: { ratio: number; lo: number; hi: number } | null;
  groupRatio: number | null;
  daily: { day: string; encounters: number; riskEvents: number }[];
}

export type SkillStatus = 'signal' | 'none' | 'low_sample';

export interface SkillWindow {
  deathWith: number;
  deathTotal: number;
  survWith: number;
  survTotal: number;
  diffPp: number;
  status: SkillStatus;
}

/** Both windows come together so the 2s/5s slider never refetches. */
export interface BossSkill {
  skillId: string;
  w5: SkillWindow;
  w2: SkillWindow;
}

export type TimelineWindow = 2 | 5;

export interface BossTimelineEvent {
  /** 1-based order of deaths. Never an account id. */
  deathSeq: number;
  skillId: string;
  /** Milliseconds before death (negative). */
  offsetMs: number;
}
