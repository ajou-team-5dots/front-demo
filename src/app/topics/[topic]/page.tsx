import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { TopicDashboard } from '@/components/topics/topic-dashboard';
import { TOPIC_IDS } from '@/server/data/topics';
import type { TopicId } from '@/types/topics';

export function generateStaticParams() {
  return TOPIC_IDS.map((topic) => ({ topic }));
}

const isTopicId = (value: string): value is TopicId => TOPIC_IDS.some((id) => id === value);

async function TopicView({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  if (!isTopicId(topic)) {
    notFound();
  }
  return <TopicDashboard topicId={topic} />;
}

export default function TopicPage({ params }: PageProps<'/topics/[topic]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <TopicView params={params} />
    </Suspense>
  );
}
