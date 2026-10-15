import { scaleLinear } from 'd3';

import { cn } from '@/lib/utils';

import type { StackedSeries } from './stacked-bar';

export interface ColumnBin {
  key: string;
  /** Axis text under the column. */
  label: string;
  /** Count per series key. */
  values: Record<string, number>;
}

interface ColumnChartProps {
  bins: ColumnBin[];
  series: StackedSeries[];
  /** Show each column as a share of all counts instead of raw counts. */
  asShare?: boolean;
  /** Values are already 0..1 shares; label ticks as percents. */
  percent?: boolean;
  /** 'stack' piles series in one column; 'group' puts them side by side. */
  layout?: 'stack' | 'group';
  /** Line under the axis, e.g. the unit. */
  axisLabel?: string;
  ariaLabel: string;
}

const WIDTH = 760;
const HEIGHT = 240;
const PAD = { top: 16, right: 8, bottom: 40, left: 44 };
const round = (value: number) => Math.round(value * 10) / 10;
const total = (bin: ColumnBin) => Object.values(bin.values).reduce((sum, value) => sum + value, 0);

/** Vertical columns for a binned distribution; series stack inside each column. */
export function ColumnChart({
  bins,
  series,
  asShare = false,
  percent = false,
  layout = 'stack',
  axisLabel,
  ariaLabel,
}: ColumnChartProps) {
  const grand = bins.reduce((sum, bin) => sum + total(bin), 0) || 1;
  const scaleOf = (value: number) => (asShare ? value / grand : value);
  const grouped = layout === 'group';
  const max = Math.max(
    ...bins.map((bin) =>
      grouped
        ? Math.max(...series.map((item) => scaleOf(bin.values[item.key] ?? 0)))
        : scaleOf(total(bin)),
    ),
    0.0001,
  );
  const y = scaleLinear()
    .domain([0, max])
    .nice(4)
    .range([HEIGHT - PAD.bottom, PAD.top]);
  const step = (WIDTH - PAD.left - PAD.right) / Math.max(bins.length, 1);
  const barWidth = Math.max(step * 0.72, 2);
  const tick = (value: number) =>
    asShare || percent ? `${Math.round(value * 100)}%` : value.toLocaleString('ko-KR');

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {y.ticks(4).map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={round(y(value))}
              y2={round(y(value))}
              className="stroke-border"
            />
            <text
              x={PAD.left - 6}
              y={round(y(value))}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {tick(value)}
            </text>
          </g>
        ))}
        {bins.map((bin, index) => {
          const x0 = PAD.left + index * step + (step - barWidth) / 2;
          let acc = 0;
          return (
            <g key={bin.key}>
              {series.map((item, seriesIndex) => {
                const value = scaleOf(bin.values[item.key] ?? 0);
                if (value <= 0) return null;
                const base = grouped ? 0 : acc;
                const top = y(base + value);
                const height = y(base) - top;
                acc += value;
                const width = grouped ? barWidth / series.length : barWidth;
                return (
                  <rect
                    key={item.key}
                    x={round(grouped ? x0 + seriesIndex * width : x0)}
                    y={round(top)}
                    width={round(Math.max(width - (grouped ? 1 : 0), 0.5))}
                    height={round(Math.max(height, 0.5))}
                    className={item.fill}
                  >
                    <title>{`${bin.label} · ${item.label} ${tick(value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={round(x0 + barWidth / 2)}
                y={HEIGHT - PAD.bottom + 16}
                textAnchor="middle"
                className="fill-foreground text-[11px]"
              >
                {bin.label}
              </text>
            </g>
          );
        })}
        {axisLabel && (
          <text
            x={WIDTH - PAD.right}
            y={HEIGHT - 4}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {axisLabel}
          </text>
        )}
      </svg>
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {series.map((item) => (
            <li key={item.key} className={cn('flex items-center gap-1.5')}>
              <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
                <rect width="10" height="10" rx="2" className={item.fill} />
              </svg>
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
