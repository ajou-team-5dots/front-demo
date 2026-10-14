import { ArrowRight, Crosshair, GitBranch, Wrench } from 'lucide-react';
import Link from 'next/link';

import { BarChart } from '@/components/charts/bar-chart';
import { TopicShell } from '@/components/topics/topic-shell';
import { TOPIC_META } from '@/lib/topic-meta';
import { getTopicData, TOPIC_IDS } from '@/server/data/topics';
import type { TopicId } from '@/types/topics';

const TOPIC_ICONS: Record<TopicId, typeof Wrench> = {
  postrun: Wrench,
  friction: Crosshair,
  loop: GitBranch,
};

export default async function TopicsPage() {
  const topics = await Promise.all(TOPIC_IDS.map((id) => getTopicData(id)));

  return (
    <TopicShell
      current="overview"
      eyebrow="5dots · Akkadia 행동 데이터"
      title="무언가를 했다 → 그 직후 무엇을 했나"
      subtitle="같은 화면 틀로 보는 주제 3개"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {topics.map((data) => {
          const meta = TOPIC_META[data.id];
          const Icon = TOPIC_ICONS[data.id];
          const [headline] = data.kpis;
          return (
            <Link
              key={data.id}
              href={`/topics/${data.id}`}
              className="group flex flex-col gap-5 rounded-lg border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  {meta.code} · {meta.title}
                </span>
              </div>
              <span className="text-2xl font-black tracking-tight">{meta.ask}?</span>
              {headline && (
                <div className="flex flex-col">
                  <span className="text-4xl font-black tracking-tight tabular-nums">
                    {headline.value}
                  </span>
                  <span className="text-sm text-muted-foreground">{headline.label}</span>
                </div>
              )}
              <div className="flex flex-col gap-2 border-t pt-4">
                <span className="text-xs font-bold text-muted-foreground">
                  {data.highlightTitle}
                </span>
                <BarChart
                  items={data.highlights.map((item) => ({
                    key: item.label,
                    label: item.label,
                    value: item.value,
                    valueLabel: `${(item.value * 100).toFixed(1)}%`,
                  }))}
                  labelWidth={118}
                  width={340}
                  rowHeight={30}
                  ariaLabel={data.highlightTitle}
                />
              </div>
              <span className="mt-auto flex items-center gap-1 text-sm font-bold text-primary">
                {meta.detailTitle} 보기
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </div>
    </TopicShell>
  );
}
