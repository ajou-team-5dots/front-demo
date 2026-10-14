'use client';

import { arc, pie, type PieArcDatum } from 'd3';

import { cn } from '@/lib/utils';

export interface DonutItem {
  key: string;
  label: string;
  value: number;
  emphasis?: boolean;
}

interface DonutChartProps {
  items: DonutItem[];
  title: string;
  /** Big text in the middle; defaults to the first item's share. */
  centerLabel?: string;
  ariaLabel: string;
}

const SIZE = 180;
// Neutral steps for non-emphasized slices, darkest first.
const NEUTRAL = ['fill-data-bar', 'fill-data-bar/60', 'fill-data-bar/35', 'fill-data-bar/20'];

export function DonutChart({ items, title, centerLabel, ariaLabel }: DonutChartProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const arcs = pie<DonutItem>()
    .value((item) => item.value)
    .sort(null)(sorted);
  const shape = arc<PieArcDatum<DonutItem>>()
    .innerRadius(SIZE * 0.3)
    .outerRadius(SIZE * 0.48)
    .padAngle(0.015)
    .cornerRadius(3)
    // Fixed precision keeps server and client paths identical (trig results can differ).
    .digits(1);
  const neutral = sorted.filter((item) => !item.emphasis);
  const classes = new Map(
    sorted.map((item) => [
      item.key,
      item.emphasis
        ? 'fill-edit-dig'
        : NEUTRAL[Math.min(neutral.indexOf(item), NEUTRAL.length - 1)],
    ]),
  );
  const top = sorted[0];

  return (
    <figure className="flex flex-col items-center gap-3">
      <figcaption className="text-sm font-bold">{title}</figcaption>
      <svg
        viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
        className="w-40"
        role="img"
        aria-label={ariaLabel}
      >
        {arcs.map((slice) => (
          <path key={slice.data.key} d={shape(slice) ?? ''} className={classes.get(slice.data.key)}>
            <title>{`${slice.data.label} ${Math.round((slice.data.value / total) * 100)}%`}</title>
          </path>
        ))}
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-[26px] font-black"
        >
          {centerLabel ?? (top ? `${Math.round((top.value / total) * 100)}%` : '')}
        </text>
      </svg>
      <ul className="flex flex-col gap-1 text-xs">
        {sorted.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <svg viewBox="0 0 10 10" className="size-2.5 shrink-0" aria-hidden>
              <rect width="10" height="10" rx="2" className={classes.get(item.key)} />
            </svg>
            <span className={cn(item.emphasis && 'font-bold')}>{item.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
