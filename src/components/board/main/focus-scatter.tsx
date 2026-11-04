'use client';

import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';

import { useChartTooltip } from '@/components/board/shell/chart-tooltip';
import { roleLabel } from '@/lib/board-rows';
import { COLOR, FONT_SIZE, OPACITY, RADIUS, STROKE } from '@/styles/tokens';
import type { DeathSignal, MonsterMainRow, MonsterRole } from '@/types/monsters';

import { riskLabel } from '../detail/format';
import { fmtInt, per100, RISK_FLAG } from './format';
import {
  DIAMOND_HALF,
  median,
  placeLabels,
  r2,
  reach,
  riskScale,
  dodge,
  sqrtTicks,
  SQUARE_HALF,
  textWidth,
  type Box,
} from './focus-scatter-geom';

// Figma 25:67 slot: width × 597. x = deaths (square-root axis, deaths are very skewed), y = risk
// vs expected (linear from 0, 1× dashed reference, 2× line). The focus zone (deaths at or above
// the median and risk at or above 2×) is washed in the death color so the monsters worth a look
// jump out. Color follows one rule on y; shape = role, every mark the same area. Marks are plain
// fills with no outline; the death signal is told in the tooltip only.
/** Drawing width at the 1440 frame (main area 1066 − 2 × 16 panel inset); the board passes the
 * measured one. */
export const FOCUS_SCATTER_W = 1034;
export const FOCUS_SCATTER_H = 597;
const PL = 40;
const PR = 12;
const PT = 40;
const PB = 44;
/** Gap between the y axis and deaths = 0, so origin marks clear the tick labels. */
const X_INSET = 10;
/** Every mark has the area of a circle of this radius. */
const MARK_R = STROKE.point.mark;
const HOVER_GROW = STROKE.point.markHoverGrow;
const DIM_OPACITY = OPACITY.dim.mark;
const LABEL_FONT = FONT_SIZE.caption;
const CHAR_W = 6.3;
/** Marks closer than this (px) share a spot; overlapping marks slide sideways. */
const SAME_SPOT = 2;
const SPREAD_STEP = 2 * MARK_R + 1;
const HIT_R = 11;
const MIN_HIT_R = MARK_R;
const ZONE_LABEL = '우선 점검 · 사망 많고 기대의 2배 이상';
const REF_LABEL = '기대 = 1배';
const ROLE_ORDER: MonsterRole[] = ['mob', 'midboss', 'boss'];

/**
 * Below 1× (and no deaths): a neutral between gray-2 and gray-1 (#9ca6b6, 2.46:1 on white), so
 * the mark shows without an outline but stays quieter than the 1–2× blue. Tokens color.scatter.
 */
const BELOW_FILL = COLOR.scatter.below;
const ZONE_FILL = COLOR.scatter.zone;

/** One color rule on y: ≥2× death, 1–2× comparison, <1× a light neutral. */
function paint(risk: number): string {
  if (risk >= RISK_FLAG) return COLOR.scatter.high;
  if (risk >= 1) return COLOR.scatter.mid;
  return BELOW_FILL;
}

const isSignal = (s: DeathSignal) => s === 'signal' || s === 'strong';

const signalText = (s: DeathSignal) => {
  if (s === 'strong') return '강함';
  if (s === 'signal') return '있음';
  return '없음';
};

const translate = (x: number, y: number): CSSProperties => ({
  transform: `translate(${r2(x)}px, ${r2(y)}px)`,
});

interface ShapeProps {
  role: MonsterRole;
  r: number;
  fill: string;
}

/** Role shape with the area of a circle of radius r: circle mob, square midboss, diamond boss. */
function Shape({ role, r, fill }: ShapeProps) {
  if (role === 'boss') {
    const d = r2(r * DIAMOND_HALF);
    return <path d={`M0 ${-d}L${d} 0L0 ${d}L${-d} 0Z`} fill={fill} />;
  }
  if (role === 'midboss') {
    const h = r2(r * SQUARE_HALF);
    return <rect x={-h} y={-h} width={2 * h} height={2 * h} rx={RADIUS.markSm} fill={fill} />;
  }
  return <circle r={r} fill={fill} />;
}

interface Pt {
  row: MonsterMainRow;
  risk: number;
  x: number;
  y: number;
  /** Other monsters drawn at the same spot (spread apart so each stays hoverable). */
  mates: string[];
  hitR: number;
}

interface FocusScatterProps {
  rows: MonsterMainRow[];
  /** Hovered monster, shared with the risk list. */
  hover: string | null;
  onHover: (monster: string | null) => void;
  /** Opens the monster's detail screen, or closes it when that monster is already open. */
  onOpen: (monster: string) => void;
  onPrefetch: (monster: string) => void;
  /** The open monster (?m=), whose mark reads as pressed. */
  current?: string | null;
  /** Drawing width in px. */
  width?: number;
  /** Drawing height in px (597 in the Figma slot). */
  height?: number;
}

export function FocusScatter({
  rows,
  hover,
  onHover,
  onOpen,
  onPrefetch,
  current = null,
  width: W = FOCUS_SCATTER_W,
  height: H = FOCUS_SCATTER_H,
}: FocusScatterProps) {
  const tip = useChartTooltip();
  const PW = W - PL - PR;
  const PH = H - PT - PB;
  const axisY = PT + PH;
  const plotted = rows.filter((r) => r.riskVsExpected !== null);
  const missing = rows.length - plotted.length;

  const maxX = Math.max(4, ...plotted.map((r) => r.deaths)) * 1.06;
  const { max: maxY, ticks: yTicks } = riskScale(
    Math.max(1, ...plotted.map((r) => r.riskVsExpected ?? 0)),
  );
  const XW = PW - X_INSET;
  const sx = (v: number) => PL + X_INSET + (Math.sqrt(Math.max(0, v)) / Math.sqrt(maxX)) * XW;
  const sy = (v: number) => PT + PH - (Math.max(0, v) / maxY) * PH;

  const raw = plotted.map((row) => {
    const risk = row.riskVsExpected ?? 0;
    return { row, risk, x: sx(row.deaths), y: sy(risk) };
  });
  const spread = dodge(
    raw.map((p) => ({ id: p.row.monster, x: p.x, y: p.y })),
    SAME_SPOT,
    SPREAD_STEP,
    PL + X_INSET,
    PL + PW - MARK_R,
  );
  const pts: Pt[] = raw
    .map((p) => {
      const s = spread.get(p.row.monster);
      return { ...p, x: s?.x ?? p.x, mates: s?.mates ?? [], hitR: HIT_R };
    })
    .map((p, _, all) => {
      const near = Math.min(
        Infinity,
        ...all.filter((q) => q !== p).map((q) => Math.hypot(q.x - p.x, q.y - p.y)),
      );
      return { ...p, hitR: Math.max(MIN_HIT_R, Math.min(HIT_R, near / 2)) };
    });
  // Stable DOM order (by name), so a filter change only glides marks and never re-mounts them.
  const ordered = [...pts].sort((a, b) => a.row.monster.localeCompare(b.row.monster));
  const hov = pts.find((p) => p.row.monster === hover) ?? null;

  const medDeaths = median(plotted.map((r) => r.deaths));
  const qx = sx(medDeaths);
  const y1 = sy(1);
  const y2 = sy(RISK_FLAG);

  // Zone label at the zone's top-left corner, pulled left if the zone is too narrow for it.
  const zoneW = textWidth(ZONE_LABEL, 12);
  const zoneLabelX = Math.min(qx + 6, PL + PW - 4 - zoneW);
  const zoneBox: Box = { x1: zoneLabelX - 2, y1: PT + 3, x2: zoneLabelX + zoneW + 2, y2: PT + 19 };
  const refW = textWidth(REF_LABEL, 11);
  const refBox: Box = {
    x1: PL + X_INSET - 2,
    y1: y1 - 17,
    x2: PL + X_INSET + refW + 4,
    y2: y1 - 1,
  };

  const markOf = (p: Pt) => ({
    id: p.row.monster,
    x: p.x,
    y: p.y,
    reach: MARK_R * reach(p.row.role),
  });
  const labels = placeLabels(
    [...pts]
      .filter((p) => p.risk >= RISK_FLAG)
      .sort((a, b) => b.risk - a.risk || a.row.monster.localeCompare(b.row.monster))
      .map(markOf),
    pts.map(markOf),
    [zoneBox, refBox],
    { x1: PL + 2, y1: PT, x2: W - 2, y2: axisY - 1 },
    CHAR_W,
  );

  const tipBody = (r: MonsterMainRow, mates: string[]) => (
    <div className="flex flex-col">
      <span className="font-semibold">
        {r.monster} <span className="font-normal text-gray-1">{roleLabel(r.role)}</span>
      </span>
      <span className="text-gray-1">
        기대 대비 위험 <span className="text-ink">{riskLabel(r.riskVsExpected, r.deaths)}</span>{' '}
        (던전 단계 반영)
      </span>
      <span className="text-gray-1">
        사망 <span className="text-ink">{fmtInt(r.deaths)}건</span> · 교전{' '}
        <span className="text-ink">{fmtInt(r.enc)}건</span>
      </span>
      <span className="text-gray-1">
        100교전당 사망 <span className="text-ink">{per100(r.deaths, r.enc)}</span>
      </span>
      <span className="text-gray-1">
        사망 신호 <span className="text-ink">{signalText(r.signal)}</span>
      </span>
      {mates.length ? (
        <span className="text-gray-1">
          같은 자리에 {mates.length}종 더: <span className="text-ink">{mates.join(', ')}</span>
        </span>
      ) : null}
      <span className="text-gray-1">
        {r.monster === current ? '다시 누르면 개요로' : '눌러서 상세 보기'}
      </span>
    </div>
  );

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(id);
    }
  };

  const onFocusMark = (e: FocusEvent<SVGGElement>, p: Pt) => {
    const b = e.currentTarget.getBoundingClientRect();
    onHover(p.row.monster);
    onPrefetch(p.row.monster);
    tip.show({ clientX: b.right - 4, clientY: b.top - 4 }, tipBody(p.row, p.mates));
  };

  // One legend row, right-aligned: color rule, then shapes.
  const legend = { fontSize: FONT_SIZE.label, fill: 'var(--ink)', fontWeight: 500 };
  const legendItems: { key: string; text: string; role: MonsterRole; fill: string }[] = [
    { key: 'c2', text: '2배 이상', role: 'mob', fill: COLOR.scatter.high },
    { key: 'c1', text: '1~2배', role: 'mob', fill: COLOR.scatter.mid },
    { key: 'c0', text: '1배 미만', role: 'mob', fill: BELOW_FILL },
    ...ROLE_ORDER.map((role) => ({
      key: role,
      text: roleLabel(role),
      role,
      fill: 'var(--gray-1)',
    })),
  ];
  const itemW = legendItems.map((it) => 14 + textWidth(it.text, 12));
  const GROUP_GAP = 22;
  const ITEM_GAP = 14;
  const legendW =
    itemW.reduce((s, w) => s + w, 0) + ITEM_GAP * (legendItems.length - 2) + GROUP_GAP;
  let cursor = W - legendW;
  const legendX = itemW.map((w, i) => {
    const x = cursor;
    cursor += w + (i === 2 ? GROUP_GAP : ITEM_GAP);
    return x;
  });

  const hoverRight = hov !== null && hov.x > PL + PW * 0.7;

  return (
    <>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block select-none"
        role="group"
        aria-label={`사망 수와 기대 대비 위험, 몬스터 ${plotted.length}종`}
      >
        {/* Axis title (left) and the one legend row (right). */}
        <text x={0} y={14} fontSize={FONT_SIZE.label} fontWeight="600" fill="var(--gray-1)">
          ↑ 기대 대비 위험 (배, 던전 단계 반영)
        </text>
        <g {...legend}>
          {legendItems.map((it, i) => (
            <g key={it.key} transform={`translate(${r2(legendX[i])} 0)`}>
              <g transform="translate(5 10)">
                <Shape role={it.role} r={STROKE.point.legend} fill={it.fill} />
              </g>
              <text x={14} y={14}>
                {it.text}
              </text>
            </g>
          ))}
        </g>

        {/* Focus zone: deaths ≥ median and risk ≥ 2×. */}
        <rect
          x={r2(qx)}
          y={PT}
          width={r2(Math.max(0, PL + PW - qx))}
          height={r2(Math.max(0, y2 - PT))}
          fill={ZONE_FILL}
          className="board-mark"
        />

        {/* Grid and ticks: each line sits in a translated group so a rescale glides. */}
        {yTicks.map((t) => (
          <g key={`y${t}`} className="board-mark" style={translate(0, sy(t))}>
            <line
              x1={PL}
              x2={PL + PW}
              stroke={t === 0 ? 'var(--gray-2)' : 'var(--chart-track)'}
              strokeWidth={t === 0 ? STROKE.width.thin : STROKE.width.hairline}
              opacity={t === 1 || t === RISK_FLAG ? 0 : 1}
            />
            <text
              x={PL - 8}
              y={4}
              textAnchor="end"
              fontSize={FONT_SIZE.caption}
              fill="var(--gray-1)"
              className="tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}
        {sqrtTicks(maxX, XW).map((t) => (
          <g key={`x${t}`} className="board-mark" style={translate(sx(t), 0)}>
            <line
              y1={PT}
              y2={axisY}
              stroke="var(--chart-track)"
              strokeWidth={STROKE.width.hairline}
              opacity={t === 0 ? 0 : 1}
            />
            <text
              y={axisY + 17}
              textAnchor="middle"
              fontSize={FONT_SIZE.caption}
              fill="var(--gray-1)"
              className="tabular-nums"
            >
              {fmtInt(t)}
            </text>
          </g>
        ))}
        <text x={PL} y={H - 4} fontSize={FONT_SIZE.label} fill="var(--gray-1)">
          <tspan fontWeight="600">사망 수 (√축, 건) →</tspan>
          <tspan>{`  세로 점선 = 사망 수 중앙값 ${fmtInt(Math.round(medDeaths))}건`}</tspan>
          {missing > 0 ? <tspan>{` · 기대 위험 미계산 ${missing}종은 빠짐`}</tspan> : null}
        </text>

        {/* Median-deaths split (thin dashed), the 2× line and the 1× reference. */}
        <g className="board-mark" style={translate(qx, 0)}>
          <line
            y1={PT}
            y2={axisY}
            stroke="var(--gray-1)"
            strokeOpacity={OPACITY.line.median}
            strokeWidth={STROKE.width.thin}
            strokeDasharray="3 3"
          />
        </g>
        <g className="board-mark" style={translate(0, y2)}>
          <line
            x1={PL}
            x2={PL + PW}
            stroke="var(--chart-death)"
            strokeOpacity={OPACITY.line.flag}
            strokeWidth={STROKE.width.thin}
          />
        </g>
        <g className="board-mark" style={translate(0, y1)}>
          <line
            x1={PL}
            x2={PL + PW}
            stroke="var(--ink)"
            strokeOpacity={OPACITY.line.reference}
            strokeWidth={STROKE.width.regular}
            strokeDasharray="5 4"
          />
          <text
            x={PL + X_INSET}
            y={-5}
            fontSize={FONT_SIZE.caption}
            fontWeight="600"
            fill="var(--ink)"
            stroke="var(--panel)"
            strokeWidth={STROKE.width.halo}
            strokeLinejoin="round"
            style={{ paintOrder: 'stroke fill' }}
          >
            {REF_LABEL}
          </text>
        </g>
        <g className="board-mark" style={translate(zoneLabelX, PT + 15)}>
          <text
            fontSize={FONT_SIZE.label}
            fontWeight="600"
            fill="var(--gray-1)"
            stroke={ZONE_FILL}
            strokeWidth={STROKE.width.halo}
            strokeLinejoin="round"
            style={{ paintOrder: 'stroke fill' }}
          >
            {ZONE_LABEL}
          </text>
        </g>

        {/* Marks: the outer group glides to the new spot, the inner one fades in on the first
            visit only. */}
        <g>
          {ordered.map((p) => {
            const id = p.row.monster;
            const signal = isSignal(p.row.signal);
            const dim = hov !== null && hov.row.monster !== id;
            const mates = p.mates.length ? `, 같은 자리 ${p.mates.length}종 더` : '';
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-pressed={id === current}
                aria-label={`${id} ${id === current ? '상세 닫기' : '상세 보기'}, ${roleLabel(p.row.role)}, 기대 대비 위험 ${riskLabel(p.row.riskVsExpected, p.row.deaths)}, 사망 ${p.row.deaths}건, 교전 ${p.row.enc}건${signal ? ', 사망 신호' : ''}${mates}`}
                className="group board-mark cursor-pointer outline-none"
                style={translate(p.x, p.y)}
                onClick={() => {
                  tip.hide();
                  onOpen(id);
                }}
                onKeyDown={(e) => onKey(e, id)}
                onFocus={(e) => onFocusMark(e, p)}
                onBlur={() => {
                  onHover(null);
                  tip.hide();
                }}
                onPointerEnter={() => {
                  onHover(id);
                  onPrefetch(id);
                }}
                onPointerMove={(e: PointerEvent) => tip.show(e, tipBody(p.row, p.mates))}
                onPointerLeave={() => {
                  onHover(null);
                  tip.hide();
                }}
              >
                <g className="board-enter board-first">
                  <circle r={r2(p.hitR)} fill="transparent" />
                  <g className="board-mark" style={{ opacity: dim ? DIM_OPACITY : 1 }}>
                    <Shape role={p.row.role} r={MARK_R} fill={paint(p.risk)} />
                  </g>
                  {/* Keyboard focus ring (focus-visible only, not a data border). */}
                  <circle
                    r={r2(MARK_R * reach(p.row.role) + 4)}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth={STROKE.width.regular}
                    strokeDasharray="3 2"
                    className="board-mark opacity-0 group-focus-visible:opacity-100"
                    pointerEvents="none"
                  />
                </g>
              </g>
            );
          })}
        </g>

        {/* Direct labels (≥ 2×). */}
        <g pointerEvents="none">
          {[...labels.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, l]) => (
              <g key={id} className="board-mark" style={translate(l.x, l.y)}>
                <text
                  data-label={id}
                  textAnchor={l.anchor}
                  fontSize={LABEL_FONT}
                  fontWeight={id === hover ? 700 : 500}
                  fill="var(--ink)"
                  stroke="var(--panel)"
                  strokeWidth={STROKE.width.halo}
                  strokeLinejoin="round"
                  className="board-enter board-first"
                  style={{ paintOrder: 'stroke fill' }}
                >
                  {id}
                </text>
              </g>
            ))}
        </g>

        {/* Hovered mark (here or in the risk list): redrawn on top, a little larger, with its
            name when it has no direct label. */}
        {hov ? (
          <g style={translate(hov.x, hov.y)} pointerEvents="none">
            <Shape role={hov.row.role} r={MARK_R + HOVER_GROW} fill={paint(hov.risk)} />
            {labels.has(hov.row.monster) ? null : (
              <text
                x={hoverRight ? -(MARK_R + 6) : MARK_R + 6}
                y={4}
                textAnchor={hoverRight ? 'end' : 'start'}
                fontSize={LABEL_FONT}
                fontWeight={700}
                fill="var(--ink)"
                stroke="var(--panel)"
                strokeWidth={STROKE.width.halo}
                strokeLinejoin="round"
                style={{ paintOrder: 'stroke fill' }}
              >
                {hov.row.monster}
              </text>
            )}
          </g>
        ) : null}
      </svg>
      {tip.node}
    </>
  );
}
