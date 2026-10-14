import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { cacheLife } from 'next/cache';

import type {
  EntityGroup,
  Highlight,
  Kpi,
  Metric,
  Reaction,
  TopicData,
  TopicEntity,
  TopicId,
  Transition,
} from '@/types/topics';

// Copied from information-design-5dots data/export/topics (scripts/export_topics.py).
// Ops accounts are excluded there and error strings are already scrubbed of transaction hashes.
const DATA_DIR = path.join(process.cwd(), 'data', 'topics');

export const TOPIC_IDS: readonly TopicId[] = ['postrun', 'friction', 'loop'];

interface RawEntity {
  id: string;
  name: string;
  n: number;
  players: number;
  primary: { label: string; value: number; text?: string };
  secondary?: Metric[];
  reactions: Reaction[];
  small: boolean;
  flags?: string[];
  blueprintId?: number;
}

interface RawTopic {
  opsExcluded: boolean;
  players: number;
  smallN: number;
  entityGroups: { id: string; label: string; entities: RawEntity[] }[];
  overallReactions?: Reaction[];
  edges?: Transition[];
}

async function readTopic(id: TopicId): Promise<RawTopic> {
  const text = await readFile(path.join(DATA_DIR, `${id}.json`), 'utf8');
  return JSON.parse(text) as RawTopic;
}

const ASCII_SLUG = /^[a-z0-9_-]+$/i;

const toEntity = (raw: RawEntity, groupId: string, index: number): TopicEntity => ({
  id: raw.id,
  // Action ids in the loop topic are Korean words; keep URLs plain ASCII.
  slug: ASCII_SLUG.test(raw.id) ? raw.id : `${groupId}-${index + 1}`,
  name: raw.name,
  n: raw.n,
  players: raw.players,
  primary: raw.primary,
  secondary: raw.secondary ?? [],
  reactions: raw.reactions,
  small: raw.small,
  flags: raw.flags ?? [],
  blueprintId: raw.blueprintId,
});

const percent = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`;
const count = (value: number) => value.toLocaleString('ko-KR');
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const findEntity = (groups: EntityGroup[], id: string) =>
  groups.flatMap((group) => group.entities).find((entity) => entity.id === id);

const reactionShare = (reactions: Reaction[], label: string) =>
  reactions.find((reaction) => reaction.label === label)?.share ?? 0;

function postrunKpis(groups: EntityGroup[], friction: EntityGroup[]): Kpi[] {
  const blueprints = groups[0]?.entities ?? [];
  // Edited runs per blueprint, recovered from the rate so we can re-aggregate.
  const edited = (entity: TopicEntity) => Math.round(entity.primary.value * entity.n);
  const allRuns = sum(blueprints.map((entity) => entity.n));
  const shared = blueprints.filter((entity) => entity.flags.length === 0);
  const sharedRuns = sum(shared.map((entity) => entity.n));
  const skipped = findEntity(friction, 'feature-blueprint_build');
  return [
    {
      label: '반복 실행을 뺀 수정 비율',
      value: percent(sum(shared.map(edited)) / sharedRuns),
      hint: `한 사람 반복 설계도 제외 ${shared.length}개, 실행 ${count(sharedRuns)}회 기준`,
    },
    {
      label: '전체 수정 비율',
      value: percent(sum(blueprints.map(edited)) / allRuns, 1),
      hint: `설계도 ${blueprints.length}개, 실행 ${count(allRuns)}회. 한 사람의 반복 실행이 섞인 값`,
    },
    {
      label: '건너뛴 블록이 생긴 실행',
      value: skipped ? percent(skipped.primary.value) : '확인 필요',
      hint: '설치 실패 단서 (개발)',
    },
    {
      label: '분석한 설계도',
      value: `${blueprints.length}개`,
      hint: '실행 5회 이상. 3D로 복원',
    },
  ];
}

function frictionKpis(groups: EntityGroup[], overall: Reaction[]): Kpi[] {
  const realm = findEntity(groups, 'feature-realm_create');
  const blueprint = findEntity(groups, 'feature-blueprint_create');
  const blocks = groups.find((group) => group.id === 'block')?.entities ?? [];
  const cancelReasons = blocks.flatMap((entity) => entity.reactions);
  const targetChange = sum(
    cancelReasons.filter((r) => r.label === 'target_change').map((r) => r.n),
  );
  return [
    {
      label: '렐름 생성 실패·취소율',
      value: realm ? percent(realm.primary.value, 1) : '확인 필요',
      hint: realm ? `시도 ${count(realm.n)}회` : '',
    },
    {
      label: '설계도 생성 실패·취소율',
      value: blueprint ? percent(blueprint.primary.value, 1) : '확인 필요',
      hint: blueprint ? `시도 ${count(blueprint.n)}회` : '',
    },
    {
      label: '채굴 취소 중 조준 변경',
      value: percent(targetChange / Math.max(sum(cancelReasons.map((r) => r.n)), 1)),
      hint: 'target_change. 블록이 어려워서가 아님',
    },
    {
      label: '취소 뒤 다른 칸으로 이동',
      value: percent(reactionShare(overall, '다른 칸으로 이동')),
      hint: `같은 칸 재시도 ${percent(reactionShare(overall, '같은 칸 재시도'))}`,
    },
  ];
}

function loopKpis(groups: EntityGroup[], edges: Transition[]): Kpi[] {
  const actions = groups[0]?.entities ?? [];
  const pairN = (a: string, b: string) =>
    sum(
      edges
        .filter((e) => (e.src === a && e.dst === b) || (e.src === b && e.dst === a))
        .map((e) => e.n),
    );
  const edgeTotal = sum(edges.map((edge) => edge.n));
  const ui = findEntity(groups, 'UI 열기');
  const prepare = findEntity(groups, '설계도 준비');
  return [
    {
      label: '채굴 ⇄ 채굴 취소',
      value: percent(pairN('채굴', '채굴 취소') / Math.max(edgeTotal, 1)),
      hint: '다른 행동으로 넘어간 전이 중 비율',
    },
    {
      label: 'UI 연 뒤 60초간 행동 없음',
      value: ui ? percent(reactionShare(ui.reactions, '60초 이상 없음')) : '확인 필요',
      hint: ui ? `다음이 설계도 준비 ${percent(reactionShare(ui.reactions, '설계도 준비'))}` : '',
    },
    {
      label: '설계도 준비 → 실행',
      value: prepare ? percent(reactionShare(prepare.reactions, '설계도 실행')) : '확인 필요',
      hint: '나머지는 대부분 다시 UI로',
    },
    {
      label: '행동 종류',
      value: `${actions.length}종`,
      hint: `전이 ${count(edgeTotal)}건 (같은 행동 반복 제외)`,
    },
  ];
}

function topicHighlights(
  id: TopicId,
  groups: EntityGroup[],
): { highlightTitle: string; highlights: Highlight[] } {
  if (id === 'postrun') {
    const blueprints = groups[0]?.entities ?? [];
    const rate = (items: TopicEntity[]) =>
      sum(items.map((entity) => Math.round(entity.primary.value * entity.n))) /
      Math.max(sum(items.map((entity) => entity.n)), 1);
    return {
      highlightTitle: '실행 직후 결과물을 고친 비율',
      highlights: [
        {
          label: '반복 실행 제외',
          value: rate(blueprints.filter((entity) => entity.flags.length === 0)),
        },
        { label: '전체', value: rate(blueprints) },
      ],
    };
  }
  if (id === 'friction') {
    const features = groups.find((group) => group.id === 'feature')?.entities ?? [];
    return {
      highlightTitle: '서버 기능 실패·취소율',
      highlights: features
        .filter((entity) => entity.id !== 'feature-blueprint_build')
        .sort((a, b) => b.primary.value - a.primary.value)
        .slice(0, 4)
        .map((entity) => ({ label: entity.name, value: entity.primary.value })),
    };
  }
  const ui = findEntity(groups, 'UI 열기');
  return {
    highlightTitle: 'UI를 연 다음 60초 안의 행동',
    highlights: (ui?.reactions ?? [])
      .filter((reaction) => reaction.label !== 'UI 열기')
      .slice(0, 4)
      .map((reaction) => ({ label: reaction.label, value: reaction.share })),
  };
}

export async function getTopicData(id: TopicId): Promise<TopicData> {
  'use cache';

  cacheLife('hours');

  const raw = await readTopic(id);
  const entityGroups: EntityGroup[] = raw.entityGroups.map((group) => ({
    id: group.id,
    label: group.label,
    entities: group.entities.map((entity, index) => toEntity(entity, group.id, index)),
  }));
  const overallReactions = raw.overallReactions ?? [];
  const edges = raw.edges ?? [];

  let kpis: Kpi[];
  if (id === 'postrun') {
    const friction = await readTopic('friction');
    kpis = postrunKpis(
      entityGroups,
      friction.entityGroups.map((group) => ({
        id: group.id,
        label: group.label,
        entities: group.entities.map((entity, index) => toEntity(entity, group.id, index)),
      })),
    );
  } else if (id === 'friction') {
    kpis = frictionKpis(entityGroups, overallReactions);
  } else {
    kpis = loopKpis(entityGroups, edges);
  }

  return {
    id,
    opsExcluded: raw.opsExcluded,
    players: raw.players,
    smallN: raw.smallN,
    entityGroups,
    overallReactions,
    edges,
    kpis,
    ...topicHighlights(id, entityGroups),
  };
}
