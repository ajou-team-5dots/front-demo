import type { RoleId } from '@/lib/topic-meta';
import type { InsightId, Verdict } from '@/types/insights';

export const VERDICT_LABELS: Record<Verdict, string> = {
  support: '지지',
  partial: '일부 지지',
  against: '반박',
  unknown: '판단 불가',
};

export interface RoleAction {
  role: RoleId;
  /** Which reading the action depends on; empty when it holds either way. */
  when: string;
  action: string;
}

export interface InsightText {
  title: string;
  /** Unanswered by the logs: needs interviews, video, the team, or new log fields. */
  openQuestions: string[];
  actions: RoleAction[];
}

export const INSIGHT_TEXT: Record<InsightId, InsightText> = {
  draft: {
    title: '설계도 결과물은 초안인가',
    openQuestions: [
      '건너뛴 블록의 위치가 로그에 없다. 수정이 그 빈자리를 메운 것인지 알 수 없다',
      '처음 실행 146회는 20명에게서 나왔다. 사람이 늘면 비율이 달라질 수 있다',
      '반복 실행 대부분은 2명이 같은 설계도를 수백~수천 번 실행한 것이다. 테스트 목적의 반복일 가능성이 있다 (회사 확인 필요)',
    ],
    actions: [
      {
        role: 'level',
        when: '지형 맞춤이 맞다면',
        action:
          '실행 전 미리보기에서 지형과 겹치는 칸을 표시하거나, 바닥 메우기·땅 고르기 옵션을 둔다',
      },
      {
        role: 'content',
        when: '꾸미기가 맞다면',
        action:
          '설계도를 완성품이 아닌 뼈대로 쓰는 흐름(부분 배치, 블록 종류 바꿔 배치)을 기획한다',
      },
      {
        role: 'dev',
        when: '설치 결과 문제를 가르려면',
        action: '건너뛴 블록의 좌표를 로그에 남긴다. 지금은 개수만 남아 해석 ①을 판별할 수 없다',
      },
    ],
  },
  prepare: {
    title: '설계도 준비 단계에서 막히나',
    openQuestions: [
      '준비 중에는 플레이어 위치가 거의 바뀌지 않는다. 미리보기를 마우스로 옮기는 방식이라면 그 위치는 로그에 없다',
      'ESC 취소가 "다시 놓으려는 것"인지 "그만두려는 것"인지는 다음 행동으로만 추정했다',
      '운영자 계정이 준비 취소의 대부분을 만든다. 운영자 판별 기준(/su 사용)이 맞는지 회사 확인 필요',
    ],
    actions: [
      {
        role: 'system',
        when: '',
        action: '준비 UI를 줄이는 개선은 우선순위가 낮다. 고르기·놓기 모두 중앙 2~3초다',
      },
      {
        role: 'system',
        when: '자리 다시 잡기가 맞다면',
        action: '준비 상태에서 회전·높이 조정을 바로 할 수 있게 해 취소 후 재준비를 줄인다',
      },
      {
        role: 'ops',
        when: '',
        action: '대시보드 기본값에서 운영자 계정을 뺀다. 빼지 않으면 막힌 단계로 잘못 보인다',
      },
      {
        role: 'dev',
        when: '미리보기 이동을 보려면',
        action: '준비 중 미리보기 앵커 좌표를 일정 간격으로 남긴다',
      },
    ],
  },
  manual: {
    title: '수동 건축·채굴에서 무엇이 손을 붙잡나',
    openQuestions: [
      '훑기가 의도한 조작인지, 조준 보정이 없어 생긴 습관인지는 로그로 가를 수 없다 (플레이 영상·인터뷰 필요)',
      '충전 시간 700ms와 200ms는 도구 차이로 보이지만 로그에 도구 정보가 없다',
      '블록 정의의 경도는 10월 기준이고 로그는 6~7월이다',
    ],
    actions: [
      {
        role: 'system',
        when: '',
        action: '채굴 취소율을 그대로 마찰 지표로 쓰지 않는다. 대부분이 옆 칸으로 훑는 조작이다',
      },
      {
        role: 'system',
        when: '충전 부담이 맞다면',
        action: '손 뗀 뒤 같은 칸 재시작이 많은 블록부터 충전 시간·피드백(진행 표시)을 검토한다',
      },
      {
        role: 'dev',
        when: '충전 부담을 가르려면',
        action:
          '채굴 로그에 사용한 도구를 남긴다. 지금은 충전 시간 700ms·200ms의 차이가 무엇 때문인지 알 수 없다',
      },
      {
        role: 'level',
        when: '수동 건축이 별도 건축이므로',
        action: '수동 건축 도구(범위 채우기, 같은 블록 반복 배치)를 설계도와 따로 검토한다',
      },
    ],
  },
};
