import { timingSafeEqual } from 'node:crypto';

import { revalidateTag } from 'next/cache';

import { getRevalidateToken } from '@/server/env';

// Called by scripts/db/load_mart.sh after a mart reload:
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

  // expire: 0 → the next request reads the new mart instead of being served stale data.
  // The mart changes once a day, so one slower request after a reload is fine.
  revalidateTag('mart', { expire: 0 });
  return Response.json({ revalidated: true, tag: 'mart' });
}
