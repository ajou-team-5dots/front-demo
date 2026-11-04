// Screen-level shapes for the board pages (filters, flow, trend). Analysis shapes live in
// ./monsters.ts.
import type { Heavy, Period } from './monsters';

/** Defined with the data functions in ./monsters.ts; re-exported for screen imports. */
export type { Period };

/** Monster group used by the role·grade filter and the last flow column. */
export type MonsterGroup = '던전 보스' | '중간보스' | '일반·strong' | '일반·medium' | '일반·약함';

/** Filters kept in the URL query: ?heavy=exclude&period=all&stage=2&group=던전 보스&q=zombie */
export interface BoardFilters {
  heavy: Heavy;
  period: Period;
  /** null = all stages. */
  stage: number | null;
  /** null = all groups. */
  group: MonsterGroup | null;
  q: string;
}

/** Flow (sankey) column keys, also the URL keys of a picked flow cell. */
export type FlowKey = 'lv' | 'wp' | 'ar' | 'grp';

export interface FlowColumn {
  key: FlowKey;
  label: string;
  values: string[];
}

/** One combination of the four flow columns with its counts. */
export interface FlowRow {
  lv: string;
  wp: string;
  ar: string;
  grp: string;
  enc: number;
  deaths: number;
}

export interface FlowData {
  columns: FlowColumn[];
  rows: FlowRow[];
  /** Left out of the flow because the player's level is not recorded. */
  excluded?: { enc: number; deaths: number };
}

/** Flow cells picked on the main screen, carried to the detail screen as chips. */
export type FlowPick = Partial<Record<FlowKey, string>>;

/** One day of one monster, for the patch before/after trend. */
export interface DailyPoint {
  /** YYYY-MM-DD */
  day: string;
  enc: number;
  deaths: number;
  /** deaths + near deaths */
  danger: number;
}

/** data/precomputed/patches.json, monster patches only. */
export interface PatchInfo {
  id: string;
  /** epoch ms */
  ts: number;
  label: string;
  /** Monsters whose numbers changed in this patch. */
  changed: string[];
}

/** Data range of the loaded batch (meta.json), for the "10/12 - 10/22" line. */
export interface DataRange {
  from: string;
  to: string;
}
