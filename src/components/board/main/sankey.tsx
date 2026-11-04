'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { useChartTooltip } from '@/components/board/shell/chart-tooltip';
import { COLOR, FONT_SIZE, OPACITY, RADIUS, SIZE, STROKE } from '@/styles/tokens';
import type { FlowColumn, FlowKey, FlowPick, FlowRow } from '@/types/board';

import { fmtInt, matchesPick, per100 } from './format';
import { nodeHue } from './sankey-palette';

// Figma 25:72 slot: width × 320 (the width fills the flow panel up to the summary box).
// Columns level → weapon → armor → monster group; node height = encounters. Every node is a thin
// solid bar in its own hue (sankey-palette). Bands are ribbons whose thickness at each end
// follows that node's own scale, so they fill nodes raised to MIN_H; each band is a soft
// gradient from its source node's hue to its target's, so overlaps blend. Bands are still split
// by the player's level bucket, so hovering follows one level's lineage. A pick strengthens the
// flows that pass every picked cell in their own gradient and steps everything else back; picked
// nodes keep their hue and widen.
export const SANKEY_H = 320;
const H = SANKEY_H;
const TOP = 26;
const NODE_W = SIZE.sankey.nodeWidth;
const GAP = 10;
/** Thin cells get this height so their labels never collide. */
const MIN_H = SIZE.sankey.nodeMin;
const LABEL_FONT = FONT_SIZE.label;
/** Space between a node and its label. */
const LABEL_PAD = 6;
/** Band opacity steps (tokens opacity.band): picked lineage > hovered lineage > rest > dimmed. */
const BAND_PICKED = OPACITY.band.picked;
const BAND_ON = OPACITY.band.hover;
const BAND_OPACITY = OPACITY.band.default;
const BAND_DIM = OPACITY.band.dim;
/** Nodes with no matching flow (under a pick or off the hovered lineage). */
const NODE_DIM = OPACITY.dim.node;
/** A picked node grows this much wider, centered on its slot. */
const PICK_GROW = SIZE.sankey.pickGrow;
/** Pointer gap between two bands before the hover clears (avoids a flash between them). */
const HOVER_CLEAR_MS = 80;

type Hover =
  | { kind: 'node'; key: FlowKey; v: string }
  | { kind: 'band'; ka: FlowKey; a: string; kb: FlowKey; b: string; lv: string };

interface Node {
  key: FlowKey;
  v: string;
  enc: number;
  deaths: number;
  pickedEnc: number;
  x: number;
  y: number;
  h: number;
}

interface Link {
  id: string;
  d: string;
  picked: boolean;
  ka: FlowKey;
  kb: FlowKey;
  /** Node values at both ends and the level bucket this band carries. */
  av: string;
  bv: string;
  lv: string;
  /** Hues of the source and target nodes; the band's gradient runs between them. */
  from: string;
  to: string;
  x0: number;
  x1: number;
  title: string;
  enc: number;
  deaths: number;
}

const sum = (rows: FlowRow[], f: (r: FlowRow) => number) => rows.reduce((s, r) => s + f(r), 0);

/** Rough rendered width of a 12px label: Hangul full width, digits and latin about 0.6em. */
function labelWidth(s: string): number {
  let w = 0;
  [...s].forEach((ch) => {
    if (/[ㄱ-힝]/.test(ch)) w += LABEL_FONT;
    else if (/[ ,.·]/.test(ch)) w += LABEL_FONT * 0.32;
    else w += LABEL_FONT * 0.62;
  });
  return w;
}

/** Closed ribbon between the vertical spans [a0, a0 + wa] at x0 and [b0, b0 + wb] at x1. */
function ribbon(x0: number, a0: number, wa: number, x1: number, b0: number, wb: number): string {
  const mx = (x0 + x1) / 2;
  const f = (n: number) => n.toFixed(2);
  return (
    `M${f(x0)} ${f(a0)} C${f(mx)} ${f(a0)} ${f(mx)} ${f(b0)} ${f(x1)} ${f(b0)} ` +
    `L${f(x1)} ${f(b0 + wb)} C${f(mx)} ${f(b0 + wb)} ${f(mx)} ${f(a0 + wa)} ${f(x0)} ${f(a0 + wa)} Z`
  );
}

const translate = (x: number, y: number): CSSProperties => ({
  transform: `translate(${x}px, ${y}px)`,
});

interface SankeyProps {
  /** Drawing width in px; the height is fixed at SANKEY_H. */
  width: number;
  columns: FlowColumn[];
  rows: FlowRow[];
  pick: FlowPick;
  onToggle: (key: FlowKey, value: string) => void;
}

export function Sankey({ width: W, columns, rows, pick, onToggle }: SankeyProps) {
  const tip = useChartTooltip();
  // SVG ids must be plain: drop the punctuation React puts around useId values.
  const gid = `sk${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [hover, setHoverState] = useState<Hover | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setHover = useCallback((h: Hover) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = null;
    setHoverState(h);
  }, []);
  const clearHover = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setHoverState(null), HOVER_CLEAR_MS);
  }, []);
  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    [],
  );
  const hasPick = Object.values(pick).some(Boolean);
  const total = sum(rows, (r) => r.enc);
  const span = H - TOP;
  const lastC = columns.length - 1;

  // One scale for every column: thin cells take MIN_H, the rest share what is left.
  const encs = columns.map((col) =>
    col.values.map((v) =>
      sum(
        rows.filter((r) => r[col.key] === v),
        (r) => r.enc,
      ),
    ),
  );
  const k = Math.min(
    ...encs.map((col) => {
      const live = col.filter((e) => e > 0);
      const usable = span - GAP * Math.max(0, live.length - 1);
      const small = live.filter((e) => e * (usable / total) < MIN_H);
      const big = live.filter((e) => e * (usable / total) >= MIN_H).reduce((s, e) => s + e, 0);
      return big ? (usable - small.length * MIN_H) / big : usable / total;
    }),
  );

  // The last column's labels sit right of its nodes in a reserved gutter, so they never lie
  // over the incoming bands.
  const lastLabels = (columns[lastC]?.values ?? [])
    .map((v, i) => ({ v, enc: encs[lastC][i] }))
    .filter((x) => x.enc > 0)
    .map((x) => labelWidth(`${x.v} ${fmtInt(x.enc)}`));
  const gutter = Math.ceil(LABEL_PAD + Math.max(0, ...lastLabels) + 2);
  const colX = (c: number) => (c / Math.max(1, lastC)) * (W - NODE_W - gutter);

  const nodes: Node[][] = columns.map((col, c) => {
    let y = TOP;
    return col.values
      .map((v) => {
        const hit = rows.filter((r) => r[col.key] === v);
        const enc = sum(hit, (r) => r.enc);
        const node: Node = {
          key: col.key,
          v,
          enc,
          deaths: sum(hit, (r) => r.deaths),
          pickedEnc: sum(
            hit.filter((r) => matchesPick(r, pick)),
            (r) => r.enc,
          ),
          x: colX(c),
          y,
          h: enc ? Math.max(MIN_H, enc * k) : 0,
        };
        if (enc) y += node.h + GAP;
        return node;
      })
      .filter((n) => n.enc > 0);
  });

  const lvValues = columns[0]?.values ?? [];
  const hueOf = (c: number, v: string) => nodeHue(columns[c].key, columns[c].values.indexOf(v));

  const links: Link[] = [];
  for (let c = 0; c < lastC; c += 1) {
    const ka = columns[c].key;
    const kb = columns[c + 1].key;
    const outY = new Map(nodes[c].map((n) => [n.v, n.y]));
    const inY = new Map(nodes[c + 1].map((n) => [n.v, n.y]));
    nodes[c].forEach((na) => {
      nodes[c + 1].forEach((nb) => {
        const pair = rows.filter((r) => r[ka] === na.v && r[kb] === nb.v);
        // One band per level bucket, stacked in bucket order at both ends.
        lvValues.forEach((lv) => {
          const hit = pair.filter((r) => r.lv === lv);
          const enc = sum(hit, (r) => r.enc);
          if (!enc) return;
          const picked = hasPick
            ? sum(
                hit.filter((r) => matchesPick(r, pick)),
                (r) => r.enc,
              )
            : 0;
          // Each end uses its own node's scale, so the bands fill every node exactly.
          const wa = (enc / na.enc) * na.h;
          const wb = (enc / nb.enc) * nb.h;
          const a0 = outY.get(na.v) ?? 0;
          const b0 = inY.get(nb.v) ?? 0;
          outY.set(na.v, a0 + wa);
          inY.set(nb.v, b0 + wb);
          const x0 = colX(c) + NODE_W;
          const x1 = colX(c + 1);
          // Keep hairline bands hoverable: at least 1px, centered on their slot.
          const ta = Math.max(1, wa);
          const tb = Math.max(1, wb);
          const sa = a0 + (wa - ta) / 2;
          const sb = b0 + (wb - tb) / 2;
          const ends = `${columns[c].label} ${na.v} → ${columns[c + 1].label} ${nb.v}`;
          links.push({
            id: `${c}|${na.v}|${nb.v}|${lv}`,
            d: ribbon(x0, sa, ta, x1, sb, tb),
            picked: picked > 0,
            ka,
            kb,
            av: na.v,
            bv: nb.v,
            lv,
            from: hueOf(c, na.v),
            to: hueOf(c + 1, nb.v),
            x0,
            x1,
            title: c === 0 ? ends : `레벨 ${lv} · ${ends}`,
            enc,
            deaths: sum(hit, (r) => r.deaths),
          });
        });
      });
    });
  }

  // Hover: the flows through the hovered node or band light up, everything else dims.
  const hoverRows: FlowRow[] | null = (() => {
    if (!hover) return null;
    if (hover.kind === 'node') return rows.filter((r) => r[hover.key] === hover.v);
    return rows.filter(
      (r) => r.lv === hover.lv && r[hover.ka] === hover.a && r[hover.kb] === hover.b,
    );
  })();
  // Under a pick, hover highlights within the picked set: only its picked rows count, and a
  // hover that touches none of them leaves the pick view as it is.
  const hoverSet = (() => {
    if (!hoverRows || !hasPick) return hoverRows;
    const inPick = hoverRows.filter((r) => matchesPick(r, pick));
    return inPick.length ? inPick : null;
  })();
  const linkOn = (l: Link) =>
    !hoverSet || hoverSet.some((r) => r.lv === l.lv && r[l.ka] === l.av && r[l.kb] === l.bv);
  const nodeOn = (n: Node) => !hoverSet || hoverSet.some((r) => r[n.key] === n.v);
  const linkOpacity = (l: Link) => {
    if (hasPick) {
      if (!l.picked) return BAND_DIM;
      if (!hoverSet) return BAND_PICKED;
      return linkOn(l) ? BAND_PICKED : BAND_OPACITY;
    }
    if (!hoverSet) return BAND_OPACITY;
    return linkOn(l) ? BAND_ON : BAND_DIM;
  };

  const tipBody = (title: string, enc: number, deaths: number, pe?: number) => (
    <div className="flex flex-col">
      <span className="font-semibold">{title}</span>
      <span className="text-gray-1">
        교전 <span className="text-ink">{fmtInt(enc)}건</span> · 사망{' '}
        <span className="text-ink">{fmtInt(deaths)}건</span>
      </span>
      <span className="text-gray-1">
        100교전당 사망 <span className="text-ink">{per100(deaths, enc)}</span> ({fmtInt(deaths)}/
        {fmtInt(enc)}건)
      </span>
      {deaths > enc ? <span className="text-gray-1">교전 없이 기록된 사망 포함</span> : null}
      {hasPick && pe !== undefined ? (
        <span className="text-gray-1">
          고른 흐름에 속한 교전 <span className="text-ink">{fmtInt(pe)}건</span>
        </span>
      ) : null}
    </div>
  );

  const nodeTip = (c: number, n: Node) =>
    tipBody(`${columns[c].label} · ${n.v}`, n.enc, n.deaths, n.pickedEnc);

  const onKey = (e: KeyboardEvent, key: FlowKey, v: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(key, v);
    }
  };

  const onFocusNode = (e: FocusEvent<SVGGElement>, c: number, n: Node) => {
    const b = e.currentTarget.getBoundingClientRect();
    setHover({ kind: 'node', key: n.key, v: n.v });
    tip.show({ clientX: b.right, clientY: b.top }, nodeTip(c, n));
  };

  return (
    <>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block overflow-visible select-none"
        role="group"
        aria-label="전체 교전 흐름: 레벨, 무기, 방어구, 몬스터 집단"
      >
        {columns.map((col, c) => {
          const edge = c === 0 || c === lastC;
          return (
            <text
              key={col.key}
              x={edge ? colX(c) : colX(c) + NODE_W / 2}
              y={12}
              textAnchor={edge ? 'start' : 'middle'}
              fontSize={FONT_SIZE.label}
              fontWeight="600"
              className="board-mark"
              style={{ fill: pick[col.key] ? COLOR.base.ink : COLOR.base.gray1 }}
            >
              {`${c + 1}. ${col.label}`}
            </text>
          );
        })}

        {/* One horizontal gradient per band, source node hue → target node hue. */}
        <defs>
          {links.map((l, i) => (
            <linearGradient
              key={l.id}
              id={`${gid}-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={l.x0}
              x2={l.x1}
              y1={0}
              y2={0}
            >
              <stop offset="0%" style={{ stopColor: l.from }} />
              <stop offset="100%" style={{ stopColor: l.to }} />
            </linearGradient>
          ))}
        </defs>

        <g>
          {links.map((l, i) => {
            const opacity = linkOpacity(l);
            return (
              <path
                key={l.id}
                d={l.d}
                data-picked={hasPick && l.picked ? '' : undefined}
                className="board-mark"
                fill={`url(#${gid}-${i})`}
                style={{ opacity }}
                onPointerEnter={() =>
                  setHover({ kind: 'band', ka: l.ka, a: l.av, kb: l.kb, b: l.bv, lv: l.lv })
                }
                onPointerMove={(e: PointerEvent) => tip.show(e, tipBody(l.title, l.enc, l.deaths))}
                onPointerLeave={() => {
                  clearHover();
                  tip.hide();
                }}
              />
            );
          })}
        </g>

        {nodes.map((col, c) =>
          col.map((n) => {
            const on = pick[n.key] === n.v;
            const dim = (hasPick && n.pickedEnc === 0) || !nodeOn(n);
            // Picked: PICK_GROW wider, centered, own hue, no border.
            const grow = on ? PICK_GROW / 2 : 0;
            const ring = 3.5 + grow;
            return (
              <g
                key={`${n.key}${n.v}`}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${columns[c].label} ${n.v}, 교전 ${n.enc}건, 사망 ${n.deaths}건`}
                className="group board-mark cursor-pointer outline-none"
                style={translate(n.x, n.y)}
                onClick={() => onToggle(n.key, n.v)}
                onKeyDown={(e) => onKey(e, n.key, n.v)}
                onFocus={(e) => onFocusNode(e, c, n)}
                onBlur={() => {
                  clearHover();
                  tip.hide();
                }}
                onPointerEnter={() => setHover({ kind: 'node', key: n.key, v: n.v })}
                onPointerMove={(e) => tip.show(e, nodeTip(c, n))}
                onPointerLeave={() => {
                  clearHover();
                  tip.hide();
                }}
              >
                <rect
                  x={-grow}
                  y={0}
                  width={NODE_W + 2 * grow}
                  height={n.h}
                  rx={RADIUS.mark}
                  className="board-mark"
                  style={{
                    x: -grow,
                    width: NODE_W + 2 * grow,
                    fill: hueOf(c, n.v),
                    opacity: dim ? NODE_DIM : 1,
                  }}
                />
                {/* Keyboard focus: a 2px ink ring outside the node, also around picked ones. */}
                <rect
                  x={-ring}
                  y={-3.5}
                  width={NODE_W + 2 * ring}
                  height={n.h + 7}
                  rx={RADIUS.focus}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={STROKE.width.focus}
                  className="board-mark opacity-0 group-focus-visible:opacity-100"
                  pointerEvents="none"
                />
                <g className="board-mark" style={translate(NODE_W + grow + LABEL_PAD, n.h / 2 + 4)}>
                  <text
                    fontSize={LABEL_FONT}
                    className="tabular-nums"
                    stroke="var(--panel)"
                    strokeWidth={STROKE.width.halo}
                    strokeLinejoin="round"
                    style={{ paintOrder: 'stroke fill' }}
                  >
                    <tspan fill="var(--ink)" fontWeight={on ? 700 : 600}>
                      {n.v}
                    </tspan>
                    <tspan fill="var(--ink)" fontWeight={500}>{` ${fmtInt(n.enc)}`}</tspan>
                  </text>
                </g>
              </g>
            );
          }),
        )}
      </svg>
      {tip.node}
    </>
  );
}
