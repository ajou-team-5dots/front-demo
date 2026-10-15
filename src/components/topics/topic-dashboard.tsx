import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { BlueprintExplorer } from '@/components/blueprint-edits/blueprint-explorer';
import { type BarItem, BarChart } from '@/components/charts/bar-chart';
import { ChartTabs } from '@/components/charts/chart-tabs';
import { DonutChart } from '@/components/charts/donut-chart';
import { SankeyChart } from '@/components/charts/sankey-chart';
import { StackedBar } from '@/components/charts/stacked-bar';
import { TransitionHeatmap } from '@/components/charts/transition-heatmap';
import {
  BlockNextMix,
  BlueprintEditMix,
  DraftEvidence,
  DraftObservation,
  ManualEvidence,
  ManualObservation,
  PrepareEvidence,
  PrepareObservation,
  SampleNote,
} from '@/components/insights/insight-evidence';
import { InsightStep, OpenQuestions } from '@/components/insights/insight-sections';
import { Badge } from '@/components/ui/badge';
import { getDetailCaveats } from '@/lib/blueprint-caveats';
import { INSIGHT_TEXT } from '@/lib/insight-meta';
import { reasonLabel, TOPIC_META } from '@/lib/topic-meta';
import { getBlueprintDetail } from '@/server/data/blueprint-edits';
import { getTopicInsight } from '@/server/data/insights';
import { getTopicData } from '@/server/data/topics';
import {
  getBlueprintReactionMix,
  getTopTransitions,
  getTransitionMatrix,
} from '@/server/data/viz-tests';
import type { BuildingInsights } from '@/types/insights';
import type { EntityGroup, Reaction, TopicData, TopicEntity, TopicId } from '@/types/topics';

import { EntityPicker } from './entity-picker';
import { EntitySummary } from './entity-summary';
import { EntityTable } from './entity-table';
import { FlowNext, FlowStepper, stageMark } from './flow-stepper';
import { GroupedOverview } from './grouped-overview';
import { HypothesisCards, HypothesisChips } from './hypothesis-lens';
import { LensPanel, RoleActionCards, RoleFocus } from './role-lens';
import { blockRetryView, overviewViews, REACTION_SERIES, reactionMixRows } from './topic-charts';
import { TopicShell } from './topic-shell';
import { TransitionGraph } from './transition-graph';

interface TopicDashboardProps {
  topicId: TopicId;
  entitySlug?: string;
}

const reactionBars = (reactions: Reaction[], compareWith: Reaction[] = [], limit = 7): BarItem[] =>
  [...reactions]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((reaction) => ({
      key: reaction.label,
      label: reasonLabel(reaction.label),
      value: reaction.share,
      compare: compareWith.find((item) => item.label === reaction.label)?.share,
      emphasis: reaction.label === 'target_change',
    }));

// Which readings each exploration panel helps with (hypothesis ids from server/data/insights.ts).
const RANKING_HYPOTHESES: Record<TopicId, string[]> = {
  postrun: ['skipped'],
  friction: ['sweep', 'charge'],
  loop: [],
};
const DETAIL_HYPOTHESES: Record<TopicId, string[]> = {
  postrun: ['terrain', 'decorate'],
  friction: ['aim', 'sweep', 'charge'],
  loop: ['ui'],
};

async function PostrunDetail({
  entity,
  insights,
}: {
  entity: TopicEntity;
  insights: BuildingInsights;
}) {
  const { blueprintId } = entity;
  const detail = blueprintId ? await getBlueprintDetail(blueprintId) : undefined;
  const bp = insights.draft.blueprints.find((item) => item.bid === blueprintId);
  const caveats = detail ? getDetailCaveats(detail.summary, detail.voxels) : [];
  return (
    <div className="flex flex-col gap-6">
      {detail ? (
        <div className="flex flex-col gap-3">
          {caveats.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caveats.map((caveat) => (
                <Badge key={caveat.kind} variant="outline" title={caveat.description}>
                  {caveat.label}
                </Badge>
              ))}
            </div>
          )}
          <BlueprintExplorer key={blueprintId} detail={detail} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">3D 데이터가 없습니다.</p>
      )}
      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-sm font-extrabold">이 설계도의 근처 수정 구성</h3>
        <p className="text-xs text-muted-foreground">
          3D에서 본 위치를 바닥·옆·위로 나눈 값. 바닥이 많으면 지형 맞춤, 옆·위가 많으면 덧붙이기
        </p>
        <BlueprintEditMix bp={bp} />
      </div>
    </div>
  );
}

function detailView(
  topicId: TopicId,
  entity: TopicEntity,
  group: EntityGroup | undefined,
  insights: BuildingInsights,
): ReactNode {
  if (topicId === 'postrun') {
    return <PostrunDetail entity={entity} insights={insights} />;
  }
  if (topicId === 'friction' && group?.id === 'block') {
    return (
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <DonutChart
          title="이 블록의 취소 사유"
          ariaLabel="취소 사유 비율"
          items={entity.reactions.map((reaction) => ({
            key: reaction.label,
            label: reasonLabel(reaction.label),
            value: reaction.n,
            emphasis: reaction.label === 'target_change',
          }))}
        />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">사유별로 10초 안에 다음에 캔 곳</h3>
          <BlockNextMix block={insights.manual.blocks.find((block) => block.id === entity.id)} />
        </div>
      </div>
    );
  }
  if (entity.reactions.length === 0) {
    return <p className="text-sm text-muted-foreground">이 대상은 비율만 집계했습니다.</p>;
  }
  return (
    <BarChart
      width={760}
      items={reactionBars(entity.reactions, [], 8)}
      ariaLabel={`${entity.name} 반응 분포`}
    />
  );
}

function observationAndEvidence(
  topicId: TopicId,
  insights: BuildingInsights,
  data: TopicData,
): { observation: ReactNode; evidence: ReactNode } {
  if (topicId === 'postrun') {
    return {
      observation: <DraftObservation data={insights.draft} />,
      evidence: (
        <DraftEvidence
          data={insights.draft}
          blueprints={data.entityGroups.flatMap((group) => group.entities)}
        />
      ),
    };
  }
  if (topicId === 'loop') {
    return {
      observation: <PrepareObservation data={insights.prepare} />,
      evidence: <PrepareEvidence data={insights.prepare} />,
    };
  }
  return {
    observation: <ManualObservation data={insights.manual} />,
    evidence: <ManualEvidence data={insights.manual} />,
  };
}

async function exploreOverview(
  topicId: TopicId,
  data: TopicData,
  entity: TopicEntity,
  group: EntityGroup | undefined,
  insights: BuildingInsights,
): Promise<ReactNode> {
  const basePath = `/topics/${topicId}`;
  if (topicId === 'loop') {
    const [topFlows, matrix] = await Promise.all([getTopTransitions(), getTransitionMatrix()]);
    return (
      <ChartTabs
        tabs={[
          {
            id: 'graph',
            label: '노드-링크',
            content: (
              <TransitionGraph
                actions={data.entityGroups.flatMap((item) => item.entities)}
                edges={data.edges}
                selectedId={entity.id}
                basePath={basePath}
              />
            ),
          },
          {
            id: 'sankey',
            label: 'Sankey',
            content: (
              <SankeyChart flows={topFlows} ariaLabel="이전 행동에서 다음 행동으로의 흐름" />
            ),
          },
          {
            id: 'heatmap',
            label: '히트맵 (상세)',
            content: <TransitionHeatmap cells={matrix} ariaLabel="행동 전이 행렬" />,
          },
        ]}
      />
    );
  }
  const views = overviewViews(topicId, data, entity.slug);
  const blockGroup = data.entityGroups.find((item) => item.id === 'block');
  if (topicId === 'friction' && blockGroup) {
    views.push(blockRetryView(blockGroup, insights.manual.blocks));
  }
  return (
    <GroupedOverview
      views={views}
      initialId={group?.id ?? data.entityGroups[0]?.id ?? ''}
      selectedSlug={entity.slug}
      basePath={basePath}
    />
  );
}

const OVERVIEW_TITLE: Record<TopicId, string> = {
  postrun: '설계도별 실행 직후 수정 비율',
  friction: '블록별 채굴 취소',
  loop: '전체 행동 전이 지도',
};

const OVERVIEW_HINT: Record<TopicId, string> = {
  postrun: '점을 누르면 아래에서 그 설계도의 3D 수정 위치를 본다',
  friction: '점을 누르면 아래에서 그 블록의 취소 사유와 다음 위치를 본다',
  loop: '채굴⇄채굴 취소가 대부분이라 설계도 경로는 위 근거 차트에서 따로 보았다. 노드를 누르면 그 행동 다음을 본다',
};

export async function TopicDashboard({ topicId, entitySlug }: TopicDashboardProps) {
  const meta = TOPIC_META[topicId];
  const [data, { data: insights, summary }] = await Promise.all([
    getTopicData(topicId),
    getTopicInsight(topicId),
  ]);
  const text = INSIGHT_TEXT[meta.insight];
  const entities = data.entityGroups.flatMap((group) => group.entities);
  const entity = entitySlug
    ? entities.find((item) => item.slug === entitySlug)
    : (entities.find((item) => item.id === meta.defaultEntityId) ?? entities[0]);
  if (!entity) {
    notFound();
  }
  const group = data.entityGroups.find((item) => item.entities.includes(entity));
  const basePath = `/topics/${topicId}`;
  const reactionTitle = (group && meta.reactionTitle[group.id]) ?? '직후 반응';
  const { observation, evidence } = observationAndEvidence(topicId, insights, data);
  const overview = await exploreOverview(topicId, data, entity, group, insights);

  return (
    <TopicShell
      current={topicId}
      topicId={topicId}
      eyebrow={`${stageMark(topicId)} ${meta.stage} · ${meta.code} ${meta.title}`}
      title={`${meta.ask}?`}
      subtitle={meta.question}
    >
      <FlowStepper current={topicId} />
      <RoleFocus topicId={topicId} />

      <p className="rounded-lg border-l-4 border-primary bg-primary-soft px-5 py-4 text-base font-bold text-primary-strong">
        {summary.finding}
      </p>

      <InsightStep step={1} title="관찰" description="로그에 남은 사실. 아직 이유는 붙이지 않는다">
        <LensPanel topicId={topicId} panel="kpi" variant="bare">
          {observation}
        </LensPanel>
      </InsightStep>

      <InsightStep
        step={2}
        title={summary.question}
        description="같은 행동을 설명하는 해석들. 카드를 누르면 그 해석을 가르는 차트만 강조된다"
      >
        <HypothesisCards topicId={topicId} hypotheses={summary.hypotheses} />
      </InsightStep>

      <InsightStep
        step={3}
        id="evidence"
        title="해석을 가르는 근거"
        description="차트마다 어떤 해석을 서로 가르는지 적었다"
      >
        <HypothesisChips topicId={topicId} hypotheses={summary.hypotheses} />
        {evidence}
      </InsightStep>

      <InsightStep
        step={4}
        id="explore"
        title="대상별로 살펴보기"
        description={OVERVIEW_HINT[topicId]}
      >
        <LensPanel
          topicId={topicId}
          panel="ranking"
          title={OVERVIEW_TITLE[topicId]}
          hypotheses={RANKING_HYPOTHESES[topicId]}
          elevated
        >
          {overview}
        </LensPanel>

        {topicId === 'postrun' && (
          <LensPanel
            topicId={topicId}
            panel="ranking"
            title="실행 직후 첫 행동 구성"
            description="손을 댄 행동(설치·채굴)이 먼저 나오는가. 반복 실행이 많은 설계도는 다시 준비가 먼저 나온다"
            hypotheses={['undo', 'decorate']}
          >
            <StackedBar
              rows={reactionMixRows(await getBlueprintReactionMix(), basePath, entity.slug)}
              series={REACTION_SERIES}
              ariaLabel="설계도별 실행 직후 첫 행동 구성"
            />
          </LensPanel>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-extrabold tracking-tight">선택한 대상</h3>
          <EntityPicker
            groups={data.entityGroups.map((item) => ({
              id: item.id,
              label: item.label,
              options: item.entities.map((option) => ({ slug: option.slug, name: option.name })),
            }))}
            selectedSlug={entity.slug}
            basePath={basePath}
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <LensPanel
            topicId={topicId}
            panel={topicId === 'postrun' ? 'detail' : ['detail', 'reactions']}
            id="detail"
            title={topicId === 'loop' ? reactionTitle : meta.detailTitle}
            hypotheses={DETAIL_HYPOTHESES[topicId]}
          >
            {detailView(topicId, entity, group, insights)}
          </LensPanel>
          <LensPanel
            topicId={topicId}
            panel={topicId === 'postrun' ? ['entity', 'reactions'] : 'entity'}
            className="xl:self-start"
          >
            <EntitySummary entity={entity} />
            {topicId === 'postrun' && (
              <div className="flex flex-col gap-2 border-t pt-4">
                <h3 className="text-sm font-extrabold">{reactionTitle}</h3>
                <p className="text-xs text-muted-foreground">세로선: 설계도 전체</p>
                <BarChart
                  items={reactionBars(entity.reactions, data.overallReactions, 5)}
                  labelWidth={92}
                  width={300}
                  rowHeight={30}
                  ariaLabel="실행 직후 다음 행동"
                />
              </div>
            )}
          </LensPanel>
        </div>

        <LensPanel topicId={topicId} panel="ranking" title="전체 대상 표">
          <EntityTable topicId={topicId} groups={data.entityGroups} selectedSlug={entity.slug} />
        </LensPanel>
      </InsightStep>

      <InsightStep step={5} title="로그로는 가를 수 없는 것">
        <OpenQuestions items={text.openQuestions} />
      </InsightStep>

      <InsightStep
        step={6}
        title="누가 무엇을 고치나"
        description="해석이 갈리는 곳은 조건을 붙였다. 위 역할 렌즈로 내 역할만 볼 수 있다"
      >
        <LensPanel topicId={topicId} panel="actions" variant="bare">
          <RoleActionCards actions={text.actions} />
        </LensPanel>
      </InsightStep>

      <FlowNext current={topicId} />
      <SampleNote meta={insights.meta} />
    </TopicShell>
  );
}
