import 'server-only';

import type { PentagonAxis } from '@/types/monsters';

/** The batch writes two independent results, selected by the same heavy filter as SQL. */
export interface HeavyResults<T> {
  include: Record<string, T>;
  exclude: Record<string, T>;
}

export interface PentagonResult {
  rank: number;
  axes: PentagonAxis[];
}

/** The batch writes null fields when the fit fails to converge or SE > 5 (DATA_SPEC 4장). */
export interface PatchModel {
  or: number | null;
  lo: number | null;
  hi: number | null;
  netOfComparator: number | null;
}

export interface MonsterPatch {
  id: string;
  ts: string;
  kind: string;
  label: string;
  changed?: Record<string, { hpRatio: number | null; dmgRatio: number | null }>;
}
