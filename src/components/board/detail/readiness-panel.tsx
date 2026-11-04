'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { H1Condition, H1Readiness } from '@/types/monsters';

import { useChartTooltip } from '../shell/chart-tooltip';
import { Panel } from '../shell/panel';
import { LegendItem } from '../shell/panel-header';
import { useTween } from '../shell/use-tween';
import type { ReadinessPanelProps } from './contracts';
import { DetailMotion, EASE, SLOW } from './detail-motion';
import { num, pct, shownPP, times } from './format';
import { SignalBadge } from './signal-badge';

const CONDITIONS: { key: H1Condition; label: string; meaning: string }[] = [
  { key: 'lowLevel', label: '저레벨', meaning: '처치 교전 레벨 중앙값보다 낮은 레벨' },
  { key: 'noWeapon', label: '무기 없음', meaning: '무기 없이 교전' },
  { key: 'woodenWeapon', label: '나무 무기', meaning: '나무 등급 무기로 교전' },
  { key: 'noArmor', label: '방어구 없음', meaning: '방어구 없이 교전' },
];

/** Columns of a dumbbell row; the scale row and the gridlines use the same grid to line up. */
const ROW_GRID = 'grid grid-cols-[72px_minmax(0,1fr)_140px_40px_68px] gap-x-(--space-dumbbell-gap)';
/** Shared x scale of the dumbbells (share of deaths / of kills, 0–100%). */
const TICKS = [0, 0.25, 0.5, 0.75, 1];

/** Values that change on a filter change slide instead of jumping. */
const SLIDE = `left ${SLOW} ${EASE}, width ${SLOW} ${EASE}`;

type Show = (e: { clientX: number; clientY: number }, c: ReactNode) => void;

interface DumbbellRowProps {
  label: string;
  meaning: string;
  row: H1Readiness | undefined;
  totalDeaths: number;
  show: Show;
  hide: () => void;
}

function DumbbellRow({ label, meaning, row, totalDeaths, show, hide }: DumbbellRowProps) {
  const short = !row || row.state === 'unk';
  const tipBody = (
    <div>
      <p className="font-semibold">
        {label} <span className="font-normal text-gray-1">· {meaning}</span>
      </p>
      {row ? (
        <>
          <p>
            사망자 중 {pct(row.dead)} ({num(row.deadN)}/{num(totalDeaths)}건)
          </p>
          <p>
            처치 교전 중 {pct(row.win)}
            {row.winN !== undefined && row.winTotal !== undefined
              ? ` (${num(row.winN)}/${num(row.winTotal)}건)`
              : ''}
          </p>
          <p>
            차이 {shownPP(row.win, row.dead)}
            {row.ratio === null ? '' : ` · 조건 교전 사망률 ${times(row.ratio)}`}
          </p>
          <p className="text-gray-1">조건 교전 {num(row.encN)}건</p>
          {short ? <p className="text-gray-1">표본 부족: 판정하지 않습니다</p> : null}
        </>
      ) : (
        <p className="text-gray-1">기록 없음</p>
      )}
    </div>
  );
  // Both dots and the connector come from one tween of (win, dead), so the bar's ends sit on
  // the dots in every frame (CSS left/width transitions could drift apart).
  const [win, dead] = useTween([row?.win ?? 0, row?.dead ?? 0]);
  const lo = Math.min(win, dead);
  const hi = Math.max(win, dead);
  return (
    <div
      role="listitem"
      className={cn(ROW_GRID, 'items-center')}
      onPointerMove={(e) => show(e, tipBody)}
      onPointerLeave={hide}
    >
      <span className="text-(length:--font-size-body) leading-[17px] font-semibold text-ink">
        {label}
      </span>
      <div className="relative h-3" aria-hidden>
        <div className="absolute top-[5.5px] right-0 left-0 h-px bg-chart-track" />
        {row && !short ? (
          <>
            <div
              data-dumbbell="bar"
              className="board-slide-w board-first absolute top-[calc(6px-var(--size-dumbbell-line)/2)] h-(--size-dumbbell-line) rounded-full bg-chart-comparison"
              style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }}
            />
            <span
              data-dumbbell="win"
              className="board-slide board-first absolute -top-px size-(--size-dumbbell-dot) -translate-x-1/2 rounded-full bg-chart-survival"
              style={{ left: `${win * 100}%` }}
            />
            <span
              data-dumbbell="dead"
              className="board-slide board-first absolute -top-px size-(--size-dumbbell-dot) -translate-x-1/2 rounded-full bg-chart-death"
              style={{ left: `${dead * 100}%` }}
            />
          </>
        ) : null}
      </div>
      <span className="text-(length:--font-size-label) font-medium whitespace-nowrap text-gray-1 tabular-nums">
        {row && !short ? (
          <>
            처치자 <span className="text-ink">{pct(row.win)}</span> → 사망자{' '}
            <span className="font-semibold text-ink">{pct(row.dead)}</span>
          </>
        ) : (
          <>표본 부족{row ? ` (조건 교전 ${num(row.encN)}건)` : ''}</>
        )}
      </span>
      <span className="text-right text-(length:--font-size-body-sm) font-semibold text-ink tabular-nums">
        {row && !short ? shownPP(row.win, row.dead) : ''}
      </span>
      <span className="flex justify-end">
        {row?.state === 'yes' ? <SignalBadge tone="danger">점검 신호</SignalBadge> : null}
      </span>
    </div>
  );
}

interface ShareBarProps {
  title: string;
  /** Label of the count, e.g. "사망" → "12/40건". */
  n: number;
  total: number;
  share: number;
  sampleShort: boolean;
  unit: string;
  tip: ReactNode;
  fill: 'death' | 'actual';
  className?: string;
  show: Show;
  hide: () => void;
}

// Figma 38:564/38:560: 16 SemiBold heading, then a full-width ×25 bar 12px under it.
function ShareBar({
  title,
  n,
  total,
  share,
  sampleShort,
  unit,
  tip,
  fill,
  className,
  show,
  hide,
}: ShareBarProps) {
  const empty = !sampleShort && n === 0;
  return (
    <div className={className}>
      <div className="flex h-[19px] w-full items-baseline justify-between">
        <h3 className="text-(length:--font-size-subtitle) leading-[19px] font-semibold text-ink">
          {title}
        </h3>
        <span className="text-(length:--font-size-label) leading-[19px] font-medium text-gray-1 tabular-nums">
          {sampleShort ? (
            `표본 부족 (${unit} ${num(total)}건)`
          ) : (
            <>
              <span className="text-ink">
                {num(n)}/{num(total)}
              </span>
              건 · <span className="font-semibold text-ink">{pct(share)}</span>
            </>
          )}
        </span>
      </div>
      {/* Every share runs on the same light track; a zero share puts a short stub at 0 on it
          (with the "0/n건 · 0%" label above) instead of a fill. */}
      <div
        role="img"
        aria-label={
          sampleShort
            ? `${title}: 표본 부족`
            : `${title}: ${unit} ${num(total)}건 중 ${num(n)}건, ${pct(share)}`
        }
        className="mt-2.5 h-(--size-bar-share) w-full overflow-hidden rounded-mark bg-chart-track-bar"
        onPointerMove={(e) => show(e, tip)}
        onPointerLeave={hide}
      >
        {empty ? (
          <div aria-hidden className="h-full w-(--size-bar-zero-stub) rounded-mark bg-gray-2" />
        ) : null}
        {sampleShort || empty ? null : (
          <div
            className={cn(
              'board-grow board-first h-full rounded-mark',
              fill === 'death' ? 'bg-chart-death' : 'bg-chart-actual',
            )}
            style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%`, transition: SLIDE }}
          />
        )}
      </div>
    </div>
  );
}

// Figma 38:463 / 38:607 (fills its box, 360 tall): readiness dumbbell ×139 at 16/54, then two
// share bars. Everything takes the panel's inner width.
export function ReadinessPanel({ h1, aux1, aux2 }: ReadinessPanelProps) {
  const tip = useChartTooltip();
  const byKey = new Map(h1.map((r) => [r.condition, r]));
  const totalDeaths = aux1.deaths;

  return (
    <Panel
      title="준비 조건별 비중"
      className="h-full pb-(--space-panel-bottom)"
      enter={1}
      meta={
        <>
          사망 <span className="text-ink">{num(totalDeaths)}건</span> 중
        </>
      }
      legend={
        <>
          <LegendItem
            swatch={
              <span
                aria-hidden
                className="size-(--size-legend-dot) rounded-full bg-chart-survival"
              />
            }
          >
            처치 교전
          </LegendItem>
          <LegendItem
            swatch={
              <span aria-hidden className="size-(--size-legend-dot) rounded-full bg-chart-death" />
            }
          >
            사망
          </LegendItem>
        </>
      }
      info={
        <>
          {CONDITIONS.map((c) => (
            <p key={c.key}>
              <span className="font-semibold">{c.label}</span>{' '}
              <span className="text-gray-1">· {c.meaning}</span>
            </p>
          ))}
          <p className="mt-1">
            <span className="font-semibold">반격하지 못한 사망</span>{' '}
            <span className="text-gray-1">· 한 번도 치지 못하고 사망한 경우</span>
          </p>
          <p>
            <span className="font-semibold">한 번에 큰 피해를 받은 교전</span>{' '}
            <span className="text-gray-1">· 가장 큰 한 번의 피해가 최대 HP 기준값 이상인 교전</span>
          </p>
        </>
      }
    >
      <DetailMotion />
      {/* One x scale for every dumbbell row: tick labels on top, light gridlines through all
          rows, both in the same column of the same grid as the dots, so they line up exactly. */}
      <div aria-hidden className={cn(ROW_GRID, 'mt-3 h-[14px]')}>
        <div className="relative col-start-2">
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2 text-(length:--font-size-caption) leading-[14px] font-medium text-gray-1 tabular-nums"
              style={{ left: `${t * 100}%` }}
            >
              {pct(t)}
            </span>
          ))}
        </div>
      </div>
      <div className="relative mt-1">
        <div aria-hidden className={cn(ROW_GRID, 'pointer-events-none absolute inset-0')}>
          <div className="relative col-start-2">
            {TICKS.map((t) => (
              <span
                key={t}
                className="absolute inset-y-0 w-px -translate-x-1/2 bg-chart-guide"
                style={{ left: `${t * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div
          role="list"
          aria-label="준비 조건별 사망자와 처치 교전 비중"
          className="relative grid h-[139px] w-full grid-rows-4"
        >
          {CONDITIONS.map((c) => (
            <DumbbellRow
              key={c.key}
              label={c.label}
              meaning={c.meaning}
              row={byKey.get(c.key)}
              totalDeaths={totalDeaths}
              show={tip.show}
              hide={tip.hide}
            />
          ))}
        </div>
      </div>
      {/* The two share bars sit at the bottom (space.panel-bottom under the last one). */}
      <ShareBar
        className="mt-auto pt-3"
        title="반격하지 못한 사망"
        n={aux1.unanswered}
        total={aux1.deaths}
        share={aux1.unansweredShare}
        sampleShort={aux1.sampleShort}
        unit="사망"
        fill="death"
        show={tip.show}
        hide={tip.hide}
        tip={
          <div>
            <p className="font-semibold">반격하지 못한 사망</p>
            <p className="text-gray-1">한 번도 치지 못하고 사망한 경우</p>
            <p>
              사망 {num(aux1.deaths)}건 중 {num(aux1.unanswered)}건
              {aux1.sampleShort ? ' · 표본 부족' : ` (${pct(aux1.unansweredShare)})`}
            </p>
          </div>
        }
      />
      <ShareBar
        className="mt-5"
        title="한 번에 큰 피해를 받은 교전"
        n={aux2.bigHit}
        total={aux2.hitEnc}
        share={aux2.bigHitShare}
        sampleShort={aux2.sampleShort}
        unit="맞은 교전"
        fill="actual"
        show={tip.show}
        hide={tip.hide}
        tip={
          <div>
            <p className="font-semibold">한 번에 큰 피해를 받은 교전</p>
            <p className="text-gray-1">가장 큰 한 번의 피해가 최대 HP 기준값 이상인 교전</p>
            <p>
              맞은 교전 {num(aux2.hitEnc)}건 중 {num(aux2.bigHit)}건
              {aux2.sampleShort ? ' · 표본 부족' : ` (${pct(aux2.bigHitShare)})`}
            </p>
          </div>
        }
      />
      {tip.node}
    </Panel>
  );
}
