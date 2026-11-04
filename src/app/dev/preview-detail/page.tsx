import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { MonsterDetail } from '@/components/board/detail/monster-detail';
import { MainBoard } from '@/components/board/main/main-board';
import { BoardFrame, MainSkeleton } from '@/components/board/shell/board-frame';
import { FilterBar } from '@/components/board/shell/filter-bar';
import { parseFilters, parseMonster, parsePick } from '@/lib/board-filters';
import { filterRows, stagesOf } from '@/lib/board-rows';
import { isDevelopment } from '@/server/env';

import { PREVIEW_FLOW } from '../preview-main/fixture';
import { PREVIEW_DETAIL, PREVIEW_PATCHES, PREVIEW_ROWS } from './fixture';

type Props = PageProps<'/dev/preview-detail'>;

const BASE = '/dev/preview-detail';

// Dev-only preview of the board with a monster's detail open, from fixture data (same layout as
// src/app/page.tsx). ?m=small_zombie or ?m=elderroot_stage_1; without ?m= the overview shows.
// Not served in production.
async function PreviewContent({ searchParams }: Pick<Props, 'searchParams'>) {
  const query = await searchParams;
  const filters = parseFilters(query);
  const pick = parsePick(query);
  const m = parseMonster(query);
  const monster = m && PREVIEW_DETAIL[m] ? m : null;
  const row = PREVIEW_ROWS.find((r) => r.monster === monster);
  const data = monster ? PREVIEW_DETAIL[monster] : undefined;
  return (
    <>
      <FilterBar
        filters={filters}
        pick={pick}
        stages={stagesOf(PREVIEW_ROWS)}
        basePath={BASE}
        monster={monster}
        variant="main"
      />
      <div className="mt-(--space-panel-gap)">
        <MainBoard
          rows={filterRows(PREVIEW_ROWS, filters)}
          flow={PREVIEW_FLOW}
          filters={filters}
          pick={pick}
          monster={monster}
          basePath={BASE}
          detail={
            monster && row && data ? (
              <MonsterDetail
                monster={monster}
                row={row}
                detail={data.detail}
                patches={data.patches}
                patchList={PREVIEW_PATCHES}
                trend={data.trend}
                rangeLabel="10/12–10/22"
                filters={filters}
                rankOf={PREVIEW_ROWS.length}
              />
            ) : null
          }
        />
      </div>
    </>
  );
}

export default function PreviewDetail({ searchParams }: Props) {
  if (!isDevelopment()) notFound();
  return (
    <BoardFrame>
      <Suspense fallback={<MainSkeleton />}>
        <PreviewContent searchParams={searchParams} />
      </Suspense>
    </BoardFrame>
  );
}
