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

export interface SameCondition {
  or: number;
  lo: number;
  hi: number;
}

export interface PatchModel extends SameCondition {
  netOfComparator: number | null;
}

export interface MonsterPatch {
  id: string;
  ts: string;
  kind: string;
  label: string;
  changed?: Record<string, { hpRatio: number | null; dmgRatio: number | null }>;
}
