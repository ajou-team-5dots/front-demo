// Analysis thresholds (계산 명세 1장, same as explore/rules.py). Keep numbers here, not in SQL:
// when planning changes a criterion, only this file changes.

/** A gap longer than this between hits by the same player on the same monster starts a new encounter (s). */
export const ENC_GAP_S = 30;
/** Slack before/after an encounter when attaching damage taken to it (s). */
export const ENC_PAD_S = 5;
/** Near death: lowest HP ÷ max HP ≤ this. */
export const NEAR_HP = 0.2;
/** High-activity account: encounter count at or above this quantile of accounts. */
export const HEAVY_Q = 0.99;
/** Minimum encounters for a monster to appear in the main table. */
export const MIN_ENC_MAIN = 20;
/** Main table: Poisson cumulative probability cutoffs for elevated deaths. */
export const DEATH_SIGNAL_QUANTILE = 0.95;
export const DEATH_STRONG_QUANTILE = 0.998;
/** Minimum deaths for H1, H3 and aux 1. */
export const MIN_DEATHS = 5;

/** H1 signal: death share − win share ≥ this (percentage points). */
export const H1_PP = 15;
/** H1 signal: condition death rate ÷ other death rate ≥ this. */
export const H1_RATIO = 2.0;
/** H1 sample: minimum encounters under the condition. */
export const H1_MIN_COND_ENC = 10;
/** H1 low level: below (median killer level − this). */
export const H1_LEVEL_GAP = 10;

/** H2 sample: minimum encounters before and after the patch. */
export const H2_MIN_ENC = 30;
/** H2 sample: minimum danger events (deaths + near deaths) before and after. */
export const H2_MIN_EVENTS = 5;
/** H2 comparator: minimum dungeon-stage distribution overlap. */
export const H2_STAGE_OVERLAP = 0.5;

/** H3 windows before a death (s). The first one decides the main state. */
export const H3_WINDOWS = [5, 2] as const;
/** H3 signal: death share − survival share ≥ this (percentage points). */
export const H3_PP = 15;
/** H3 signal: death share ÷ survival share ≥ this. */
export const H3_RATIO = 2.0;
/** H3 sample: minimum survived encounters with damage taken. */
export const H3_MIN_SURV_ENC = 10;
/** H3 sample: minimum deaths with the ability in the window. */
export const H3_MIN_ABILITY_DEATHS = 3;

/** Aux 2 big hit: one hit ≥ this share of the player's max HP. */
export const AUX2_BIG_HIT = 0.5;
/** Aux 2 sample: minimum encounters with damage taken. */
export const AUX2_MIN_HIT_ENC = 100;

/** Monster ids starting with these are mid-bosses. Ids containing _stage_ are bosses. */
export const MIDBOSS_PREFIX = [
  'iron_guardian',
  'iron_colossus',
  'abyss_beast',
  'abyss_colossus',
] as const;
