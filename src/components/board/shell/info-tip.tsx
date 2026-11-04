'use client';

import { Info } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { useChartTooltip } from './chart-tooltip';

interface InfoTipProps {
  /** What the note explains, read as "<label> 설명" by screen readers. */
  label: string;
  /** The explanation, shown in the shared portalled tooltip. */
  children: ReactNode;
}

// ⓘ beside a panel title: the panel's reading notes live here instead of in sentences inside the
// panel. Hover or keyboard focus shows them; a click (touch) toggles; Esc hides them without
// closing the detail. The same text is the button's accessible description.
export function InfoTip({ label, children }: InfoTipProps) {
  const tip = useChartTooltip();
  const id = useId();
  const [open, setOpen] = useState(false);
  const showAt = (el: HTMLElement) => {
    const b = el.getBoundingClientRect();
    tip.show({ clientX: b.right - 6, clientY: b.bottom - 6 }, children);
    setOpen(true);
  };
  const hide = () => {
    tip.hide();
    setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        aria-label={`${label} 설명`}
        aria-describedby={id}
        aria-expanded={open}
        onPointerEnter={(e) => showAt(e.currentTarget)}
        onPointerLeave={hide}
        onFocus={(e) => showAt(e.currentTarget)}
        onBlur={hide}
        onClick={(e) => (open ? hide() : showAt(e.currentTarget))}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.preventDefault();
            hide();
          }
        }}
        className="board-control inline-flex size-6 shrink-0 items-center justify-center rounded-pill text-gray-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      >
        <Info aria-hidden className="size-(--size-icon-info)" />
      </button>
      <span id={id} hidden>
        {children}
      </span>
      {tip.node}
    </>
  );
}
