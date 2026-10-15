import { ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { VerdictBadge } from '@/components/insights/insight-sections';
import { TOPIC_FLOW, TOPIC_META } from '@/lib/topic-meta';
import { cn } from '@/lib/utils';
import type { InsightSummary } from '@/types/insights';
import type { TopicId } from '@/types/topics';

const STAGE_MARK = ['①', '②', '③'];

export const stageMark = (topicId: TopicId) => STAGE_MARK[TOPIC_FLOW.indexOf(topicId)] ?? '';

/** Slim three-step bar at the top of a topic page: where this topic sits in the building flow. */
export function FlowStepper({ current }: { current: TopicId }) {
  return (
    <nav aria-label="건축 흐름" className="flex flex-wrap items-center gap-1.5 text-sm">
      {TOPIC_FLOW.map((id, index) => {
        const meta = TOPIC_META[id];
        const active = id === current;
        return (
          <span key={id} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-4 text-muted-foreground" />}
            <Link
              href={`/topics/${id}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1.5 transition-colors duration-200',
                active
                  ? 'border-primary bg-primary-soft font-bold text-primary-strong'
                  : 'bg-card text-muted-foreground hover:border-primary',
              )}
            >
              {`${STAGE_MARK[index]} ${meta.stage}`}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

/** Big flow on the overview: one card per stage with its answer and readings. */
export function FlowOverview({ summaries }: { summaries: Record<TopicId, InsightSummary> }) {
  return (
    <ol className="grid gap-6 lg:grid-cols-3">
      {TOPIC_FLOW.map((id, index) => {
        const meta = TOPIC_META[id];
        const summary = summaries[id];
        return (
          <li key={id} className="relative flex">
            {index > 0 && (
              <ArrowRight className="absolute top-8 -left-5 hidden size-5 text-muted-foreground lg:block" />
            )}
            <Link
              href={`/topics/${id}`}
              className="group flex w-full flex-col gap-5 rounded-lg border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-card"
            >
              <span className="flex flex-col gap-1">
                <span className="text-sm font-black text-primary-strong">
                  {`${STAGE_MARK[index]} ${meta.stage}`}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  {meta.code} · {meta.title}
                </span>
              </span>
              <span className="text-xl font-black tracking-tight">{summary.question}</span>
              <span className="flex flex-col">
                <span className="text-4xl font-black tracking-tight tabular-nums">
                  {summary.headline.value}
                </span>
                <span className="text-sm text-muted-foreground">{summary.headline.label}</span>
              </span>
              <span className="text-sm">{summary.finding}</span>
              <ul className="flex flex-col gap-2 border-t pt-4">
                {summary.hypotheses.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0">{item.title}</span>
                    <VerdictBadge verdict={item.verdict} />
                  </li>
                ))}
              </ul>
              <span className="mt-auto flex items-center gap-1 text-sm font-bold text-primary">
                {meta.code} 대시보드에서 근거 보기
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Previous / next stage at the bottom of a topic page so the story reads on. */
export function FlowNext({ current }: { current: TopicId }) {
  const index = TOPIC_FLOW.indexOf(current);
  const links = [
    { id: TOPIC_FLOW[index - 1], label: '이전 단계' },
    { id: TOPIC_FLOW[index + 1], label: '다음 단계' },
  ].filter((item): item is { id: TopicId; label: string } => item.id !== undefined);
  return (
    <nav aria-label="건축 흐름 이동" className="grid gap-4 sm:grid-cols-2">
      {links.map((item) => {
        const meta = TOPIC_META[item.id];
        return (
          <Link
            key={item.id}
            href={`/topics/${item.id}`}
            className={cn(
              'group flex flex-col gap-1 rounded-lg border bg-card p-5 transition duration-200 hover:border-primary',
              item.label === '다음 단계' && 'sm:col-start-2 sm:text-right',
            )}
          >
            <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
            <span className="font-extrabold">
              {`${stageMark(item.id)} ${meta.stage} · ${meta.code} ${meta.ask}?`}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
