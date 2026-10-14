'use client';

import { useState } from 'react';

import { type BarItem, BarChart } from '@/components/charts/bar-chart';
import {
  EntityScatter,
  type ScatterAnnotation,
  type ScatterPoint,
} from '@/components/charts/entity-scatter';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ScatterView {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  sizeLabel: string;
  labelSlugs?: string[];
  xDomain?: [number, number];
  annotations?: ScatterAnnotation[];
}

export interface OverviewView {
  id: string;
  label: string;
  /** One-line reading guide shown under the chart. */
  note?: string;
  bars?: BarItem[];
  barValueWidth?: number;
  scatter?: ScatterView;
}

interface GroupedOverviewProps {
  views: OverviewView[];
  initialId: string;
  selectedSlug: string;
  basePath: string;
}

/** Comparison chart of every entity in a group, with tabs when a topic has several groups. */
export function GroupedOverview({
  views,
  initialId,
  selectedSlug,
  basePath,
}: GroupedOverviewProps) {
  const [viewId, setViewId] = useState(initialId);
  const view = views.find((item) => item.id === viewId) ?? views[0];
  if (!view) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      {views.length > 1 && (
        <Tabs value={viewId} onValueChange={(value: string) => setViewId(value)}>
          <TabsList>
            {views.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {view.bars && (
        <BarChart
          items={view.bars}
          labelWidth={190}
          width={760}
          valueWidth={view.barValueWidth}
          ariaLabel={`${view.label} 비교`}
        />
      )}
      {view.scatter && (
        <EntityScatter
          points={view.scatter.points}
          selectedSlug={selectedSlug}
          basePath={basePath}
          xLabel={view.scatter.xLabel}
          yLabel={view.scatter.yLabel}
          sizeLabel={view.scatter.sizeLabel}
          labelSlugs={view.scatter.labelSlugs}
          xDomain={view.scatter.xDomain}
          annotations={view.scatter.annotations}
          ariaLabel={`${view.label} 비교`}
        />
      )}
      {view.note && <p className="text-xs text-muted-foreground">{view.note}</p>}
    </div>
  );
}
