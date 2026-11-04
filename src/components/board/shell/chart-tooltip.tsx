'use client';

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

const GAP = 12;

interface TipBoxProps {
  tip: TipState;
}

// Rendered into document.body: panels animate with transform, which would otherwise make a
// panel the containing block of a fixed box (tooltip pushed away) and its own stacking layer
// (tooltip hidden behind the next panel).
function TipBox({ tip }: TipBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: tip.x + GAP, top: tip.y + GAP });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const flipX = tip.x + GAP + width > window.innerWidth - 8;
    const flipY = tip.y + GAP + height > window.innerHeight - 8;
    setPos({
      left: flipX ? tip.x - GAP - width : tip.x + GAP,
      top: flipY ? Math.max(8, tip.y - GAP - height) : tip.y + GAP,
    });
  }, [tip.x, tip.y, tip.content]);
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="board-pop pointer-events-none fixed z-[100] max-w-72 rounded-control border border-gray-2 bg-panel px-3 py-2 text-(length:--font-size-label) leading-[18px] text-ink tabular-nums"
      style={{ left: pos.left, top: pos.top }}
    >
      {tip.content}
    </div>,
    document.body,
  );
}

// One floating tooltip per chart. show() on pointer move, hide() on leave.
export function useChartTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const show = useCallback((e: { clientX: number; clientY: number }, content: ReactNode) => {
    setTip({ x: e.clientX, y: e.clientY, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  const node = tip ? <TipBox tip={tip} /> : null;
  return { show, hide, node };
}
