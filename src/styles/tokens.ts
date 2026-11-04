// Generated from design-tokens/tokens.json by `pnpm tokens`. Do not edit by hand.

/** CSS var() for each color. */
export const COLOR = {
  base: {
    brand: 'var(--brand)',
    ink: 'var(--ink)',
    gray1: 'var(--gray-1)',
    gray2: 'var(--gray-2)',
    gray3: 'var(--gray-3)',
    panel: 'var(--panel)',
    primaryStrong: 'var(--primary-strong)',
    primarySoft: 'var(--primary-soft)',
    successSoft: 'var(--success-soft)',
    skeletonShine: 'var(--skeleton-shine)',
  },
  chart: {
    actual: 'var(--chart-actual)',
    comparison: 'var(--chart-comparison)',
    death: 'var(--chart-death)',
    survival: 'var(--chart-survival)',
    track: 'var(--chart-track)',
    accent: 'var(--chart-accent)',
    earth: 'var(--chart-earth)',
    violet: 'var(--chart-violet)',
    neutral: 'var(--chart-neutral)',
  },
  status: {
    warning: 'var(--status-warning)',
    danger: 'var(--status-danger)',
    supported: 'var(--status-supported)',
    warningSoft: 'var(--status-warning-soft)',
    dangerSoft: 'var(--status-danger-soft)',
    supportedSoft: 'var(--status-supported-soft)',
  },
  sankey: {
    lv: ['var(--sankey-lv-1)', 'var(--sankey-lv-2)', 'var(--sankey-lv-3)', 'var(--sankey-lv-4)'],
    wp: ['var(--sankey-wp-1)', 'var(--sankey-wp-2)', 'var(--sankey-wp-3)', 'var(--sankey-wp-4)'],
    ar: ['var(--sankey-ar-1)', 'var(--sankey-ar-2)', 'var(--sankey-ar-3)'],
    grp: [
      'var(--sankey-grp-1)',
      'var(--sankey-grp-2)',
      'var(--sankey-grp-3)',
      'var(--sankey-grp-4)',
      'var(--sankey-grp-5)',
    ],
    neutral: 'var(--sankey-neutral)',
  },
  scatter: {
    high: 'var(--scatter-high)',
    mid: 'var(--scatter-mid)',
    below: 'var(--scatter-below)',
    zone: 'var(--scatter-zone)',
  },
  textScale: {
    flag: 'var(--text-scale-flag)',
    sub: 'var(--text-scale-sub)',
  },
  state: {
    rowHover: 'var(--state-row-hover)',
    chipHover: 'var(--state-chip-hover)',
  },
} as const;

/** Opacity, 0–1. */
export const OPACITY = {
  band: {
    default: 0.35,
    hover: 0.75,
    picked: 0.85,
    dim: 0.08,
  },
  dim: {
    node: 0.35,
    mark: 0.4,
    label: 0.45,
    line: 0.35,
  },
  line: {
    grid: 0.7,
    ring: 0.8,
    reference: 0.7,
    flag: 0.55,
    median: 0.6,
  },
  fill: {
    area: 0.18,
  },
  point: {
    thin: 0.6,
  },
  pending: 0.6,
} as const;

/** Corner radius, px. */
export const RADIUS = {
  panel: 10,
  control: 6,
  pill: 4,
  focus: 4,
  mark: 2,
  markSm: 1,
} as const;

/** Spacing, px. */
export const SPACE = {
  panelGap: 14,
  panelInset: 16,
  panelTop: 12,
  segmentInset: 3,
} as const;

/** Font size, px. */
export const FONT_SIZE = {
  micro: 10,
  caption: 11,
  label: 12,
  bodySm: 13,
  body: 14,
  subtitle: 16,
  title: 18,
  heading: 20,
  kpi: 22,
  display: 24,
} as const;

/** Stroke width and point radius, px. */
export const STROKE = {
  width: {
    hairline: 0.75,
    thin: 1,
    ring: 1.25,
    regular: 1.5,
    bold: 2,
    focus: 2,
    halo: 3,
  },
  point: {
    mark: 6,
    markHoverGrow: 1.5,
    legend: 4.5,
    vertex: 4,
    vertexHover: 5.5,
    vertexRing: 8,
    trend: 3.5,
    trendThin: 2.5,
    estimate: 6,
  },
} as const;

/** Bar heights and mark sizes, px. */
export const SIZE = {
  bar: {
    skill: 10,
    share: 25,
    interval: 4,
  },
  dumbbell: {
    line: 2,
    dot: 14,
  },
  legend: {
    dot: 10,
    swatchW: 16,
  },
  sankey: {
    nodeWidth: 14,
    nodeMin: 18,
    pickGrow: 4,
  },
} as const;

/** Easing control points [x1, y1, x2, y2] and durations (ms). */
export const MOTION = {
  ease: {
    board: [0.2, 0.7, 0.2, 1],
  },
  duration: {
    fast: 120,
    base: 200,
    slow: 320,
  },
} as const;

export interface TokenEntry {
  path: string;
  type: string;
  cssVar: string;
  css: string;
  value: string | number | readonly number[];
  description: string;
}

/** Every token, in file order (the /dev/tokens preview page lists these). */
export const TOKEN_LIST: TokenEntry[] = [
  {
    path: 'color.base.brand',
    type: 'color',
    cssVar: '--brand',
    css: '#a97b1e',
    value: '#a97b1e',
    description:
      '머리글 AKKADIA 로고 글자(20px 굵게). 제약: 큰 글자라 패널·gray-3 바탕 3:1 이상 (검사). 디자이너 원안 #c3ab6a 는 대비 부족',
  },
  {
    path: 'color.base.ink',
    type: 'color',
    cssVar: '--ink',
    css: '#0b1220',
    value: '#0b1220',
    description:
      '모든 본문 글자, 차트 이름표, 키보드 초점 고리, 산점도 1배 기준 점선. 제약: 패널(흰)·gray-3 바탕 모두 글자 대비 4.5:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.base.gray-1',
    type: 'color',
    cssVar: '--gray-1',
    css: '#4f5b6e',
    value: '#4f5b6e',
    description:
      '보조 글자(패널 설명, 축 눈금, 범례), 중앙값 점선. 제약: 패널(흰)·gray-3 바탕 모두 글자 대비 4.5:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.base.gray-2',
    type: 'color',
    cssVar: '--gray-2',
    css: '#bfc8d6',
    value: '#bfc8d6',
    description:
      '선택 상자·검색칸 테두리, 산점도 0 기준선, 머리글 구분선. 제약: 없음(장식선). 너무 진하게 하면 컨트롤이 무거워 보임',
  },
  {
    path: 'color.base.gray-3',
    type: 'color',
    cssVar: '--gray-3',
    css: '#e9eef5',
    value: '#e9eef5',
    description:
      '페이지 바탕, 세그먼트 바탕, 칩 바탕, 열린 목록 행 바탕. 제약: 글자 토큰들이 이 위에서 4.5:1 을 넘어야 하므로 바꾸면 tokens:contrast 로 전체 확인',
  },
  {
    path: 'color.base.panel',
    type: 'color',
    cssVar: '--panel',
    css: '#ffffff',
    value: '#ffffff',
    description:
      '모든 패널 바탕, 차트 글자 뒤 테두리(halo). 제약: 글자·그래픽 대비 검사의 기준 바탕. 바꾸면 tokens:contrast 로 전체 확인',
  },
  {
    path: 'color.base.primary-strong',
    type: 'color',
    cssVar: '--primary-strong',
    css: '#a8904f',
    value: '#a8904f',
    description: 'shadcn 부품의 primary 진한 쪽 (보드 화면에서는 거의 안 보임). 제약: 없음',
  },
  {
    path: 'color.base.primary-soft',
    type: 'color',
    cssVar: '--primary-soft',
    css: '#f4efe1',
    value: '#f4efe1',
    description: 'shadcn 부품의 primary 옅은 쪽 (보드 화면에서는 거의 안 보임). 제약: 없음',
  },
  {
    path: 'color.base.success-soft',
    type: 'color',
    cssVar: '--success-soft',
    css: '#e6f0f1',
    value: '#e6f0f1',
    description: 'shadcn 부품의 success 옅은 쪽 (보드 화면에서는 거의 안 보임). 제약: 없음',
  },
  {
    path: 'color.base.skeleton-shine',
    type: 'color',
    cssVar: '--skeleton-shine',
    css: '#f8fafc',
    value: '#f8fafc',
    description: '로딩 뼈대(회색 상자)가 반짝일 때 가운데 색. 제약: gray-3 보다 밝게',
  },
  {
    path: 'color.chart.actual',
    type: 'color',
    cssVar: '--chart-actual',
    css: '#22448f',
    value: '#22448f',
    description:
      '고른 몬스터 자신의 값: 오각형 선·면·꼭짓점, 패치 추이 선과 점, 같은 조건 위험 배수 점, 준비 패널 막대. 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.chart.comparison',
    type: 'color',
    cssVar: '--chart-comparison',
    css: '#2f6fe0',
    value: '#2f6fe0',
    description:
      '비교 집단: 오각형 중앙값 고리, 패치 평균 점선, 준비 조건 선, 위험 배수 범위 막대. 흐름도 칸 색 재료, 산점도 1~2배(scatter.mid). 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.chart.death',
    type: 'color',
    cssVar: '--chart-death',
    css: '#d64a5f',
    value: '#d64a5f',
    description:
      '사망·위험 의미 전용: 사망 막대, 사망자 점, 산점도 2배 이상 점(scatter.high)과 2배 선, 우선 점검 구역(scatter.zone), 2배 이상 숫자(text-scale.flag)의 재료. 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사). 위험이 아닌 범주에 쓰지 않음',
  },
  {
    path: 'color.chart.survival',
    type: 'color',
    cssVar: '--chart-survival',
    css: '#0f9a8f',
    value: '#0f9a8f',
    description:
      '생존·처치 쪽: 살아남은 교전 막대, 처치자 점. 흐름도 칸 색 재료. 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.chart.track',
    type: 'color',
    cssVar: '--chart-track',
    css: '#e7ecf3',
    value: '#e7ecf3',
    description:
      '막대의 빈 부분, 격자선, 0이 아닌 기준선. 제약: 패널 위에서 보일 만큼만 (그래픽 대비 대상 아님)',
  },
  {
    path: 'color.chart.accent',
    type: 'color',
    cssVar: '--chart-accent',
    css: '#c0850f',
    value: '#c0850f',
    description:
      '흐름도 칸 색 재료(호박색). 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사). gray-3 위에는 쓰지 않음(2.73:1), 칸마다 이름 글자가 붙음',
  },
  {
    path: 'color.chart.earth',
    type: 'color',
    cssVar: '--chart-earth',
    css: '#9b5f2e',
    value: '#9b5f2e',
    description:
      '흐름도 칸 색 재료(갈색). 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.chart.violet',
    type: 'color',
    cssVar: '--chart-violet',
    css: '#b04fc0',
    value: '#b04fc0',
    description:
      '흐름도 칸 색 재료(보라, 중간보스 칸). 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.chart.neutral',
    type: 'color',
    cssVar: '--chart-neutral',
    css: 'color-mix(in oklab, var(--gray-2) 70%, var(--gray-1))',
    value: '#bfc8d6',
    description:
      '조용한 중립: 산점도 1배 미만 점, 흐름도 순서 밖 칸. gray-2 를 gray-1 쪽으로 30%. 제약: 패널 바탕 2.2:1 이상 (검사). 3:1 미만이라 항상 범례 글자와 함께 쓰고, 글자색으로 쓰지 않음',
  },
  {
    path: 'color.status.warning',
    type: 'color',
    cssVar: '--status-warning',
    css: '#985a00',
    value: '#985a00',
    description:
      '배지 "표본 부족"류 글자색. 제약: 패널과 자기 -soft 바탕 위 글자 대비 4.5:1 이상 (검사). 색만으로 뜻을 전하지 않고 항상 글자와 함께',
  },
  {
    path: 'color.status.danger',
    type: 'color',
    cssVar: '--status-danger',
    css: '#c2334f',
    value: '#c2334f',
    description:
      '배지 "점검 신호"류 글자색. 제약: 패널과 자기 -soft 바탕 위 글자 대비 4.5:1 이상 (검사). 색만으로 뜻을 전하지 않고 항상 글자와 함께',
  },
  {
    path: 'color.status.supported',
    type: 'color',
    cssVar: '--status-supported',
    css: '#1e4f9a',
    value: '#1e4f9a',
    description:
      '배지 "가설 지지" 글자색. 제약: 패널과 자기 -soft 바탕 위 글자 대비 4.5:1 이상 (검사). 비교 파랑(chart.comparison)과 구분되게',
  },
  {
    path: 'color.status.warning-soft',
    type: 'color',
    cssVar: '--status-warning-soft',
    css: 'color-mix(in oklab, var(--status-warning) 10%, var(--panel))',
    value: '#985a00',
    description:
      'warning 배지 바탕 (상태색 10% + 패널). 제약: status.warning 글자가 이 위에서 4.5:1 (검사). amount 를 올리면 글자 대비가 떨어짐',
  },
  {
    path: 'color.status.danger-soft',
    type: 'color',
    cssVar: '--status-danger-soft',
    css: 'color-mix(in oklab, var(--status-danger) 10%, var(--panel))',
    value: '#c2334f',
    description:
      'danger 배지 바탕 (상태색 10% + 패널). 제약: status.danger 글자가 이 위에서 4.5:1 (검사). amount 를 올리면 글자 대비가 떨어짐',
  },
  {
    path: 'color.status.supported-soft',
    type: 'color',
    cssVar: '--status-supported-soft',
    css: 'color-mix(in oklab, var(--status-supported) 10%, var(--panel))',
    value: '#1e4f9a',
    description:
      'supported 배지 바탕 (상태색 10% + 패널). 제약: status.supported 글자가 이 위에서 4.5:1 (검사)',
  },
  {
    path: 'color.sankey.lv.1',
    type: 'color',
    cssVar: '--sankey-lv-1',
    css: 'var(--chart-accent)',
    value: '#c0850f',
    description:
      '흐름도 1열 레벨 "1~19" 칸과 그 칸에서 나가는 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.lv.2',
    type: 'color',
    cssVar: '--sankey-lv-2',
    css: 'var(--chart-survival)',
    value: '#0f9a8f',
    description:
      '흐름도 1열 레벨 "20~39" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.lv.3',
    type: 'color',
    cssVar: '--sankey-lv-3',
    css: 'var(--chart-comparison)',
    value: '#2f6fe0',
    description:
      '흐름도 1열 레벨 "40~69" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.lv.4',
    type: 'color',
    cssVar: '--sankey-lv-4',
    css: 'var(--chart-earth)',
    value: '#9b5f2e',
    description:
      '흐름도 1열 레벨 "70+" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.wp.1',
    type: 'color',
    cssVar: '--sankey-wp-1',
    css: 'var(--chart-survival)',
    value: '#0f9a8f',
    description:
      '흐름도 2열 무기 "없음·나무" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.wp.2',
    type: 'color',
    cssVar: '--sankey-wp-2',
    css: 'var(--chart-earth)',
    value: '#9b5f2e',
    description:
      '흐름도 2열 무기 "돌" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.wp.3',
    type: 'color',
    cssVar: '--sankey-wp-3',
    css: 'var(--chart-comparison)',
    value: '#2f6fe0',
    description:
      '흐름도 2열 무기 "철" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.wp.4',
    type: 'color',
    cssVar: '--sankey-wp-4',
    css: 'var(--chart-accent)',
    value: '#c0850f',
    description:
      '흐름도 2열 무기 "금·다이아" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.ar.1',
    type: 'color',
    cssVar: '--sankey-ar-1',
    css: 'var(--chart-accent)',
    value: '#c0850f',
    description:
      '흐름도 3열 방어구 "없음" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.ar.2',
    type: 'color',
    cssVar: '--sankey-ar-2',
    css: 'var(--chart-comparison)',
    value: '#2f6fe0',
    description:
      '흐름도 3열 방어구 "일부" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.ar.3',
    type: 'color',
    cssVar: '--sankey-ar-3',
    css: 'var(--chart-survival)',
    value: '#0f9a8f',
    description:
      '흐름도 3열 방어구 "6부위" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.grp.1',
    type: 'color',
    cssVar: '--sankey-grp-1',
    css: 'var(--chart-comparison)',
    value: '#2f6fe0',
    description:
      '흐름도 4열 몬스터 집단 "일반·약함" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.grp.2',
    type: 'color',
    cssVar: '--sankey-grp-2',
    css: 'var(--chart-survival)',
    value: '#0f9a8f',
    description:
      '흐름도 4열 "일반·medium" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.grp.3',
    type: 'color',
    cssVar: '--sankey-grp-3',
    css: 'var(--chart-accent)',
    value: '#c0850f',
    description:
      '흐름도 4열 "일반·strong" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.grp.4',
    type: 'color',
    cssVar: '--sankey-grp-4',
    css: 'var(--chart-violet)',
    value: '#b04fc0',
    description:
      '흐름도 4열 "중간보스" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.grp.5',
    type: 'color',
    cssVar: '--sankey-grp-5',
    css: 'var(--chart-earth)',
    value: '#9b5f2e',
    description:
      '흐름도 4열 "던전 보스" 칸과 띠. 제약: 같은 열 안의 다른 칸 색과 OKLab 거리 0.10 이상, 색약 시뮬레이션 0.05 이상 (tokens:contrast 검사). 사망 색(chart.death) 쓰지 않음',
  },
  {
    path: 'color.sankey.neutral',
    type: 'color',
    cssVar: '--sankey-neutral',
    css: 'var(--chart-neutral)',
    value: '#bfc8d6',
    description:
      '흐름도에서 정해진 순서 밖의 값(예: 모르는 레벨) 칸. 제약: chart.neutral 과 같은 규칙, 범주 색과 구분되는 회색 유지',
  },
  {
    path: 'color.scatter.high',
    type: 'color',
    cssVar: '--scatter-high',
    css: 'var(--chart-death)',
    value: '#d64a5f',
    description:
      '산점도 기대 대비 2배 이상 점과 범례 "2배 이상". 위험 의미라 chart.death 를 가리킴. 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.scatter.mid',
    type: 'color',
    cssVar: '--scatter-mid',
    css: 'var(--chart-comparison)',
    value: '#2f6fe0',
    description:
      '산점도 1~2배 점과 범례 "1~2배". 제약: 패널(흰) 바탕 그래픽 대비 3:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.scatter.below',
    type: 'color',
    cssVar: '--scatter-below',
    css: 'var(--chart-neutral)',
    value: '#bfc8d6',
    description:
      '산점도 1배 미만 점과 범례 "1배 미만". 제약: chart.neutral 규칙(2.2:1, 범례 동반). high·mid 보다 조용해야 함',
  },
  {
    path: 'color.scatter.zone',
    type: 'color',
    cssVar: '--scatter-zone',
    css: 'color-mix(in oklab, var(--chart-death) 8%, var(--panel))',
    value: '#d64a5f',
    description:
      '산점도 오른쪽 위 "우선 점검" 구역 바탕 (사망색 8% + 패널). 그 위 구역 이름 글자 뒤 테두리로도 쓰임. 제약: gray-1 글자가 이 위에서 읽혀야 하므로 amount 는 0.15 이하 권장',
  },
  {
    path: 'color.text-scale.flag',
    type: 'color',
    cssVar: '--text-scale-flag',
    css: 'color-mix(in oklab, var(--chart-death) 85%, var(--ink))',
    value: '#d64a5f',
    description:
      '위험 목록 2배 이상 숫자(13px), 사망색을 ink 쪽으로 15%. 제약: 패널(흰)·gray-3 바탕 모두 글자 대비 4.5:1 이상 (tokens:contrast 검사). hover·열린 행이 gray-3',
  },
  {
    path: 'color.text-scale.sub',
    type: 'color',
    cssVar: '--text-scale-sub',
    css: 'color-mix(in oklab, var(--gray-1) 95%, var(--ink))',
    value: '#4f5b6e',
    description:
      '위험 목록 "N단계 · 역할" 줄(11px)과 값 없는 숫자, gray-1 을 ink 쪽으로 5%. 제약: 패널(흰)·gray-3 바탕 모두 글자 대비 4.5:1 이상 (tokens:contrast 검사)',
  },
  {
    path: 'color.state.row-hover',
    type: 'color',
    cssVar: '--state-row-hover',
    css: 'color-mix(in oklab, var(--gray-3) 60%, transparent)',
    value: '#e9eef5',
    description:
      '위험 목록 행: 산점도·흐름도에서 그 몬스터를 가리킬 때 바탕 (gray-3 60%, 반투명). 제약: 열린 행(gray-3)보다 옅게',
  },
  {
    path: 'color.state.chip-hover',
    type: 'color',
    cssVar: '--state-chip-hover',
    css: 'color-mix(in oklab, var(--gray-2) 50%, transparent)',
    value: '#bfc8d6',
    description:
      '흐름 칩(선택한 조건) hover 바탕 (gray-2 50%, 반투명). 제약: 칩 글자(gray-1→ink)가 읽히게',
  },
  {
    path: 'opacity.band.default',
    type: 'number',
    cssVar: '--opacity-band-default',
    css: '0.35',
    value: 0.35,
    description:
      '흐름도 띠: 아무것도 고르거나 가리키지 않았을 때. 제약: dim < default < hover < picked 순서 유지',
  },
  {
    path: 'opacity.band.hover',
    type: 'number',
    cssVar: '--opacity-band-hover',
    css: '0.75',
    value: 0.75,
    description: '흐름도 띠: 가리킨 칸·띠의 레벨 갈래. 제약: default 보다 크고 picked 이하',
  },
  {
    path: 'opacity.band.picked',
    type: 'number',
    cssVar: '--opacity-band-picked',
    css: '0.85',
    value: 0.85,
    description: '흐름도 띠: 고른 칸을 모두 지나는 띠. 제약: 가장 진한 단계, 1 이하',
  },
  {
    path: 'opacity.band.dim',
    type: 'number',
    cssVar: '--opacity-band-dim',
    css: '0.08',
    value: 0.08,
    description:
      '흐름도 띠: 고름·가리킴에서 물러난 띠. 제약: 가장 옅은 단계, 띠가 거의 사라질 정도(0.05–0.15)',
  },
  {
    path: 'opacity.dim.node',
    type: 'number',
    cssVar: '--opacity-dim-node',
    css: '0.35',
    value: 0.35,
    description:
      '흐름도 칸: 고른 조건이나 가리킨 갈래에 맞는 흐름이 없을 때. 제약: 칸 이름 글자는 흐려지지 않으므로 0.2 이상 권장',
  },
  {
    path: 'opacity.dim.mark',
    type: 'number',
    cssVar: '--opacity-dim-mark',
    css: '0.4',
    value: 0.4,
    description:
      '산점도: 한 점을 가리킬 때 나머지 점. 제약: 0.2–0.6, 너무 낮으면 위치 비교가 안 됨',
  },
  {
    path: 'opacity.dim.label',
    type: 'number',
    cssVar: '--opacity-dim-label',
    css: '0.45',
    value: 0.45,
    description:
      '오각형: 한 축을 가리킬 때 나머지 축 이름·값 글자. 제약: 흐린 글자라도 읽혀야 하므로 0.4 이상',
  },
  {
    path: 'opacity.dim.line',
    type: 'number',
    cssVar: '--opacity-dim-line',
    css: '0.35',
    value: 0.35,
    description:
      '패치 추이: 교전 10건 미만인 날이 섞였을 때 선 전체(진한 부분은 따로 그림). 제약: 0.2–0.5',
  },
  {
    path: 'opacity.line.grid',
    type: 'number',
    cssVar: '--opacity-line-grid',
    css: '0.7',
    value: 0.7,
    description: '패치 추이 가로 격자, 오각형 바큇살. 제약: 0.4–1',
  },
  {
    path: 'opacity.line.ring',
    type: 'number',
    cssVar: '--opacity-line-ring',
    css: '0.8',
    value: 0.8,
    description: '오각형 눈금 고리(±1, ±2). 제약: 0.4–1',
  },
  {
    path: 'opacity.line.reference',
    type: 'number',
    cssVar: '--opacity-line-reference',
    css: '0.7',
    value: 0.7,
    description: '산점도 "기대 = 1배" 점선(ink). 제약: 기준선이라 격자보다 진하게',
  },
  {
    path: 'opacity.line.flag',
    type: 'number',
    cssVar: '--opacity-line-flag',
    css: '0.55',
    value: 0.55,
    description: '산점도 2배 선(사망색). 제약: 구역 경계로 보일 만큼, 점보다 흐리게',
  },
  {
    path: 'opacity.line.median',
    type: 'number',
    cssVar: '--opacity-line-median',
    css: '0.6',
    value: 0.6,
    description: '산점도 사망 수 중앙값 세로 점선(gray-1). 제약: 1배 점선보다 흐리게',
  },
  {
    path: 'opacity.fill.area',
    type: 'number',
    cssVar: '--opacity-fill-area',
    css: '0.18',
    value: 0.18,
    description: '오각형 고른 몬스터 면. 제약: 0.1–0.3, 비교 고리가 비쳐 보여야 함',
  },
  {
    path: 'opacity.point.thin',
    type: 'number',
    cssVar: '--opacity-point-thin',
    css: '0.6',
    value: 0.6,
    description: '패치 추이: 교전 10건 미만인 날의 빈 점 테두리. 제약: 0.4–0.8',
  },
  {
    path: 'opacity.pending',
    type: 'number',
    cssVar: '--opacity-pending',
    css: '0.6',
    value: 0.6,
    description: '필터·선택을 바꾸는 동안 내용 전체 흐림. 제약: 0.4–0.8, 내용이 읽힐 만큼',
  },
  {
    path: 'radius.panel',
    type: 'dimension',
    cssVar: '--corner-panel',
    css: '10px',
    value: 10,
    description: '패널, KPI 상자, 필터 바 (rounded-panel). 제약: 레이아웃에 영향 없음',
  },
  {
    path: 'radius.control',
    type: 'dimension',
    cssVar: '--corner-control',
    css: '6px',
    value: 6,
    description: '선택 상자, 칩, 목록 행, 툴팁, 세그먼트 바깥 (rounded-control). 제약: panel 이하',
  },
  {
    path: 'radius.pill',
    type: 'dimension',
    cssVar: '--corner-pill',
    css: '4px',
    value: 4,
    description:
      '배지, 세그먼트 단추, 기술·비율 막대 끝 (rounded-pill). 제약: 막대 높이(size.bar.skill 10px)의 절반 이하가 자연스러움',
  },
  {
    path: 'radius.focus',
    type: 'dimension',
    cssVar: '--corner-focus',
    css: '4px',
    value: 4,
    description: '흐름도 칸 키보드 초점 고리 모서리. 제약: 없음',
  },
  {
    path: 'radius.mark',
    type: 'dimension',
    cssVar: '--corner-mark',
    css: '2px',
    value: 2,
    description: '흐름도 칸, 같은 조건 위험 배수 범위 막대 모서리. 제약: 칸 너비(14px)의 1/4 이하',
  },
  {
    path: 'radius.mark-sm',
    type: 'dimension',
    cssVar: '--corner-mark-sm',
    css: '1px',
    value: 1,
    description: '산점도 네모(중간보스) 점 모서리. 제약: 2px 이하, 크면 원과 구분이 어려움',
  },
  {
    path: 'space.panel-gap',
    type: 'dimension',
    cssVar: '--space-panel-gap',
    css: '14px',
    value: 14,
    description:
      '패널 사이 간격(가로·세로), 필터 바 아래 간격. 제약: 레이아웃 변경. 1440 화면 높이 맞춤이 깨질 수 있어 바꾸지 않는 것이 기본',
  },
  {
    path: 'space.panel-inset',
    type: 'dimension',
    cssVar: '--space-panel-inset',
    css: '16px',
    value: 16,
    description:
      '패널 안쪽 좌우 여백, 차트 그리는 폭 계산에도 쓰임. 제약: 레이아웃 변경. 바꾸지 않는 것이 기본',
  },
  {
    path: 'space.panel-top',
    type: 'dimension',
    cssVar: '--space-panel-top',
    css: '12px',
    value: 12,
    description: '패널 위 여백(제목 위). 제약: 레이아웃 변경. 바꾸지 않는 것이 기본',
  },
  {
    path: 'space.segment-inset',
    type: 'dimension',
    cssVar: '--space-segment-inset',
    css: '3px',
    value: 3,
    description:
      '세그먼트 컨트롤(기간, 2초·5초) 안쪽 여백. 제약: 단추 높이 24px 와 바깥 30px 에 맞춘 값(30 = 24 + 2×3)',
  },
  {
    path: 'font-size.micro',
    type: 'dimension',
    cssVar: '--font-size-micro',
    css: '10px',
    value: 10,
    description: '오각형 눈금 숫자(+1, -2). 제약: 10px 미만 금지',
  },
  {
    path: 'font-size.caption',
    type: 'dimension',
    cssVar: '--font-size-caption',
    css: '11px',
    value: 11,
    description:
      '패널 설명, 축 눈금, 배지, 목록 보조 줄, 산점도 점 이름. 제약: 11px 미만 금지. 키우면 산점도 이름 겹침 회피·목록 줄이 바뀜',
  },
  {
    path: 'font-size.label',
    type: 'dimension',
    cssVar: '--font-size-label',
    css: '12px',
    value: 12,
    description:
      '필터 라벨, 컨트롤, 범례, 툴팁, 흐름도 칸 이름. 제약: 흐름도 칸 이름 폭 계산에 쓰여 키우면 이름이 겹칠 수 있음',
  },
  {
    path: 'font-size.body-sm',
    type: 'dimension',
    cssVar: '--font-size-body-sm',
    css: '13px',
    value: 13,
    description:
      '위험 목록 배수 숫자, 준비 조건 수치. 제약: 목록 숫자 칸 72px 안에 "4.99배" 가 들어가야 함',
  },
  {
    path: 'font-size.body',
    type: 'dimension',
    cssVar: '--font-size-body',
    css: '14px',
    value: 14,
    description:
      '위험 목록 몬스터 이름, 준비 조건 이름, 보스 기술 이름. 제약: 목록 행 높이 44px 안에 두 줄이 들어가야 함',
  },
  {
    path: 'font-size.subtitle',
    type: 'dimension',
    cssVar: '--font-size-subtitle',
    css: '16px',
    value: 16,
    description: '패널 안 소제목, 상세 단계·역할, 흐름 요약 숫자. 제약: title 보다 작게',
  },
  {
    path: 'font-size.title',
    type: 'dimension',
    cssVar: '--font-size-title',
    css: '18px',
    value: 18,
    description: '패널 제목. 제약: 제목 줄 높이 22px, 키우면 패널 안 차트 위치가 밀림',
  },
  {
    path: 'font-size.heading',
    type: 'dimension',
    cssVar: '--font-size-heading',
    css: '20px',
    value: 20,
    description:
      '머리글(AKKADIA, 몬스터 밸런스 보드), 같은 조건 위험 배수 숫자. 제약: 머리글 높이 60px 안',
  },
  {
    path: 'font-size.kpi',
    type: 'dimension',
    cssVar: '--font-size-kpi',
    css: '22px',
    value: 22,
    description: '상세 KPI 숫자(사망, 교전, 기대 대비 위험). 제약: KPI 상자 높이 66px 안',
  },
  {
    path: 'font-size.display',
    type: 'dimension',
    cssVar: '--font-size-display',
    css: '24px',
    value: 24,
    description: '상세 화면 몬스터 이름. 제약: 긴 이름은 말줄임, 줄 높이 29px',
  },
  {
    path: 'stroke.width.hairline',
    type: 'dimension',
    cssVar: '--stroke-width-hairline',
    css: '0.75px',
    value: 0.75,
    description: '산점도 격자선. 제약: thin 이하',
  },
  {
    path: 'stroke.width.thin',
    type: 'dimension',
    cssVar: '--stroke-width-thin',
    css: '1px',
    value: 1,
    description:
      '0 기준선, 2배 선, 중앙값 점선, 패치 격자, 오각형 눈금 고리·바큇살. 제약: hairline 이상 regular 이하',
  },
  {
    path: 'stroke.width.ring',
    type: 'dimension',
    cssVar: '--stroke-width-ring',
    css: '1.25px',
    value: 1.25,
    description: '오각형: 축 끝(±3)을 넘은 값의 점선 고리. 제약: 없음',
  },
  {
    path: 'stroke.width.regular',
    type: 'dimension',
    cssVar: '--stroke-width-regular',
    css: '1.5px',
    value: 1.5,
    description:
      '비교 고리, 패치 평균 점선, 1배 기준 점선, 패치 날짜선, 산점도 초점 고리. 제약: bold 보다 가늘게(고른 몬스터 선이 가장 굵어야 함)',
  },
  {
    path: 'stroke.width.bold',
    type: 'dimension',
    cssVar: '--stroke-width-bold',
    css: '2px',
    value: 2,
    description: '오각형 고른 몬스터 선, 패치 추이 선, 범례 선. 제약: 차트 선 중 가장 굵게',
  },
  {
    path: 'stroke.width.focus',
    type: 'dimension',
    cssVar: '--stroke-width-focus',
    css: '2px',
    value: 2,
    description: '흐름도 칸 키보드 초점 고리. 제약: 2px 이상(접근성)',
  },
  {
    path: 'stroke.width.halo',
    type: 'dimension',
    cssVar: '--stroke-width-halo',
    css: '3px',
    value: 3,
    description: '차트 글자 뒤 패널색 테두리(선·면 위에서도 글자가 읽히게). 제약: 2–4px',
  },
  {
    path: 'stroke.point.mark',
    type: 'dimension',
    cssVar: '--stroke-point-mark',
    css: '6px',
    value: 6,
    description:
      '산점도 점 반지름(모든 모양이 이 반지름 원과 같은 넓이). 제약: 키우면 점 겹침이 늘고 겹침 회피 간격도 함께 바뀜',
  },
  {
    path: 'stroke.point.mark-hover-grow',
    type: 'dimension',
    cssVar: '--stroke-point-mark-hover-grow',
    css: '1.5px',
    value: 1.5,
    description: '산점도 가리킨 점이 커지는 양. 제약: 0–3px',
  },
  {
    path: 'stroke.point.legend',
    type: 'dimension',
    cssVar: '--stroke-point-legend',
    css: '4.5px',
    value: 4.5,
    description: '산점도 범례 점 반지름. 제약: mark 이하',
  },
  {
    path: 'stroke.point.vertex',
    type: 'dimension',
    cssVar: '--stroke-point-vertex',
    css: '4px',
    value: 4,
    description: '오각형 꼭짓점 반지름. 제약: vertex-hover 보다 작게',
  },
  {
    path: 'stroke.point.vertex-hover',
    type: 'dimension',
    cssVar: '--stroke-point-vertex-hover',
    css: '5.5px',
    value: 5.5,
    description: '오각형 가리킨 축의 꼭짓점 반지름. 제약: vertex 보다 크고 vertex-ring 보다 작게',
  },
  {
    path: 'stroke.point.vertex-ring',
    type: 'dimension',
    cssVar: '--stroke-point-vertex-ring',
    css: '8px',
    value: 8,
    description: '오각형 축 끝을 넘은 값 표시 점선 고리 반지름. 제약: vertex-hover 보다 크게',
  },
  {
    path: 'stroke.point.trend',
    type: 'dimension',
    cssVar: '--stroke-point-trend',
    css: '3.5px',
    value: 3.5,
    description: '패치 추이 점 반지름(교전 10건 이상인 날). 제약: trend-thin 보다 크게',
  },
  {
    path: 'stroke.point.trend-thin',
    type: 'dimension',
    cssVar: '--stroke-point-trend-thin',
    css: '2.5px',
    value: 2.5,
    description: '패치 추이 빈 점 반지름(교전 10건 미만인 날). 제약: trend 보다 작게',
  },
  {
    path: 'stroke.point.estimate',
    type: 'dimension',
    cssVar: '--stroke-point-estimate',
    css: '6px',
    value: 6,
    description: '같은 조건 위험 배수 점 반지름. 제약: 범위 막대(size.bar.interval)보다 크게',
  },
  {
    path: 'size.bar.skill',
    type: 'dimension',
    cssVar: '--size-bar-skill',
    css: '10px',
    value: 10,
    description:
      '보스 기술 막대 높이, 기술 범례 견본 높이. 제약: 기술 행 높이(44–56px) 안에 막대 두 개',
  },
  {
    path: 'size.bar.share',
    type: 'dimension',
    cssVar: '--size-bar-share',
    css: '25px',
    value: 25,
    description:
      '준비 패널 "반격하지 못한 사망"·"큰 피해" 비율 막대 높이. 제약: 레이아웃 영향, 25px 기준으로 패널 높이를 맞춤',
  },
  {
    path: 'size.bar.interval',
    type: 'dimension',
    cssVar: '--size-bar-interval',
    css: '4px',
    value: 4,
    description: '같은 조건 위험 배수 95% 범위 막대 높이. 제약: estimate 점 지름보다 작게',
  },
  {
    path: 'size.dumbbell.line',
    type: 'dimension',
    cssVar: '--size-dumbbell-line',
    css: '2px',
    value: 2,
    description: '준비 조건 처치자→사망자 연결선 두께. 제약: dot 보다 훨씬 가늘게',
  },
  {
    path: 'size.dumbbell.dot',
    type: 'dimension',
    cssVar: '--size-dumbbell-dot',
    css: '14px',
    value: 14,
    description: '준비 조건 처치자·사망자 점 지름. 제약: 행 높이 안, 14px 기준으로 위치를 맞춤',
  },
  {
    path: 'size.legend.dot',
    type: 'dimension',
    cssVar: '--size-legend-dot',
    css: '10px',
    value: 10,
    description: '준비 패널 범례 동그라미 지름. 제약: dumbbell.dot 이하',
  },
  {
    path: 'size.legend.swatch-w',
    type: 'dimension',
    cssVar: '--size-legend-swatch-w',
    css: '16px',
    value: 16,
    description: '보스 기술 범례 막대 견본 너비(높이는 bar.skill). 제약: 없음',
  },
  {
    path: 'size.sankey.node-width',
    type: 'dimension',
    cssVar: '--size-sankey-node-width',
    css: '14px',
    value: 14,
    description: '흐름도 칸 너비. 제약: 레이아웃 영향(열 위치·이름 위치 계산)',
  },
  {
    path: 'size.sankey.node-min',
    type: 'dimension',
    cssVar: '--size-sankey-node-min',
    css: '18px',
    value: 18,
    description:
      '흐름도 칸 최소 높이(작은 칸의 이름이 겹치지 않게). 제약: 이름 글자(font-size.label) 높이 이상',
  },
  {
    path: 'size.sankey.pick-grow',
    type: 'dimension',
    cssVar: '--size-sankey-pick-grow',
    css: '4px',
    value: 4,
    description: '고른 칸이 양옆으로 넓어지는 양. 제약: 0–6px',
  },
  {
    path: 'motion.ease.board',
    type: 'cubicBezier',
    cssVar: '--ease-board',
    css: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    value: [0.2, 0.7, 0.2, 1],
    description:
      '보드의 모든 움직임 가속 곡선(CSS 전환, 숫자 트윈, 목록 재정렬). 제약: 네 값 모두 0–1 범위의 x, 튀는 곡선 금지',
  },
  {
    path: 'motion.duration.fast',
    type: 'duration',
    cssVar: '--duration-fast',
    css: '120ms',
    value: 120,
    description: '컨트롤 색 변화, 꼭짓점 크기. 제약: base 보다 짧게, 200ms 이하',
  },
  {
    path: 'motion.duration.base',
    type: 'duration',
    cssVar: '--duration-base',
    css: '200ms',
    value: 200,
    description: '패널 등장, 흐림, 칩 등장. 제약: fast 와 slow 사이',
  },
  {
    path: 'motion.duration.slow',
    type: 'duration',
    cssVar: '--duration-slow',
    css: '320ms',
    value: 320,
    description:
      '차트 모양 이동, 목록 재정렬, 상세 열기. 제약: 500ms 이하. prefers-reduced-motion 이면 모두 꺼짐',
  },
];
