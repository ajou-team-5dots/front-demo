// Chart configs shared by the topic dashboards and the visualization test page.
import type { StackedRow, StackedSeries } from '@/components/charts/stacked-bar';
import type { EntityGroup, TopicData, TopicEntity, TopicId } from '@/types/topics';
import type { ReactionMixRow } from '@/types/viz';

import type { OverviewView } from './grouped-overview';

// Bookshelf 1slot: a definition-only block (no render, no drop) that players still tried to mine.
const BOOKSHELF = 'block-19';

const mainCancelTone = (entity: TopicEntity): 'dig' | 'release' | 'none' => {
  const [top] = [...entity.reactions].sort((a, b) => b.n - a.n);
  if (!top) return 'none';
  return top.label === 'target_change' ? 'dig' : 'release';
};

// First action after a run: hands-on actions get the data colors, everything else stays gray.
export const REACTION_SERIES: StackedSeries[] = [
  { key: '설치', label: '설치 (손을 댐)', fill: 'fill-edit-add' },
  { key: '채굴', label: '채굴 (손을 댐)', fill: 'fill-edit-dig' },
  { key: '채굴 취소', label: '채굴 취소', fill: 'fill-data-bar/45' },
  { key: '설계도 준비', label: '설계도 준비', fill: 'fill-data-bar/30' },
  { key: 'UI 열기', label: 'UI 열기', fill: 'fill-data-bar/18' },
  { key: '30분 안에 행동 없음', label: '행동 없음', fill: 'fill-muted-foreground/15' },
  { key: '기타', label: '기타', fill: 'fill-muted-foreground/30' },
];

/** The top-of-page comparison of every entity: scatter or bars per group. */
export function overviewViews(
  topicId: TopicId,
  data: TopicData,
  selectedSlug: string,
): OverviewView[] {
  const basePath = `/topics/${topicId}`;
  const groups = data.entityGroups;
  if (topicId === 'postrun') {
    const blueprints = groups[0]?.entities ?? [];
    const notable = blueprints
      .filter((entity) => entity.n >= 10)
      .sort((a, b) => b.primary.value - a.primary.value)
      .slice(0, 3)
      .map((entity) => entity.slug);
    return [
      {
        id: groups[0]?.id ?? 'blueprint',
        label: groups[0]?.label ?? '설계도',
        scatter: {
          points: blueprints.map((entity) => ({
            slug: entity.slug,
            name: `#${entity.blueprintId ?? entity.name}`,
            x: entity.n,
            y: entity.primary.value,
            size: entity.players,
            hollow: entity.flags.length > 0,
          })),
          xLabel: '실행 수',
          yLabel: '직후 수정 비율',
          xDomain: [4, 2000],
          sizeLabel: '플레이어 수',
          labelSlugs: notable,
        },
        note: '○ 속이 빈 점: 한 사람이 실행의 80% 이상',
      },
    ];
  }
  return groups.map((group: EntityGroup) => {
    if (group.id === 'block') {
      const notable = group.entities
        .filter((entity) => entity.n >= 1000)
        .sort((a, b) => b.primary.value - a.primary.value)
        .slice(0, 3)
        .map((entity) => entity.slug);
      return {
        id: group.id,
        label: `${group.label} ${group.entities.length}`,
        scatter: {
          points: group.entities.map((entity) => ({
            slug: entity.slug,
            name: entity.name,
            x: entity.n,
            y: entity.primary.value,
            size: entity.players,
            tone: mainCancelTone(entity),
          })),
          xLabel: '채굴 시도 수',
          yLabel: '취소율',
          sizeLabel: '플레이어 수',
          labelSlugs: notable.filter((slug) => slug !== BOOKSHELF),
          annotations: [
            {
              slug: BOOKSHELF,
              lines: [
                'Bookshelf 1slot · 취소율 96% · 41명',
                '정의 전용 블록이 월드에 놓여 캘 수 없음',
                '(정의는 10월 기준, 로그는 6~7월)',
              ],
            },
          ],
        },
        note: '빨강 = 조준 변경이 대부분(조작 신호) · 청록 = 손 뗌이 대부분(실제 막힘 후보) · 회색 = 취소 없음',
      };
    }
    return {
      id: group.id,
      label: `${group.label} ${group.entities.length}`,
      bars: [...group.entities]
        .sort((a, b) => b.primary.value - a.primary.value)
        .map((entity) => ({
          key: entity.slug,
          label: entity.name,
          value: entity.primary.value,
          valueLabel: `${(entity.primary.value * 100).toFixed(1)}% · n ${entity.n.toLocaleString('ko-KR')}`,
          selected: entity.slug === selectedSlug,
          href: `${basePath}/${entity.slug}`,
        })),
      barValueWidth: 130,
      note: '설계도 실행은 건너뛴 블록이 생긴 실행 비율 · n = 시도 수',
    };
  });
}

/** Rows for the 100% stacked bar of first actions after a run. */
export const reactionMixRows = (
  rows: ReactionMixRow[],
  basePath: string,
  selectedSlug: string,
): StackedRow[] =>
  rows.map((row) => ({
    key: row.slug,
    label: row.label,
    sub: `n ${row.n.toLocaleString('ko-KR')}`,
    href: `${basePath}/${row.slug}`,
    selected: row.slug === selectedSlug,
    segments: REACTION_SERIES.map((series) => ({
      key: series.key,
      share: row.segments.find((segment) => segment.key === series.key)?.share ?? 0,
    })),
  }));
