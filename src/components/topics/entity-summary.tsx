import { Badge } from '@/components/ui/badge';
import type { TopicEntity } from '@/types/topics';

const formatMetric = (label: string, value: number | null) => {
  if (value === null) return '집계 없음';
  if (label.includes('ms')) return `${value.toLocaleString('ko-KR')}ms`;
  if (label.includes('비율') || label.includes('재시도')) return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString('ko-KR');
};

export function EntitySummary({ entity }: { entity: TopicEntity }) {
  const stats = [
    { label: 'n (시도·실행·행동)', value: entity.n.toLocaleString('ko-KR') },
    { label: '플레이어', value: `${entity.players}명` },
    ...entity.secondary.map((metric) => ({
      label: metric.label,
      value: formatMetric(metric.label, metric.value),
    })),
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-xl font-extrabold tracking-tight">{entity.name}</h3>
          {entity.small && <Badge variant="outline">사례</Badge>}
          {entity.flags.length > 0 && <Badge variant="secondary">한 명의 사례</Badge>}
        </div>
      </div>
      <div className="rounded-md bg-muted p-4">
        <p className="text-xs text-muted-foreground">{entity.primary.label}</p>
        <p className="text-3xl font-black tracking-tight tabular-nums">
          {entity.primary.text ? `${entity.primary.text} ` : ''}
          {(entity.primary.value * 100).toFixed(1)}%
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
