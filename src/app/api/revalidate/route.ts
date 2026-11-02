import { timingSafeEqual } from 'node:crypto';

import { revalidateTag } from 'next/cache';

import { GAME_EVENTS_TAG } from '@/server/data/game-events';
import { getRevalidateToken } from '@/server/env';

// Clears the cached game_events results, e.g. after new logs land on EC2:
//   curl -X POST -H "x-revalidate-token: $REVALIDATE_TOKEN" http://localhost:3000/api/revalidate
// A Route Handler is allowed here because the caller is outside the app (CONVENTION 8장).

const sameToken = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Constant-time compare so response timing does not leak how much of the token matched.
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(request: Request) {
  const expected = getRevalidateToken();
  if (!expected) {
    return Response.json({ error: 'REVALIDATE_TOKEN이 설정되지 않았습니다' }, { status: 503 });
  }
  const given = request.headers.get('x-revalidate-token') ?? '';
  if (!sameToken(given, expected)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  // expire: 0 → the next request reads ClickHouse again instead of being served stale data.
  revalidateTag(GAME_EVENTS_TAG, { expire: 0 });
  return Response.json({ revalidated: true, tag: GAME_EVENTS_TAG });
}
