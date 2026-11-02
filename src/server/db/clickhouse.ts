import 'server-only';

import { type ClickHouseClient, createClient } from '@clickhouse/client';

import { getClickHouseConfig } from '@/server/env';

// Direct connection for local development (DATA_SOURCE=direct).
// One client per server process. It keeps an HTTP keep-alive pool, so creating one per
// request would open a new connection every time.
let client: ClickHouseClient | undefined;

const getClient = (): ClickHouseClient => {
  if (!client) {
    const { url, username, password, database } = getClickHouseConfig();
    client = createClient({ url, username, password, database, request_timeout: 10_000 });
  }
  return client;
};

/** DATA_SOURCE=direct implementation. Data functions call query() in ./query.ts, not this. */
export async function queryClickHouse<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const result = await getClient().query({ query, query_params: params, format: 'JSONEachRow' });
  return result.json<T>();
}
