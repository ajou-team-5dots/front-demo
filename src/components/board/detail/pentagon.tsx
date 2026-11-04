'use client';

import { useState } from 'react';

import { FONT_SIZE, OPACITY, STROKE } from '@/styles/tokens';

import { useChartTooltip } from '../shell/chart-tooltip';
import { Panel } from '../shell/panel';
import { useTween } from '../shell/use-tween';
import type { PentagonProps } from './contracts';
import { DetailMotion } from './detail-motion';
import { pct, round2 } from './format';

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

// Figma 38:462 / 38:606, now titled "전투 양상"; 340×360 in the detail column, chart slot 302 wide.
const W = 302;
const H = 260;
const CX = W / 2;
const CY = 148;
const R = 90;
/**
 * One fixed scale for every monster (never fitted per monster): z is clamped to ±Z_MAX, the
 * center is −Z_MAX, the peer median (z = 0) the middle ring, the spoke end +Z_MAX. z is the
 * batch's robust z (value − group median) / MAD within the same role·grade group, and every
 * axis grows in the same direction: a higher value (outward) means higher than the group.
 */
const Z_MAX = 3;
const RINGS = [-2, -1, 0, 1, 2];
const ringLabel = (z: number) => {
  if (z === 0) return '중앙값';
  return z > 0 ? `+${z}` : `−${-z}`;
};
const CAPTION =
  '눈금 = 같은 역할·등급 묶음 중앙값과의 거리(z, MAD 기준) · 모든 몬스터 같은 눈금 · ±3 넘는 값은 끝에 고정';

const isNum = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);
/** Beyond the scale end, so the vertex is pinned at ±Z_MAX. */
const isOut = (z: number | null | undefined) => isNum(z) && Math.abs(z) > Z_MAX;

/** Ring labels sit this far beside the top spoke, clear of its vertex dot (r 5.5 + stroke). */
const LABEL_DX = 9;
/** Rough label box: 10px text, Hangul full width, signs and digits about 0.6em. */
const labelBox = (z: number) => ({ w: z === 0 ? 30 : 13, h: 12 });
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
  // Ring labels go right of the top spoke unless a plotted vertex would land on them there and
  // the left side is clear (decided on the target radii, so the side does not flicker).
  const ringLabelHits = (side: 1 | -1) =>
    rows.some((r) => {
      if (!has[r.i]) return false;
      const [vx, vy] = pointAt(r.i, radiusOf(r.data?.z ?? 0));
      return RINGS.some((z) => {
        const { w, h } = labelBox(z);
        const x0 = side > 0 ? CX + LABEL_DX : CX - LABEL_DX - w;
        const y1 = CY - radiusOf(z) + 3.5;
        return vx + 7 > x0 && vx - 7 < x0 + w && vy + 7 > y1 - h + 2 && vy - 7 < y1 + 2;
      });
    });
  const labelSide = ringLabelHits(1) && !ringLabelHits(-1) ? -1 : 1;
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
      className="h-full"
      actions={
        rank !== null ? (
          <span className="ml-auto text-(length:--font-size-label) font-semibold text-ink tabular-nums">
            종합 {rank}위 <span className="text-gray-1">/ {rankOf}종</span>
          </span>
        ) : null
      }
    >
      <DetailMotion />
      <div className="mt-[10px] ml-[3px] h-[260px] w-[302px]">
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
          {/* Legend */}
          <g fontSize={FONT_SIZE.caption} fontWeight={600} fill="var(--gray-1)">
            <line
              x1={0}
              x2={16}
              y1={6}
              y2={6}
              stroke="var(--chart-actual)"
              strokeWidth={STROKE.width.bold}
            />
            <text x={21} y={10}>
              이 몬스터
            </text>
            <line
              x1={80}
              x2={96}
              y1={6}
              y2={6}
              stroke="var(--chart-comparison)"
              strokeWidth={STROKE.width.regular}
              strokeDasharray="4 3"
            />
            <text x={101} y={10}>
              같은 역할·등급 중앙값
            </text>
          </g>

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

          {/* Ring labels once, beside the top spoke (clear of its vertex), drawn over the polygon
              with a panel halo so the fill and outline never cover them. */}
          <g
            data-ring-labels
            fontSize={FONT_SIZE.micro}
            fontWeight={500}
            fill="var(--gray-1)"
            aria-hidden
          >
            {RINGS.map((z) => (
              <text
                key={z}
                x={CX + labelSide * LABEL_DX}
                y={CY - radiusOf(z) + 3.5}
                textAnchor={labelSide > 0 ? 'start' : 'end'}
                paintOrder="stroke"
                stroke="var(--panel)"
                strokeWidth={STROKE.width.halo}
                strokeLinejoin="round"
                className="tabular-nums"
              >
                {ringLabel(z)}
              </text>
            ))}
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
      <div className="mt-auto pb-3 text-(length:--font-size-caption) leading-[13px] font-semibold text-gray-1">
        <p>{CAPTION}</p>
        <p className="mt-0.5">바깥쪽 = 비교 집단보다 높음 · 모양만으로 원인을 판단하지 않음</p>
        {note ? <p className="mt-0.5">{note}</p> : null}
      </div>
      {tip.node}
    </Panel>
  );
}
