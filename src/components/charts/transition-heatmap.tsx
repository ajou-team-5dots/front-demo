'use client';

import { scaleBand } from 'd3';

import { ACTION_ORDER } from '@/lib/action-family';
import type { TransitionShare } from '@/types/viz';

interface TransitionHeatmapProps {
  cells: TransitionShare[];
  ariaLabel: string;
}

const IDLE = '60초 이상 없음';
const LEFT = 92;
const TOP = 96;
const CELL = 42;
const round = (value: number) => Math.round(value * 100) / 100;

/** Rows = previous action, columns = next action, same order so repeats run down the diagonal. */
export function TransitionHeatmap({ cells, ariaLabel }: TransitionHeatmapProps) {
  const rows = ACTION_ORDER.filter((action) => cells.some((cell) => cell.src === action));
  const columns = [...rows, IDLE];
  const x = scaleBand()
    .domain(columns)
    .range([LEFT, LEFT + columns.length * CELL]);
  const y = scaleBand()
    .domain(rows)
    .range([TOP, TOP + rows.length * CELL]);
  const lookup = new Map(cells.map((cell) => [`${cell.src}|${cell.dst}`, cell]));
  const width = LEFT + columns.length * CELL + 4;
  const height = TOP + rows.length * CELL + 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {columns.map((column) => (
        <text
          key={`c-${column}`}
          transform={`translate(${(x(column) ?? 0) + CELL / 2}, ${TOP - 8}) rotate(-50)`}
          className="fill-muted-foreground text-[11px]"
        >
          {column}
        </text>
      ))}
      {rows.map((row) => (
        <text
          key={`r-${row}`}
          x={LEFT - 8}
          y={(y(row) ?? 0) + CELL / 2}
          textAnchor="end"
          dominantBaseline="middle"
          className="fill-muted-foreground text-[11px]"
        >
          {row}
        </text>
      ))}
      {rows.map((row) =>
        columns.map((column) => {
          const cell = lookup.get(`${row}|${column}`);
          const share = cell?.share ?? 0;
          return (
            <g key={`${row}-${column}`}>
              <rect
                x={x(column)}
                y={y(row)}
                width={CELL - 2}
                height={CELL - 2}
                rx={4}
                fillOpacity={share > 0 ? round(0.08 + 0.92 * share) : 1}
                className={share > 0 ? 'fill-data-bar' : 'fill-muted'}
                stroke={row === column ? 'currentColor' : 'none'}
              >
                <title>{`${row} → ${column} ${Math.round(share * 100)}%`}</title>
              </rect>
              {share >= 0.1 && (
                <text
                  x={(x(column) ?? 0) + (CELL - 2) / 2}
                  y={(y(row) ?? 0) + (CELL - 2) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={
                    share >= 0.45
                      ? 'fill-white text-[11px] font-bold'
                      : 'fill-foreground text-[11px]'
                  }
                >
                  {Math.round(share * 100)}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
