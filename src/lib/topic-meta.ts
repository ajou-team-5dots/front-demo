import type { TopicId } from '@/types/topics';

// Topic definitions from information-design-5dots docs/demo_topics.md (2026-10-14).

export type RoleId = 'level' | 'content' | 'dev' | 'system' | 'ops';
export type PanelId = 'kpi' | 'ranking' | 'entity' | 'reactions' | 'detail';

export const ROLES: { id: RoleId; label: string }[] = [
  { id: 'level', label: '레벨 디자인' },
  { id: 'content', label: '콘텐츠 기획' },
  { id: 'dev', label: '개발' },
  { id: 'system', label: '시스템·UX 기획' },
  { id: 'ops', label: '운영' },
];

export const PANEL_LABELS: Record<PanelId, string> = {
  kpi: '핵심 수치',
  ranking: '대상 비교',
  entity: '선택한 대상',
  reactions: '직후 반응',
  detail: '상세 보기',
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
}

export const TOPIC_META: Record<TopicId, TopicMeta> = {
  postrun: {
    id: 'postrun',
    code: 'T1',
    title: '콘텐츠 실행 직후 결과물 수정 분석',
    ask: '어디를 고쳤나',
    question: '블루프린트를 실행한 직후, 플레이어는 결과물의 어디를 캐거나 덧붙였나?',
    roles: {
      level: { panels: ['detail'], focus: '3D 위에서 실행 직후 고친 위치' },
      content: { panels: ['ranking', 'kpi'], focus: '설계도별 수정 비율' },
      dev: { panels: ['kpi', 'entity'], focus: '건너뛴 블록 비율 (설치 실패 단서)' },
    },
    defaultEntityId: 'bp-20',
    reactionTitle: { blueprint: '실행 직후 30분 안의 다음 행동' },
    detailTitle: '3D 수정 히트맵',
  },
  friction: {
    id: 'friction',
    code: 'T2',
    title: '시도 대비 실패와 재시도로 본 플레이 마찰 분석',
    ask: '어디서 막히나',
    question: '시도했다가 실패·취소한 곳은 어디이고, 그 다음 다시 했나 포기했나?',
    roles: {
      dev: { panels: ['ranking', 'reactions'], focus: '기능별 실패율과 오류 유형' },
      system: { panels: ['entity', 'detail'], focus: '취소 사유와 재시도 비율' },
      content: { panels: ['ranking'], focus: '블록별 취소율 (조준 변경 비중과 함께)' },
    },
    defaultEntityId: 'feature-realm_create',
    reactionTitle: { feature: '실패 오류 유형 · 취소 사유', block: '채굴 취소 사유' },
    detailTitle: '사유·오류 분포',
  },
  loop: {
    id: 'loop',
    code: 'T3',
    title: '행동 전이로 본 실제 코어 루프 분석',
    ask: '무엇 다음에 무엇을 하나',
    question: '기획한 루프(채집 → 건축 → 공유)와 실제로 반복되는 행동 고리는 같은가?',
    roles: {
      content: { panels: ['ranking', 'reactions'], focus: '의도한 루프와 실제 루프의 차이' },
      system: { panels: ['ranking', 'detail'], focus: '행동이 어디로 이어지고 어디서 끊기나' },
    },
    defaultEntityId: 'UI 열기',
    reactionTitle: { action: '60초 안의 다음 행동' },
    detailTitle: '행동 전이 그래프',
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
