import { SampleNote } from '@/components/insights/insight-evidence';
import { FlowOverview } from '@/components/topics/flow-stepper';
import { TopicShell } from '@/components/topics/topic-shell';
import { getBuildingInsights, getTopicInsight } from '@/server/data/insights';
import { TOPIC_IDS } from '@/server/data/topics';
import type { InsightSummary } from '@/types/insights';
import type { TopicId } from '@/types/topics';

const STEPS = [
  '관찰: 로그에 남은 행동과 n',
  '해석: 같은 행동을 설명하는 여러 이유',
  '근거: 이유마다 "맞다면 남을 흔적"을 실제와 비교',
  '대상별 탐색: 설계도·블록·행동 하나씩',
  '개선: 어느 해석이면 누가 무엇을 고치나',
];

export default async function TopicsPage() {
  const [entries, data] = await Promise.all([
    Promise.all(TOPIC_IDS.map(async (id) => [id, (await getTopicInsight(id)).summary] as const)),
    getBuildingInsights(),
  ]);
  const summaries = Object.fromEntries(entries) as Record<TopicId, InsightSummary>;

  return (
    <TopicShell
      current="overview"
      eyebrow="5dots · Akkadia 건축 행동"
      title="건축하는 동안 무엇이 방해되고, 무엇을 고쳐야 하나"
      subtitle="설계도를 고르고 → 실행해 고치고 → 손으로 캐고 짓는 흐름을 따라, 같은 행동의 여러 해석을 로그로 가려 본다"
    >
      <FlowOverview summaries={summaries} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">각 대시보드를 읽는 순서</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-lg font-extrabold">이번에 뺀 것</h2>
        <p>
          렐름·설계도 생성 같은 서버 기능의 실패는 건축 방해로 보지 않는다. 연결 오류는 게임이
          재시도로 보정하는 구조이기 때문이다 (개발 측 설명). 이탈·잔존 지표도 만들지 않는다.
        </p>
      </section>

      <SampleNote meta={data.meta} />
    </TopicShell>
  );
}
