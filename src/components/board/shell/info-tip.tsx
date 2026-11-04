'use client';

import { Info } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from 'react';

import { useChartTooltip } from './chart-tooltip';

interface InfoTipProps {
  /** What the note explains, read as "<label> 설명" by screen readers. */
  label: string;
  /** The explanation, shown in the shared portalled tooltip. */
  children: ReactNode;
}

/** How the note was opened: a mouse hover or keyboard focus (passing), or a click/tap (pinned). */
type Mode = 'hover' | 'focus' | 'pinned' | null;

/** Sent when a note opens, with its id: every other open note closes (one note at a time). */
const OPEN_EVENT = 'board-info-tip-open';

// ⓘ beside a panel title: the panel's reading notes live here instead of in sentences inside the
// panel. A mouse hover or keyboard focus shows them while it lasts; a click or tap pins them
// until the next click, a press elsewhere, blur or Esc (Esc closes only the note, not the detail).
// The same text is the button's accessible description.
export function InfoTip({ label, children }: InfoTipProps) {
  const { show, hide, node } = useChartTooltip();
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<Mode>(null);

  const close = () => {
    hide();
    setMode(null);
  };
  /** Shows the note at the button; false when the button is off screen. */
  const place = () => {
    const el = ref.current;
    if (!el) return false;
    const b = el.getBoundingClientRect();
    if (b.bottom < 0 || b.top > window.innerHeight) return false;
    show({ clientX: b.right - 6, clientY: b.bottom - 6 }, children);
    return true;
  };
  const open = (next: Exclude<Mode, null>) => {
    window.dispatchEvent(new CustomEvent<string>(OPEN_EVENT, { detail: id }));
    if (place()) setMode(next);
  };
  const follow = useEffectEvent(() => {
    if (!place()) close();
  });

  // While a note is open: another note opening, or a press elsewhere, closes it; a scroll (any
  // element, caught in the capture phase) or a resize moves it with its button, or closes it
  // once the button leaves the screen, so a pinned note never floats over other content. Esc
  // closes only the note: it is caught on document in the capture phase and marked handled, so
  // the board's Esc (close the detail) sees defaultPrevented, also when the note opened by hover.
  useEffect(() => {
    if (!mode) return undefined;
    const shut = () => {
      hide();
      setMode(null);
    };
    const onOther = (e: Event) => {
      if (e instanceof CustomEvent && e.detail !== id) shut();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      shut();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      shut();
    };
    const onMove = () => follow();
    window.addEventListener(OPEN_EVENT, onOther);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onMove, { capture: true, passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOther);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onMove, { capture: true });
      window.removeEventListener('resize', onMove);
    };
  }, [mode, hide, id]);

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
        className="board-control inline-flex size-6 shrink-0 items-center justify-center rounded-control text-gray-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
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
