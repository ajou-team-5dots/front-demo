import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { PanelHeader, type PanelHeaderProps } from './panel-header';

interface PanelProps extends Partial<Omit<PanelHeaderProps, 'className'>> {
  className?: string;
  /** Fade-in order when data arrives (0 first). */
  enter?: 0 | 1 | 2;
  children?: ReactNode;
}

// White card used by every section (Figma frames 25:33, 25:34, 25:35 ...): radius 10, no border or
// shadow. The header row is the shared PanelHeader (title · figure · legend · ⓘ · chips · controls).
const ENTER_DELAY = ['', 'board-enter-1', 'board-enter-2'] as const;

export function Panel({
  title,
  meta,
  legend,
  info,
  chips,
  controls,
  className,
  enter = 0,
  children,
}: PanelProps) {
  return (
    <section
      className={cn(
        'board-enter board-dim relative flex flex-col rounded-panel bg-panel px-(--space-panel-inset) pt-(--space-panel-top)',
        ENTER_DELAY[enter],
        className,
      )}
    >
      {title ? (
        <PanelHeader
          title={title}
          meta={meta}
          legend={legend}
          info={info}
          chips={chips}
          controls={controls}
        />
      ) : null}
      {children}
    </section>
  );
}
