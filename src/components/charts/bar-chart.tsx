'use client';

import { scaleLinear } from 'd3';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Text after the bar; defaults to the value as a percent. */
  valueLabel?: string;
  /** Thin marker for a reference value (e.g. the all-entities average). */
  compare?: number;
  emphasis?: boolean;
  selected?: boolean;
  /** Clicking the bar navigates here. */
  href?: string;
}

interface BarChartProps {
  items: BarItem[];
  /** Upper end of the scale. Defaults to the largest value (or compare). */
  max?: number;
  labelWidth?: number;
  rowHeight?: number;
  width?: number;
  /** Room for the text after each bar. */
  valueWidth?: number;
  className?: string;
  ariaLabel: string;
}

const percent = (value: number) =>
  value > 0 && value < 0.01 ? '<1%' : `${Math.round(value * 100)}%`;
const round = (value: number) => Math.round(value * 10) / 10;

export function BarChart({
  items,
  max,
  labelWidth = 150,
  rowHeight = 34,
  width = 560,
  valueWidth = 56,
  className,
  ariaLabel,
}: BarChartProps) {
  const router = useRouter();
  const domainMax =
    max ?? Math.max(...items.map((item) => Math.max(item.value, item.compare ?? 0)), 0.0001);
  const x = scaleLinear()
    .domain([0, domainMax])
    .range([0, width - labelWidth - valueWidth]);
  const height = items.length * rowHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-auto w-full overflow-visible', className)}
      role="img"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const y = index * rowHeight;
        const barHeight = Math.min(16, rowHeight * 0.5);
        const barY = round(y + (rowHeight - barHeight) / 2);
        const barWidth = round(Math.max(x(item.value), 2));
        const { href } = item;
        const go = href ? () => router.push(href, { scroll: false }) : undefined;
        return (
          <g
            key={item.key}
            className={cn(href && 'cursor-pointer')}
            onClick={go}
            onKeyDown={(event) => {
              if (go && event.key === 'Enter') go();
            }}
            role={href ? 'link' : undefined}
            tabIndex={href ? 0 : undefined}
          >
            {item.selected && (
              <rect
                x={0}
                y={y + 1}
                width={width}
                height={rowHeight - 2}
                rx={8}
                className="fill-accent"
              />
            )}
            <text
              x={labelWidth - 10}
              y={y + rowHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className={cn('fill-foreground text-[13px]', item.selected && 'font-bold')}
            >
              {item.label.length > 18 ? `${item.label.slice(0, 17)}…` : item.label}
              <title>{item.label}</title>
            </text>
            <rect
              x={labelWidth}
              y={barY}
              width={round(x(domainMax))}
              height={barHeight}
              rx={barHeight / 2}
              className="fill-muted"
            />
            <rect
              x={labelWidth}
              y={barY}
              width={barWidth}
              height={barHeight}
              rx={barHeight / 2}
              className={cn(
                item.emphasis ? 'fill-edit-dig' : 'fill-data-bar',
                item.selected && !item.emphasis && 'fill-primary',
              )}
            />
            {item.compare !== undefined && (
              <line
                x1={round(labelWidth + x(item.compare))}
                x2={round(labelWidth + x(item.compare))}
                y1={barY - 4}
                y2={barY + barHeight + 4}
                strokeWidth={2.5}
                className="stroke-foreground"
              />
            )}
            <text
              x={width - valueWidth + 8}
              y={y + rowHeight / 2}
              dominantBaseline="middle"
              className="fill-foreground text-[13px] font-bold tabular-nums"
            >
              {item.valueLabel ?? percent(item.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
