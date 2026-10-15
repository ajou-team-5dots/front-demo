import { scaleLinear, scaleLog } from 'd3';

import { cn } from '@/lib/utils';

export interface DumbbellRow {
  key: string;
  label: string;
  from: number;
  to: number;
  /** Small text after the values, e.g. the sample size. */
  note?: string;
}

interface DumbbellChartProps {
  rows: DumbbellRow[];
  fromLabel: string;
  toLabel: string;
  unit: string;
  /** 'percent' takes 0..1 values on a linear 0–100% axis. */
  scale?: 'log' | 'percent';
  ariaLabel: string;
}

const WIDTH = 760;
const ROW = 30;
const PAD = { top: 26, left: 64, right: 220 };
const round = (value: number) => Math.round(value * 10) / 10;

/** One row per item: gray dot = before, colored dot = after, on a log scale. */
export function DumbbellChart({
  rows,
  fromLabel,
  toLabel,
  unit,
  scale = 'log',
  ariaLabel,
}: DumbbellChartProps) {
  const values = rows.flatMap((row) => [row.from, row.to]).map((value) => Math.max(value, 0.1));
  const percent = scale === 'percent';
  const x = percent
    ? scaleLinear()
        .domain([0, 1])
        .range([PAD.left, WIDTH - PAD.right])
    : scaleLog()
        .domain([Math.min(...values, 1), Math.max(...values, 10)])
        .nice()
        .range([PAD.left, WIDTH - PAD.right]);
  const height = PAD.top + rows.length * ROW;
  const [lo, hi] = x.domain();
  // A 1-2-5 sequence keeps log ticks readable.
  const ticks = percent
    ? [0, 0.25, 0.5, 0.75, 1]
    : [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500].filter(
        (value) => value >= lo && value <= hi,
      );
  const fmt = (value: number) => {
    if (percent) return `${Math.round(value * 100)}${unit}`;
    return `${value < 10 ? value.toFixed(1) : Math.round(value)}${unit}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={round(x(value))}
              x2={round(x(value))}
              y1={PAD.top - 8}
              y2={height}
              className="stroke-border"
            />
            <text
              x={round(x(value))}
              y={12}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {fmt(value)}
            </text>
          </g>
        ))}
        {rows.map((row, index) => {
          const y = PAD.top + index * ROW + ROW / 2;
          const falling = row.to < row.from;
          const xa = round(x(percent ? row.from : Math.max(row.from, 0.1)));
          const xb = round(x(percent ? row.to : Math.max(row.to, 0.1)));
          return (
            <g key={row.key}>
              <title>{`${row.label}: ${fmt(row.from)} → ${fmt(row.to)}`}</title>
              <text
                x={PAD.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-foreground text-[12px] font-bold"
              >
                {row.label}
              </text>
              <line
                x1={xa}
                x2={xb}
                y1={y}
                y2={y}
                strokeWidth={3}
                className={cn(falling ? 'stroke-primary/40' : 'stroke-data-bar/30')}
              />
              <circle cx={xa} cy={y} r={5} className="fill-data-bar/40" />
              <circle cx={xb} cy={y} r={5} className="fill-primary" />
              <text
                x={WIDTH - PAD.right + 12}
                y={y}
                dominantBaseline="middle"
                className="fill-foreground text-[12px] tabular-nums"
              >
                {`${fmt(row.from)} → ${fmt(row.to)}`}
                {row.note && <tspan className="fill-muted-foreground">{` · ${row.note}`}</tspan>}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
            <circle cx="5" cy="5" r="5" className="fill-data-bar/40" />
          </svg>
          {fromLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
            <circle cx="5" cy="5" r="5" className="fill-primary" />
          </svg>
          {toLabel}
        </li>
      </ul>
    </div>
  );
}
