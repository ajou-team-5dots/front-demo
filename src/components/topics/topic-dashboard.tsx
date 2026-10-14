import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { BlueprintExplorer } from '@/components/blueprint-edits/blueprint-explorer';
import { type BarItem, BarChart } from '@/components/charts/bar-chart';
import { ChartTabs } from '@/components/charts/chart-tabs';
import { DonutChart } from '@/components/charts/donut-chart';
import { SankeyChart } from '@/components/charts/sankey-chart';
import { StackedBar } from '@/components/charts/stacked-bar';
import { TransitionHeatmap } from '@/components/charts/transition-heatmap';
import { Badge } from '@/components/ui/badge';
import { getDetailCaveats } from '@/lib/blueprint-caveats';
import { reasonLabel, TOPIC_META } from '@/lib/topic-meta';
import { getBlueprintDetail } from '@/server/data/blueprint-edits';
import { getTopicData } from '@/server/data/topics';
import {
  getBlueprintReactionMix,
  getTopTransitions,
  getTransitionMatrix,
} from '@/server/data/viz-tests';
import type { EntityGroup, Reaction, TopicData, TopicEntity, TopicId } from '@/types/topics';

import { EntityPicker } from './entity-picker';
import { EntitySummary } from './entity-summary';
import { EntityTable } from './entity-table';
import { GroupedOverview } from './grouped-overview';
import { KpiTiles } from './kpi-tiles';
import { LensPanel, RoleFocus } from './role-lens';
import { overviewViews, REACTION_SERIES, reactionMixRows } from './topic-charts';
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

async function PostrunDetail({ blueprintId }: { blueprintId: number }) {
  const detail = await getBlueprintDetail(blueprintId);
  if (!detail) {
    return <p className="text-sm text-muted-foreground">3D 데이터가 없습니다.</p>;
  }
  const caveats = getDetailCaveats(detail.summary, detail.voxels);
  return (
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
  );
}

function detailView(
  topicId: TopicId,
  entity: TopicEntity,
  group: EntityGroup | undefined,
  data: TopicData,
) {
  if (topicId === 'postrun') {
    return entity.blueprintId ? (
      <PostrunDetail blueprintId={entity.blueprintId} />
    ) : (
      <p className="text-sm text-muted-foreground">3D 데이터가 없습니다.</p>
    );
  }
  if (topicId === 'friction' && group?.id === 'block') {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
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
        <DonutChart
          title="채굴 취소 뒤 10초 (전체)"
          ariaLabel="취소 뒤 행동 비율"
          items={data.overallReactions.map((reaction) => ({
            key: reaction.label,
            label: reaction.label,
            value: reaction.n,
          }))}
        />
      </div>
    );
  }
  if (entity.reactions.length === 0) {
    return <p className="text-sm text-muted-foreground">이 대상은 비율만 집계했습니다.</p>;
  }
  return (
    <BarChart
      items={reactionBars(entity.reactions, [], 8)}
      ariaLabel={`${entity.name} 반응 분포`}
    />
  );
}

export async function TopicDashboard({ topicId, entitySlug }: TopicDashboardProps) {
  const meta = TOPIC_META[topicId];
  const data = await getTopicData(topicId);
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

  let overview: ReactNode;
  if (topicId === 'loop') {
    const [topFlows, matrix] = await Promise.all([getTopTransitions(), getTransitionMatrix()]);
    overview = (
      <ChartTabs
        tabs={[
          {
            id: 'graph',
            label: '노드-링크',
            content: (
              <TransitionGraph
                actions={entities}
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
  } else {
    overview = (
      <GroupedOverview
        views={overviewViews(topicId, data, entity.slug)}
        initialId={group?.id ?? data.entityGroups[0]?.id ?? ''}
        selectedSlug={entity.slug}
        basePath={basePath}
      />
    );
  }

  const overviewTitle = {
    postrun: '설계도별 실행 직후 수정 비율',
    friction: '어디서 실패·취소가 많은가',
    loop: '행동 전이 지도',
  }[topicId];

  return (
    <TopicShell
      current={topicId}
      topicId={topicId}
      eyebrow={`${meta.code} · ${meta.title}`}
      title={`${meta.ask}?`}
      subtitle={meta.question}
    >
      <RoleFocus topicId={topicId} />

      {/* 1. Big picture: headline numbers */}
      <LensPanel topicId={topicId} panel="kpi" variant="bare">
        <KpiTiles topicId={topicId} kpis={data.kpis} />
      </LensPanel>

      {/* 2. Every entity compared; picking one drives the detail below */}
      <LensPanel topicId={topicId} panel="ranking" title={overviewTitle} elevated>
        {overview}
      </LensPanel>

      {topicId === 'postrun' && (
        <LensPanel topicId={topicId} panel="ranking" title="실행 직후 첫 행동 구성">
          <StackedBar
            rows={reactionMixRows(await getBlueprintReactionMix(), basePath, entity.slug)}
            series={REACTION_SERIES}
            ariaLabel="설계도별 실행 직후 첫 행동 구성"
          />
        </LensPanel>
      )}

      {/* 3. The selected entity */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-extrabold tracking-tight">선택한 대상</h2>
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
            title={topicId === 'postrun' ? meta.detailTitle : reactionTitle}
          >
            {detailView(topicId, entity, group, data)}
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
      </section>

      {/* 4. Full table for exact numbers */}
      <LensPanel topicId={topicId} panel="ranking" title="전체 대상 표">
        <EntityTable topicId={topicId} groups={data.entityGroups} selectedSlug={entity.slug} />
      </LensPanel>
    </TopicShell>
  );
}
