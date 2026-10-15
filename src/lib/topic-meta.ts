import type { InsightId } from '@/types/insights';
import type { TopicId } from '@/types/topics';

// Topic definitions from information-design-5dots docs/demo_topics.md (2026-10-14),
// each now paired with one building insight (src/server/data/insights.ts).

export type RoleId = 'level' | 'content' | 'dev' | 'system' | 'ops';
export type PanelId =
  'kpi' | 'evidence' | 'ranking' | 'entity' | 'reactions' | 'detail' | 'actions';

export const ROLES: { id: RoleId; label: string }[] = [
  { id: 'level', label: '레벨 디자인' },
  { id: 'content', label: '콘텐츠 기획' },
  { id: 'dev', label: '개발' },
  { id: 'system', label: '시스템·UX 기획' },
  { id: 'ops', label: '운영' },
];

export const PANEL_LABELS: Record<PanelId, string> = {
  kpi: '관찰',
  evidence: '해석을 가르는 근거',
  ranking: '대상 비교',
  entity: '선택한 대상',
  reactions: '직후 반응',
  detail: '상세 보기',
  actions: '누가 무엇을 고치나',
};

export interface TopicMeta {
  id: TopicId;
  code: string;
  title: string;
  /** The one question this topic answers, e.g. "어디를 고쳤나". */
  ask: string;
  question: string;
  roles: Partial<Record<RoleId, { panels: PanelId[]; focus: string }>>;
  defaultEntityId: string;
  reactionTitle: Record<string, string>;
  detailTitle: string;
  /** The building insight this topic carries. */
  insight: InsightId;
  /** Stage in the building flow: choose → run and fix → build by hand. */
  stage: string;
}

/** Topics in building-flow order (codes keep the original T numbers). */
export const TOPIC_FLOW: TopicId[] = ['loop', 'postrun', 'friction'];

export const TOPIC_META: Record<TopicId, TopicMeta> = {
  postrun: {
    id: 'postrun',
    code: 'T1',
    title: '콘텐츠 실행 직후 결과물 수정 분석',
    ask: '어디를 고쳤나',
    question: '블루프린트를 실행한 직후, 플레이어는 결과물의 어디를 캐거나 덧붙였나?',
    roles: {
      level: {
        panels: ['detail', 'evidence', 'actions'],
        focus: '3D와 위치 구성에서 지형 맞춤·덧붙이기가 어디서 일어나나',
      },
      content: {
        panels: ['kpi', 'ranking', 'actions'],
        focus: '처음 실행과 반복 실행의 수정 비율 차이',
      },
      dev: { panels: ['entity', 'evidence', 'actions'], focus: '건너뛴 블록과 수정의 관계' },
    },
    defaultEntityId: 'bp-20',
    reactionTitle: { blueprint: '실행 직후 30분 안의 다음 행동' },
    detailTitle: '3D 수정 히트맵',
    insight: 'draft',
    stage: '실행하고 결과 고치기',
  },
  friction: {
    id: 'friction',
    code: 'T2',
    title: '채굴 취소와 재시도로 본 조작 마찰 분석',
    ask: '어디서 막히나',
    question: '어떤 블록에서 채굴을 취소했고, 그 다음 같은 칸을 다시 캤나 다른 칸으로 옮겼나?',
    roles: {
      dev: {
        panels: ['ranking', 'reactions', 'actions'],
        focus: '손 뗀 뒤 같은 칸을 다시 캐는 블록 (충전 시간 후보)',
      },
      system: {
        panels: ['evidence', 'detail', 'actions'],
        focus: '취소 사유별로 다음에 어디를 캤나',
      },
      level: { panels: ['evidence', 'actions'], focus: '수동 설치는 어디서 하나' },
    },
    defaultEntityId: 'block-87',
    reactionTitle: { block: '채굴 취소 사유' },
    detailTitle: '사유별 다음 채굴 위치',
    insight: 'manual',
    stage: '손으로 캐고 짓기',
  },
  loop: {
    id: 'loop',
    code: 'T3',
    title: '설계도 준비와 행동 전이로 본 건축 루프 분석',
    ask: '어디서 끊기나',
    question: '설계도를 고르고, 준비하고, 실행하기까지 건축 흐름은 어디서 끊기나?',
    roles: {
      system: {
        panels: ['evidence', 'ranking', 'actions'],
        focus: '준비 → 실행 경로와 취소 뒤 행동',
      },
      content: { panels: ['ranking', 'reactions'], focus: '의도한 루프와 실제 루프의 차이' },
      ops: { panels: ['kpi', 'evidence', 'actions'], focus: '운영자 계정이 섞이면 달라지는 값' },
      dev: { panels: ['actions'], focus: '준비 중 미리보기 위치 로그' },
    },
    defaultEntityId: '설계도 준비',
    reactionTitle: { action: '60초 안의 다음 행동' },
    detailTitle: '행동 전이 그래프',
    insight: 'prepare',
    stage: '고르고 준비하기',
  },
};

// Raw reason codes from the logs, shown with a plain-language label.
const REASON_LABELS: Record<string, string> = {
  target_change: '조준 변경',
  mouse_up: '버튼에서 손 뗌',
  escape: 'ESC로 취소',
  manual: '직접 취소',
  reselect: '다시 선택',
  error: '오류',
};

export const reasonLabel = (label: string) =>
  REASON_LABELS[label] ? `${REASON_LABELS[label]} (${label})` : label;
