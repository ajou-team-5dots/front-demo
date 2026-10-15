import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { cacheLife } from 'next/cache';

import { TOPIC_META } from '@/lib/topic-meta';

import type {
  BuildingInsights,
  DraftData,
  Hypothesis,

  InsightSummary,
  ManualData,
  PrepareData,
} from '@/types/insights';
import type { TopicId } from '@/types/topics';

// Built from the raw Akkadia logs by DataSet/akkadia_insight_metrics.py + akkadia_insight_export.py
// (information-design folder). Ops accounts (/su users) are excluded there; players are P01… only.
const DATA_FILE = path.join(process.cwd(), 'data', 'insights', 'building.json');


export async function getBuildingInsights(): Promise<BuildingInsights> {
  'use cache';

  cacheLife('hours');

  const text = await readFile(DATA_FILE, 'utf8');
  return JSON.parse(text) as BuildingInsights;
}

const pct = (n: number, d: number, digits = 0) =>
  d > 0 ? `${((n / d) * 100).toFixed(digits)}%` : '확인 필요';
const count = (value: number) => value.toLocaleString('ko-KR');
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// Verdicts below are judged by hand from these numbers; the thresholds are written in each
// evidence line so a reader can disagree with the call.

function draftSummary(d: DraftData): InsightSummary {
  const digs = d.digOwn + d.digOther;
  const groundPlace = d.placeLoc.bottom + d.placeLoc.below;
  const outsidePlace = d.placeLoc.side + d.placeLoc.above;
  const hypotheses: Hypothesis[] = [
    {
      id: 'skipped',
      title: '설치 결과가 잘못돼서 고친다',
      ifTrue: '블록이 건너뛰어진 실행이 더 자주 수정된다',
      evidence: `건너뜀 있음 ${pct(d.skipped.withEdited, d.skipped.withN, 1)} (n ${count(d.skipped.withN)}) vs 없음 ${pct(d.skipped.withoutEdited, d.skipped.withoutN, 1)} (n ${count(d.skipped.withoutN)}). 건너뛴 위치는 로그에 없어 그 자리를 메웠는지는 확인 불가`,
      verdict: 'partial',
    },
    {
      id: 'terrain',
      title: '지형에 맞추느라 고친다',
      ifTrue: '결과물 범위 안의 원래 지형을 캐고, 바닥과 그 아래를 메운다',
      evidence: `캔 블록 ${count(digs)}개 중 설계도가 놓지 않은 블록 ${pct(d.digOther, digs)}, 설치 ${count(d.place)}개 중 바닥층·아래 ${pct(groundPlace, d.place)}`,
      verdict: 'support',
    },
    {
      id: 'decorate',
      title: '설계도를 뼈대로 쓰고 꾸민다',
      ifTrue: '설계도에 없던 블록 종류를 결과물 옆이나 위에 덧붙인다',
      evidence: `설치 ${count(d.place)}개 중 설계도에 없던 블록 종류 ${pct(d.placeNewBlock, d.place)}, 옆·위 바깥 ${pct(outsidePlace, d.place)}`,
      verdict: 'support',
    },
    {
      id: 'undo',
      title: '마음에 안 들어 되돌린다',
      ifTrue: '놓인 블록의 절반 이상을 다시 캔다',
      evidence: `절반 이상 캔 실행 ${count(d.undoRuns)}회 / ${count(d.runs)}회 (${pct(d.undoRuns, d.runs, 1)})`,
      verdict: 'against',
    },
  ];
  return {
    id: 'draft',
    code: 'I1',
    question: '설계도를 실행한 직후, 왜 결과물에 다시 손을 대나?',
    finding:
      '처음 실행한 설계도는 절반이 30분 안에 고쳐진다. 고친 내용은 지형 정리와 덧붙이기가 중심이고, 되돌리기는 드물다.',
    headline: {
      value: pct(d.firstRun.edited, d.firstRun.n),
      label: `사람별 첫 실행 직후 수정 (n ${count(d.firstRun.n)})`,
    },
    hypotheses,
  };
}

function prepareSummary(d: PrepareData): InsightSummary {
  const { afterCancel } = d;
  const cancelled = d.outcomes.cancel;
  const faster = d.learning.filter((row) => row.last10 < row.first10).length;
  const allPrep = d.episodes + d.ops.prep;
  const allCancel = cancelled + d.ops.cancel;
  const hypotheses: Hypothesis[] = [
    {
      id: 'ui',
      title: '준비 UI가 번거로워 멈춘다',
      ifTrue: '목록에서 고르는 데, 준비에서 실행까지 오래 걸리고 취소가 잦다',
      evidence: `목록 창 → 준비 중앙 ${d.pickToPrepare.p50}초, 준비 → 실행 중앙 ${d.dtBuild.p50}초, 취소 ${pct(cancelled, d.episodes, 1)} (n ${count(d.episodes)})`,
      verdict: 'against',
    },
    {
      id: 'terrain',
      title: '지형·위치가 안 맞아 자리를 다시 잡는다',
      ifTrue: '취소한 뒤 땅을 고르거나 옮겨서 같은 설계도를 다시 꺼낸다',
      evidence: `취소 ${count(cancelled)}건 중 같은 설계도 다시 준비 ${pct(afterCancel.prep_same.n, cancelled)}, 그 사이 채굴 ${count(afterCancel.prep_same.dig)}건·이동 중앙 ${afterCancel.prep_same.moveMedian ?? '-'}칸. 준비 중 위치 변화는 거의 기록되지 않아(${count(d.movedOver3)}건) 미리보기를 옮겼는지는 판단 불가`,
      verdict: 'partial',
    },
    {
      id: 'compare',
      title: '내용을 확인하거나 다른 설계도와 비교한다',
      ifTrue: '취소 뒤 다른 설계도를 꺼낸다',
      evidence: `취소 뒤 다른 설계도 ${pct(afterCancel.prep_other.n, cancelled)} (${count(afterCancel.prep_other.n)}건). 상세 창은 ${count(d.detailModalOpens)}번 열렸지만 준비와의 연결은 집계하지 않음`,
      verdict: 'partial',
    },
    {
      id: 'mastery',
      title: '익숙해지면 빨라진다',
      ifTrue: '같은 사람의 처음 10회보다 마지막 10회가 짧다',
      evidence: `20회 이상 실행한 ${d.learning.length}명 중 ${faster}명이 짧아짐. 사례 수준`,
      verdict: 'support',
    },
  ];
  return {
    id: 'prepare',
    code: 'I2',
    question: '설계도를 준비해 놓고 실행하지 않는 것은 막혀서인가?',
    finding: `준비 단계는 막히지 않는다. 준비의 ${pct(d.outcomes.build, d.episodes, 1)}가 실행으로 이어지고, 드문 취소는 대부분 같은 설계도로 자리를 다시 잡는 행동이다. 운영자 ${d.ops.players}명을 빼지 않으면 취소의 ${pct(d.ops.cancel, allCancel)}가 운영자 몫이라 막힌 것처럼 보인다 (전체 준비 ${count(allPrep)}회).`,
    headline: {
      value: pct(d.outcomes.build, d.episodes, 1),
      label: `준비 → 실행 (n ${count(d.episodes)}, 운영자 제외)`,
    },
    hypotheses,
  };
}

function manualSummary(d: ManualData): InsightSummary {
  const tc = d.byReason.target_change;
  const mu = d.byReason.mouse_up;
  const placeAll = sum(Object.values(d.placeContext));
  const nearBp = d.placeContext.nearbp + d.placeContext.postrun;
  const hypotheses: Hypothesis[] = [
    {
      id: 'aim',
      title: '조준이 어려워 놓친다',
      ifTrue: '조준 변경으로 취소된 뒤 같은 칸을 다시 캔다',
      evidence: `조준 변경 ${count(tc.n)}건 중 10초 안에 같은 칸 재시작 ${pct(tc.next.same ?? 0, tc.n, 1)}`,
      verdict: 'against',
    },
    {
      id: 'sweep',
      title: '누른 채 훑으며 캔다 (의도된 조작)',
      ifTrue: '아주 짧게 누르고 바로 옆 칸으로 옮긴다',
      evidence: `조준 변경 다음 대상이 바로 옆 칸 ${pct(tc.next.adjacent ?? 0, tc.n)}, 누른 시간 중앙 ${tc.held.p50}ms (충전 시간의 ${Math.round(tc.chargeRatio.p50 * 100)}%)`,
      verdict: 'support',
    },
    {
      id: 'charge',
      title: '충전을 기다리기 힘들어 손을 뗀다',
      ifTrue: '손을 뗀 뒤 같은 칸을 다시 캔다',
      evidence: `손 뗌 ${count(mu.n)}건 중 같은 칸 재시작 ${pct(mu.next.same ?? 0, mu.n)} (${count(mu.next.same ?? 0)}건). 손 뗀 시점은 충전 시간의 중앙 ${Math.round(mu.chargeRatio.p50 * 100)}%`,
      verdict: 'partial',
    },
    {
      id: 'finish',
      title: '수동 건축은 설계도 결과물의 마감 작업이다',
      ifTrue: '수동 설치가 설계도 결과물 근처에 몰린다',
      evidence: `수동 설치 ${count(placeAll)}개 중 설계도 결과물 근처 ${pct(nearBp, placeAll, 1)}, 설계도 제작 월드 ${pct(d.placeContext.bpworld, placeAll, 1)}, 나머지 ${pct(d.placeContext.free, placeAll, 1)}`,
      verdict: 'against',
    },
  ];
  return {
    id: 'manual',
    code: 'I3',
    question: '수동으로 캐고 지을 때 무엇이 손을 붙잡나?',
    finding: `채굴 취소의 ${pct(tc.n, d.cancels)}는 실패가 아니라 훑는 조작이다. 막힘 후보는 손을 뗀 뒤 같은 칸을 다시 캔 ${count(mu.next.same ?? 0)}건이다. 수동 설치는 설계도와 떨어진 별도 건축이 대부분이다.`,
    headline: {
      value: pct(tc.next.adjacent ?? 0, tc.n),
      label: `조준 변경 다음 대상이 바로 옆 칸 (n ${count(tc.n)})`,
    },
    hypotheses,
  };
}

export async function getInsightSummaries(): Promise<InsightSummary[]> {
  const data = await getBuildingInsights();
  return [draftSummary(data.draft), prepareSummary(data.prepare), manualSummary(data.manual)];
}

/** The insight a topic carries, with the full data its evidence panels read. */
export async function getTopicInsight(
  topicId: TopicId,
): Promise<{ data: BuildingInsights; summary: InsightSummary }> {
  const data = await getBuildingInsights();
  const summaries = await getInsightSummaries();
  const id = TOPIC_META[topicId].insight;
  const summary = summaries.find((item) => item.id === id);
  if (!summary) {
    throw new Error(`No insight for topic ${topicId}`);
  }
  return { data, summary };
}
