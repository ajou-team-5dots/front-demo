// Flourish experiment record, condensed from information-design-5dots docs/visualization_tests.md (2026-10-14).

export type Verdict = '채택' | '보조' | '보류';

export interface VizTest {
  id: string;
  topic: 'T1' | 'T2' | 'T3';
  title: string;
  verdict: Verdict;
  why: string;
  saw: string;
  gap: string;
}

export const VIZ_CRITERIA = [
  { title: '질문 하나에 그래프 하나', text: '주제의 질문에 바로 답하는 형태' },
  { title: '비교가 먼저', text: '대상끼리 비교가 화면에서 바로 보임' },
  { title: '표본 크기를 숨기지 않음', text: '실행·시도 수를 축이나 점 크기로' },
  { title: '나중 데이터에도 같은 그래프', text: '전투·퀘스트가 와도 축 이름만 바뀜' },
];

export const VIZ_TESTS: VizTest[] = [
  {
    id: 't1-scatter',
    topic: 'T1',
    title: '산점도: 실행 수 × 직후 수정 비율',
    verdict: '채택',
    why: '수정 비율과 그 비율을 믿을 수 있는지(실행 수)를 한 화면에',
    saw: '수정 비율 40~80%는 모두 실행 5~8회 사례, 여러 명이 충분히 쓴 설계도는 #20뿐',
    gap: 'x축이 넓어 빈 공간이 큼 → 4~2,000으로 좁힘',
  },
  {
    id: 't1-stacked',
    topic: 'T1',
    title: '100% 누적 막대: 실행 직후 첫 행동',
    verdict: '채택',
    why: '직후 행동은 부분과 전체의 문제라 같은 길이로 비교',
    saw: '반복 실행(#108, #48)은 다시 준비, 적게 쓴 설계도는 설치·채굴로 손을 댐',
    gap: '비슷한 파랑이라 설치/채굴 구분이 약함 → 손을 댄 행동만 색',
  },
  {
    id: 't2-features',
    topic: 'T2',
    title: '막대: 기능별 실패·취소율',
    verdict: '채택',
    why: '기능 6개, 값 하나라 가로 막대가 가장 빨리 읽힘',
    saw: '렐름 생성 52.8%, 설계도 실행(건너뜀) 46.6%, 설계도 생성 38.5%',
    gap: '시도 수가 안 보여 40회짜리도 같은 무게 → n 표시',
  },
  {
    id: 't2-blocks',
    topic: 'T2',
    title: '산점도: 블록별 시도 수 × 취소율',
    verdict: '채택',
    why: '블록 110종을 한 번에, 왜 높은지는 색(주된 취소 사유)으로',
    saw: '시도가 많은 블록은 모두 조준 변경. 예외 Bookshelf 1slot(정의 전용 블록)',
    gap: '색 의미 설명이 필요 → 읽는 법 한 줄 + 주석',
  },
  {
    id: 't3-sankey',
    topic: 'T3',
    title: 'Sankey: 이전 행동 → 다음 행동',
    verdict: '채택',
    why: '흐름의 양을 굵기로. 순환은 이전/다음 두 단으로 나눔',
    saw: '채굴 ⇄ 채굴 취소가 대부분, 다음이 설치 → 채굴, 도구 선택 → 설치',
    gap: '노드마다 무지개색 → 행동 계열 3색으로',
  },
  {
    id: 't3-heatmap',
    topic: 'T3',
    title: '히트맵: 행동 전이 행렬',
    verdict: '보조',
    why: '같은 행동 반복(대각선)까지 빠짐없이',
    saw: '설치 → 설치 92%, 퀘스트 보상 반복 81%, 월드 이동 → UI 열기 100%',
    gap: '칸이 많아 발표용으로 무거움 → 상세 보기용',
  },
  {
    id: 't3-chord',
    topic: 'T3',
    title: 'Chord: 행동 사이 흐름',
    verdict: '보류',
    why: '순환 관계를 한 원 안에 보여줄 수 있는지 시험',
    saw: '채굴 ⇄ 채굴 취소가 원의 절반 이상',
    gap: '방향이 안 읽히고 작은 행동은 안 보임. Sankey가 더 쉬움',
  },
];
