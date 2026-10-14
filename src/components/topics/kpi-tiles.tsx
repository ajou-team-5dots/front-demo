import {
  Boxes,
  CircleSlash,
  Crosshair,
  FileX,
  Hourglass,
  MoveRight,
  Play,
  Repeat,
  Repeat2,
  Shapes,
  TriangleAlert,
  Wrench,
} from 'lucide-react';

import type { Kpi, TopicId } from '@/types/topics';

// Icons follow the KPI order built in src/server/data/topics.ts.
const ICONS: Record<TopicId, (typeof Wrench)[]> = {
  postrun: [Wrench, Repeat, CircleSlash, Boxes],
  friction: [TriangleAlert, FileX, Crosshair, MoveRight],
  loop: [Repeat2, Hourglass, Play, Shapes],
};

export function KpiTiles({ topicId, kpis }: { topicId: TopicId; kpis: Kpi[] }) {
  return (
    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = ICONS[topicId][index] ?? Shapes;
        return (
          <div key={kpi.label} className="flex flex-col gap-3 rounded-lg border bg-card p-6">
            <span className="flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Icon className="size-5" />
            </span>
            <dt className="text-sm text-muted-foreground">{kpi.label}</dt>
            <dd className="text-3xl font-black tracking-tight tabular-nums">{kpi.value}</dd>
            <dd className="text-xs text-muted-foreground">{kpi.hint}</dd>
          </div>
        );
      })}
    </dl>
  );
}
