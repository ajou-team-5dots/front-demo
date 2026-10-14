'use client';

import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey';

import { FAMILY_LABELS, FAMILY_TONE, familyOf } from '@/lib/action-family';
import type { Transition } from '@/types/viz';

interface SankeyChartProps {
  flows: Transition[];
  ariaLabel: string;
}

interface NodeDatum {
  id: string;
  action: string;
  side: 'prev' | 'next';
}

interface LinkDatum {
  source: string;
  target: string;
  value: number;
}

const WIDTH = 760;
const HEIGHT = 520;
const round = (value: number) => Math.round(value * 10) / 10;

/** Previous action (left) → next action (right). Cycles cannot be drawn, so the two sides are split. */
export function SankeyChart({ flows, ariaLabel }: SankeyChartProps) {
  const ids = new Map<string, NodeDatum>();
  flows.forEach((flow) => {
    ids.set(`prev:${flow.src}`, { id: `prev:${flow.src}`, action: flow.src, side: 'prev' });
    ids.set(`next:${flow.dst}`, { id: `next:${flow.dst}`, action: flow.dst, side: 'next' });
  });
  const layout = sankey<NodeDatum, LinkDatum>()
    .nodeId((node) => node.id)
    .nodeWidth(14)
    .nodePadding(10)
    .extent([
      [120, 8],
      [WIDTH - 120, HEIGHT - 8],
    ]);
  const graph = layout({
    nodes: [...ids.values()].map((node) => ({ ...node })),
    links: flows.map((flow) => ({
      source: `prev:${flow.src}`,
      target: `next:${flow.dst}`,
      value: flow.n,
    })),
  });
  const path = sankeyLinkHorizontal<NodeDatum, LinkDatum>();
  const nodeOf = (end: SankeyLink<NodeDatum, LinkDatum>['source']) =>
    end as SankeyNode<NodeDatum, LinkDatum>;

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <g fill="none">
          {graph.links.map((link) => {
            const source = nodeOf(link.source);
            const target = nodeOf(link.target);
            return (
              <path
                key={`${source.id}-${target.id}`}
                d={path(link) ?? ''}
                strokeWidth={round(Math.max(link.width ?? 1, 1))}
                strokeOpacity={0.35}
                className={FAMILY_TONE[familyOf(source.action)].stroke}
              >
                <title>{`${source.action} → ${target.action} ${link.value.toLocaleString('ko-KR')}건`}</title>
              </path>
            );
          })}
        </g>
        {graph.nodes.map((node) => {
          const x0 = round(node.x0 ?? 0);
          const y0 = round(node.y0 ?? 0);
          const height = round((node.y1 ?? 0) - (node.y0 ?? 0));
          return (
            <g key={node.id}>
              <rect
                x={x0}
                y={y0}
                width={round((node.x1 ?? 0) - (node.x0 ?? 0))}
                height={Math.max(height, 1)}
                className={FAMILY_TONE[familyOf(node.action)].fill}
              />
              {height >= 9 && (
                <text
                  x={node.side === 'prev' ? x0 - 8 : round(node.x1 ?? 0) + 8}
                  y={round(y0 + height / 2)}
                  textAnchor={node.side === 'prev' ? 'end' : 'start'}
                  dominantBaseline="middle"
                  className="fill-foreground text-[12px]"
                >
                  {node.action}
                </text>
              )}
            </g>
          );
        })}
        <text x={120} y={HEIGHT} className="fill-muted-foreground text-[11px] font-bold" dy={-1}>
          이전 행동
        </text>
        <text
          x={WIDTH - 120}
          y={HEIGHT}
          textAnchor="end"
          className="fill-muted-foreground text-[11px] font-bold"
          dy={-1}
        >
          60초 안의 다음 행동
        </text>
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {(Object.keys(FAMILY_LABELS) as (keyof typeof FAMILY_LABELS)[]).map((family) => (
          <li key={family} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${FAMILY_TONE[family].bg}`} />
            {FAMILY_LABELS[family]}
          </li>
        ))}
      </ul>
    </div>
  );
}
