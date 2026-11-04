import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { SIZE } from '@/styles/tokens';

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

// One header grammar for every panel, always in this order on one row (size.panel-header):
//   title · secondary figure · ⓘ · legend · warning chips ............ controls
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
    <div
      className={cn('flex h-(--size-panel-header) min-w-0 shrink-0 items-center gap-3', className)}
    >
      <h2 className="shrink-0 text-(length:--font-size-title) leading-6 font-semibold whitespace-nowrap text-ink">
        {title}
      </h2>
      {meta ? <span className={META}>{meta}</span> : null}
      {info ? (
        <span className="-ml-1.5 flex">
          <InfoTip label={title}>{info}</InfoTip>
        </span>
      ) : null}
      {legend ? <div className={LEGEND}>{legend}</div> : null}
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

interface PanelLegendProps {
  children: ReactNode;
  className?: string;
}

/** A legend on its own row under the header, for panels too narrow to hold it in the header row. */
export function PanelLegend({ children, className }: PanelLegendProps) {
  return <div className={cn(LEGEND, 'h-5', className)}>{children}</div>;
}

interface LineSwatchProps {
  color: string;
  width: number;
  dash?: string;
}

/** A short line key for line-chart legends (solid or dashed). */
export function LineSwatch({ color, width, dash }: LineSwatchProps) {
  return (
    <svg aria-hidden width={SIZE.legend.swatchW} height={4} className="shrink-0">
      <line
        x1={0}
        x2={SIZE.legend.swatchW}
        y1={2}
        y2={2}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dash}
      />
    </svg>
  );
}
