'use client';

import { scaleLinear } from 'd3';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';

export interface StackedSeries {
  key: string;
  label: string;
  /** Tailwind fill class (a data token). */
  fill: string;
}

export interface StackedRow {
  key: string;
  label: string;
  sub?: string;
  href?: string;
  selected?: boolean;
  segments: { key: string; share: number }[];
}

interface StackedBarProps {
  rows: StackedRow[];
  series: StackedSeries[];
  ariaLabel: string;
}

const WIDTH = 760;
const LABEL = 120;
const ROW = 30;
const round = (value: number) => Math.round(value * 10) / 10;

/** 100% stacked horizontal bars: each row is one whole split into series. */
export function StackedBar({ rows, series, ariaLabel }: StackedBarProps) {
  const router = useRouter();
  const x = scaleLinear()
    .domain([0, 1])
    .range([LABEL, WIDTH - 8]);
  const fillOf = new Map(series.map((item) => [item.key, item.fill]));
  const labelOf = new Map(series.map((item) => [item.key, item.label]));

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${rows.length * ROW}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {rows.map((row, index) => {
          const y = index * ROW;
          const total = row.segments.reduce((sum, segment) => sum + segment.share, 0) || 1;
          let start = 0;
          const { href } = row;
          return (
            <g
              key={row.key}
              className={cn(href && 'cursor-pointer')}
              role={href ? 'link' : undefined}
              tabIndex={href ? 0 : undefined}
              onClick={href ? () => router.push(href, { scroll: false }) : undefined}
              onKeyDown={(event) => {
                if (href && event.key === 'Enter') router.push(href, { scroll: false });
              }}
            >
              <text
                x={LABEL - 10}
                y={y + ROW / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className={cn('fill-foreground text-[13px]', row.selected && 'font-bold')}
              >
                {row.label}
                {row.sub && (
                  <tspan className="fill-muted-foreground text-[11px]">{` ${row.sub}`}</tspan>
                )}
              </text>
              {row.segments.map((segment) => {
                const share = segment.share / total;
                const x0 = x(start);
                start += share;
                const width = x(start) - x0;
                if (width <= 0) return null;
                return (
                  <rect
                    key={segment.key}
                    x={round(x0)}
                    y={y + 6}
                    width={round(Math.max(width - 1, 0.5))}
                    height={ROW - 12}
                    className={fillOf.get(segment.key)}
                  >
                    <title>{`${row.label} · ${labelOf.get(segment.key) ?? segment.key} ${Math.round(share * 100)}%`}</title>
                  </rect>
                );
              })}
              {row.selected && (
                <rect
                  x={LABEL - 2}
                  y={y + 4}
                  width={WIDTH - LABEL - 4}
                  height={ROW - 8}
                  rx={3}
                  fill="none"
                  strokeWidth={2}
                  className="stroke-primary"
                />
              )}
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <rect width="10" height="10" rx="2" className={item.fill} />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
