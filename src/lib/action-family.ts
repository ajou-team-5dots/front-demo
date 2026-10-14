// Three action families for coloring flows, instead of one color per action.
export type ActionFamily = 'mining' | 'building' | 'other';

const FAMILY: Record<string, ActionFamily> = {
  채굴: 'mining',
  '채굴 취소': 'mining',
  설치: 'building',
  '도구 선택': 'building',
};

export const familyOf = (action: string): ActionFamily => FAMILY[action] ?? 'other';

export const FAMILY_LABELS: Record<ActionFamily, string> = {
  mining: '채굴 계열',
  building: '설치·도구 계열',
  other: 'UI·설계도·기타',
};

/** Tailwind fill/stroke/bg class stems per family (data tokens). */
export const FAMILY_TONE: Record<ActionFamily, { fill: string; stroke: string; bg: string }> = {
  mining: { fill: 'fill-edit-dig', stroke: 'stroke-edit-dig', bg: 'bg-edit-dig' },
  building: { fill: 'fill-edit-add', stroke: 'stroke-edit-add', bg: 'bg-edit-add' },
  other: { fill: 'fill-data-bar', stroke: 'stroke-data-bar', bg: 'bg-data-bar' },
};

// Shared row/column order so repeats sit on the diagonal.
export const ACTION_ORDER = [
  '채굴',
  '채굴 취소',
  '설치',
  '도구 선택',
  'UI 열기',
  '설계도 준비',
  '설계도 실행',
  '설계도 취소',
  '월드 이동',
  '퀘스트 보상',
  '채팅',
  '종료',
];
