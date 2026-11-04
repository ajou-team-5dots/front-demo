'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { MONSTER_GROUPS, toQuery } from '@/lib/board-filters';
import { cn } from '@/lib/utils';
import type { BoardFilters, FlowPick } from '@/types/board';

import { useBoardPending } from './board-pending';
import { BoardSelect } from './board-select';

interface FilterBarProps {
  filters: BoardFilters;
  pick?: FlowPick;
  /** Stages that exist in the data, for the stage select. */
  stages: number[];
  /** Path the filters apply to ('/' or a dev preview). */
  basePath: string;
  /** Open monster (?m=), kept across filter changes so the detail stays open. */
  monster?: string | null;
  /** Main screen: field labels and the monster search (Figma 14:5). Detail: selects only (25:85). */
  variant: 'main' | 'detail';
}

interface SegmentProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function Segment<T extends string>({ label, value, options, onChange }: SegmentProps<T>) {
  // The white pill slides to the clicked option at once; the URL catches up after.
  const [picked, setPicked] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setPicked(value);
  }
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const index = options.findIndex((o) => o.value === picked);
  useLayoutEffect(() => {
    const el = refs.current[index];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [index]);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative flex h-[30px] gap-1 rounded-control bg-gray-3 p-(--space-segment-inset)"
    >
      {pill ? (
        <span
          aria-hidden
          className="absolute top-(--space-segment-inset) h-6 rounded-pill bg-panel transition-[left,width] duration-(--duration-base) ease-(--ease-board)"
          style={{ left: pill.left, width: pill.width }}
        />
      ) : null}
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={picked === o.value}
          onClick={() => {
            setPicked(o.value);
            onChange(o.value);
          }}
          className={cn(
            'board-control relative h-6 rounded-pill px-3 text-(length:--font-size-label) leading-none font-medium focus-visible:outline-2 focus-visible:outline-ink',
            picked === o.value ? 'text-ink' : 'text-gray-1 hover:text-ink',
            // Before the first measure the pill is drawn by the button itself.
            !pill && picked === o.value && 'bg-panel',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const fieldLabel =
  'text-(length:--font-size-label) leading-[14px] font-medium text-ink whitespace-nowrap';

export function FilterBar({
  filters,
  pick = {},
  stages,
  basePath,
  monster = null,
  variant,
}: FilterBarProps) {
  const { navigate } = useBoardPending();
  const [q, setQ] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  // Back/forward or a link changed ?q=: show the URL's value again.
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    setQ(filters.q);
  }

  const go = (next: Partial<BoardFilters>) => {
    // Keep the open monster, so a filter change updates the detail in place.
    const qs = toQuery({ ...filters, ...next }, pick);
    const keep = monster ? `${qs ? '&' : '?'}m=${encodeURIComponent(monster)}` : '';
    navigate(`${basePath}${qs}${keep}`);
  };

  // Search applies after typing pauses.
  useEffect(() => {
    if (q === filters.q) return undefined;
    const t = setTimeout(() => go({ q }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go is rebuilt every render; q drives this.
  }, [q]);

  const groupSelect = (
    <BoardSelect
      id="filter-group"
      label="역할·등급"
      value={filters.group ?? ''}
      options={[
        { value: '', label: '역할·등급' },
        ...MONSTER_GROUPS.map((g) => ({ value: g, label: g })),
      ]}
      onChange={(v) => go({ group: MONSTER_GROUPS.find((g) => g === v) ?? null })}
    />
  );
  const stageSelect = (
    <BoardSelect
      id="filter-stage"
      label="던전 단계"
      value={filters.stage === null ? '' : String(filters.stage)}
      options={[
        { value: '', label: '던전 단계' },
        ...stages.map((s) => ({ value: String(s), label: `${s}단계` })),
      ]}
      onChange={(v) => go({ stage: v ? Number(v) : null })}
    />
  );

  return (
    <div className="flex h-[42px] items-center rounded-panel bg-panel px-[6px]">
      {variant === 'main' ? (
        <>
          <span className={cn(fieldLabel, 'mr-2 ml-3')}>역할·등급</span>
          {groupSelect}
          <span className={cn(fieldLabel, 'mr-2 ml-5')}>던전 단계</span>
          {stageSelect}
        </>
      ) : (
        <div className="flex gap-[6px]">
          {groupSelect}
          {stageSelect}
        </div>
      )}
      <span className={cn(fieldLabel, 'mr-[10px] ml-5')}>기간</span>
      <Segment
        label="기간"
        value={filters.period}
        options={[
          { value: 'current', label: '현재 수치' },
          { value: 'all', label: '전체' },
        ]}
        onChange={(v) => go({ period: v })}
      />
      <span className={cn(fieldLabel, 'mr-[10px] ml-[23px]')}>고활동 계정</span>
      <Segment
        label="고활동 계정"
        value={filters.heavy}
        options={[
          { value: 'include', label: '포함' },
          { value: 'exclude', label: '제외' },
        ]}
        onChange={(v) => go({ heavy: v })}
      />
      {variant === 'main' ? (
        <input
          id="filter-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="몬스터 검색"
          aria-label="몬스터 검색"
          className="board-control ml-auto h-[30px] w-[244px] rounded-control border-2 border-gray-2 bg-panel px-[9px] text-(length:--font-size-label) font-medium text-ink placeholder:text-gray-1 focus-visible:outline-2 focus-visible:outline-ink"
        />
      ) : null}
    </div>
  );
}
