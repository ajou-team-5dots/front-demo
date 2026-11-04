import type { BoardFilters, FlowKey, FlowPick } from '@/types/board';
import type { MonsterMainRow } from '@/types/monsters';

import { FLOW_KEYS, groupOf } from './board-filters';

export const FLOW_LABELS: Record<FlowKey, string> = {
  lv: '레벨',
  wp: '무기',
  ar: '방어구',
  grp: '몬스터 집단',
};

export function stagesOf(rows: MonsterMainRow[]): number[] {
  return [...new Set(rows.map((r) => r.mainStage))].sort((a, b) => a - b);
}

/** Stage, group and search filters, applied after the (cached) full list is read. */
export function filterRows(rows: MonsterMainRow[], f: BoardFilters): MonsterMainRow[] {
  const q = f.q.toLowerCase();
  return rows.filter(
    (r) =>
      (f.stage === null || r.mainStage === f.stage) &&
      (f.group === null || groupOf(r.role, r.grade) === f.group) &&
      (q === '' || r.monster.toLowerCase().includes(q)),
  );
}

/** Picked flow cells as chips, each linking to the same page without that cell. */
export function pickChips(pick: FlowPick, hrefWithout: (p: FlowPick) => string) {
  return FLOW_KEYS.filter((k) => pick[k]).map((k) => {
    const rest: FlowPick = { ...pick };
    delete rest[k];
    return { label: `${FLOW_LABELS[k]} · ${pick[k]}`, removeHref: hrefWithout(rest) };
  });
}

export function roleLabel(role: string): string {
  if (role === 'boss') return '보스';
  if (role === 'midboss') return '중간보스';
  return '일반';
}

/** "2026-10-12" → "10/12" */
export const shortDay = (d: string) => d.slice(5).replace('-', '/');

/** Where one monster stands among the batch on each KPI (1 = highest), for the detail's KPI box. */
export interface KpiRanks {
  deaths: number;
  enc: number;
  /** null when the monster has no risk value (or no deaths, shown as "사망 0건"). */
  risk: number | null;
  /** How many monsters the ranks are out of (those without a risk value rank after the rest). */
  of: number;
}

const hasRisk = (r: MonsterMainRow): r is MonsterMainRow & { riskVsExpected: number } =>
  r.riskVsExpected !== null &&
  Number.isFinite(r.riskVsExpected) &&
  !(r.riskVsExpected === 0 && r.deaths === 0);

/** 1 + how many are strictly higher, so ties share a rank. */
const rankAmong = (values: number[], v: number) => 1 + values.filter((x) => x > v).length;

/** Ranks of `row` within `all` (the whole batch the board reads), from fields already loaded. */
export function kpiRanks(all: MonsterMainRow[], row: MonsterMainRow): KpiRanks {
  const valued = all.filter(hasRisk);
  return {
    deaths: rankAmong(
      all.map((r) => r.deaths),
      row.deaths,
    ),
    enc: rankAmong(
      all.map((r) => r.enc),
      row.enc,
    ),
    risk: hasRisk(row)
      ? rankAmong(
          valued.map((r) => r.riskVsExpected),
          row.riskVsExpected,
        )
      : null,
    of: all.length,
  };
}
