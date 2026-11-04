'use client';

import { useState, type ReactNode } from 'react';

import { FONT_SIZE, OPACITY, RADIUS, SIZE, SPACE, STROKE } from '@/styles/tokens';
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
import { DetailMotion } from './detail-motion';
import { kstDay, kstDayFraction, md, num, round2, times } from './format';
import { SignalBadge } from './signal-badge';

type Show = (e: { clientX: number; clientY: number }, c: ReactNode) => void;

const DAY_MS = 24 * 60 * 60 * 1000;
const dayIndex = (day: string, first: string) => (Date.parse(day) - Date.parse(first)) / DAY_MS;
const risk = (p: { danger: number; enc: number }) => (p.enc > 0 ? (p.danger / p.enc) * 100 : 0);

/**
 * Y scale just above the data: a nice step (1, 2, 2.5, 5 × 10ⁿ) for about `count` intervals,
 * and the max is the first step at or above the data max plus a little headroom.
 */
const niceScale = (v: number, count: number): { max: number; step: number } => {
  const top = Math.max(v, 0.1) * 1.05;
  const raw = top / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * p >= raw) ?? 10) * p;
  return { max: Math.ceil(top / step - 1e-9) * step, step };
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
  `패치 전 ${b.value.toFixed(1)} (${num(b.events)}/${num(b.enc)}) → 패치 후 ${a.value.toFixed(1)} (${num(a.events)}/${num(a.enc)})`;

function Trend({ trend, patch, h2, width: TW, height: TH, show, hide }: TrendProps) {
  // Series key, thin-day key and the average key are in the panel header legend; each average's
  // value is a direct label on its own dashed segment (see placeAvg).
  const days = [...trend].sort((a, b) => a.day.localeCompare(b.day));
  const first = days[0].day;
  const span = Math.max(1, dayIndex(days[days.length - 1].day, first) + 1);
  const { before, after } = summarize(trend, patch, h2);
  const beforeText = before ? `패치 전 ${before.value.toFixed(1)}` : '';
  const afterText = after ? `패치 후 ${after.value.toFixed(1)}` : '';
  const innerW = TW - M.l - M.r;
  const innerH = TH - M.t - M.b;
  const xAt = (idx: number) => round2(M.l + (idx / span) * innerW);
  const xDay = (day: string) => xAt(dayIndex(day, first) + 0.5);

  const patchIdx = patch ? dayIndex(kstDay(patch.ts), first) + kstDayFraction(patch.ts) : null;
  const patchInRange = patchIdx !== null && patchIdx >= 0 && patchIdx <= span;
  const patchX = patchInRange && patchIdx !== null ? xAt(patchIdx) : null;

  const maxV = Math.max(...days.map(risk), before?.value ?? 0, after?.value ?? 0);
  // More gridlines when the panel (and so the chart) is tall.
  // The smallest nice max over 3–6 intervals (a tall chart prefers more intervals on a tie).
  const { max: yMax, step: yStep } = [3, 4, 5, 6]
    .map((n) => niceScale(maxV, n))
    .reduce((best, c) => {
      if (c.max < best.max - 1e-9) return c;
      if (Math.abs(c.max - best.max) < 1e-9 && innerH > 300 && c.step < best.step) return c;
      return best;
    });
  const yTicks = Array.from({ length: Math.round(yMax / yStep) + 1 }, (_, k) => k * yStep);
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
  // Average labels sit on their own segment, 4px above the line: 패치 전 ends just left of the
  // patch line, 패치 후 at the right end. A label whose box (+3px) would touch a trend point or
  // segment flips below its line; if the two labels would overlap, the 패치 후 one moves down a
  // line. Both have the panel-colored halo.
  const pad = 3;
  const lineSamples = pts.flatMap((d, i) => {
    const x = xDay(d.day);
    const y = yDay(d);
    const next = pts[i + 1];
    if (!next) return [[x, y]];
    const nx = xDay(next.day);
    const ny = yDay(next);
    const n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / 2));
    return Array.from({ length: n }, (_, k) => [x + ((nx - x) * k) / n, y + ((ny - y) * k) / n]);
  });
  const reach = STROKE.point.trend + STROKE.width.bold / 2 + pad;
  const hits = (x1: number, x2: number, y1: number, y2: number) =>
    lineSamples.some(
      ([px, py]) => px > x1 - reach && px < x2 + reach && py > y1 - reach && py < y2 + reach,
    );
  const capH = FONT_SIZE.caption;
  // Candidates along the label's own segment, from its preferred end leftwards in steps, above
  // then below the line; the first clear one wins (the preferred spot when none is clear).
  const placeAvg = (text: string, right: number, segLeft: number, lineY: number) => {
    // Estimated width plus a fifth, so the box never undercuts the drawn (semibold) text.
    const w = textWidth(text, FONT_SIZE.caption) * 1.2;
    const above = lineY - 4;
    const below = lineY + capH + 2;
    const xs: number[] = [];
    for (let x = right; x - w >= segLeft; x -= capH) xs.push(x);
    if (!xs.length) xs.push(right);
    // Nearest rows first (just above, just below), then one and two rows further out, all inside
    // the plot.
    const ys = [above, below, above - capH - 3, below + capH + 3, above - 2 * (capH + 3)].filter(
      (y) => y - capH >= M.t && y <= M.t + innerH,
    );
    const spots = ys.flatMap((y) => xs.map((x) => ({ x, y })));
    if (!spots.length) spots.push({ x: right, y: above });
    // Glyph box: ascent above the baseline (about the font size) and the descent below it.
    const spot = spots.find((sp) => !hits(sp.x - w, sp.x, sp.y - capH, sp.y + 3)) ?? spots[0];
    return { x: spot.x, y: spot.y, x1: spot.x - w, w };
  };
  const beforeLabel =
    patchXT !== null && before ? placeAvg(beforeText, patchXT - 4, M.l, beforeY) : null;
  let afterLabel =
    patchXT !== null && after ? placeAvg(afterText, TW - M.r, patchXT + 4, afterY) : null;
  if (beforeLabel && afterLabel) {
    const overlapX = beforeLabel.x > afterLabel.x1 && afterLabel.x > beforeLabel.x1;
    if (overlapX && Math.abs(beforeLabel.y - afterLabel.y) < capH + 2) {
      afterLabel = { ...afterLabel, y: beforeLabel.y + capH + 3 };
    }
  }
  const afterD = patchXT !== null && after ? `M${patchXT},${afterY} H${TW - M.r}` : null;

  return (
    <div className="flex flex-col" style={{ width: TW }}>
      <svg
        width={TW}
        height={TH}
        viewBox={`0 0 ${TW} ${TH}`}
        role="img"
        aria-label={`100교전당 위험 사건 일별 추이${
          before && after
            ? `, 패치 전 ${before.value.toFixed(1)}, 패치 후 ${after.value.toFixed(1)}`
            : ''
        }`}
        className="overflow-visible"
      >
        {yTicks.map((t) => (
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
              {Number.isInteger(t) ? t : +t.toFixed(2)}
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
            x={beforeLabel?.x}
            y={beforeLabel ? round2(beforeLabel.y) : undefined}
            textAnchor="end"
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
            x={afterLabel?.x}
            y={afterLabel ? round2(afterLabel.y) : undefined}
            textAnchor="end"
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
          strokeLinecap="round"
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

/** Space under the header before the trend, and under the trend (the panel's bottom padding). */
const BODY_TOP = SPACE.patchBodyTop;
const BODY_BOTTOM = SPACE.patchBodyBottom;
/** Panel height taken by everything but the trend: top padding, header, the gaps around it. */
const TREND_REST = SPACE.panelTop + SIZE.panelHeader + BODY_TOP + BODY_BOTTOM;

// ---- Same-condition ratio (log axis) --------------------------------------------------------

const RW = SIZE.ratioAxis.w;
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
  /** SVG height, size.ratio-axis.h-min … h-max (grows with a tall panel). */
  height: number;
}

function RatioAxis({ or: rawOr, lo: rawLo, hi: rawHi, height: RH }: RatioAxisProps) {
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
  // The axis line sits at the same share of the height at every size (22 of 58 at h-min), and
  // the 1× reference spans most of the space above the tick labels.
  const y = round2(RH * (22 / SIZE.ratioAxis.hMin));
  const refHalf = Math.min(y - 4, RH - y - 16);
  // An end label that would run past the SVG edge is anchored to its tick instead of centred.
  const anchorOf = (t: number): 'start' | 'middle' | 'end' => {
    const half = textWidth(`${t}배`, FONT_SIZE.caption) / 2;
    if (xAt(t) - half < 0) return 'start';
    if (xAt(t) + half > RW) return 'end';
    return 'middle';
  };
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
          y1={y - refHalf}
          y2={y + refHalf}
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
            x={anchorOf(t) === 'start' ? -2 : 0}
            y={RH - 4}
            textAnchor={anchorOf(t)}
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
  /** Height the block has (the trend's): the ratio axis grows into it within its token range. */
  height: number;
  patch: PatchInfo | undefined;
  h2: H2Patch | undefined;
  show: Show;
  hide: () => void;
}

const HINT = '레벨·장비·던전 단계를 맞춘 뒤 패치 후 ÷ 패치 전 · 1배 = 차이 없음';

const periodLine = (label: string, p: H2Period) =>
  `${label} ${num(p.events)}/${num(p.enc)}교전 (100교전당 ${p.risk100.toFixed(1)})`;

/** The block's label is centred on the trend's top gridline (y = M.t in the trend). */
const SIDE_TOP = M.t - 7;
/** Fixed parts of the block besides the axis: label, ratio line, the gaps, one count line. */
const SIDE_FIXED = SIDE_TOP + 14 + 8 + 24 + 8 + 18;
const LINE_H = 18;
const BADGE_ROW = 28;

function SidePanel({ height, patch, h2, show, hide }: SidePanelProps) {
  if (!patch) return <EmptyState>패치 기록 없음</EmptyState>;
  const sc = h2?.sameCondition ?? null;
  let stateText: string | null = null;
  if (!h2) stateText = '이 패치의 전후 기록 없음';
  else if (!sc && h2.state === 'sample_short') stateText = '표본 부족';
  else if (!sc && h2.state === 'no_comparator') stateText = '비교군 없음';
  else if (!sc) stateText = '배수 계산 불가 (모형 수렴 실패)';
  // The axis keeps h-min at the base panel height and grows by a fifth of the extra height a
  // taller panel brings, up to h-max (never more than the block has room for).
  const extraLines =
    (h2?.netOfComparator !== null && h2?.netOfComparator !== undefined ? 1 : 0) +
    (h2?.state === 'sample_short' && h2.groupReference !== null ? 1 : 0);
  const badges = h2?.state === 'no_comparator' || h2?.intentCheck ? BADGE_ROW : 0;
  const room = height - SIDE_FIXED - extraLines * LINE_H - badges;
  const grown = SIZE.ratioAxis.hMin + (height - (SIZE.patchPanel - TREND_REST)) / 5;
  const axisH = Math.round(
    Math.max(SIZE.ratioAxis.hMin, Math.min(SIZE.ratioAxis.hMax, grown, room)),
  );
  return (
    // Anchored to the top: its label lines up with the trend's top gridline, and the parts keep
    // fixed gaps (mt-2). In a tall panel the ratio axis takes some of the extra height
    // (size.ratio-axis.h-min … h-max) so the column reads as one designed block.
    <div className="flex flex-col" style={{ width: SIDE_W, paddingTop: SIDE_TOP }}>
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
          <RatioAxis or={sc.or} lo={sc.lo} hi={sc.hi} height={axisH} />
        </div>
      ) : (
        <p className="mt-3 text-(length:--font-size-subtitle) leading-5 font-semibold text-gray-1">
          {stateText}
        </p>
      )}
      {h2 ? (
        <div className="mt-2 text-(length:--font-size-label) leading-[18px] font-medium text-gray-1 tabular-nums">
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

// Figma 38:448 / 38:595: title + patch select (150×30 at 138/9), patch label, trend + ratio.
export function PatchRisk({
  monster,
  patches,
  patchList,
  trend,
  width = 1066,
  height = SIZE.patchPanel,
}: PatchRiskProps) {
  // The panel is at least size.patch-panel and the trend fills whatever it is given, so the
  // chart always fills the panel and empty states centre in the same box.
  const panelH = Math.max(SIZE.patchPanel, height);
  const TREND_H = panelH - TREND_REST;
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
  // Same averages the trend draws.
  const sum = summarize(trend, patch, h2);

  return (
    <div className="shrink-0" style={{ height: panelH }}>
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
          changed ? undefined : (
            <SignalBadge
              tone="warning"
              className="board-pop board-first"
              title="수치 미변경 · 패치 효과로 해석하지 않음"
            >
              수치 미변경
            </SignalBadge>
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
              widthClass="w-(--size-select-patch)"
            />
          ) : undefined
        }
      >
        <div className="flex" style={{ gap: COL_GAP, marginTop: BODY_TOP, height: TREND_H }}>
          <div className="flex shrink-0" style={{ width: trendW, height: TREND_H }}>
            {!hasTrend ? (
              <EmptyState>일별 기록 없음</EmptyState>
            ) : (
              <Trend
                trend={trend}
                patch={patch}
                h2={h2}
                width={trendW}
                height={TREND_H}
                show={tip.show}
                hide={tip.hide}
              />
            )}
          </div>
          <SidePanel height={TREND_H} patch={patch} h2={h2} show={tip.show} hide={tip.hide} />
        </div>
        <DetailMotion />
        {tip.node}
      </Panel>
    </div>
  );
}
