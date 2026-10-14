'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { EntityGroup, TopicId } from '@/types/topics';

interface EntityTableProps {
  topicId: TopicId;
  groups: EntityGroup[];
  selectedSlug: string;
}

const PREVIEW_ROWS = 10;
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const COLUMNS =
  'grid grid-cols-[minmax(0,2fr)_5rem_4rem_minmax(0,2fr)] gap-4 sm:grid-cols-[minmax(0,2fr)_6rem_5rem_minmax(0,2fr)_minmax(0,1.4fr)]';

export function EntityTable({ topicId, groups, selectedSlug }: EntityTableProps) {
  const initialGroup =
    groups.find((group) => group.entities.some((entity) => entity.slug === selectedSlug))?.id ??
    groups[0]?.id;
  const [groupId, setGroupId] = useState(initialGroup);
  const [expanded, setExpanded] = useState(false);
  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  if (!group) {
    return null;
  }
  const rows = expanded ? group.entities : group.entities.slice(0, PREVIEW_ROWS);
  const primaryLabel = group.entities[0]?.primary.label ?? '핵심 비율';

  return (
    <div className="-mx-6 -mb-6 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4">
        {groups.length > 1 ? (
          <Tabs
            value={groupId}
            onValueChange={(value: string) => {
              setGroupId(value);
              setExpanded(false);
            }}
          >
            <TabsList>
              {groups.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {item.label} {item.entities.length}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <span className="text-sm text-muted-foreground">
            {group.label} {group.entities.length}개
          </span>
        )}
        {group.entities.length > PREVIEW_ROWS && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-sm font-bold text-primary hover:text-primary-strong"
          >
            {expanded ? '접기' : `전체 ${group.entities.length}개 보기`}
          </button>
        )}
      </div>
      <div
        role="row"
        className={cn(
          COLUMNS,
          'border-y bg-primary-soft/60 px-6 py-3 text-xs font-bold tracking-wide text-muted-foreground',
        )}
      >
        <span role="columnheader">대상</span>
        <span role="columnheader" className="text-right">
          n
        </span>
        <span role="columnheader" className="text-right">
          플레이어
        </span>
        <span role="columnheader">{primaryLabel}</span>
        <span role="columnheader" className="hidden sm:block">
          표시
        </span>
      </div>
      <ul>
        {rows.map((entity) => {
          const selected = entity.slug === selectedSlug;
          return (
            <li key={entity.id} className="border-b last:border-b-0">
              <Link
                href={`/topics/${topicId}/${entity.slug}#detail`}
                scroll={false}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  COLUMNS,
                  'items-center px-6 py-3.5 text-sm transition-colors duration-200 hover:bg-accent/60',
                  selected && 'bg-accent',
                )}
              >
                <span className={cn('truncate', selected ? 'font-extrabold' : 'font-semibold')}>
                  {entity.name}
                </span>
                <span className="text-right tabular-nums">{entity.n.toLocaleString('ko-KR')}</span>
                <span className="text-right tabular-nums">{entity.players}명</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-data-bar"
                      style={{ width: formatPercent(entity.primary.value) }}
                    />
                  </span>
                  <span className="w-20 truncate text-right text-xs font-bold tabular-nums">
                    {entity.primary.text ? `${entity.primary.text} ` : ''}
                    {formatPercent(entity.primary.value)}
                  </span>
                </span>
                <span className="hidden flex-wrap gap-1 sm:flex">
                  {entity.small && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      사례
                    </span>
                  )}
                  {entity.flags.length > 0 && (
                    <span
                      className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-strong"
                      title={entity.flags.join(', ')}
                    >
                      한 명의 사례
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
