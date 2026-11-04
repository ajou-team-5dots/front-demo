import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { MainBoard } from '@/components/board/main/main-board';
import { BoardFrame, MainSkeleton } from '@/components/board/shell/board-frame';
import { FilterBar } from '@/components/board/shell/filter-bar';
import { parseFilters, parsePick } from '@/lib/board-filters';
import { filterRows, stagesOf } from '@/lib/board-rows';
import { isDevelopment } from '@/server/env';

import { PREVIEW_FLOW, PREVIEW_ROWS } from './fixture';

// Dev-only preview of the main board with fixture data, so the charts can be built before the
// data functions exist. Served only by `next dev`.
async function PreviewContent({
  searchParams,
}: Pick<PageProps<'/dev/preview-main'>, 'searchParams'>) {
  const query = await searchParams;
  const filters = parseFilters(query);
  const pick = parsePick(query);
  return (
    <>
      <FilterBar
        filters={filters}
        pick={pick}
        stages={stagesOf(PREVIEW_ROWS)}
        basePath="/dev/preview-main"
      />
      <div className="mt-(--space-panel-gap)">
        <MainBoard
          rows={filterRows(PREVIEW_ROWS, filters)}
          flow={PREVIEW_FLOW}
          filters={filters}
          pick={pick}
          basePath="/dev/preview-main"
        />
      </div>
    </>
  );
}

export default function PreviewMain({ searchParams }: PageProps<'/dev/preview-main'>) {
  if (!isDevelopment()) notFound();
  return (
    <BoardFrame>
      <Suspense fallback={<MainSkeleton />}>
        <PreviewContent searchParams={searchParams} />
      </Suspense>
    </BoardFrame>
  );
}
