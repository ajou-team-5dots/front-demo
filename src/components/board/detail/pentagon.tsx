'use client';

import { useState } from 'react';

import { FONT_SIZE, OPACITY, STROKE } from '@/styles/tokens';

import { useChartTooltip } from '../shell/chart-tooltip';
import { Panel } from '../shell/panel';
import { LegendItem, LineSwatch, PanelLegend } from '../shell/panel-header';
import { useTween } from '../shell/use-tween';
import type { PentagonProps } from './contracts';
import { DetailMotion } from './detail-motion';
import { pct, round2 } from './format';
import { SignalBadge } from './signal-badge';

interface AxisMeta {
  label: string;
  /** Plain meaning for the tooltip (계산 명세 4장). */
  meaning: string;
  format: (v: number) => string;
}

// Axis keys from docs/DATA_SPEC.md 5장, labels from the calc spec's 오각형 5축.
const AXES: Record<string, AxisMeta> = {
  race_med: {
    label: '전투 열세도',
    meaning: '맞은 교전의 경주비 중앙값',
    format: (v) => v.toFixed(2),
  },
  hits_med: {
    label: '필요 타격량',
    meaning: '혼자 처치한 교전의 타격 수 중앙값',
    format: (v) => `${Math.round(v * 10) / 10}회`,
  },
  hpcost_mean: {
    label: 'HP 소모량',
    meaning: '교전당 잃은 HP 비율 평균',
    format: (v) => pct(v, 1),
  },
  escape_rate: {
    label: '처치 실패도',
    meaning: '맞고 처치되지 않은 개체 비율',
    format: (v) => pct(v, 1),
  },
  avoid_rate: {
    label: '회피도',
    meaning: '스폰 후 60초 안 12블록 안에 플레이어가 있었는데 아무도 치지 않은 개체 비율',
    format: (v) => pct(v, 1),
  },
};
const ORDER = ['race_med', 'hits_med', 'hpcost_mean', 'escape_rate', 'avoid_rate'];

// Figma 38:462 / 38:606, now titled "전투 양상"; 340 (360) wide × size.detail-row in the detail
// column, chart slot 302 wide.
// The legend sits under the header (PanelLegend), so the drawing starts at the top label.
const W = 302;
const H = 240;
const CX = W / 2;
const CY = 132;
const R = 90;
/**
 * One fixed scale for every monster (never fitted per monster): z is clamped to ±Z_MAX, the
 * center is −Z_MAX, the peer median (z = 0) the middle ring, the spoke end +Z_MAX. z is the
 * batch's robust z (value − group median) / MAD within the same role·grade group, and every
 * axis grows in the same direction: a higher value (outward) means higher than the group.
 */
const Z_MAX = 3;
const RINGS = [-2, -1, 0, 1, 2];
/** Ticks of the scale ruler: the center (−3) to the spoke end (+3). */
const SCALE_TICKS = [-3, -2, -1, 0, 1, 2, 3];
const tickLabel = (z: number) => {
  if (z === 0) return '0';
  return z > 0 ? `+${z}` : `−${-z}`;
};
const CAPTION =
  '눈금 = 같은 역할·등급 묶음 중앙값과의 거리(z, MAD 기준) · 모든 몬스터 같은 눈금 · ±3 넘는 값은 끝에 고정';

const isNum = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);
/** Beyond the scale end, so the vertex is pinned at ±Z_MAX. */
const isOut = (z: number | null | undefined) => isNum(z) && Math.abs(z) > Z_MAX;

/**
 * The ring scale is a ruler on its own row under the drawing ("중앙값 기준 거리"): center (−3) on
 * the left, spoke end (+3) on the right, ticks at every ring. Tick labels on the rings themselves
 * would always cross the outline or a ring edge somewhere.
 */
const SCALE_STEP = 24;
const SCALE_W = SCALE_STEP * 2 * Z_MAX + 16;
const SCALE_H = 26;
const SCALE_LINE_Y = 7;
const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
const pointAt = (i: number, r: number): [number, number] => [
  round2(CX + r * Math.cos(angle(i))),
  round2(CY + r * Math.sin(angle(i))),
];
const radiusOf = (z: number) => (R * (Math.max(-Z_MAX, Math.min(Z_MAX, z)) + Z_MAX)) / (2 * Z_MAX);
const ring = (r: number) => [0, 1, 2, 3, 4].map((i) => pointAt(i, r).join(',')).join(' ');

/** Wedge around axis i, used as the hover target. */
const wedge = (i: number) => {
  const a0 = angle(i) - Math.PI / 5;
  const a1 = angle(i) + Math.PI / 5;
  const rr = R + 40;
  return `M${CX},${CY} L${round2(CX + rr * Math.cos(a0))},${round2(CY + rr * Math.sin(a0))} A${rr},${rr} 0 0 1 ${round2(CX + rr * Math.cos(a1))},${round2(CY + rr * Math.sin(a1))} Z`;
};

export function Pentagon({ axes, rank, rankOf, note }: PentagonProps) {
  const tip = useChartTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const byKey = new Map(axes.map((a) => [a.axis, a]));
  const rows = ORDER.map((key, i) => ({ key, i, meta: AXES[key], data: byKey.get(key) }));
  const has = rows.map((r) => Boolean(r.data && isNum(r.data.z) && isNum(r.data.value)));
  // The five plotted radii glide together (a missing axis toward the center), and the fill,
  // outline, vertices and out-of-range rings all come from the same tweened radii, so the
  // edges never come apart from the points mid-animation.
  const radii = useTween(rows.map((r) => (has[r.i] ? radiusOf(r.data?.z ?? 0) : 0)));
  const vertex = (i: number) => pointAt(i, radii[i]);
  const shown = rows.filter((r) => has[r.i]);
  // A missing axis pulls the fill to the center (a notch, never a 4-gon across the gap) and
  // leaves the outline open on both sides of it.
  const fill = rows.map((r) => vertex(r.i).join(',')).join(' ');
  const outline = rows
    .filter((r) => has[r.i] && has[(r.i + 1) % 5])
    .map((r) => `M${vertex(r.i).join(',')} L${vertex((r.i + 1) % 5).join(',')}`)
    .join(' ');
  const dim = (i: number) => (hover !== null && hover !== i ? OPACITY.dim.label : 1);

  return (
    <Panel
      title="전투 양상"
      className="h-full pb-(--space-panel-bottom)"
      meta={
        rank !== null ? (
          <>
            종합 <span className="text-ink">{rank}위</span> / {rankOf}종
          </>
        ) : undefined
      }
      chips={
        note ? (
          <SignalBadge tone="warning" title={note}>
            현재 수치 기준
          </SignalBadge>
        ) : undefined
      }
      info={
        <>
          <p>{CAPTION}</p>
          <p className="mt-1">
            중앙값 기준 거리 눈금자 = 가운데 −3 → 바큇살 끝 +3, 0 = 중앙값(점선 고리)
          </p>
          <p className="mt-1">바깥쪽 = 비교 집단보다 높음 · 모양만으로 원인을 판단하지 않음</p>
          {note ? <p className="mt-1">{note}</p> : null}
        </>
      }
    >
      <DetailMotion />
      <PanelLegend className="mt-1">
        <LegendItem swatch={<LineSwatch color="var(--chart-actual)" width={STROKE.width.bold} />}>
          이 몬스터
        </LegendItem>
        <LegendItem
          swatch={
            <LineSwatch color="var(--chart-comparison)" width={STROKE.width.regular} dash="4 3" />
          }
        >
          같은 역할·등급 중앙값
        </LegendItem>
      </PanelLegend>
      <div className="mx-auto mt-2 h-[240px] w-[302px] shrink-0">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`전투 양상 오각형: ${rows
            .map((r) =>
              r.data && isNum(r.data.value)
                ? `${r.meta.label} ${r.meta.format(r.data.value)} (비교 집단 중앙값 ${isNum(r.data.peerMedian) ? r.meta.format(r.data.peerMedian) : '값 없음'}${isOut(r.data.z) && isNum(r.data.z) ? `, 범위 밖 z=${r.data.z.toFixed(1)}` : ''})`
                : `${r.meta.label} 값 없음`,
            )
            .join(', ')}`}
          className="overflow-visible"
          onPointerLeave={() => setHover(null)}
        >
          {/* Grid: one fixed scale for every monster. Rings at z = −2, −1, +1, +2 (thin) and the
              peer median z = 0 (dashed, drawn below); the center is z = −3, the spoke ends +3. */}
          {RINGS.filter((z) => z !== 0).map((z) => (
            <polygon
              key={z}
              points={ring(radiusOf(z))}
              fill="none"
              stroke="var(--chart-track)"
              strokeOpacity={OPACITY.line.ring}
              strokeWidth={STROKE.width.thin}
            />
          ))}
          {rows.map((r) => {
            const [x, y] = pointAt(r.i, R);
            return (
              <line
                key={r.key}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                className="board-mark"
                stroke={hover === r.i ? 'var(--gray-1)' : 'var(--chart-track)'}
                strokeOpacity={hover === r.i ? 1 : OPACITY.line.grid}
                strokeWidth={STROKE.width.thin}
                strokeDasharray={has[r.i] ? undefined : '2 3'}
              />
            );
          })}
          <polygon
            points={ring(radiusOf(0))}
            fill="none"
            stroke="var(--chart-comparison)"
            strokeWidth={STROKE.width.regular}
            strokeDasharray="4 3"
          />
          <g
            className="board-unfold board-first"
            style={{ transformBox: 'view-box', transformOrigin: `${CX}px ${CY}px` }}
          >
            {shown.length >= 3 ? (
              <polygon
                data-pentagon-fill
                points={fill}
                fill="var(--chart-actual)"
                fillOpacity={OPACITY.fill.area}
              />
            ) : null}
            <path
              d={outline}
              fill="none"
              stroke="var(--chart-actual)"
              strokeWidth={STROKE.width.bold}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {shown.map((r) => {
              const [x, y] = vertex(r.i);
              const out = isOut(r.data?.z);
              return (
                <g key={r.key}>
                  {out ? (
                    // Clamped at the scale end: an open ring marks "beyond ±3".
                    <circle
                      cx={x}
                      cy={y}
                      r={STROKE.point.vertexRing}
                      fill="none"
                      stroke="var(--chart-actual)"
                      strokeWidth={STROKE.width.ring}
                      strokeDasharray="2 2"
                    />
                  ) : null}
                  {/* Position comes from the tween each frame; only r transitions in CSS. */}
                  <circle
                    data-vertex={r.i}
                    cx={x}
                    cy={y}
                    r={STROKE.point.vertex}
                    style={{
                      r: hover === r.i ? STROKE.point.vertexHover : STROKE.point.vertex,
                      transition: 'r var(--duration-fast) var(--ease-board)',
                    }}
                    fill="var(--chart-actual)"
                  />
                </g>
              );
            })}
          </g>

          {/* Axis labels */}
          {rows.map((r) => {
            const [x, y] = pointAt(r.i, R + 12);
            const cos = Math.cos(angle(r.i));
            let anchor: 'start' | 'middle' | 'end' = 'middle';
            if (cos > 0.3) anchor = 'start';
            else if (cos < -0.3) anchor = 'end';
            const top = r.i === 0;
            const bottom = Math.sin(angle(r.i)) > 0.5;
            let y0 = y;
            if (top) y0 = y - 18;
            else if (bottom) y0 = y + 8;
            const known = Boolean(r.data && isNum(r.data.value));
            const value = r.data && isNum(r.data.value) ? r.meta.format(r.data.value) : '값 없음';
            return (
              <text
                key={r.key}
                x={x}
                y={y0}
                textAnchor={anchor}
                className="board-mark"
                opacity={dim(r.i)}
              >
                <tspan x={x} fontSize={FONT_SIZE.label} fontWeight={600} fill="var(--ink)">
                  {r.meta.label}
                </tspan>
                <tspan
                  x={x}
                  dy={15}
                  fontSize={FONT_SIZE.label}
                  fontWeight={hover === r.i ? 600 : 500}
                  fill={known ? 'var(--ink)' : 'var(--gray-1)'}
                  className="tabular-nums"
                >
                  {value}
                </tspan>
              </text>
            );
          })}

          {/* Hover targets */}
          {rows.map((r) => (
            <path
              key={r.key}
              d={wedge(r.i)}
              fill="transparent"
              onPointerEnter={() => setHover(r.i)}
              onPointerMove={(e) =>
                tip.show(
                  e,
                  <div>
                    <p className="font-semibold">{r.meta.label}</p>
                    <p className="text-gray-1">{r.meta.meaning}</p>
                    {r.data && isNum(r.data.value) ? (
                      <>
                        <p>이 몬스터 {r.meta.format(r.data.value)}</p>
                        <p>
                          비교 집단 중앙값{' '}
                          {isNum(r.data.peerMedian) ? r.meta.format(r.data.peerMedian) : '값 없음'}
                        </p>
                        {isNum(r.data.z) ? (
                          <p>
                            z {r.data.z.toFixed(2)}
                            {isOut(r.data.z) ? (
                              <span className="text-gray-1">
                                {' '}
                                · 범위 밖 (z={r.data.z.toFixed(1)}), 끝에 고정
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                        <p className="text-gray-1">바깥쪽일수록 비교 집단보다 높음</p>
                      </>
                    ) : (
                      <p>값 없음 (계산할 표본이 없습니다)</p>
                    )}
                  </div>,
                )
              }
              onPointerLeave={tip.hide}
            />
          ))}
        </svg>
      </div>
      <div
        data-ring-scale
        className="mx-auto mt-auto flex items-center gap-2 text-(length:--font-size-caption) font-medium text-gray-1"
      >
        <span>중앙값 기준 거리</span>
        <svg aria-hidden width={SCALE_W} height={SCALE_H} className="shrink-0">
          <line
            x1={8}
            x2={SCALE_W - 8}
            y1={SCALE_LINE_Y}
            y2={SCALE_LINE_Y}
            stroke="var(--gray-2)"
            strokeWidth={STROKE.width.regular}
          />
          {SCALE_TICKS.map((z) => {
            const x = 8 + (z + Z_MAX) * SCALE_STEP;
            return (
              <g key={z}>
                <line
                  x1={x}
                  x2={x}
                  y1={SCALE_LINE_Y - 4}
                  y2={SCALE_LINE_Y + 4}
                  stroke={z === 0 ? 'var(--chart-comparison)' : 'var(--gray-1)'}
                  strokeWidth={z === 0 ? STROKE.width.bold : STROKE.width.regular}
                />
                <text
                  x={x}
                  y={SCALE_H - 2}
                  textAnchor="middle"
                  fontSize={FONT_SIZE.caption}
                  fontWeight={z === 0 ? 600 : 500}
                  fill={z === 0 ? 'var(--ink)' : 'var(--gray-1)'}
                  className="tabular-nums"
                >
                  {tickLabel(z)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {tip.node}
    </Panel>
  );
}
