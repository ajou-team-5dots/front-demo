'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import type { BossSkill, H3Window } from '@/types/monsters';

import { useChartTooltip } from '../shell/chart-tooltip';
import { EmptyState } from '../shell/empty-state';
import { Panel } from '../shell/panel';
import type { SkillWindowProps } from './contracts';
import { DetailMotion } from './detail-motion';
import { num, pct, signedPP, times } from './format';
import { SignalBadge } from './signal-badge';

type Win = 2 | 5;

/** "10/28 (36%)" with the numbers in ink, the brackets in gray. */
const shareLabel = (n: number, total: number, share: number) => (
  <>
    <span className="text-ink">
      {num(n)}/{num(total)}
    </span>{' '}
    (<span className="text-ink">{pct(share)}</span>)
  </>
);

function Bars({ w }: { w: H3Window }) {
  return (
    <div className="flex flex-col gap-1">
      {[
        {
          key: 'death',
          share: w.deathShare,
          label: shareLabel(w.deathsWithAbility, w.deathsTotal, w.deathShare),
          fill: 'bg-chart-death',
        },
        {
          key: 'surv',
          share: w.survShare,
          label: shareLabel(w.survEncWithAbility, w.survEncTotal, w.survShare),
          fill: 'bg-chart-survival',
        },
      ].map((b) => (
        <div key={b.key} className="flex items-center gap-2">
          {/* The track takes the column width left of the count label (0% → 100%). */}
          <div className="h-(--size-bar-skill) min-w-0 flex-1 rounded-pill bg-chart-track">
            <div
              className={cn('board-grow board-first board-mark h-full rounded-pill', b.fill)}
              style={{ width: `${Math.max(0, Math.min(1, b.share)) * 100}%` }}
            />
          </div>
          <span className="w-[92px] shrink-0 text-(length:--font-size-label) leading-[14px] font-medium whitespace-nowrap text-gray-1 tabular-nums">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function stateBadge(s: BossSkill, win: Win) {
  const state = win === 5 ? s.state : s.state2;
  if (state === 'signal') {
    return <SignalBadge tone="danger">{`${s.ability} ${win}초 기준 점검 신호`}</SignalBadge>;
  }
  if (state === 'sample_short') {
    return (
      <span className="text-(length:--font-size-label) font-semibold text-gray-1">표본 부족</span>
    );
  }
  return null;
}

/** Chart height that fits the 365 panel (Figma 38:642): rows share it up to ROW_MAX each. */
const CHART_H = 281;
const LEGEND_H = 24;
const NOTE_H = 18;
const ROW_MAX = 56;
/** Two bar lines (14 + 4 + 14) with room around them; the badge (20) fits beside. */
const ROW_MIN = 44;

// Figma 38:642 (full detail width × 365 at most 4–5 skills): "보스 기술 직후 사망". With more
// skills the rows keep ROW_MIN and the panel grows instead of squeezing them.
export function SkillWindow({ skills }: SkillWindowProps) {
  const tip = useChartTooltip();
  const [win, setWin] = useState<Win>(5);
  // Stable order by the 5 s death share, so switching windows moves bars, not rows.
  const rows = [...skills].sort(
    (a, b) =>
      b.windows[5].deathShare - a.windows[5].deathShare || a.ability.localeCompare(b.ability),
  );
  const diff = skills.filter((s) => s.criterionEffect);
  const rowH = Math.max(
    ROW_MIN,
    Math.min(
      ROW_MAX,
      Math.floor((CHART_H - LEGEND_H - (diff.length ? NOTE_H : 0)) / Math.max(1, rows.length)),
    ),
  );

  return (
    <Panel
      title="보스 기술 직후 사망"
      className="min-h-[365px] pb-4"
      enter={2}
      actions={
        skills.length > 0 ? (
          <div className="flex items-center gap-3">
            <div
              role="radiogroup"
              aria-label="기술 사용 후 시간 기준"
              className="relative -my-1 flex h-[30px] gap-1 rounded-control bg-gray-3 p-(--space-segment-inset)"
            >
              {/* Active pill slides between the two 44px buttons (gap 4). */}
              <span
                aria-hidden
                className="board-mark absolute top-(--space-segment-inset) left-(--space-segment-inset) h-6 w-11 rounded-pill bg-panel"
                style={{ transform: `translateX(${win === 5 ? 48 : 0}px)` }}
              />
              {([2, 5] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={win === w}
                  onClick={() => setWin(w)}
                  className={cn(
                    'board-control relative h-6 w-11 rounded-pill text-(length:--font-size-label) leading-none font-medium focus-visible:outline-2 focus-visible:outline-ink',
                    win === w ? 'text-ink' : 'text-gray-1 hover:text-ink',
                  )}
                >
                  {w}초
                </button>
              ))}
            </div>
            <span className="text-(length:--font-size-caption) font-semibold text-gray-1">
              사망 직전 {win}초 안에 그 기술이 있었던 비율
            </span>
          </div>
        ) : null
      }
    >
      <DetailMotion />
      {skills.length === 0 ? (
        <EmptyState>기술 기록 없음</EmptyState>
      ) : (
        <div className="mt-[22px] flex w-full flex-col">
          <div className="flex h-5 items-center gap-4 pl-[160px] text-(length:--font-size-caption) font-semibold text-gray-1">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-(--size-bar-skill) w-(--size-legend-swatch-w) rounded-pill bg-chart-death"
              />
              사망 (기술 있음/전체 사망)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-(--size-bar-skill) w-(--size-legend-swatch-w) rounded-pill bg-chart-survival"
              />
              살아남은 교전 (가장 큰 피해 직전 {win}초 · 기술 있음/전체)
            </span>
          </div>
          <ul aria-label="기술별 사망과 생존 교전 비중" className="mt-1">
            {rows.map((s) => {
              const w = s.windows[win];
              return (
                <li
                  key={s.abilityId}
                  style={{ height: rowH }}
                  className="grid grid-cols-[148px_minmax(0,1fr)_280px] items-center gap-x-3"
                  onPointerMove={(e) =>
                    tip.show(
                      e,
                      <div>
                        <p className="font-semibold">
                          {s.ability} · {win}초 기준
                        </p>
                        <p>
                          사망 {num(w.deathsTotal)}건 중 {num(w.deathsWithAbility)}건 (
                          {pct(w.deathShare)})
                        </p>
                        <p>
                          살아남은 교전 {num(w.survEncTotal)}건 중 {num(w.survEncWithAbility)}건 (
                          {pct(w.survShare)})
                        </p>
                        <p>
                          차이 {signedPP(w.diffPP)} ·{' '}
                          {w.ratio === null ? '생존 쪽 0건' : `비 ${times(w.ratio)}`}
                        </p>
                        {s.criterionEffect ? (
                          <p className="text-gray-1">2초와 5초 기준의 신호가 다릅니다</p>
                        ) : null}
                      </div>,
                    )
                  }
                  onPointerLeave={tip.hide}
                >
                  <span
                    className="truncate text-(length:--font-size-body) font-semibold text-ink"
                    title={s.abilityId}
                  >
                    {s.ability}
                  </span>
                  <Bars w={w} />
                  {/* Badge and the criterion note share one line, so rows never stack them. */}
                  <span className="flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap">
                    {stateBadge(s, win)}
                    {s.criterionEffect ? (
                      <span className="text-(length:--font-size-caption) font-medium text-gray-1">
                        2초·5초 다름
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          {diff.length > 0 ? (
            <p className="mt-1 text-(length:--font-size-caption) leading-[13px] font-semibold text-gray-1">
              {diff.map((s) => s.ability).join(', ')}: 2초와 5초 기준에서 점검 신호가 다르게
              나타납니다. 시간 기준에 따라 함께 나타나는 정도가 달라집니다.
            </p>
          ) : null}
        </div>
      )}
      {tip.node}
    </Panel>
  );
}
