import type { FlowKey, FlowPick, FlowRow } from '@/types/board';
import type { MonsterMainRow } from '@/types/monsters';

/** Risk at or above this many times the expected value is drawn in the death color. */
export const RISK_FLAG = 2;

/** Risk ≥ 2× expected: the one color rule shared by the scatter marks and list rows. A death
 * signal (3-1) is told in the scatter tooltip only, never as a second color criterion. */
export const isFlagged = (r: MonsterMainRow): boolean => (r.riskVsExpected ?? 0) >= RISK_FLAG;

export const fmtInt = (n: number): string => n.toLocaleString('ko-KR');

export const fmtRisk = (v: number | null): string => (v === null ? '–' : `${v.toFixed(2)}배`);

export const per100 = (deaths: number, enc: number): string =>
  enc > 0 ? ((deaths / enc) * 100).toFixed(1) : '–';

/** Rows by riskVsExpected, highest first, nulls last. */
export function byRisk(rows: MonsterMainRow[]): MonsterMainRow[] {
  return [...rows].sort((a, b) => {
    if (a.riskVsExpected === null) return b.riskVsExpected === null ? 0 : 1;
    if (b.riskVsExpected === null) return -1;
    return b.riskVsExpected - a.riskVsExpected || b.deaths - a.deaths;
  });
}

/** A flow row passes every picked cell. */
export const matchesPick = (r: FlowRow, pick: FlowPick): boolean =>
  (Object.keys(pick) as FlowKey[]).every((k) => !pick[k] || r[k] === pick[k]);
