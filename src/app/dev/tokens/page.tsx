import { notFound } from 'next/navigation';

import { isDevelopment } from '@/server/env';

import { TokenPreview } from './token-preview';

// Dev-only sheet of every design token (design-tokens/tokens.json) with contrast ratios and a few
// small chart samples, for designers checking a palette change. Served only by `next dev`.
export default function TokensPage() {
  if (!isDevelopment()) notFound();
  return <TokenPreview />;
}
