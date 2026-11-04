import { cn } from '@/lib/utils';
import type { FlowPick, FlowRow } from '@/types/board';

import { fmtInt, matchesPick, per100 } from './format';

interface FlowSummaryProps {
  rows: FlowRow[];
  pick: FlowPick;
  /** Encounters left out because the player's level is not recorded. */
  excludedEnc?: number;
  excludedDeaths?: number;
}

interface FigureProps {
  value: string;
}

// A number that fades up when it changes (keyed by its text, so the new value remounts).
function Figure({ value }: FigureProps) {
  return (
    <dd className="text-(length:--font-size-subtitle) leading-5 font-semibold text-ink">
      <span key={value} className="board-enter inline-block">
        {value}
      </span>
    </dd>
  );
}

const note = 'text-(length:--font-size-caption) leading-[14px] text-gray-1';

// Figma 25:76 slot: 144 wide, as tall as the sankey, numbers of the flows that pass every picked cell. The flow counts
// every encounter, also those of monsters too rare for the main list, so its totals are a bit
// larger than the list's.
export function FlowSummary({ rows, pick, excludedEnc = 0, excludedDeaths = 0 }: FlowSummaryProps) {
  const hasPick = Object.values(pick).some(Boolean);
  const hit = rows.filter((r) => matchesPick(r, pick));
  const enc = hit.reduce((s, r) => s + r.enc, 0);
  const deaths = hit.reduce((s, r) => s + r.deaths, 0);
  const all = rows.reduce((s, r) => s + r.enc, 0);
  return (
    <div className="flex h-full flex-col rounded-control bg-gray-3 px-3 py-2.5 tabular-nums">
      <p className="text-(length:--font-size-label) leading-4 font-semibold text-ink">
        {hasPick ? '고른 흐름' : '전체 흐름'}
      </p>
      <p
        className={note}
        title="목록은 교전이 적은 몬스터를 빼지만, 흐름은 모든 몬스터의 교전을 셉니다."
      >
        목록 밖 몬스터 포함
      </p>
      <dl className="mt-2 flex flex-col gap-1.5">
        <div>
          <dt className={note}>교전</dt>
          <Figure value={`${fmtInt(enc)}건`} />
          {hasPick ? (
            <dd className={note}>
              전체 {fmtInt(all)}건 중 {all ? ((enc / all) * 100).toFixed(1) : '–'}%
            </dd>
          ) : null}
        </div>
        <div>
          <dt className={note}>사망</dt>
          <Figure value={`${fmtInt(deaths)}건`} />
        </div>
        <div>
          <dt className={note}>100교전당 사망</dt>
          <Figure value={per100(deaths, enc)} />
          <dd className={note}>
            {fmtInt(deaths)}/{fmtInt(enc)}건
          </dd>
          {deaths > enc ? (
            <dd className={note} title="교전 없이 기록된 사망 포함">
              교전 없는 사망 포함
            </dd>
          ) : null}
        </div>
      </dl>
      {excludedEnc > 0 ? (
        <p className={cn(note, 'mt-auto pt-2')}>
          레벨 기록 없는 교전 {fmtInt(excludedEnc)}건 · 사망 {fmtInt(excludedDeaths)}건 제외
        </p>
      ) : null}
    </div>
  );
}
