import { revalidateTag } from 'next/cache';

import { GAME_EVENTS_TAG } from '@/server/data/game-events';
import { PRECOMPUTED_TAG } from '@/server/data/precomputed';
import { checkOperatorToken } from '@/server/token';

// Clears cached game_events results and precomputed JSON, e.g. after a load or batch run:
//   curl -X POST -H "x-revalidate-token: $REVALIDATE_TOKEN" http://localhost:3000/api/revalidate
// A Route Handler is allowed here because the caller is outside the app (CONVENTION 8장).

export async function POST(request: Request) {
  const denied = checkOperatorToken(request, 'x-revalidate-token');
  if (denied) return denied;

  // expire: 0 → the next request reads ClickHouse again instead of being served stale data.
  const tags = [GAME_EVENTS_TAG, PRECOMPUTED_TAG];
  tags.forEach((tag) => revalidateTag(tag, { expire: 0 }));
  return Response.json({ revalidated: true, tags });
}
