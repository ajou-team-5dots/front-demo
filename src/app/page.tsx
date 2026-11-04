import { Suspense } from 'react';

import { MissingDetail, MonsterDetail } from '@/components/board/detail/monster-detail';
import { MainBoard } from '@/components/board/main/main-board';
import { BoardFrame, DetailSkeleton, MainSkeleton } from '@/components/board/shell/board-frame';
import { FilterBar } from '@/components/board/shell/filter-bar';
import { parseFilters, parseMonster, parsePick } from '@/lib/board-filters';
import { dayRange, filterRows, stagesOf } from '@/lib/board-rows';
import { getDataRange, getFlow, getMonsterTrend, getPatches } from '@/server/data/board';
import { getMonsterDetail, getMonsterList, getPatchRisk } from '@/server/data/monsters';
import { isFixtureMissing } from '@/server/db/query';
import type { BoardFilters, FlowPick } from '@/types/board';

interface DetailContentProps {
  monster: string | null;
  filters: BoardFilters;
  pick: FlowPick;
}

// The open monster's detail (Figma detail 38:423 / 38:570), in the board's left slot. Without
// ?m= it renders nothing, so the slot's Suspense boundary is always mounted and already showing:
// opening, switching and filtering then keep the current screen until the new detail is ready
// (inside the navigation's transition) instead of falling back to the skeleton.
async function DetailContent({ monster, filters, pick }: DetailContentProps) {
  if (!monster) return null;
  let loaded;
  try {
    loaded = await Promise.all([
      getMonsterList(filters.heavy, filters.period),
      getMonsterDetail(monster, filters.heavy, filters.period),
      getPatchRisk(monster, filters.heavy),
      getPatches(),
      getMonsterTrend(monster, filters.heavy, pick),
      getDataRange(),
    ]);
  } catch (error) {
    // DATA_SOURCE=fixture records only some screens (e.g. no flow pick on most monsters).
    if (isFixtureMissing(error)) {
      return <MissingDetail monster={monster} message="디자인 예시 데이터에는 없는 화면입니다" />;
    }
    throw error;
  }
  const [all, detail, patches, patchList, trend, range] = loaded;
  const row = all.find((r) => r.monster === monster);
  if (!row || !detail) {
    return <MissingDetail monster={monster} />;
  }
  // Ranks come from the whole batch; the list may hide a few low-encounter monsters.
  const ranks = all.flatMap((r) => (r.pentagonRank === null ? [] : [r.pentagonRank]));
  return (
    <MonsterDetail
      monster={monster}
      row={row}
      detail={detail}
      patches={patches}
      patchList={patchList}
      trend={trend}
      rangeLabel={dayRange(range)}
      filters={filters}
      pick={pick}
      rankOf={Math.max(ranks.length, ...ranks)}
    />
  );
}

// The board (Figma main / Desktop - 1, node 14:2), one page: the explorer list on the left, the
// overview or a monster's detail in the main area. ?m=<monster> opens the detail.
async function MainContent({ searchParams }: Pick<PageProps<'/'>, 'searchParams'>) {
  const query = await searchParams;
  const filters = parseFilters(query);
  const pick = parsePick(query);
  const asked = parseMonster(query);
  const [all, flow] = await Promise.all([
    getMonsterList(filters.heavy, filters.period),
    getFlow(filters.heavy, filters.period),
  ]);
  // Only a monster of this batch opens (and fetches) a detail; any other ?m= shows the overview,
  // so random strings never reach the detail queries or their cache.
  const monster = asked && all.some((r) => r.monster === asked) ? asked : null;
  return (
    <>
      <FilterBar
        filters={filters}
        pick={pick}
        stages={stagesOf(all)}
        basePath="/"
        monster={monster}
        variant="main"
      />
      <div className="mt-(--space-panel-gap)">
        <MainBoard
          rows={filterRows(all, filters)}
          flow={flow}
          filters={filters}
          pick={pick}
          monster={monster}
          detail={
            <Suspense fallback={<DetailSkeleton />}>
              <DetailContent monster={monster} filters={filters} pick={pick} />
            </Suspense>
          }
        />
      </div>
    </>
  );
}

export default function Home({ searchParams }: PageProps<'/'>) {
  return (
    <BoardFrame>
      <Suspense fallback={<MainSkeleton />}>
        <MainContent searchParams={searchParams} />
      </Suspense>
    </BoardFrame>
  );
}
