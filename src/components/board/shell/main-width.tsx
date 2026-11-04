'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

/**
 * The board's main area (frame − side padding − 320 sidebar − 14 gap) at the 1440 frame. The
 * server renders with it; the client measures the real width before its first paint.
 */
export const MAIN_W_MIN = 1066;
/** Main-area width from which the detail lays out its wide arrangement (container query too). */
export const MAIN_W_WIDE = 1200;
/** Quiet time after a resize before chart marks glide again. */
const SETTLE_MS = 160;

const MainWidthContext = createContext(MAIN_W_MIN);

export const MainWidthProvider = MainWidthContext.Provider;

/**
 * Width of the board's main area (the overview and the detail slot), in px. Only for components
 * that hydrate with the board itself: the streamed detail hydrates after the board measured, so
 * it must start from MAIN_W_MIN and measure itself (useMeasuredWidth) to match the server HTML.
 */
export function useMainWidth(): number {
  return useContext(MainWidthContext);
}

interface MeasuredWidth {
  width: number;
  /**
   * False until the first measurement has painted and while a resize is going on: the board then
   * sets data-board-still, which turns transitions off so marks jump to the new size instead of
   * gliding (hydration never animates).
   */
  settled: boolean;
}

/** Content width of `ref`, kept current with a ResizeObserver. */
export function useMeasuredWidth(
  ref: RefObject<HTMLElement | null>,
  fallback = MAIN_W_MIN,
): MeasuredWidth {
  const [width, setWidth] = useState(fallback);
  const [settled, setSettled] = useState(false);
  const last = useRef(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const measure = (w: number, quiet = false) => {
      const next = Math.round(w);
      if (next <= 0 || next === last.current) return;
      last.current = next;
      setWidth(next);
      if (quiet) return;
      cancelAnimationFrame(frame);
      setSettled(false);
      clearTimeout(timer);
      timer = setTimeout(() => setSettled(true), SETTLE_MS);
    };
    // First measurement in the same commit as hydration, so the first client paint already has
    // the real width; transitions stay off until two frames later.
    measure(el.getBoundingClientRect().width, true);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSettled(true));
    });
    const ro = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect.width);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [fallback, ref]);

  return { width, settled };
}

/**
 * Border-box height of `ref`, kept current with a ResizeObserver. Starts at `fallback` (the
 * server render) and measures before the first client paint.
 */
export function useMeasuredHeight(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [height, setHeight] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) setHeight(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return height;
}
