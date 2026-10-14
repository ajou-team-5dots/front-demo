import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { TopicDashboard } from '@/components/topics/topic-dashboard';
import { getTopicData, TOPIC_IDS } from '@/server/data/topics';
import type { TopicId } from '@/types/topics';

export async function generateStaticParams() {
  const topics = await Promise.all(TOPIC_IDS.map((topic) => getTopicData(topic)));
  return topics.flatMap((data) =>
    data.entityGroups.flatMap((group) =>
      group.entities.map((entity) => ({ topic: data.id, entity: entity.slug })),
    ),
  );
}

const isTopicId = (value: string): value is TopicId => TOPIC_IDS.some((id) => id === value);

async function TopicEntityView({ params }: { params: Promise<{ topic: string; entity: string }> }) {
  const { topic, entity } = await params;
  if (!isTopicId(topic)) {
    notFound();
  }
  return <TopicDashboard topicId={topic} entitySlug={entity} />;
}

export default function TopicEntityPage({ params }: PageProps<'/topics/[topic]/[entity]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <TopicEntityView params={params} />
    </Suspense>
  );
}
