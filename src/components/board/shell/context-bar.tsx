import type { ReactNode } from 'react';

import type { BoardFilters } from '@/types/board';

interface ContextBarProps {
  /** Data period, e.g. "10/12–10/22". */
  rangeLabel: string;
  filters: BoardFilters;
  /** Monsters shown in the list and the scatter after the filters. */
  shown: number;
  /** The open monster (?m=), if any. */
  monster: string | null;
}

interface ItemProps {
  label: string;
  children: ReactNode;
}

function Item({ label, children }: ItemProps) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-gray-1">{label}</span>
      <span className="font-semibold text-ink">{children}</span>
    </span>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-gray-2">
      ·
    </span>
  );
}

// One slim line between the filter bar and the board saying what is on screen: data period,
// 현재 수치/전체, how many monsters, 고활동 포함/제외, the narrowing filters when set, and the open
// monster. Built from the page's own filters and rows (no extra query).
export function ContextBar({ rangeLabel, filters, shown, monster }: ContextBarProps) {
  const narrowing = [
    filters.group,
    filters.stage === null ? null : `${filters.stage}단계`,
    filters.q ? `"${filters.q}"` : null,
  ].filter((v): v is string => Boolean(v));
  return (
    <div
      role="group"
      aria-label="지금 보는 범위"
      className="flex h-[34px] min-w-0 items-center gap-2.5 px-4 text-(length:--font-size-label) leading-none font-medium tabular-nums"
    >
      <Item label="데이터">{rangeLabel}</Item>
      <Sep />
      <Item label="기간">{filters.period === 'current' ? '현재 수치' : '전체'}</Item>
      <Sep />
      <Item label="몬스터">{shown}종</Item>
      <Sep />
      <Item label="고활동 계정">{filters.heavy === 'include' ? '포함' : '제외'}</Item>
      {narrowing.length ? (
        <>
          <Sep />
          <Item label="조건">{narrowing.join(' · ')}</Item>
        </>
      ) : null}
      {monster ? (
        <>
          <Sep />
          <Item label="선택">{monster}</Item>
        </>
      ) : null}
    </div>
  );
}
