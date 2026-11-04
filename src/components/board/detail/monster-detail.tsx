import type { ReactNode } from 'react';

import { boardHref } from '@/lib/board-filters';
import { pickChips, roleLabel } from '@/lib/board-rows';
import type { BoardFilters, DailyPoint, FlowPick, PatchInfo } from '@/types/board';
import type { H2Patch, MonsterDetail as MonsterDetailData, MonsterMainRow } from '@/types/monsters';

import { EmptyState } from '../shell/empty-state';
import { KpiRow } from '../shell/kpi-row';
import { riskLabel } from './format';
import { PatchRiskFit } from './patch-risk-fit';
import { Pentagon } from './pentagon';
import { PickedFlowRow } from './picked-flow-row';
import { ReadinessPanel } from './readiness-panel';
import { SkillWindow } from './skill-window';

/** Builds the board href for a pick and an open monster (null = overview). */
export type BoardHrefFor = (pick: FlowPick, monster: string | null) => string;

interface MonsterDetailProps {
  monster: string;
  row: MonsterMainRow;
  detail: MonsterDetailData;
  patches: H2Patch[];
  patchList: PatchInfo[];
  trend: DailyPoint[];
  /** "10/12–10/22" (dayRange) */
  rangeLabel: string;
  filters: BoardFilters;
  pick: FlowPick;
  /** How many monsters the pentagon rank is out of. */
  rankOf: number;
  /** Defaults to the real board ('/'); dev previews pass their own path. */
  hrefFor?: BoardHrefFor;
}

interface TitleRowProps {
  monster: string;
  meta?: string;
  sub?: string;
  /** The KPI box at the row's right end (Figma 25:169 / 38:623). */
  kpi?: ReactNode;
}

// Name and meta on the left, the KPI box (size.kpi-box) at the right end of the same row. No close
// button: the open row in the sidebar (or Esc) returns to the overview.
function TitleRow({ monster, meta, sub, kpi }: TitleRowProps) {
  return (
    <div className="flex h-(--size-kpi-box-h) shrink-0 items-center justify-between gap-6 pl-4">
      <div className="flex min-w-0 items-center gap-[22px]">
        <h1
          tabIndex={-1}
          data-detail-title
          className="truncate text-(length:--font-size-display) leading-[29px] font-semibold text-ink outline-none"
        >
          <span key={monster} className="board-swap inline-block">
            {monster}
          </span>
        </h1>
        {meta ? (
          <div className="shrink-0 text-gray-1">
            <p className="text-(length:--font-size-subtitle) leading-[19px] font-semibold">
              {meta}
            </p>
            {sub ? (
              <p className="text-(length:--font-size-label) leading-[14px] font-semibold">{sub}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      {kpi}
    </div>
  );
}

/** "4.74배" as number + unit; "사망 0건" and "–" stay whole words. */
const riskKpi = (risk: number | null, deaths: number): { value: string; unit?: string } => {
  const text = riskLabel(risk, deaths);
  return text.endsWith('배') ? { value: text.slice(0, -1), unit: '배' } : { value: text };
};

/** PatchRisk's default patch: the first in the list that has numbers for this monster. */
const defaultPatch = (patches: H2Patch[], patchList: PatchInfo[]): string =>
  patchList.find((p) => patches.some((h) => h.patchId === p.id))?.id ?? patchList[0]?.id ?? '';

const defaultHref =
  (filters: BoardFilters): BoardHrefFor =>
  (pick, monster) =>
    boardHref(filters, pick, monster);

/**
 * Detail of one monster filling the board's main area (1066 at the 1440 frame, 1506 at
 * 1920; Figma detail 38:423 / 38:570, re-flowed): picked flow chips, title with the KPI box at its right end, 전투 양상
 * beside 준비 조건별 비중, 보스 기술 직후 사망 (bosses only), 패치 전후 위험, each full width.
 * The slot is a size container: from 1200 wide 전투 양상 is 360 wide, below 340.
 */
export function MonsterDetail({
  monster,
  row,
  detail,
  patches,
  patchList,
  trend,
  rangeLabel,
  filters,
  pick,
  rankOf,
  hrefFor = defaultHref(filters),
}: MonsterDetailProps) {
  // H3 is computed for bosses only (DATA_SPEC 5장); midbosses get H3_bossSkill null and no
  // panel. A boss with no skill records gets an empty panel that says 기술 기록 없음.
  const skills = detail.H3_bossSkill ?? [];
  const showSkills = row.role === 'boss';
  const chips = pickChips(pick, (p) => hrefFor(p, monster));
  // Expected risk and the pentagon are precomputed per heavy setting only.
  const periodNote =
    filters.period === 'current' ? undefined : '기대 대비 위험·전투 양상은 현재 수치 기준';

  return (
    // Another monster swaps in place: the same charts stay mounted, so marks glide to the new
    // values while the panels come back from the pending dim, and title / KPI text fade in.
    <div data-detail={monster} className="flex w-full flex-col gap-(--space-panel-gap)">
      <PickedFlowRow chips={chips} />
      <TitleRow
        monster={monster}
        meta={`${row.mainStage}단계 · ${roleLabel(row.role)}`}
        sub={`${rangeLabel} | ${filters.period === 'current' ? '현재 수치' : '전체'}`}
        kpi={
          <KpiRow
            items={[
              {
                label: '사망',
                value: row.deaths.toLocaleString('ko-KR'),
                unit: '건',
              },
              {
                label: '교전',
                value: row.enc.toLocaleString('ko-KR'),
                unit: '건',
              },
              {
                label: '기대 대비 위험',
                ...riskKpi(row.riskVsExpected, row.deaths),
                title: `기대 대비 위험 (던전 단계 반영). 1배보다 크면 같은 단계 기대보다 위험이 높습니다.${
                  row.riskVsExpected === 0 && row.deaths === 0
                    ? ' 사망이 없어 배수를 계산하지 않습니다.'
                    : ''
                }${periodNote ? ` ${periodNote}.` : ''}`,
              },
            ]}
          />
        }
      />
      <div className="flex h-(--size-detail-row) gap-(--space-panel-gap)">
        <div className="h-full w-[340px] shrink-0 @min-[1200px]:w-[360px]">
          <Pentagon
            axes={detail.pentagon}
            rank={row.pentagonRank}
            rankOf={rankOf}
            note={periodNote}
          />
        </div>
        <div className="h-full min-w-0 flex-1">
          <ReadinessPanel
            h1={detail.H1_readiness}
            aux1={detail.aux1_unanswered}
            aux2={detail.aux2_bigHit}
          />
        </div>
      </div>
      {showSkills ? (
        <div className="shrink-0">
          <SkillWindow skills={skills} />
        </div>
      ) : null}
      {/* Not keyed on the monster or heavy, so switching tweens the trend in place. Only a
          different default patch remounts it, so the select never keeps the previous monster's
          default (PatchRisk keeps its first default as the chosen patch). */}
      <PatchRiskFit
        key={defaultPatch(patches, patchList)}
        monster={monster}
        patches={patches}
        patchList={patchList}
        trend={trend}
        picked={chips.length > 0}
      />
    </div>
  );
}

interface MissingDetailProps {
  monster: string;
}

/** ?m= names a monster the batch does not have: say so in place, keep the board. */
export function MissingDetail({ monster }: MissingDetailProps) {
  return (
    <div className="flex w-full flex-col gap-(--space-panel-gap)">
      <TitleRow monster={monster} />
      <div className="flex h-[200px] rounded-panel bg-panel">
        <EmptyState>이 몬스터의 기록이 없습니다 · Esc로 개요</EmptyState>
      </div>
    </div>
  );
}
