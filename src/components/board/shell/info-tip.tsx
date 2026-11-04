'use client';

import { Info } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useChartTooltip } from './chart-tooltip';

interface InfoTipProps {
  /** What the note explains, read as "<label> 설명" by screen readers. */
  label: string;
  /** The explanation, shown in the shared portalled tooltip. */
  children: ReactNode;
}

/** How the note was opened: a mouse hover or keyboard focus (passing), or a click/tap (pinned). */
type Mode = 'hover' | 'focus' | 'pinned' | null;

// ⓘ beside a panel title: the panel's reading notes live here instead of in sentences inside the
// panel. A mouse hover or keyboard focus shows them while it lasts; a click or tap pins them
// until the next click, a press elsewhere, blur or Esc (Esc closes only the note, not the detail).
// The same text is the button's accessible description.
export function InfoTip({ label, children }: InfoTipProps) {
  const { show, hide, node } = useChartTooltip();
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<Mode>(null);

  const open = (next: Exclude<Mode, null>) => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    show({ clientX: b.right - 6, clientY: b.bottom - 6 }, children);
    setMode(next);
  };
  const close = () => {
    hide();
    setMode(null);
  };

  // A press anywhere else closes a pinned (or hovered) note.
  useEffect(() => {
    if (!mode) return undefined;
    const onDown = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      hide();
      setMode(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [mode, hide]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`${label} 설명`}
        aria-describedby={id}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse' && !mode) open('hover');
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse' && mode === 'hover') close();
        }}
        onFocus={(e) => {
          // Keyboard focus only; focus from a click or tap is handled by onClick.
          if (e.currentTarget.matches(':focus-visible') && !mode) open('focus');
        }}
        onBlur={close}
        onClick={() => (mode === 'pinned' ? close() : open('pinned'))}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && mode) {
            e.preventDefault();
            close();
          }
        }}
        className="board-control inline-flex size-6 shrink-0 items-center justify-center rounded-pill text-gray-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      >
        <Info aria-hidden className="size-(--size-icon-info)" />
      </button>
      <span id={id} hidden>
        {children}
      </span>
      {node}
    </>
  );
}
