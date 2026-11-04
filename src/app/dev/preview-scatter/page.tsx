import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { isDevelopment } from '@/server/env';

import { PREVIEW_ROWS } from '../preview-main/fixture';
import { PreviewScatter } from './preview-scatter';

// Dev-only preview of the focus scatter with fixture data (?w= sets the drawing width).
async function PreviewContent({
  searchParams,
}: Pick<PageProps<'/dev/preview-scatter'>, 'searchParams'>) {
  const { w } = await searchParams;
  const width = Math.min(1600, Math.max(400, Number(w) || 1034));
  return <PreviewScatter rows={PREVIEW_ROWS} width={width} />;
}

export default function PreviewScatterPage({ searchParams }: PageProps<'/dev/preview-scatter'>) {
  if (!isDevelopment()) notFound();
  return (
    <Suspense fallback={null}>
      <PreviewContent searchParams={searchParams} />
    </Suspense>
  );
}
