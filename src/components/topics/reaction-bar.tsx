import { reasonLabel } from '@/lib/topic-meta';
import { cn } from '@/lib/utils';
import type { Reaction } from '@/types/topics';

interface ReactionBarProps {
  reactions: Reaction[];
  /** Rows beyond this are folded into one "기타" row. */
  maxItems?: number;
  /** Labels to draw in the emphasis color. */
  emphasize?: string[];
  emptyText?: string;
  className?: string;
}

const formatShare = (share: number) =>
  share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`;

export function ReactionBar({
  reactions,
  maxItems = 7,
  emphasize = [],
  emptyText = '집계된 반응이 없습니다.',
  className,
}: ReactionBarProps) {
  if (reactions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  const sorted = [...reactions].sort((a, b) => b.n - a.n);
  const shown = sorted.slice(0, maxItems);
  const rest = sorted.slice(maxItems);
  const rows =
    rest.length > 0
      ? [
          ...shown,
          {
            label: `기타 ${rest.length}개`,
            n: rest.reduce((total, item) => total + item.n, 0),
            share: rest.reduce((total, item) => total + item.share, 0),
          },
        ]
      : shown;

  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {rows.map((row) => (
        <li key={row.label} className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate" title={reasonLabel(row.label)}>
              {reasonLabel(row.label)}
            </span>
            <span
              className="shrink-0 font-bold tabular-nums"
              title={`${row.n.toLocaleString('ko-KR')}건`}
            >
              {formatShare(row.share)}
            </span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                'block h-full rounded-full',
                emphasize.includes(row.label) ? 'bg-edit-dig' : 'bg-data-bar',
              )}
              style={{ width: `${Math.max(row.share * 100, 0.5)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
