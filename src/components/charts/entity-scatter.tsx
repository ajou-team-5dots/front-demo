'use client';

import { max as d3Max, scaleLinear, scaleLog, scaleSqrt } from 'd3';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface ScatterPoint {
  slug: string;
  name: string;
  x: number;
  y: number;
  /** Drives dot area. */
  size: number;
  /** Drawn as a ring (e.g. one player made most of the runs). */
  hollow?: boolean;
  /** 0..1 strength of the emphasis color fill (e.g. share of target_change). */
  intensity?: number;
  /** Category color; overrides intensity. */
  tone?: 'dig' | 'release' | 'none';
}

export interface ScatterAnnotation {
  slug: string;
  lines: string[];
}

const TONE_FILL = {
  dig: 'fill-edit-dig',
  release: 'fill-reason-release',
  none: 'fill-muted-foreground',
};

const fillClass = (point: ScatterPoint) => {
  if (point.tone) return TONE_FILL[point.tone];
  return point.intensity !== undefined ? 'fill-edit-dig' : 'fill-data-bar';
};

interface EntityScatterProps {
  points: ScatterPoint[];
  selectedSlug: string;
  /** Point clicks go to `${basePath}/${slug}`. */
  basePath: string;
  xLabel: string;
  yLabel: string;
  sizeLabel: string;
  /** Labels these slugs on the chart besides the selected one. */
  labelSlugs?: string[];
  /** Fixed x range; defaults to the data range. */
  xDomain?: [number, number];
  annotations?: ScatterAnnotation[];
  ariaLabel: string;
}

const WIDTH = 760;
const HEIGHT = 380;
const MARGIN = { top: 36, right: 24, bottom: 44, left: 56 };
const round = (value: number) => Math.round(value * 10) / 10;

export function EntityScatter({
  points,
  selectedSlug,
  basePath,
  xLabel,
  yLabel,
  sizeLabel,
  labelSlugs = [],
  xDomain,
  annotations = [],
  ariaLabel,
}: EntityScatterProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);

  const xMax = d3Max(points, (point) => point.x) ?? 10;
  const xMin = Math.max(1, Math.min(...points.map((point) => point.x)));
  const x = scaleLog()
    .domain(xDomain ?? [xMin * 0.8, xMax * 1.25])
    .range([MARGIN.left, WIDTH - MARGIN.right]);
  const y = scaleLinear()
    .domain([0, Math.min(1, (d3Max(points, (point) => point.y) ?? 1) * 1.1)])
    .nice()
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  const r = scaleSqrt()
    .domain([0, d3Max(points, (point) => point.size) ?? 1])
    .range([3, 16]);
  const xTicks = x.ticks(6).filter((tick) => [1, 2, 5].includes(Number(String(tick)[0])));
  const yTicks = y.ticks(5);
  // Annotated points carry their own text, so they get no plain label.
  const annotated = new Set(annotations.map((note) => note.slug));
  const labelled = new Set([selectedSlug, ...labelSlugs].filter((slug) => !annotated.has(slug)));
  // Draw the selected point last so it sits on top.
  const ordered = [...points].sort(
    (a, b) => Number(a.slug === selectedSlug) - Number(b.slug === selectedSlug) || b.size - a.size,
  );

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={round(y(tick))}
              y2={round(y(tick))}
              className="stroke-border"
            />
            <text
              x={MARGIN.left - 10}
              y={round(y(tick))}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[12px]"
            >
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text
            key={`x-${tick}`}
            x={round(x(tick))}
            y={HEIGHT - MARGIN.bottom + 20}
            textAnchor="middle"
            className="fill-muted-foreground text-[12px]"
          >
            {tick.toLocaleString('en-US')}
          </text>
        ))}
        <text
          x={WIDTH - MARGIN.right}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-muted-foreground text-[12px] font-bold"
        >
          {xLabel} →
        </text>
        <text x={MARGIN.left - 44} y={14} className="fill-muted-foreground text-[12px] font-bold">
          ↑ {yLabel}
        </text>

        {ordered.map((point) => {
          const selected = point.slug === selectedSlug;
          const cx = round(x(Math.max(point.x, xMin)));
          const cy = round(y(point.y));
          const radius = round(r(point.size));
          return (
            <g
              key={point.slug}
              role="link"
              tabIndex={0}
              aria-label={point.name}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHovered(point)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => router.push(`${basePath}/${point.slug}`, { scroll: false })}
              onKeyDown={(event) => {
                if (event.key === 'Enter')
                  router.push(`${basePath}/${point.slug}`, { scroll: false });
              }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                strokeWidth={selected ? 3 : 1.5}
                fillOpacity={
                  point.hollow ? 0 : round(point.tone ? 0.7 : 0.25 + 0.6 * (point.intensity ?? 0.6))
                }
                className={cn(
                  fillClass(point),
                  selected ? 'stroke-primary' : 'stroke-data-bar',
                  point.hollow && !selected && 'stroke-data-bar',
                )}
              />
              {labelled.has(point.slug) && (
                <text
                  x={cx + radius + 5}
                  y={cy}
                  dominantBaseline="middle"
                  className={cn(
                    'stroke-background [stroke-width:3px] text-[12px] [paint-order:stroke]',
                    selected ? 'fill-primary font-bold' : 'fill-foreground',
                  )}
                >
                  {point.name}
                </text>
              )}
            </g>
          );
        })}

        {annotations.map((note) => {
          const point = points.find((item) => item.slug === note.slug);
          if (!point) return null;
          const cx = round(x(Math.max(point.x, xMin)));
          const cy = round(y(point.y));
          const radius = round(r(point.size));
          const tx = cx + radius + 8;
          const ty = cy + 4;
          return (
            <g key={`note-${note.slug}`} className="pointer-events-none">
              <text
                x={tx}
                y={ty}
                className="fill-foreground stroke-background [stroke-width:3px] text-[12px] [paint-order:stroke]"
              >
                {note.lines.map((line, index) => (
                  <tspan
                    key={line}
                    x={tx}
                    dy={index === 0 ? 0 : 15}
                    className={index === 0 ? 'font-bold' : ''}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-card"
          style={{
            left: `${(x(Math.max(hovered.x, xMin)) / WIDTH) * 100}%`,
            top: `${(y(hovered.y) / HEIGHT) * 100}%`,
            transform: 'translate(12px, -110%)',
          }}
        >
          <p className="font-bold">{hovered.name}</p>
          <p className="text-muted-foreground tabular-nums">
            {yLabel} {Math.round(hovered.y * 100)}% · {xLabel} {hovered.x.toLocaleString('ko-KR')}
          </p>
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        점 크기: {sizeLabel} · 점을 누르면 아래 상세가 바뀝니다
      </p>
    </div>
  );
}
