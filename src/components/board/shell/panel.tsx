import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PanelProps {
  title?: string;
  /** Small line under the title (Figma 25:42, 11px gray). */
  hint?: string;
  /** Controls placed right of the title (Figma 25:173 patch select). */
  actions?: ReactNode;
  className?: string;
  /** Fade-in order when data arrives (0 first). */
  enter?: 0 | 1 | 2;
  children?: ReactNode;
}

// White card used by every section (Figma frames 25:33, 25:34, 25:35 ...): radius 10,
// title 18 SemiBold at 16/12.
const ENTER_DELAY = ['', 'board-enter-1', 'board-enter-2'] as const;

export function Panel({ title, hint, actions, className, enter = 0, children }: PanelProps) {
  return (
    <section
      className={cn(
        'board-enter board-dim relative flex flex-col rounded-panel bg-panel px-(--space-panel-inset) pt-(--space-panel-top)',
        ENTER_DELAY[enter],
        className,
      )}
    >
      {title ? (
        <div className="flex min-h-[22px] items-center gap-5">
          <h2 className="text-(length:--font-size-title) leading-[22px] font-semibold text-ink">
            {title}
          </h2>
          {actions}
        </div>
      ) : null}
      {hint ? (
        <p className="mt-0.5 text-(length:--font-size-caption) leading-[13px] font-semibold text-gray-1">
          {hint}
        </p>
      ) : null}
      {children}
    </section>
  );
}
