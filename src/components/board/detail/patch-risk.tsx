'use client';

import { useState, type ReactNode } from 'react';

import { FONT_SIZE, OPACITY, RADIUS, SIZE, STROKE } from '@/styles/tokens';
import type { DailyPoint, PatchInfo } from '@/types/board';
import type { H2Patch, H2Period } from '@/types/monsters';

import { textWidth } from '../main/focus-scatter-geom';
import { BoardSelect } from '../shell/board-select';
import { useChartTooltip } from '../shell/chart-tooltip';
import { EmptyState } from '../shell/empty-state';
import { Panel } from '../shell/panel';
import { LegendItem, LineSwatch } from '../shell/panel-header';
import { useTween } from '../shell/use-tween';
import type { PatchRiskProps } from './contracts';
import { DetailMotion, EASE, SLOW } from './detail-motion';
import { kstDay, kstDayFraction, md, num, round2, times } from './format';
import { SignalBadge } from './signal-badge';

type Show = (e: { clientX: number; clientY: number }, c: ReactNode) => void;

const DAY_MS = 24 * 60 * 60 * 1000;
const dayIndex = (day: string, first: string) => (Date.parse(day) - Date.parse(first)) / DAY_MS;
const risk = (p: { danger: number; enc: number }) => (p.enc > 0 ? (p.danger / p.enc) * 100 : 0);

/** 0, 2, 5, 10, 20, 50 ... ceiling for the y axis. */
const niceCeil = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = [1, 2, 5, 10].find((s) => s * p >= v) ?? 10;
  return m * p;
};

const patchOption = (p: PatchInfo) => `${md(kstDay(p.ts))} patch`;

// ---- Daily trend ---------------------------------------------------------------------------

/** Panel padding (16 + 16), the gap between trend and ratio, and the ratio column. */
const PANEL_PAD = 32;
const COL_GAP = 28;
const SIDE_W = 340;
const M = { l: 36, r: 14, t: 18, b: 22 };
/** Days with fewer encounters than this are drawn faint (hollow point, light line). */
const THIN_ENC = 10;

interface TrendProps {
  trend: DailyPoint[];
  patch: PatchInfo | undefined;
  h2: H2Patch | undefined;
  /** The trend is filtered by picked flow cells. */
  picked: boolean;
  /** SVG width (what the ratio column leaves in the panel). */
  width: number;
  /** SVG height (226 on changed monsters, smaller on unchanged ones). */
  height: number;
  show: Show;
  hide: () => void;
}

interface Avg {
  value: number;
  events: number;
  enc: number;
}

const periodAvg = (p: H2Period): Avg => ({ value: p.risk100, events: p.events, enc: p.enc });
const sumAvg = (pts: DailyPoint[]): Avg | null => {
  const enc = pts.reduce((s, p) => s + p.enc, 0);
  const events = pts.reduce((s, p) => s + p.danger, 0);
  return enc > 0 ? { value: (events / enc) * 100, events, enc } : null;
};

interface TrendSummary {
  before: Avg | null;
  after: Avg | null;
  /** Some plotted day has fewer than THIN_ENC encounters (hollow point, faint line). */
  anyThin: boolean;
}

/** The before/after averages of the patch (when it falls inside the trend) and the thin-day flag. */
function summarize(trend: DailyPoint[], patch: PatchInfo | undefined, h2: H2Patch | undefined) {
  const days = [...trend].sort((a, b) => a.day.localeCompare(b.day));
  const out: TrendSummary = {
    before: null,
    after: null,
    anyThin: days.some((d) => d.enc > 0 && d.enc < THIN_ENC),
  };
  if (!patch || days.length === 0) return out;
  const first = days[0].day;
  const span = Math.max(1, dayIndex(days[days.length - 1].day, first) + 1);
  const idx = dayIndex(kstDay(patch.ts), first) + kstDayFraction(patch.ts);
  if (idx < 0 || idx > span) return out;
  const patchDay = kstDay(patch.ts);
  out.before = h2 ? periodAvg(h2.before) : sumAvg(days.filter((d) => d.day < patchDay));
  out.after = h2 ? periodAvg(h2.after) : sumAvg(days.filter((d) => d.day > patchDay));
  return out;
}

const avgText = (b: Avg, a: Avg) =>
  `평균 패치 전 ${b.value.toFixed(1)} (${num(b.events)}/${num(b.enc)}) → 패치 후 ${a.value.toFixed(1)} (${num(a.events)}/${num(a.enc)})`;

/** Where an average label is drawn. */
interface Spot {
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

function Trend({ trend, patch, h2, picked, width: TW, height: TH, show, hide }: TrendProps) {
  // Series key, thin-day key and the average key are in the panel header legend; the averages'
  // values are direct labels on their lines.
  const days = [...trend].sort((a, b) => a.day.localeCompare(b.day));
  const first = days[0].day;
  const span = Math.max(1, dayIndex(days[days.length - 1].day, first) + 1);
  const innerW = TW - M.l - M.r;
  const innerH = TH - M.t - M.b;
  const xAt = (idx: number) => round2(M.l + (idx / span) * innerW);
  const xDay = (day: string) => xAt(dayIndex(day, first) + 0.5);

  const patchIdx = patch ? dayIndex(kstDay(patch.ts), first) + kstDayFraction(patch.ts) : null;
  const patchInRange = patchIdx !== null && patchIdx >= 0 && patchIdx <= span;
  const patchX = patchInRange && patchIdx !== null ? xAt(patchIdx) : null;

  const { before, after } = summarize(trend, patch, h2);

  const maxV = Math.max(...days.map(risk), before?.value ?? 0, after?.value ?? 0);
  const yMax = niceCeil(maxV * 1.1);
  const yAt = (v: number) => round2(M.t + innerH - (v / yMax) * innerH);
  // Every day's y, the two average levels and the patch x glide in one tween, and the line, its
  // points, the solid segments and the average lines are all drawn from those same numbers, so
  // they stay joined while they move.
  const base = yAt(0);
  const motion = useTween([
    ...days.map((d) => (d.enc > 0 ? yAt(risk(d)) : base)),
    before ? yAt(before.value) : base,
    after ? yAt(after.value) : base,
    patchX ?? M.l,
  ]);
  const yOf = new Map(days.map((d, i) => [d.day, round2(motion[i])]));
  const beforeY = round2(motion[days.length]);
  const afterY = round2(motion[days.length + 1]);
  const patchXT = patchX === null ? null : round2(motion[days.length + 2]);
  const pts = days.filter((d) => d.enc > 0);
  const yDay = (d: DailyPoint) => yOf.get(d.day) ?? base;
  const xy = (d: DailyPoint) => `${xDay(d.day)},${yDay(d)}`;
  const line = pts.map(xy).join(' ');
  const thin = (d: DailyPoint) => d.enc < THIN_ENC;
  const anyThin = pts.some(thin);
  // With thin days the whole line is light and only segments between two solid days are full.
  const solid = pts
    .slice(1)
    .map((d, i) => [pts[i], d] as const)
    .filter(([p, q]) => !thin(p) && !thin(q))
    .map(([p, q]) => `M${xy(p)} L${xy(q)}`)
    .join(' ');
  const labelEvery = Math.ceil(days.length / 11);
  const beforeD = patchXT !== null && before ? `M${M.l},${beforeY} H${patchXT}` : null;
  // Average labels go at an end of their own segment, above or below the dashed line: the first
  // of right-above, right-below, left-above, left-below whose box clears every point and the
  // trend line (sampled along each segment), so a label never sits on the data.
  const beforeText = before ? `패치 전 평균 ${before.value.toFixed(1)}` : '';
  const afterText = after ? `패치 후 평균 ${after.value.toFixed(1)}` : '';
  const pad = STROKE.point.trend + 2;
  const samples = pts.flatMap((d, i) => {
    const x = xDay(d.day);
    const y = yDay(d);
    const next = pts[i + 1];
    if (!next) return [[x, y]];
    const nx = xDay(next.day);
    const ny = yDay(next);
    const n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / 3));
    return Array.from({ length: n }, (_, k) => [x + ((nx - x) * k) / n, y + ((ny - y) * k) / n]);
  });
  const clear = (x1: number, x2: number, y1: number, y2: number) =>
    !samples.some(([px, py]) => px + pad > x1 && px - pad < x2 && py + pad > y1 && py - pad < y2);
  const place = (text: string, lineY: number, left: number, right: number): Spot => {
    const w = textWidth(text, FONT_SIZE.caption);
    const top = M.t + FONT_SIZE.caption;
    const bottom = M.t + innerH - 2;
    // Nearest first: just above or below the line, then a row further out each way.
    const ys = [-5, FONT_SIZE.caption + 3, -5 - 14, FONT_SIZE.caption + 3 + 14, -5 - 28]
      .map((dy) => lineY + dy)
      .filter((y) => y >= top && y <= bottom);
    const spots: Spot[] = ys.flatMap((y) => [
      { x: right, y, anchor: 'end' as const },
      { x: left, y, anchor: 'start' as const },
    ]);
    const box = (sp: Spot) => {
      const x1 = sp.anchor === 'end' ? sp.x - w : sp.x;
      return [x1, x1 + w, sp.y - FONT_SIZE.caption, sp.y + 2] as const;
    };
    return (
      spots.find((sp) => clear(...box(sp))) ?? spots[0] ?? { x: right, y: lineY - 5, anchor: 'end' }
    );
  };
  const beforeSpot = patchXT === null ? null : place(beforeText, beforeY, M.l + 4, patchXT - 6);
  const afterSpot = patchXT === null ? null : place(afterText, afterY, patchXT + 6, TW - M.r - 4);
  const afterD = patchXT !== null && after ? `M${patchXT},${afterY} H${TW - M.r}` : null;

  return (
    <div className="flex flex-col" style={{ width: TW }}>
      <svg
        width={TW}
        height={TH}
        viewBox={`0 0 ${TW} ${TH}`}
        role="img"
        aria-label={`100교전당 위험 사건 일별 추이${picked ? ' (선택한 흐름 기준)' : ''}${
          before && after
            ? `, 패치 전 ${before.value.toFixed(1)}, 패치 후 ${after.value.toFixed(1)}`
            : ''
        }`}
        className="overflow-visible"
      >
        {[0, yMax / 2, yMax].map((t) => (
          <g key={t}>
            <line
              x1={M.l}
              x2={TW - M.r}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="var(--chart-track)"
              strokeOpacity={t === 0 ? 1 : OPACITY.line.grid}
              strokeWidth={STROKE.width.thin}
            />
            <text
              x={M.l - 6}
              y={yAt(t) + 4}
              textAnchor="end"
              fontSize={FONT_SIZE.caption}
              fill="var(--gray-1)"
              className="tabular-nums"
            >
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % labelEvery === 0 ? (
            <text
              key={d.day}
              x={xDay(d.day)}
              y={TH - 6}
              textAnchor="middle"
              fontSize={FONT_SIZE.caption}
              fill="var(--gray-1)"
              className="tabular-nums"
            >
              {md(d.day)}
            </text>
          ) : null,
        )}

        {/* Before/after averages of the selected patch; they glide (tween) when it changes. */}
        {beforeD ? (
          <path
            data-avg="before"
            d={beforeD}
            fill="none"
            stroke="var(--chart-comparison)"
            strokeWidth={STROKE.width.regular}
            strokeDasharray="5 3"
          />
        ) : null}
        {afterD ? (
          <path
            data-avg="after"
            d={afterD}
            fill="none"
            stroke="var(--chart-comparison)"
            strokeWidth={STROKE.width.regular}
            strokeDasharray="5 3"
          />
        ) : null}
        {beforeD && before ? (
          <text
            x={beforeSpot?.x}
            y={beforeSpot?.y}
            textAnchor={beforeSpot?.anchor}
            fontSize={FONT_SIZE.caption}
            fontWeight={600}
            fill="var(--chart-comparison)"
            stroke="var(--panel)"
            strokeWidth={STROKE.width.halo}
            strokeLinejoin="round"
            className="tabular-nums"
            style={{ paintOrder: 'stroke fill' }}
          >
            {beforeText}
          </text>
        ) : null}
        {afterD && after ? (
          <text
            x={afterSpot?.x}
            y={afterSpot?.y}
            textAnchor={afterSpot?.anchor}
            fontSize={FONT_SIZE.caption}
            fontWeight={600}
            fill="var(--chart-comparison)"
            stroke="var(--panel)"
            strokeWidth={STROKE.width.halo}
            strokeLinejoin="round"
            className="tabular-nums"
            style={{ paintOrder: 'stroke fill' }}
          >
            {afterText}
          </text>
        ) : null}
        {patchXT !== null && patch ? (
          <g data-patch-x={patchXT} transform={`translate(${patchXT} 0)`}>
            <line
              x1={0}
              x2={0}
              y1={M.t - 6}
              y2={M.t + innerH}
              stroke="var(--ink)"
              strokeWidth={STROKE.width.regular}
              strokeDasharray="4 3"
            />
            <text x={5} y={M.t - 1} fontSize={FONT_SIZE.caption} fontWeight={600} fill="var(--ink)">
              {md(kstDay(patch.ts))} 패치
            </text>
          </g>
        ) : null}

        <polyline
          data-trend-line
          points={line}
          pathLength={1}
          className="board-draw board-first"
          fill="none"
          stroke="var(--chart-actual)"
          strokeOpacity={anyThin ? OPACITY.dim.line : 1}
          strokeWidth={STROKE.width.bold}
          strokeLinejoin="round"
        />
        {anyThin && solid ? (
          <path
            d={solid}
            className="board-fade board-first"
            fill="none"
            stroke="var(--chart-actual)"
            strokeWidth={STROKE.width.bold}
            strokeLinecap="round"
          />
        ) : null}
        <g className="board-fade board-first">
          {pts.map((d) =>
            thin(d) ? (
              <circle
                key={d.day}
                data-trend-point
                cx={xDay(d.day)}
                cy={yDay(d)}
                r={STROKE.point.trendThin}
                fill="var(--panel)"
                stroke="var(--chart-actual)"
                strokeOpacity={OPACITY.point.thin}
                strokeWidth={STROKE.width.regular}
              />
            ) : (
              <circle
                key={d.day}
                data-trend-point
                cx={xDay(d.day)}
                cy={yDay(d)}
                r={STROKE.point.trend}
                fill="var(--chart-actual)"
              />
            ),
          )}
        </g>

        {/* Hover bands, one per day. */}
        {days.map((d) => (
          <rect
            key={d.day}
            x={xDay(d.day) - innerW / span / 2}
            y={M.t}
            width={innerW / span}
            height={innerH}
            fill="transparent"
            onPointerMove={(e) =>
              show(
                e,
                <div>
                  <p className="font-semibold">{md(d.day)}</p>
                  {d.enc > 0 ? (
                    <>
                      <p>100교전당 위험 사건 {risk(d).toFixed(1)}</p>
                      <p>
                        위험 사건 {num(d.danger)}/{num(d.enc)}교전 · 사망 {num(d.deaths)}건
                      </p>
                      {thin(d) ? (
                        <p className="text-gray-1">교전 {THIN_ENC}건 미만: 흔들림이 큽니다</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-gray-1">교전 없음</p>
                  )}
                </div>,
              )
            }
            onPointerLeave={hide}
          />
        ))}
      </svg>
    </div>
  );
}

// ---- Same-condition ratio (log axis) --------------------------------------------------------

const RW = 330;
const RH = 58;
/** The log axis needs positive, finite ends: 0 or ∞ from the batch are pinned here. */
const R_MIN = 0.01;
const R_MAX = 100;
const clampR = (v: number) => (Number.isNaN(v) ? 1 : Math.max(R_MIN, Math.min(R_MAX, v)));
/** 2-decimal ratio text that survives 0 and ∞ ("0.00", "∞"). */
const r2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '∞');

interface RatioAxisProps {
  or: number;
  lo: number;
  hi: number;
}

function RatioAxis({ or: rawOr, lo: rawLo, hi: rawHi }: RatioAxisProps) {
  const or = clampR(rawOr);
  const lo = clampR(Math.min(rawLo, rawOr));
  const hi = clampR(Math.max(rawHi, rawOr));
  const ticks = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 10, 25, 50, 100];
  const dLo = Math.min(0.5, lo / 1.2);
  const dHi = Math.max(2, hi * 1.2);
  const visible = ticks.filter((t) => t >= dLo && t <= dHi);
  // Keep at most ~7 labels on wide ranges.
  const step = Math.ceil(visible.length / 7);
  const labels = visible.filter((t, i) => t === 1 || i % step === 0);
  const l = Math.log(dLo);
  const r = Math.log(dHi);
  const xAt = (v: number) => round2(6 + ((Math.log(v) - l) / (r - l)) * (RW - 12));
  const y = 22;
  return (
    <svg
      width={RW}
      height={RH}
      viewBox={`0 0 ${RW} ${RH}`}
      role="img"
      aria-label={`같은 조건 위험 배수 ${r2(rawOr)}배, 범위 ${r2(rawLo)}에서 ${r2(rawHi)}`}
    >
      <line
        x1={6}
        x2={RW - 6}
        y1={y}
        y2={y}
        stroke="var(--chart-track)"
        strokeWidth={STROKE.width.thin}
      />
      <rect
        x={xAt(lo)}
        y={y - SIZE.bar.interval / 2}
        width={Math.max(2, xAt(hi) - xAt(lo))}
        height={SIZE.bar.interval}
        rx={RADIUS.mark}
        className="board-mark"
        style={{ x: xAt(lo), width: Math.max(2, xAt(hi) - xAt(lo)) }}
        fill="var(--chart-comparison)"
      />
      <g className="board-mark" style={{ transform: `translateX(${xAt(1)}px)` }}>
        <line
          x1={0}
          x2={0}
          y1={y - 14}
          y2={y + 14}
          stroke="var(--ink)"
          strokeWidth={STROKE.width.regular}
          strokeDasharray="3 2"
        />
      </g>
      <circle
        cx={xAt(or)}
        cy={y}
        r={STROKE.point.estimate}
        className="board-mark"
        style={{ cx: xAt(or) }}
        fill="var(--chart-actual)"
      />
      {labels.map((t) => (
        <g key={t} className="board-mark" style={{ transform: `translateX(${xAt(t)}px)` }}>
          <text
            x={0}
            y={RH - 4}
            textAnchor="middle"
            fontSize={FONT_SIZE.caption}
            fontWeight={t === 1 ? 600 : 500}
            fill={t === 1 ? 'var(--ink)' : 'var(--gray-1)'}
            className="tabular-nums"
          >
            {t}배
          </text>
        </g>
      ))}
    </svg>
  );
}

interface SidePanelProps {
  patch: PatchInfo | undefined;
  h2: H2Patch | undefined;
  picked: boolean;
  /** 240-tall panel (unchanged monster): no hint line, before/after on one line. */
  compact: boolean;
  show: Show;
  hide: () => void;
}

const HINT = '레벨·장비·던전 단계를 맞춘 뒤 패치 후 ÷ 패치 전 · 1배 = 차이 없음';

const periodLine = (label: string, p: H2Period) =>
  `${label} ${num(p.events)}/${num(p.enc)}교전 (100교전당 ${p.risk100.toFixed(1)})`;

interface PeriodLineProps {
  label: string;
  p: H2Period;
}

/** periodLine with the numbers in ink and the words in gray. */
function PeriodLine({ label, p }: PeriodLineProps) {
  return (
    <p>
      {label}{' '}
      <span className="text-ink">
        {num(p.events)}/{num(p.enc)}
      </span>
      교전 (100교전당 <span className="text-ink">{p.risk100.toFixed(1)}</span>)
    </p>
  );
}

function SidePanel({ patch, h2, picked, compact, show, hide }: SidePanelProps) {
  if (!patch) return <EmptyState>패치 기록 없음</EmptyState>;
  const sc = h2?.sameCondition ?? null;
  let stateText: string | null = null;
  if (!h2) stateText = '이 패치의 전후 기록 없음';
  else if (!sc && h2.state === 'sample_short') stateText = '표본 부족';
  else if (!sc && h2.state === 'no_comparator') stateText = '비교군 없음';
  else if (!sc) stateText = '배수 계산 불가 (모형 수렴 실패)';

  return (
    <div className="flex flex-col" style={{ width: SIDE_W }}>
      {/* What the ratio means (HINT) is in the panel's ⓘ. */}
      <h3 className="text-(length:--font-size-label) leading-[14px] font-semibold text-gray-1">
        같은 조건 위험 배수
      </h3>
      {sc ? (
        <div
          className="mt-2"
          onPointerMove={(e) =>
            show(
              e,
              <div>
                <p className="font-semibold">같은 조건 위험 배수 {r2(sc.or)}배</p>
                <p>
                  95% 범위 {r2(sc.lo)}–{r2(sc.hi)}배
                </p>
                {h2 ? (
                  <>
                    <p>{periodLine('패치 전', h2.before)}</p>
                    <p>{periodLine('패치 후', h2.after)}</p>
                  </>
                ) : null}
                <p className="text-gray-1">범위가 1배를 넘나들면 차이를 말하기 어렵습니다</p>
              </div>,
            )
          }
          onPointerLeave={hide}
        >
          <p className="text-(length:--font-size-heading) leading-6 font-semibold text-ink tabular-nums">
            {r2(sc.or)}배{' '}
            <span className="text-(length:--font-size-label) font-medium text-gray-1">
              (95% 범위{' '}
              <span className="text-ink">
                {r2(sc.lo)}–{r2(sc.hi)}
              </span>
              )
            </span>
          </p>
          <RatioAxis or={sc.or} lo={sc.lo} hi={sc.hi} />
        </div>
      ) : (
        <p className="mt-3 text-(length:--font-size-subtitle) leading-5 font-semibold text-gray-1">
          {stateText}
        </p>
      )}
      {h2 ? (
        <div className="mt-2 text-(length:--font-size-label) leading-[18px] font-medium text-gray-1 tabular-nums">
          {compact ? (
            <p>
              위험 사건{' '}
              <span className="text-ink">
                {num(h2.before.events)}/{num(h2.before.enc)} → {num(h2.after.events)}/
                {num(h2.after.enc)}
              </span>{' '}
              (100교전당{' '}
              <span className="text-ink">
                {h2.before.risk100.toFixed(1)} → {h2.after.risk100.toFixed(1)}
              </span>
              )
            </p>
          ) : (
            <>
              <PeriodLine label="패치 전 위험 사건" p={h2.before} />
              <PeriodLine label="패치 후 위험 사건" p={h2.after} />
            </>
          )}
          {picked ? <p>선택 조건과 관계없이 전체 교전 기준</p> : null}
          {h2.netOfComparator !== null ? (
            <p>
              비교군 대비 <span className="text-ink">{times(h2.netOfComparator)}</span>
            </p>
          ) : null}
          {h2.state === 'sample_short' && h2.groupReference !== null ? (
            <p>
              소속 묶음 참고값 <span className="text-ink">{times(h2.groupReference)}</span>
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">
        {h2?.state === 'no_comparator' ? (
          <SignalBadge tone="warning">비교군 확인 필요</SignalBadge>
        ) : null}
        {h2?.intentCheck ? <SignalBadge tone="warning">의도값 확인 필요</SignalBadge> : null}
      </div>
    </div>
  );
}

// ---- Panel ---------------------------------------------------------------------------------

/** Panel heights: Figma 332 for a monster the patch changed, 240 when it did not. */
const H_CHANGED = 332;
const H_UNCHANGED = 240;
/** Trend SVG heights that fill those panels. */
const TH_CHANGED = 262;
const TH_UNCHANGED = 170;

// Figma 38:448 / 38:595: title + patch select (150×30 at 138/9), patch label, trend + ratio.
export function PatchRisk({
  monster,
  patches,
  patchList,
  trend,
  picked,
  width = 1066,
}: PatchRiskProps) {
  const trendW = width - PANEL_PAD - COL_GAP - SIDE_W;
  const tip = useChartTooltip();
  const fallback =
    patchList.find((p) => patches.some((h) => h.patchId === p.id))?.id ?? patchList[0]?.id ?? '';
  const [chosen, setChosen] = useState(fallback);
  // A choice that is not in the current list (new monster or filter) falls back to the default.
  const patchId = patchList.some((p) => p.id === chosen) ? chosen : fallback;
  const patch = patchList.find((p) => p.id === patchId);
  const h2 = patches.find((h) => h.patchId === patchId);
  const changed = patch ? patch.changed.includes(monster) : true;
  const hasTrend = !trend.every((d) => d.enc === 0);
  // Same averages the trend draws (with picked cells they come from the filtered trend).
  const sum = summarize(trend, patch, picked ? undefined : h2);

  return (
    <div
      className="shrink-0"
      style={{
        height: changed ? H_CHANGED : H_UNCHANGED,
        transition: `height ${SLOW} ${EASE}`,
      }}
    >
      <Panel
        title="패치 전후 위험"
        className="h-full overflow-hidden"
        enter={1}
        meta={patch ? patch.label : undefined}
        info={
          <>
            {changed ? null : <p className="mb-1">수치 미변경 · 패치 효과로 해석하지 않음</p>}
            <p>
              <span className="font-semibold">100교전당 위험 사건</span>{' '}
              <span className="text-gray-1">· 사망 + 빈사</span>
            </p>
            {sum.before && sum.after ? (
              <p>
                <span className="font-semibold">평균</span>{' '}
                <span className="text-gray-1">· {avgText(sum.before, sum.after)}</span>
              </p>
            ) : null}
            {sum.anyThin ? (
              <p>
                <span className="font-semibold">속 빈 점</span>{' '}
                <span className="text-gray-1">· 교전 {THIN_ENC}건 미만 (선도 옅게)</span>
              </p>
            ) : null}
            <p className="mt-1">
              <span className="font-semibold">같은 조건 위험 배수</span>{' '}
              <span className="text-gray-1">· {HINT}</span>
            </p>
          </>
        }
        legend={
          hasTrend ? (
            <>
              <LegendItem
                swatch={<LineSwatch color="var(--chart-actual)" width={STROKE.width.bold} />}
              >
                100교전당 위험 사건
              </LegendItem>
              {sum.before && sum.after ? (
                <LegendItem
                  swatch={
                    <LineSwatch
                      color="var(--chart-comparison)"
                      width={STROKE.width.regular}
                      dash="5 3"
                    />
                  }
                >
                  패치 전·후 평균
                </LegendItem>
              ) : null}
              {sum.anyThin ? (
                <LegendItem
                  swatch={
                    <svg
                      aria-hidden
                      width={2 * STROKE.point.trendThin + 2}
                      height={2 * STROKE.point.trendThin + 2}
                      className="shrink-0"
                    >
                      <circle
                        cx={STROKE.point.trendThin + 1}
                        cy={STROKE.point.trendThin + 1}
                        r={STROKE.point.trendThin}
                        fill="var(--panel)"
                        stroke="var(--chart-actual)"
                        strokeOpacity={OPACITY.point.thin}
                        strokeWidth={STROKE.width.regular}
                      />
                    </svg>
                  }
                >
                  교전 {THIN_ENC}건 미만
                </LegendItem>
              ) : null}
            </>
          ) : undefined
        }
        chips={
          changed && !picked ? undefined : (
            <>
              {changed ? null : (
                <SignalBadge
                  tone="warning"
                  className="board-pop board-first"
                  title="수치 미변경 · 패치 효과로 해석하지 않음"
                >
                  수치 미변경
                </SignalBadge>
              )}
              {picked ? (
                <span className="board-pop board-first inline-flex h-5 items-center rounded-pill bg-gray-3 px-1.5 text-(length:--font-size-caption) font-semibold whitespace-nowrap text-ink">
                  선택한 흐름 기준
                </span>
              ) : null}
            </>
          )
        }
        controls={
          patchList.length > 0 ? (
            <BoardSelect
              id="patch-select"
              label="패치 선택"
              value={patchId}
              options={patchList.map((p) => ({ value: p.id, label: patchOption(p) }))}
              onChange={setChosen}
              widthClass="w-[150px]"
            />
          ) : undefined
        }
      >
        <div className="mt-3 flex" style={{ gap: COL_GAP }}>
          <div className="flex shrink-0" style={{ width: trendW }}>
            {!hasTrend ? (
              <EmptyState>{picked ? '선택한 조건의 교전 없음' : '일별 기록 없음'}</EmptyState>
            ) : (
              // With picked flow cells the H2 periods (all encounters) would not match the
              // filtered trend, so the averages come from the trend itself.
              <Trend
                trend={trend}
                patch={patch}
                h2={picked ? undefined : h2}
                picked={picked}
                width={trendW}
                height={changed ? TH_CHANGED : TH_UNCHANGED}
                show={tip.show}
                hide={tip.hide}
              />
            )}
          </div>
          <SidePanel
            patch={patch}
            h2={h2}
            picked={picked}
            compact={!changed}
            show={tip.show}
            hide={tip.hide}
          />
        </div>
        <DetailMotion />
        {tip.node}
      </Panel>
    </div>
  );
}
