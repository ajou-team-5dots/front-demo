'use client';

import { arc, chordDirected, ribbonArrow } from 'd3';
import { useSyncExternalStore } from 'react';

import { ACTION_ORDER, FAMILY_TONE, familyOf } from '@/lib/action-family';
import type { Transition } from '@/types/viz';

interface ChordChartProps {
  flows: Transition[];
  ariaLabel: string;
}

const SIZE = 420;
const OUTER = SIZE / 2 - 60;
const INNER = OUTER - 12;

/** Directed chord diagram. Rendered after mount: trig-heavy paths can differ between server and browser. */
export function ChordChart({ flows, ariaLabel }: ChordChartProps) {
  // false during SSR and hydration, true afterwards.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const names = ACTION_ORDER.filter((action) =>
    flows.some((flow) => flow.src === action || flow.dst === action),
  );
  const index = new Map(names.map((name, i) => [name, i]));
  const matrix = names.map(() => names.map(() => 0));
  flows.forEach((flow) => {
    const i = index.get(flow.src);
    const j = index.get(flow.dst);
    if (i !== undefined && j !== undefined) matrix[i][j] += flow.n;
  });

  return (
    <svg
      viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
      className="mx-auto h-auto w-full max-w-sm"
      role="img"
      aria-label={ariaLabel}
    >
      {mounted &&
        (() => {
          const chords = chordDirected()
            .padAngle(0.03)
            .sortSubgroups((a, b) => b - a)(matrix);
          const group = arc<{ startAngle: number; endAngle: number }>()
            .innerRadius(INNER)
            .outerRadius(OUTER);
          const ribbon = ribbonArrow<
            unknown,
            { startAngle: number; endAngle: number; radius: number }
          >().radius(INNER - 1);
          return (
            <>
              {chords.map((chord) => (
                <path
                  key={`${chord.source.index}-${chord.target.index}`}
                  d={String(ribbon(chord as never) ?? '')}
                  fillOpacity={0.55}
                  className={FAMILY_TONE[familyOf(names[chord.source.index])].fill}
                />
              ))}
              {chords.groups.map((item) => {
                const angle = (item.startAngle + item.endAngle) / 2;
                const name = names[item.index];
                return (
                  <g key={name}>
                    <path d={group(item) ?? ''} className={FAMILY_TONE[familyOf(name)].fill} />
                    {item.endAngle - item.startAngle > 0.08 && (
                      <text
                        transform={`rotate(${(angle * 180) / Math.PI - 90}) translate(${OUTER + 6}) ${angle > Math.PI ? 'rotate(180)' : ''}`}
                        textAnchor={angle > Math.PI ? 'end' : 'start'}
                        dominantBaseline="middle"
                        className="fill-foreground text-[11px]"
                      >
                        {name}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          );
        })()}
    </svg>
  );
}
