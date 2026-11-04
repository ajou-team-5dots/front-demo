import { Suspense } from 'react';

import { MissingDetail, MonsterDetail } from '@/components/board/detail/monster-detail';
import { MainBoard } from '@/components/board/main/main-board';
import { BoardFrame, DetailSkeleton, MainSkeleton } from '@/components/board/shell/board-frame';
import { ContextBar } from '@/components/board/shell/context-bar';
import { FilterBar } from '@/components/board/shell/filter-bar';
import { parseFilters, parseMonster, parsePick } from '@/lib/board-filters';
import { filterRows, kpiRanks, shortDay, stagesOf } from '@/lib/board-rows';
import { getDataRange, getFlow, getMonsterTrend, getPatches } from '@/server/data/board';
import { getMonsterDetail, getMonsterList, getPatchRisk } from '@/server/data/monsters';
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
  const [all, detail, patches, patchList, trend, range] = await Promise.all([
    getMonsterList(filters.heavy, filters.period),
    getMonsterDetail(monster, filters.heavy, filters.period),
    getPatchRisk(monster, filters.heavy),
    getPatches(),
    getMonsterTrend(monster, filters.heavy, pick),
    getDataRange(),
  ]);
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
      rangeLabel={`${shortDay(range.from)} - ${shortDay(range.to)}`}
      filters={filters}
      pick={pick}
      rankOf={Math.max(ranks.length, ...ranks)}
      ranks={kpiRanks(all, row)}
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
  // getDataRange is the same cached precomputed-meta read the detail already makes.
  const [all, flow, range] = await Promise.all([
    getMonsterList(filters.heavy, filters.period),
    getFlow(filters.heavy, filters.period),
    getDataRange(),
  ]);
  // Only a monster of this batch opens (and fetches) a detail; any other ?m= shows the overview,
  // so random strings never reach the detail queries or their cache.
  const monster = asked && all.some((r) => r.monster === asked) ? asked : null;
  const rows = filterRows(all, filters);
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
      <ContextBar
        rangeLabel={`${shortDay(range.from)}–${shortDay(range.to)}`}
        filters={filters}
        shown={rows.length}
        monster={monster}
      />
      <div>
        <MainBoard
          rows={rows}
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
