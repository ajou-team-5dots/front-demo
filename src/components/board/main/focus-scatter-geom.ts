import type { MonsterRole } from '@/types/monsters';

// Pure geometry for the focus scatter: scales, ticks, the same-spot spread and label placement.

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Placed {
  x: number;
  y: number;
  anchor: 'start' | 'end' | 'middle';
  box: Box;
}

export const overlaps = (a: Box, b: Box, pad: number) =>
  !(a.x2 + pad < b.x1 || a.x1 - pad > b.x2 || a.y2 + pad < b.y1 || a.y1 - pad > b.y2);

/** Rounded to 2 decimals so the server and client write the same numbers. */
export const r2 = (v: number) => Math.round(v * 100) / 100;

/** Half side of a square / half diagonal of a diamond with the area of a unit circle. */
export const SQUARE_HALF = Math.sqrt(Math.PI) / 2;
export const DIAMOND_HALF = Math.sqrt(Math.PI / 2);

/** Farthest reach of a role shape from its center, as a multiple of its radius. */
export const reach = (role: MonsterRole) => (role === 'mob' ? 1 : DIAMOND_HALF);

const X_TICK_CANDIDATES = [
  1, 2, 5, 10, 20, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000,
];

/** Ticks on the square-root deaths axis, at least `minGap` px apart. */
export function sqrtTicks(max: number, plotW: number, minGap = 56): number[] {
  const pos = (v: number) => (Math.sqrt(v) / Math.sqrt(max)) * plotW;
  const ticks = [0];
  X_TICK_CANDIDATES.forEach((c) => {
    if (c > max) return;
    if (pos(c) - pos(ticks[ticks.length - 1]) >= minGap) ticks.push(c);
  });
  return ticks;
}

/** Linear 0..max, max rounded up to a whole step with a little headroom (at least 3×). */
export function riskScale(rawMax: number): { max: number; ticks: number[] } {
  const step = rawMax > 8 ? 2 : 1;
  const max = Math.max(3, Math.ceil((rawMax * 1.1) / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  return { max, ticks };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Rough rendered width of a label: Hangul is wide, Latin/digits narrower. */
export function textWidth(s: string, fontSize: number): number {
  let w = 0;
  [...s].forEach((ch) => {
    if (/[ㄱ-힝]/.test(ch)) w += fontSize * 0.95;
    else if (ch === ' ') w += fontSize * 0.3;
    else w += fontSize * 0.58;
  });
  return w;
}

export interface SpotPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Keeps marks from piling up. Points closer than `same` px share a spot (e.g. 0 deaths at 0배)
 * and list each other as mates. Each point keeps its y (the risk) and, if it would overlap an
 * already placed mark, slides sideways by `step` (right first, then left) to the nearest free x
 * inside [left, right]. So the origin cluster stays on the baseline and grows right. Placement
 * order is fixed (lowest risk, then name) so the layout is stable between renders.
 */
export function dodge(
  pts: SpotPoint[],
  same: number,
  step: number,
  left: number,
  right: number,
): Map<string, { x: number; mates: string[] }> {
  const out = new Map<string, { x: number; mates: string[] }>();
  const placed: SpotPoint[] = [];
  const free = (x: number, y: number) => placed.every((q) => Math.hypot(q.x - x, q.y - y) >= step);
  [...pts]
    .sort((a, b) => b.y - a.y || a.x - b.x || a.id.localeCompare(b.id))
    .forEach((p) => {
      let x = Math.min(Math.max(left, p.x), right);
      for (let k = 1; k <= 24 && !free(x, p.y); k += 1) {
        const cand = p.x + Math.ceil(k / 2) * step * (k % 2 ? 1 : -1);
        if (cand >= left && cand <= right && free(cand, p.y)) x = cand;
      }
      placed.push({ id: p.id, x, y: p.y });
      const mates = pts
        .filter((q) => q.id !== p.id && Math.hypot(q.x - p.x, q.y - p.y) < same)
        .map((q) => q.id)
        .sort((m, n) => m.localeCompare(n));
      out.set(p.id, { x, mates });
    });
  return out;
}

export interface LabelTarget {
  id: string;
  x: number;
  y: number;
  /** Clearance from the center to the mark edge. */
  reach: number;
}

/**
 * Direct labels for `targets` (in priority order). Each tries spots around its mark and takes the
 * first free of other labels, fixed boxes and marks; failing that, the first free of labels and
 * fixed boxes; failing that, the first in bounds, so no target goes unlabelled.
 */
export function placeLabels(
  targets: LabelTarget[],
  marks: LabelTarget[],
  fixed: Box[],
  bounds: Box,
  charW: number,
): Map<string, Placed> {
  const labels = new Map<string, Placed>();
  const inBounds = (b: Box) =>
    b.x1 >= bounds.x1 && b.x2 <= bounds.x2 && b.y1 >= bounds.y1 && b.y2 <= bounds.y2;
  const hitsLabel = (b: Box) =>
    fixed.some((f) => overlaps(b, f, 2)) || [...labels.values()].some((l) => overlaps(b, l.box, 2));
  const hitsMark = (b: Box) =>
    marks.some((q) =>
      overlaps(
        b,
        { x1: q.x - q.reach, y1: q.y - q.reach, x2: q.x + q.reach, y2: q.y + q.reach },
        1,
      ),
    );
  targets.forEach((t) => {
    const w = t.id.length * charW + 4;
    const o = t.reach + 3;
    const cands: Placed[] = [];
    const side = (dx: number, dy: number) => {
      const y = t.y + dy;
      cands.push(
        {
          x: t.x + o + dx,
          y: y + 4,
          anchor: 'start',
          box: { x1: t.x + o + dx, y1: y - 7, x2: t.x + o + dx + w, y2: y + 6 },
        },
        {
          x: t.x - o - dx,
          y: y + 4,
          anchor: 'end',
          box: { x1: t.x - o - dx - w, y1: y - 7, x2: t.x - o - dx, y2: y + 6 },
        },
      );
    };
    const vert = (dy: number) => {
      cands.push(
        {
          x: t.x,
          y: t.y - o - 2 - dy,
          anchor: 'middle',
          box: { x1: t.x - w / 2, y1: t.y - o - 13 - dy, x2: t.x + w / 2, y2: t.y - o - dy },
        },
        {
          x: t.x,
          y: t.y + o + 10 + dy,
          anchor: 'middle',
          box: { x1: t.x - w / 2, y1: t.y + o + dy, x2: t.x + w / 2, y2: t.y + o + 13 + dy },
        },
      );
    };
    side(0, 0);
    vert(0);
    [-12, 12, -22, 22].forEach((dy) => side(0, dy));
    vert(10);
    [-34, 34].forEach((dy) => side(6, dy));
    const ok = cands.filter((c) => inBounds(c.box) && !hitsLabel(c.box));
    const chosen = ok.find((c) => !hitsMark(c.box)) ?? ok[0] ?? cands.find((c) => inBounds(c.box));
    if (chosen) labels.set(t.id, chosen);
    else labels.set(t.id, cands[0]);
  });
  return labels;
}
