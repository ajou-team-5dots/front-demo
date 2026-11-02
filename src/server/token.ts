import 'server-only';

import { timingSafeEqual } from 'node:crypto';

import { getRevalidateToken } from '@/server/env';

/**
 * Checks the operator token sent by scripts (revalidate, health). Returns an error Response to
 * send back, or null when the token matches. The compare is constant-time so response timing
 * does not leak how much of the token matched.
 */
export function checkOperatorToken(request: Request, header: string): Response | null {
  const expected = getRevalidateToken();
  if (!expected) {
    return Response.json({ error: 'REVALIDATE_TOKEN이 설정되지 않았습니다' }, { status: 503 });
  }
  const a = Buffer.from(request.headers.get(header) ?? '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
