import type { ReactNode } from 'react';

import { BarChart } from '@/components/charts/bar-chart';
import { ChordChart } from '@/components/charts/chord-chart';
import { EntityScatter } from '@/components/charts/entity-scatter';
import { SankeyChart } from '@/components/charts/sankey-chart';
import { StackedBar } from '@/components/charts/stacked-bar';
import { TransitionHeatmap } from '@/components/charts/transition-heatmap';
import { overviewViews, REACTION_SERIES, reactionMixRows } from '@/components/topics/topic-charts';
import { TopicShell } from '@/components/topics/topic-shell';
import { cn } from '@/lib/utils';
import { type Verdict, VIZ_CRITERIA, VIZ_TESTS } from '@/lib/viz-tests';
import { getTopicData } from '@/server/data/topics';
import {
  getBlueprintReactionMix,
  getCollapsedFlows,
  getTopTransitions,
  getTransitionMatrix,
} from '@/server/data/viz-tests';

const VERDICT_CLASS: Record<Verdict, string> = {
  채택: 'bg-success-soft text-success',
  보조: 'bg-primary-soft text-primary-strong',
  보류: 'bg-muted text-muted-foreground',
};

export default async function VisualizationTestPage() {
  const [postrun, friction, mix, topFlows, matrix, flows] = await Promise.all([
    getTopicData('postrun'),
    getTopicData('friction'),
    getBlueprintReactionMix(),
    getTopTransitions(),
    getTransitionMatrix(),
    getCollapsedFlows(),
  ]);
  const [blueprintView] = overviewViews('postrun', postrun, '');
  const frictionViews = overviewViews('friction', friction, '');
  const featureView = frictionViews.find((view) => view.id === 'feature');
  const blockView = frictionViews.find((view) => view.id === 'block');

  const charts: Record<string, ReactNode> = {
    't1-scatter': blueprintView?.scatter && (
      <EntityScatter
        {...blueprintView.scatter}
        selectedSlug=""
        basePath="/topics/postrun"
        ariaLabel="설계도 산점도"
      />
    ),
    't1-stacked': (
      <StackedBar
        rows={reactionMixRows(mix, '/topics/postrun', '')}
        series={REACTION_SERIES}
        ariaLabel="실행 직후 첫 행동 구성"
      />
    ),
    't2-features': featureView?.bars && (
      <BarChart
        items={featureView.bars.map((bar) => ({ ...bar, selected: false }))}
        labelWidth={190}
        width={760}
        valueWidth={featureView.barValueWidth}
        ariaLabel="기능별 실패·취소율"
      />
    ),
    't2-blocks': blockView?.scatter && (
      <EntityScatter
        {...blockView.scatter}
        selectedSlug=""
        basePath="/topics/friction"
        ariaLabel="블록 산점도"
      />
    ),
    't3-sankey': <SankeyChart flows={topFlows} ariaLabel="행동 흐름 Sankey" />,
    't3-heatmap': <TransitionHeatmap cells={matrix} ariaLabel="행동 전이 행렬" />,
    't3-chord': <ChordChart flows={flows} ariaLabel="행동 흐름 Chord" />,
  };

  return (
    <TopicShell
      current="viz-test"
      eyebrow="Flourish 실험을 d3로 다시 그림"
      title="시각화 실험"
      subtitle="같은 데이터를 7가지로 그려 보고 고른 결과"
      showRoleSwitcher={false}
    >
      <ol className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {VIZ_CRITERIA.map((item, index) => (
          <li key={item.title} className="flex items-start gap-3 rounded-lg border bg-card p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              {index + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-extrabold">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-2">
        {VIZ_TESTS.map((test) => (
          <article
            key={test.id}
            className={cn(
              'flex flex-col gap-4 rounded-lg border bg-card p-6',
              test.verdict === '보류' && 'xl:col-span-1',
            )}
          >
            <header className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-muted-foreground">{test.topic}</span>
                <h2 className="text-lg font-extrabold tracking-tight">{test.title}</h2>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-bold',
                  VERDICT_CLASS[test.verdict],
                )}
              >
                {test.verdict}
              </span>
            </header>
            <div className={cn(test.verdict === '보류' && 'mx-auto w-full max-w-xs')}>
              {charts[test.id]}
            </div>
            <dl className="mt-auto grid gap-1.5 border-t pt-4 text-sm">
              {[
                ['고른 이유', test.why],
                ['보인 것', test.saw],
                ['아쉬운 점', test.gap],
              ].map(([term, text]) => (
                <div key={term} className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <dt className="text-xs font-bold text-muted-foreground">{term}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </TopicShell>
  );
}
