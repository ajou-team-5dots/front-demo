import type { ReactNode } from 'react';

import { BarChart } from '@/components/charts/bar-chart';
import { ColumnChart } from '@/components/charts/column-chart';
import { DumbbellChart } from '@/components/charts/dumbbell-chart';
import { type StackedSeries, StackedBar } from '@/components/charts/stacked-bar';
import { LensPanel } from '@/components/topics/role-lens';
import type {
  BlockCancel,
  BlueprintRuns,
  BuildingInsights,
  CellCount,
  DraftData,
  ManualData,
  NextCell,
  PrepareData,
} from '@/types/insights';
import type { TopicEntity, TopicId } from '@/types/topics';

import { Stat } from './insight-sections';

const count = (value: number) => value.toLocaleString('ko-KR');
const pct = (n: number, d: number, digits = 0) =>
  d > 0 ? `${((n / d) * 100).toFixed(digits)}%` : '-';
const ratio = (n: number, d: number) => (d > 0 ? n / d : 0);

interface EvidenceProps {
  topicId: TopicId;
  title: string;
  /** Which readings this chart tells apart. */
  separates: string;
  hypotheses: string[];
  note?: string;
  children: ReactNode;
}

/** An evidence chart; it lights up when one of the readings it tests is chosen. */
function Evidence({ topicId, title, separates, hypotheses, note, children }: EvidenceProps) {
  return (
    <LensPanel
      topicId={topicId}
      panel="evidence"
      title={title}
      description={<span className="font-bold text-primary-strong">{separates}</span>}
      hypotheses={hypotheses}
    >
      {children}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </LensPanel>
  );
}

/* ---------- T1 · I1: 실행 직후 수정 ---------- */

const CELL_SERIES: StackedSeries[] = [
  { key: 'inside', label: '결과물 안쪽', fill: 'fill-data-bar' },
  { key: 'bottom', label: '바닥층', fill: 'fill-edit-dig' },
  { key: 'below', label: '바닥 아래', fill: 'fill-edit-dig/55' },
  { key: 'side', label: '옆 바깥', fill: 'fill-edit-add' },
  { key: 'above', label: '위 바깥', fill: 'fill-edit-add/55' },
];

const SOURCE_SERIES: StackedSeries[] = [
  { key: 'a', label: '원래 지형·다른 블록 / 설계도에 없던 종류', fill: 'fill-edit-dig' },
  { key: 'b', label: '설계도가 놓은 블록 / 설계도에 있던 종류', fill: 'fill-data-bar/35' },
];

const cellSegments = (cells: CellCount) =>
  CELL_SERIES.map((series) => ({ key: series.key, share: cells[series.key as keyof CellCount] }));

type EditMix = Pick<
  DraftData,
  'place' | 'placeNewBlock' | 'digOwn' | 'digOther' | 'placeLoc' | 'digLoc'
>;

function EditLocation({ mix }: { mix: EditMix }) {
  const digs = mix.digOwn + mix.digOther;
  return (
    <StackedBar
      ariaLabel="수정 위치 구성"
      series={CELL_SERIES}
      rows={[
        {
          key: 'place',
          label: '설치',
          sub: `n ${count(mix.place)}`,
          segments: cellSegments(mix.placeLoc),
        },
        { key: 'dig', label: '채굴', sub: `n ${count(digs)}`, segments: cellSegments(mix.digLoc) },
      ]}
    />
  );
}

function EditSource({ mix }: { mix: EditMix }) {
  const digs = mix.digOwn + mix.digOther;
  return (
    <StackedBar
      ariaLabel="캔 블록과 놓은 블록의 출처"
      series={SOURCE_SERIES}
      rows={[
        {
          key: 'dig',
          label: '캔 블록',
          sub: `n ${count(digs)}`,
          segments: [
            { key: 'a', share: mix.digOther },
            { key: 'b', share: mix.digOwn },
          ],
        },
        {
          key: 'place',
          label: '놓은 블록',
          sub: `n ${count(mix.place)}`,
          segments: [
            { key: 'a', share: mix.placeNewBlock },
            { key: 'b', share: mix.place - mix.placeNewBlock },
          ],
        },
      ]}
    />
  );
}

export function DraftObservation({ data }: { data: DraftData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat
        value={pct(data.edited, data.runs, 1)}
        label="실행 뒤 30분 안에 결과물 근처(±2칸)를 고친 실행"
        hint={`실행 ${count(data.runs)}회 · ${data.players}명`}
      />
      <Stat
        value={pct(data.firstRun.edited, data.firstRun.n)}
        label="사람별로 그 설계도를 처음 실행했을 때"
        hint={`n ${count(data.firstRun.n)}`}
      />
      <Stat
        value={pct(data.repeatRun.edited, data.repeatRun.n)}
        label="같은 설계도를 다시 실행했을 때"
        hint={`n ${count(data.repeatRun.n)} · 대부분 2명의 반복`}
      />
    </div>
  );
}

interface DraftEvidenceProps {
  data: DraftData;
  /** T1 blueprint entities: their rate counts edits on the result's own cells only. */
  blueprints: TopicEntity[];
}

export function DraftEvidence({ data, blueprints }: DraftEvidenceProps) {
  const byBid = new Map(data.blueprints.map((bp) => [bp.bid, bp]));
  const paired = blueprints
    .flatMap((entity) => {
      const bp = entity.blueprintId === undefined ? undefined : byBid.get(entity.blueprintId);
      return bp && bp.runs >= 15 ? [{ entity, bp }] : [];
    })
    .sort((a, b) => b.bp.runs - a.bp.runs);
  const kinds = [
    ['first', '처음 실행', data.firstRun.edited, data.firstRun.n],
    ['repeat', '다시 실행', data.repeatRun.edited, data.repeatRun.n],
    ['skip', '건너뛴 블록 있음', data.skipped.withEdited, data.skipped.withN],
    ['noskip', '건너뛴 블록 없음', data.skipped.withoutEdited, data.skipped.withoutN],
  ] as const;
  return (
    <div className="grid gap-6">
      <Evidence
        topicId="postrun"
        title="어떤 실행이 고쳐졌나"
        separates="해석 1(설치 결과) · 처음 쓰는 설계도인지"
        hypotheses={['skipped']}
        note="세로선: 전체 실행의 수정 비율. 건너뛴 블록은 개수만 남아 위치는 알 수 없다"
      >
        <BarChart
          width={760}
          ariaLabel="실행 종류별 수정 비율"
          labelWidth={170}
          valueWidth={130}
          items={kinds.map(([key, label, edited, n]) => ({
            key,
            label,
            value: ratio(edited, n),
            valueLabel: `${pct(edited, n)} · n ${count(n)}`,
            compare: ratio(data.edited, data.runs),
            emphasis: key === 'first' || key === 'skip',
          }))}
        />
      </Evidence>

      <Evidence
        topicId="postrun"
        title="결과물 칸 자체 vs 결과물 근처"
        separates="해석 2(지형 맞춤)·해석 3(덧붙이기): 두 값의 차이가 결과물 밖에서 한 수정"
        hypotheses={['terrain', 'decorate']}
        note="회색: 설계도가 놓은 칸 자체를 고친 실행 비율 (T1 기존 지표). 파랑: 범위 ±2칸 안을 고친 실행 비율. 실행 15회 이상. 두 지표는 실행을 세는 방식이 조금 달라 n이 다를 수 있다"
      >
        <DumbbellChart
          ariaLabel="설계도별 칸 자체 수정과 근처 수정 비율"
          scale="percent"
          unit="%"
          fromLabel="결과물 칸 자체"
          toLabel="결과물 근처 ±2칸"
          rows={paired.map(({ entity, bp }) => ({
            key: entity.slug,
            label: `#${bp.bid}`,
            from: entity.primary.value,
            to: ratio(bp.edited, bp.runs),
            note: `n ${count(bp.runs)} · ${bp.players}명${bp.topShare >= 0.8 ? ' · 1인 반복' : ''}`,
          }))}
        />
      </Evidence>

      <Evidence
        topicId="postrun"
        title="어디를 고쳤나"
        separates="해석 2(지형 맞춤) vs 해석 3(덧붙이기)"
        hypotheses={['terrain', 'decorate']}
        note="결과물 범위를 2칸 넓혀 그 안의 수정만 셈. 바닥층·아래가 많으면 지형, 옆·위 바깥이 많으면 덧붙이기"
      >
        <EditLocation mix={data} />
      </Evidence>

      <Evidence
        topicId="postrun"
        title="무엇을 캐고 무엇을 놓았나"
        separates="해석 2(원래 지형 정리) · 해석 3(새 블록) · 해석 4(되돌리기)"
        hypotheses={['terrain', 'decorate', 'undo']}
      >
        <EditSource mix={data} />
        <p className="text-sm">
          놓인 블록의 절반 이상을 다시 캔 실행은{' '}
          <strong className="tabular-nums">
            {count(data.undoRuns)}회 ({pct(data.undoRuns, data.runs, 1)})
          </strong>
          . 첫 수정까지 중앙 {data.firstEditMin.p50}분, 고친 실행당 수정 중앙{' '}
          {data.editsPerEditedRun.p50}칸.
        </p>
      </Evidence>
    </div>
  );
}

/** Edit mix of one blueprint, next to its 3D view. */
export function BlueprintEditMix({ bp }: { bp: BlueprintRuns | undefined }) {
  if (!bp || bp.place + bp.digOwn + bp.digOther === 0) {
    return <p className="text-sm text-muted-foreground">이 설계도는 근처 수정 기록이 없습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm tabular-nums">
        실행 {count(bp.runs)}회 중 근처(±2칸) 수정 {pct(bp.edited, bp.runs)} · {bp.players}명
      </p>
      <EditLocation mix={bp} />
      <EditSource mix={bp} />
    </div>
  );
}

/* ---------- T3 · I2: 설계도 준비 ---------- */

export function PrepareObservation({ data }: { data: PrepareData }) {
  const allPrep = data.episodes + data.ops.prep;
  const allBuild = data.outcomes.build + data.ops.build;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat
        value={pct(data.outcomes.build, data.episodes, 1)}
        label="설계도 준비 → 실행"
        hint={`준비 ${count(data.episodes)}회 · ${data.players}명 · 운영자 제외`}
      />
      <Stat
        value={`${data.dtBuild.p50}초`}
        label="준비에서 실행까지 중앙값"
        hint={`10~90%: ${data.dtBuild.p10}~${data.dtBuild.p90}초`}
      />
      <Stat
        value={pct(allBuild, allPrep, 1)}
        label={`운영자 ${data.ops.players}명을 넣으면`}
        hint={`준비 ${count(allPrep)}회. 섞이면 막힌 것처럼 보인다`}
      />
    </div>
  );
}

export function PrepareEvidence({ data }: { data: PrepareData }) {
  const { afterCancel } = data;
  const cancelled = data.outcomes.cancel;
  const funnel = [
    ['pick', '목록 창을 거친 준비', data.pickN],
    ['prep', '설계도 준비', data.episodes],
    ['build', '실행', data.outcomes.build],
    ['cancel', '취소 (ESC)', cancelled],
    ['same', '└ 같은 설계도 다시 준비', afterCancel.prep_same.n],
    ['other', '└ 다른 설계도 준비', afterCancel.prep_other.n],
    ['none', '└ 5분 안에 다시 안 꺼냄', afterCancel.none.n],
  ] as const;
  const afterRows = [
    ['prep_same', '같은 설계도 다시 준비'],
    ['prep_other', '다른 설계도 준비'],
    ['none', '설계도 다시 안 꺼냄'],
  ] as const;
  return (
    <div className="grid gap-6">
      <Evidence
        topicId="loop"
        title="설계도 경로: 고르기 → 준비 → 실행·취소 → 그다음"
        separates="해석 1(UI 마찰) · 해석 2(자리 다시 잡기) · 해석 3(비교)"
        hypotheses={['ui', 'terrain', 'compare']}
        note={`막대 길이: 준비 ${count(data.episodes)}회 대비. 목록 창 → 준비 중앙 ${data.pickToPrepare.p50}초`}
      >
        <BarChart
          width={760}
          ariaLabel="설계도 경로 퍼널"
          labelWidth={200}
          valueWidth={120}
          max={data.episodes}
          items={funnel.map(([key, label, n]) => ({
            key,
            label,
            value: n,
            valueLabel: `${count(n)} · ${pct(n, data.episodes, 1)}`,
            emphasis: key === 'cancel' || key === 'same',
          }))}
        />
      </Evidence>

      <Evidence
        topicId="loop"
        title="취소는 누가 만들었나"
        separates="해석 1(막힌 단계)인지, 계정이 섞인 탓인지"
        hypotheses={['ui']}
        note="운영자: 채팅에서 /su 명령을 쓴 계정"
      >
        <StackedBar
          ariaLabel="운영자 포함 여부별 준비 결과"
          series={[
            { key: 'build', label: '실행', fill: 'fill-data-bar/35' },
            { key: 'cancel', label: '취소', fill: 'fill-edit-dig' },
            { key: 'none', label: '끝나지 않음', fill: 'fill-muted-foreground/30' },
          ]}
          rows={[
            {
              key: 'players',
              label: '플레이어',
              sub: `${data.players}명`,
              segments: [
                { key: 'build', share: data.outcomes.build },
                { key: 'cancel', share: data.outcomes.cancel },
                { key: 'none', share: data.outcomes.none },
              ],
            },
            {
              key: 'ops',
              label: '운영자',
              sub: `${data.ops.players}명`,
              segments: [
                { key: 'build', share: data.ops.build },
                { key: 'cancel', share: data.ops.cancel },
                { key: 'none', share: data.ops.prep - data.ops.build - data.ops.cancel },
              ],
            },
          ]}
        />
        <p className="text-sm tabular-nums">
          취소 {count(cancelled + data.ops.cancel)}건 중 운영자{' '}
          <strong>{pct(data.ops.cancel, cancelled + data.ops.cancel)}</strong>
        </p>
      </Evidence>

      <Evidence
        topicId="loop"
        title="준비에서 결정까지 걸린 시간"
        separates="해석 1(UI 번거로움): 오래 머무는가"
        hypotheses={['ui']}
        note={`실행 n ${count(data.outcomes.build)} · 취소 n ${count(cancelled)}. 취소는 실행보다 오래 머문 뒤 일어난다 (중앙 ${data.dtCancel.p50}초)`}
      >
        <ColumnChart
          ariaLabel="준비 후 결정까지 시간 분포"
          asShare
          axisLabel="준비 → 실행·취소까지 시간"
          series={[
            { key: 'build', label: '실행', fill: 'fill-data-bar/45' },
            { key: 'cancel', label: '취소', fill: 'fill-edit-dig' },
          ]}
          bins={data.dtDist.map((bin) => ({
            key: bin.label,
            label: bin.label,
            values: { build: bin.build, cancel: bin.cancel },
          }))}
        />
      </Evidence>

      <Evidence
        topicId="loop"
        title="취소한 뒤 5분 안에 한 일"
        separates="해석 2(자리 다시 잡기) vs 해석 3(다른 설계도 비교)"
        hypotheses={['terrain', 'compare']}
        note="채굴: 그 사이 한 번이라도 캔 비율. 이동: 취소 시점과 다음 준비 시점의 플레이어 위치 차이(중앙)"
      >
        <BarChart
          width={760}
          ariaLabel="취소 뒤 다음 행동"
          labelWidth={190}
          valueWidth={210}
          items={afterRows.map(([key, label]) => {
            const row = afterCancel[key];
            return {
              key,
              label,
              value: ratio(row.n, cancelled),
              valueLabel: `${pct(row.n, cancelled)} · 채굴 ${pct(row.dig, row.n)} · 이동 ${row.moveMedian ?? '-'}칸`,
              emphasis: key === 'prep_same',
            };
          })}
        />
      </Evidence>

      <Evidence
        topicId="loop"
        title="같은 사람의 처음 10회 → 마지막 10회"
        separates="해석 4(숙련): 준비 → 실행 시간 중앙값"
        hypotheses={['mastery']}
        note="실행 20회 이상인 사람만. 가로축은 로그 눈금. 사람 수가 적어 사례로만 읽는다"
      >
        <DumbbellChart
          ariaLabel="사람별 준비 시간 변화"
          fromLabel="처음 10회"
          toLabel="마지막 10회"
          unit="초"
          rows={data.learning.map((row) => ({
            key: row.player,
            label: row.player,
            from: row.first10,
            to: row.last10,
            note: `n ${count(row.n)}`,
          }))}
        />
      </Evidence>
    </div>
  );
}

/* ---------- T2 · I3: 수동 채굴·건축 ---------- */

const NEXT_SERIES: StackedSeries[] = [
  { key: 'same', label: '같은 칸', fill: 'fill-reason-release' },
  { key: 'adjacent', label: '바로 옆 칸', fill: 'fill-edit-dig' },
  { key: 'near', label: '2~3칸', fill: 'fill-edit-dig/50' },
  { key: 'far', label: '4칸 이상', fill: 'fill-data-bar/40' },
  { key: 'none', label: '10초 안에 안 캠', fill: 'fill-muted-foreground/25' },
];

const REASON_LABEL = { target_change: '조준 변경', mouse_up: '손 뗌' } as const;

const nextSegments = (next: Partial<Record<NextCell, number>>) =>
  NEXT_SERIES.map((series) => ({ key: series.key, share: next[series.key as NextCell] ?? 0 }));

export function ManualObservation({ data }: { data: ManualData }) {
  const tc = data.byReason.target_change;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat
        value={count(data.cancels)}
        label="채굴 취소"
        hint={`${data.players}명 · 운영자 제외`}
      />
      <Stat
        value={pct(tc.n, data.cancels)}
        label="그중 조준 변경 (target_change)"
        hint={`누른 시간 중앙 ${tc.held.p50}ms`}
      />
      <Stat
        value={`${data.manualPerMin.p50}개`}
        label="수동 설치, 설치한 1분당 블록 (중앙)"
        hint={`큰 설계도는 초당 ${data.bigBpPerSec.p50}개 (n ${count(data.bigBpRuns)})`}
      />
    </div>
  );
}

export function ManualEvidence({ data }: { data: ManualData }) {
  const reasons = ['target_change', 'mouse_up'] as const;
  const players = data.placeContextPlayers.slice(0, 10);
  const contextKeys = ['postrun', 'nearbp', 'bpworld', 'free'] as const;
  return (
    <div className="grid gap-6">
      <Evidence
        topicId="friction"
        title="취소한 다음 어디를 캤나"
        separates="해석 1(조준 실패) vs 해석 2(훑기) vs 해석 3(충전 부담)"
        hypotheses={['aim', 'sweep', 'charge']}
        note="취소 뒤 10초 안의 다음 채굴 시작 위치 (칸 거리). 같은 칸이면 다시 시도, 바로 옆 칸이면 훑기"
      >
        <StackedBar
          ariaLabel="취소 사유별 다음 채굴 위치"
          series={NEXT_SERIES}
          rows={reasons.map((reason) => ({
            key: reason,
            label: REASON_LABEL[reason],
            sub: `n ${count(data.byReason[reason].n)}`,
            segments: nextSegments(data.byReason[reason].next),
          }))}
        />
      </Evidence>

      <Evidence
        topicId="friction"
        title="얼마나 누르고 있다가 취소했나"
        separates="해석 2(훑기): 아주 짧게 누르는가 · 해석 3: 충전 직전에 손을 떼는가"
        hypotheses={['sweep', 'charge']}
        note="채굴 충전 시간은 대부분 700ms. 각 사유 안에서의 비율"
      >
        <ColumnChart
          ariaLabel="취소까지 누른 시간 분포"
          layout="group"
          percent
          axisLabel="누른 시간 (ms)"
          series={reasons.map((reason) => ({
            key: reason,
            label: REASON_LABEL[reason],
            fill: reason === 'target_change' ? 'fill-edit-dig' : 'fill-reason-release',
          }))}
          bins={data.byReason.target_change.heldBins.map((bin, index) => ({
            key: bin.label,
            label: bin.label,
            values: Object.fromEntries(
              reasons.map((reason) => [
                reason,
                (data.byReason[reason].heldBins[index]?.n ?? 0) / (data.byReason[reason].n || 1),
              ]),
            ),
          }))}
        />
      </Evidence>

      <Evidence
        topicId="friction"
        title="손 뗀 뒤 같은 칸을 다시 캔 경우"
        separates="해석 3(충전 부담): 막힘 후보의 크기"
        hypotheses={['charge']}
        note="블록별로 어디에 몰리는지는 아래 '대상 비교'의 막힘 후보 탭에서 본다"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            value={count(data.byReason.mouse_up.next.same ?? 0)}
            label="손 뗌 → 같은 칸 재시작"
            hint={`손 뗌 ${count(data.byReason.mouse_up.n)}건의 ${pct(
              data.byReason.mouse_up.next.same ?? 0,
              data.byReason.mouse_up.n,
            )}`}
          />
          <Stat
            value={count(data.byReason.target_change.next.same ?? 0)}
            label="조준 변경 → 같은 칸 재시작"
            hint={`조준 변경 ${count(data.byReason.target_change.n)}건의 ${pct(
              data.byReason.target_change.next.same ?? 0,
              data.byReason.target_change.n,
              1,
            )}`}
          />
        </div>
      </Evidence>

      <Evidence
        topicId="friction"
        title="수동 설치는 어디에서 했나"
        separates="해석 4(설계도 마감 작업) vs 별도 건축"
        hypotheses={['finish']}
        note={`설계도 결과물 근처: 같은 사람이 같은 월드에서 실행한 설계도 범위 ±2칸. 직후: 실행 뒤 30분 안. 설치 500개 이상인 사람 상위 ${players.length}명`}
      >
        <StackedBar
          ariaLabel="수동 설치 위치 맥락"
          series={[
            { key: 'postrun', label: '설계도 실행 직후 근처', fill: 'fill-edit-add' },
            { key: 'nearbp', label: '설계도 결과물 근처', fill: 'fill-edit-add/55' },
            { key: 'bpworld', label: '설계도 제작 월드', fill: 'fill-data-bar/45' },
            { key: 'free', label: '그 외 (별도 건축)', fill: 'fill-data-bar' },
          ]}
          rows={[
            {
              key: 'all',
              label: '전체',
              sub: `n ${count(Object.values(data.placeContext).reduce((a, b) => a + b, 0))}`,
              segments: contextKeys.map((key) => ({ key, share: data.placeContext[key] })),
            },
            ...players.map((row) => ({
              key: row.player,
              label: row.player,
              sub: `n ${count(row.total)}`,
              segments: contextKeys.map((key) => ({ key, share: row[key] })),
            })),
          ]}
        />
      </Evidence>
    </div>
  );
}

/** Where one block's cancels went next, split by reason; replaces the all-blocks donut. */
export function BlockNextMix({ block }: { block: BlockCancel | undefined }) {
  if (!block) {
    return (
      <p className="text-sm text-muted-foreground">
        취소가 100건 미만이라 따로 집계하지 않았습니다.
      </p>
    );
  }
  return (
    <StackedBar
      ariaLabel="이 블록의 취소 사유별 다음 채굴 위치"
      series={NEXT_SERIES}
      rows={[
        {
          key: 'tc',
          label: '조준 변경',
          sub: `n ${count(block.targetChange)}`,
          segments: nextSegments(block.tcNext),
        },
        {
          key: 'mu',
          label: '손 뗌',
          sub: `n ${count(block.mouseUp)}`,
          segments: nextSegments(block.muNext),
        },
      ]}
    />
  );
}

export function SampleNote({ meta }: { meta: BuildingInsights['meta'] }) {
  return (
    <p className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
      원본 로그 {count(meta.rows)}행 · 선별된 테스트 인원 {meta.players}명 (운영자{' '}
      {meta.opsExcluded}명 제외, /su 사용 기준). 대상 비교 데이터(T1~T3 기존 export)는 91명
      기준이며, 설계도 준비 수(5,895)가 같아 같은 제외 기준으로 보인다 (확인 필요). 수치는 기술
      통계이며 일반 유저로 일반화하지 않는다.
    </p>
  );
}
