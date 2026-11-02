import { query } from '@/server/db/query';
import { getDataSource } from '@/server/env';
import { checkOperatorToken } from '@/server/token';

// Operator check that the data path works end to end in a deployment
// (Vercel OIDC → query Lambda → ClickHouse). Not cached, token-protected, returns counts only:
//   curl -H "x-health-token: $REVALIDATE_TOKEN" https://<deployment>/api/health

export async function GET(request: Request) {
  const denied = checkOperatorToken(request, 'x-health-token');
  if (denied) return denied;

  const source = getDataSource();
  const started = Date.now();
  try {
    const [row] = await query<{ rows: number }>(
      'SELECT toUInt32(count()) AS rows FROM game_events',
    );
    return Response.json({
      ok: true,
      source,
      rows: row?.rows ?? 0,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
    return Response.json({ ok: false, source, error: message }, { status: 502 });
  }
}
