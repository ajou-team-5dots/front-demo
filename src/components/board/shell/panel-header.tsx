import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { InfoTip } from './info-tip';

export interface PanelHeaderProps {
  title: string;
  /** Secondary figure right after the title, e.g. "종합 21위 / 36종" or "36종". */
  meta?: ReactNode;
  /** Legend items (swatch + text), after the figure. */
  legend?: ReactNode;
  /** Reading notes moved out of the panel body into the ⓘ tooltip. */
  info?: ReactNode;
  /** Short warnings that change how the panel reads ("수치 미변경", "표본 부족"); stay visible. */
  chips?: ReactNode;
  /** Controls (segment, select) at the row's right end. */
  controls?: ReactNode;
  className?: string;
}

/** Text style shared by every header's secondary figure. Numbers inside it set text-ink. */
const META =
  'text-(length:--font-size-label) font-semibold whitespace-nowrap text-gray-1 tabular-nums';
const LEGEND =
  'flex items-center gap-3 text-(length:--font-size-label) font-medium whitespace-nowrap text-gray-1';

// One header grammar for every panel, always in this order on one 30px row:
//   title · secondary figure · legend · ⓘ · warning chips ............ controls
export function PanelHeader({
  title,
  meta,
  legend,
  info,
  chips,
  controls,
  className,
}: PanelHeaderProps) {
  return (
    <div className={cn('flex h-[30px] min-w-0 shrink-0 items-center gap-3', className)}>
      <h2 className="shrink-0 text-(length:--font-size-title) leading-6 font-semibold whitespace-nowrap text-ink">
        {title}
      </h2>
      {meta ? <span className={META}>{meta}</span> : null}
      {legend ? <div className={LEGEND}>{legend}</div> : null}
      {info ? (
        <span className="-ml-1.5 flex">
          <InfoTip label={title}>{info}</InfoTip>
        </span>
      ) : null}
      {chips ? <div className="flex min-w-0 items-center gap-1.5">{chips}</div> : null}
      {controls ? <div className="ml-auto flex shrink-0 items-center gap-3">{controls}</div> : null}
    </div>
  );
}

interface LegendItemProps {
  swatch: ReactNode;
  children: ReactNode;
}

/** One legend entry: its swatch, then the label. */
export function LegendItem({ swatch, children }: LegendItemProps) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      {children}
    </span>
  );
}
