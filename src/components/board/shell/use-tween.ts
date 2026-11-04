'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { MOTION } from '@/styles/tokens';

/** Solver for CSS cubic-bezier(x1, y1, x2, y2): maps progress t in [0, 1] to eased progress. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sy = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  /** Curve parameter s whose x is t: Newton steps, then bisection if they stall. */
  const solve = (t: number) => {
    let s = t;
    for (let i = 0; i < 8; i += 1) {
      const err = sx(s) - t;
      if (Math.abs(err) < 1e-6) return s;
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = t;
    for (let i = 0; i < 30 && hi - lo > 1e-6; i += 1) {
      if (sx(s) < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sy(solve(t));
  };
}

/** The board's one easing (token motion.ease.board, CSS --ease-board). */
export const EASE_BOARD = cubicBezier(...MOTION.ease.board);

const REDUCE = '(prefers-reduced-motion: reduce)';
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const getReduce = () => window.matchMedia(REDUCE).matches;
const getReduceServer = () => false;

interface TweenOptions {
  /** Milliseconds, default 320 (--duration-slow). */
  duration?: number;
  ease?: (t: number) => number;
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Animates a list of numbers toward `target` with requestAnimationFrame, so geometry derived
 * from them (a polygon and its vertices, a line and its points) moves in the same frame. The
 * first render returns the target (no animation from 0 on mount), a new target mid-flight
 * continues from the value on screen, and under prefers-reduced-motion it jumps. A target of
 * another length also jumps.
 */
export function useTween(
  target: number[],
  { duration = 320, ease = EASE_BOARD }: TweenOptions = {},
): number[] {
  const reduced = useSyncExternalStore(subscribeReduce, getReduce, getReduceServer);
  const [value, setValue] = useState(target);
  /** The value on screen, read by the next animation as its start. */
  const current = useRef(target);
  const key = JSON.stringify(target);

  useEffect(() => {
    const to = JSON.parse(key) as number[];
    const from = current.current;
    if (same(from, to)) return undefined;
    let frame = 0;
    if (reduced || from.length !== to.length || duration <= 0) {
      current.current = to;
      frame = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const e = ease(t);
      const v = t >= 1 ? to : from.map((f, i) => f + (to[i] - f) * e);
      current.current = v;
      setValue(v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, reduced, duration, ease]);

  return reduced || value.length !== target.length ? target : value;
}
