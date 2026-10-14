'use client';

import { pathRound, scaleSqrt } from 'd3';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import type { TopicEntity, Transition } from '@/types/topics';

interface TransitionGraphProps {
  actions: TopicEntity[];
  edges: Transition[];
  selectedId: string;
  /** Node clicks go to `${basePath}/${slug}`. */
  basePath: string;
}

const WIDTH = 720;
const HEIGHT = 560;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const RING = 210;

// Neighbors in this order sit next to each other on the ring so the main loops stay short.
const ORDER = [
  '채굴',
  '채굴 취소',
  '도구 선택',
  '설치',
  '채팅',
  '퀘스트 보상',
  '종료',
  '월드 이동',
  'UI 열기',
  '설계도 취소',
  '설계도 실행',
  '설계도 준비',
];

type EdgeKind = 'out' | 'in' | 'muted';

const anchorOf = (angle: number) => {
  const cos = Math.cos(angle);
  if (cos > 0.3) return 'start';
  if (cos < -0.3) return 'end';
  return 'middle';
};

// SVG numbers are rounded so server and client render identical attributes.
const round = (value: number) => Math.round(value * 10) / 10;

const rank = (name: string) => {
  const index = ORDER.indexOf(name);
  return index === -1 ? ORDER.length : index;
};

export function TransitionGraph({ actions, edges, selectedId, basePath }: TransitionGraphProps) {
  const router = useRouter();
  const sorted = [...actions].sort((a, b) => rank(a.name) - rank(b.name));
  const radius = scaleSqrt()
    .domain([0, Math.max(...actions.map((action) => action.n))])
    .range([10, 32]);
  const strokeWidth = scaleSqrt()
    .domain([0, Math.max(...edges.map((edge) => edge.n))])
    .range([0.8, 7.8]);

  const nodes = new Map(
    sorted.map((action, index) => {
      const angle = (index / sorted.length) * Math.PI * 2 - Math.PI / 2;
      return [
        action.id,
        {
          action,
          x: round(CENTER.x + Math.cos(angle) * RING),
          y: round(CENTER.y + Math.sin(angle) * RING),
          r: round(radius(action.n)),
          angle,
        },
      ];
    }),
  );

  const selected = actions.find((action) => action.id === selectedId);
  const selfShare = (action: TopicEntity) =>
    action.reactions.find((reaction) => reaction.label === action.name)?.share ?? 0;

  // Selected node's edges are drawn last so they sit on top.
  const ordered = [...edges].sort((a, b) => {
    const score = (edge: Transition) => {
      if (edge.src === selectedId) return 2;
      return edge.dst === selectedId ? 1 : 0;
    };
    return score(a) - score(b) || a.n - b.n;
  });

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="행동 전이 그래프"
      >
        <defs>
          {['muted', 'out', 'in'].map((kind) => (
            <marker
              key={kind}
              id={`arrow-${kind}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerUnits="userSpaceOnUse"
              markerWidth="11"
              markerHeight="11"
              orient="auto-start-reverse"
            >
              <path
                d="M0,0 L10,5 L0,10 z"
                className={cn(
                  kind === 'muted' && 'fill-muted-foreground/40',
                  kind === 'out' && 'fill-flow-next',
                  kind === 'in' && 'fill-flow-prev',
                )}
              />
            </marker>
          ))}
        </defs>

        {ordered.map((edge) => {
          const from = nodes.get(edge.src);
          const to = nodes.get(edge.dst);
          if (!from || !to) return null;
          const outgoing = edge.src === selectedId;
          const incoming = !outgoing && edge.dst === selectedId;
          let kind: EdgeKind = 'muted';
          if (outgoing) kind = 'out';
          else if (incoming) kind = 'in';
          // Bend each edge to its right so A→B and B→A do not overlap.
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy) || 1;
          const nx = -dy / length;
          const ny = dx / length;
          const bend = 28;
          const cx = round((from.x + to.x) / 2 + nx * bend);
          const cy = round((from.y + to.y) / 2 + ny * bend);
          // Trim both ends to the node circles.
          const trim = (node: typeof from, tx: number, ty: number) => {
            const vx = tx - node.x;
            const vy = ty - node.y;
            const d = Math.hypot(vx, vy) || 1;
            return {
              x: round(node.x + (vx / d) * (node.r + 3)),
              y: round(node.y + (vy / d) * (node.r + 3)),
            };
          };
          const start = trim(from, cx, cy);
          const end = trim(to, cx, cy);
          const width = round(strokeWidth(edge.n));
          const curve = pathRound(1);
          curve.moveTo(start.x, start.y);
          curve.quadraticCurveTo(cx, cy, end.x, end.y);
          const share = outgoing && selected ? edge.n / selected.n : undefined;
          return (
            <g key={`${edge.src}-${edge.dst}`}>
              <path
                d={curve.toString()}
                fill="none"
                strokeWidth={width}
                strokeLinecap="round"
                markerEnd={`url(#arrow-${kind})`}
                className={cn(
                  outgoing && 'stroke-flow-next',
                  incoming && 'stroke-flow-prev opacity-70',
                  !outgoing && !incoming && 'stroke-muted-foreground/20',
                )}
              />
              {share !== undefined && share >= 0.01 && (
                <text
                  x={round(0.25 * start.x + 0.5 * cx + 0.25 * end.x)}
                  y={round(0.25 * start.y + 0.5 * cy + 0.25 * end.y)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground stroke-background [stroke-width:4px] text-[13px] font-semibold [paint-order:stroke]"
                >
                  {Math.round(share * 100)}%
                </text>
              )}
            </g>
          );
        })}

        {[...nodes.values()].map(({ action, x, y, r, angle }) => {
          const active = action.id === selectedId;
          const labelX = round(x + Math.cos(angle) * (r + 10));
          const labelY = round(y + Math.sin(angle) * (r + 10));
          const anchor = anchorOf(angle);
          const self = selfShare(action);
          return (
            <g
              key={action.id}
              role="link"
              tabIndex={0}
              aria-label={`${action.name} 선택`}
              className="cursor-pointer outline-none"
              onClick={() => router.push(`${basePath}/${action.slug}`, { scroll: false })}
              onKeyDown={(event) => {
                if (event.key === 'Enter')
                  router.push(`${basePath}/${action.slug}`, { scroll: false });
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={r}
                className={cn(
                  'stroke-2',
                  active ? 'fill-primary stroke-primary' : 'fill-card stroke-foreground/50',
                )}
              />
              {self >= 0.05 && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    'text-[11px] font-medium',
                    active ? 'fill-primary-foreground' : 'fill-muted-foreground',
                  )}
                >
                  ↻{Math.round(self * 100)}%
                </text>
              )}
              <text
                x={labelX}
                y={labelY}
                textAnchor={anchor}
                dominantBaseline="middle"
                className={cn(
                  'text-[14px]',
                  active ? 'fill-foreground font-semibold' : 'fill-foreground/80',
                )}
              >
                {action.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-flow-next" /> 다음 행동 (%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-flow-prev" /> 직전 행동
        </span>
        <span>원: 행동 수 · 선: 전이 수 · ↻ 같은 행동 반복 · 노드를 누르면 선택</span>
      </div>
    </div>
  );
}
