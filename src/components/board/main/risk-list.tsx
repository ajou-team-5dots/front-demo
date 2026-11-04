'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react';

import { riskLabel } from '@/components/board/detail/format';
import { roleLabel } from '@/lib/board-rows';
import { cn } from '@/lib/utils';
import { COLOR, MOTION } from '@/styles/tokens';
import type { MonsterMainRow } from '@/types/monsters';

import { fmtInt, RISK_FLAG } from './format';

/** Who set the shared hover: the list scrolls to the row only when the scatter did. */
export type HoverSource = 'scatter' | 'list';

interface RiskListProps {
  rows: MonsterMainRow[];
  /** Hovered monster, shared with the scatter. */
  hover: string | null;
  hoverFrom: HoverSource | null;
  onHover: (monster: string | null) => void;
  /** The row's href: opens the monster, or the overview when it is the open one. */
  hrefFor: (monster: string) => string;
  /** Opens the monster's detail, or closes it when it is already open (board transition). */
  onOpen: (monster: string) => void;
  onPrefetch: (monster: string) => void;
  /** The open monster (?m=). */
  open: string | null;
  /** The monster shown as open right now: the clicked one while its navigation is pending. */
  current: string | null;
}

/** Highest risk vs expected first, monsters without a value last, ties by name. */
export function byRiskThenName(rows: MonsterMainRow[]): MonsterMainRow[] {
  return [...rows].sort((a, b) => {
    const ra = a.riskVsExpected;
    const rb = b.riskVsExpected;
    if (ra === null && rb !== null) return 1;
    if (rb === null && ra !== null) return -1;
    if (ra !== null && rb !== null && ra !== rb) return rb - ra;
    return a.monster.localeCompare(b.monster);
  });
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A CSS time in ms. Chrome serializes the computed --duration-slow as "0.32s", not "320ms". */
const toMs = (v: string): number => {
  const t = v.trim();
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return 320;
  if (t.endsWith('ms')) return n;
  return t.endsWith('s') ? n * 1000 : n;
};

/**
 * Risk ≥ 2× in the death color, pulled toward ink so the 13px text keeps contrast:
 * 5.42:1 on white, 4.65:1 on the gray-3 of a hovered or open row (chart-death is 4.20:1).
 */
const FLAG_TEXT = COLOR.textScale.flag;
/** gray-1 nudged toward ink: 7.32 / 6.28 on white / gray-3 (token color.text-scale.sub). */
const SUB_TEXT = COLOR.textScale.sub;

// The explorer sidebar (left, 320 wide, full board height): one row per monster, name over
// "N단계 · 역할", risk vs expected right-aligned. A row opens the monster's detail in the main
// area; the open row returns to the overview instead.
export function RiskList({
  rows,
  hover,
  hoverFrom,
  onHover,
  hrefFor,
  onOpen,
  onPrefetch,
  open,
  current,
}: RiskListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const tops = useRef(new Map<string, number>());
  const order = rows.map((r) => r.monster).join('|');

  // FLIP: when a filter change reorders the rows, each row slides from where it was instead of
  // jumping (instant under reduced motion). Positions are read before paint, every layout, as
  // the row's box relative to the list's content. A row still sliding from the last change starts
  // from where it is seen now: its running offset is added to its old place, then the old
  // animation is cancelled before the new one starts.
  useLayoutEffect(() => {
    const ol = listRef.current;
    if (!ol) return;
    const items = [...ol.querySelectorAll<HTMLElement>('li[data-monster]')];
    const top = (li: HTMLElement) =>
      li.getBoundingClientRect().top - ol.getBoundingClientRect().top + ol.scrollTop;
    const shifted = new Map(items.map((li) => [li.dataset.monster ?? '', top(li)]));
    items.forEach((li) => {
      if (typeof li.getAnimations === 'function') li.getAnimations().forEach((a) => a.cancel());
    });
    const before = tops.current;
    const next = new Map(items.map((li) => [li.dataset.monster ?? '', top(li)]));
    tops.current = next;
    if (!before.size || reducedMotion()) return;
    const slow = toMs(
      getComputedStyle(document.documentElement).getPropertyValue('--duration-slow'),
    );
    items.forEach((li) => {
      const id = li.dataset.monster ?? '';
      const laidOut = before.get(id);
      const now = next.get(id);
      if (laidOut === undefined || now === undefined) return;
      // Visual old place: old layout + whatever the cancelled slide still offset it by.
      const was = laidOut + ((shifted.get(id) ?? now) - now);
      if (Math.abs(was - now) < 0.5 || typeof li.animate !== 'function') return;
      li.animate([{ transform: `translateY(${was - now}px)` }, { transform: 'none' }], {
        duration: slow,
        easing: `cubic-bezier(${MOTION.ease.board.join(', ')})`,
      });
    });
  }, [order]);

  // Keep the row hovered in the scatter in view. Only the list scrolls, never the page.
  useEffect(() => {
    if (hoverFrom !== 'scatter' || !hover) return;
    const ol = listRef.current;
    const row = [...(ol?.querySelectorAll<HTMLElement>('[data-monster]') ?? [])].find(
      (el) => el.dataset.monster === hover,
    );
    if (!ol || !row) return;
    const top = row.offsetTop; // the list is the offset parent (relative)
    const bottom = top + row.offsetHeight;
    let next: number | null = null;
    if (top < ol.scrollTop) next = top;
    else if (bottom > ol.scrollTop + ol.clientHeight) next = bottom - ol.clientHeight;
    if (next !== null) ol.scrollTo({ top: next, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [hover, hoverFrom]);

  const onClick = (e: MouseEvent, monster: string) => {
    // New tab / window keeps the browser's own behavior.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onOpen(monster);
  };

  const enter = (monster: string) => {
    onHover(monster);
    onPrefetch(monster);
  };

  return (
    <ol
      ref={listRef}
      className="relative h-full overflow-y-auto overscroll-contain"
      aria-label="기대 대비 위험 높은 순"
    >
      {rows.map((r) => {
        const isOpen = r.monster === open;
        const lit = r.monster === current;
        const risk = r.riskVsExpected;
        const valued = risk !== null && Number.isFinite(risk) && !(risk === 0 && r.deaths === 0);
        const flagged = valued && (risk ?? 0) >= RISK_FLAG;
        return (
          <li key={r.monster} data-monster={r.monster}>
            <Link
              href={hrefFor(r.monster)}
              prefetch={false}
              onClick={(e) => onClick(e, r.monster)}
              onPointerEnter={() => enter(r.monster)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => enter(r.monster)}
              onBlur={() => onHover(null)}
              aria-current={isOpen ? 'true' : undefined}
              aria-label={`${r.monster} ${isOpen ? '상세 닫기' : '상세 보기'}, ${r.mainStage}단계 ${roleLabel(r.role)}, 기대 대비 위험 ${riskLabel(risk, r.deaths)}, 사망 ${r.deaths}건, 교전 ${r.enc}건`}
              title={
                isOpen ? '다시 누르면 개요로' : `사망 ${fmtInt(r.deaths)}/${fmtInt(r.enc)}교전`
              }
              className={cn(
                'board-control flex h-11 items-center justify-between gap-3 rounded-control px-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                lit && 'bg-gray-3',
                !lit && r.monster === hover && 'bg-state-row-hover',
              )}
            >
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-(length:--font-size-body) leading-[17px] text-ink',
                    lit ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {r.monster}
                </span>
                <span
                  className="block text-(length:--font-size-caption) leading-[13px] font-medium"
                  style={{ color: SUB_TEXT }}
                >
                  {r.mainStage}단계 · {roleLabel(r.role)}
                </span>
              </span>
              {/* Fixed right-aligned column: decimals, "사망 0건" and "–" share one edge. */}
              <span
                className={cn(
                  'w-[72px] shrink-0 text-right text-(length:--font-size-body-sm) tabular-nums',
                  valued ? 'font-(weight:--font-weight-risk-value) text-ink' : 'font-medium',
                )}
                style={flagged || !valued ? { color: flagged ? FLAG_TEXT : SUB_TEXT } : undefined}
              >
                {riskLabel(risk, r.deaths)}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
