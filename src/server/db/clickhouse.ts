import 'server-only';

import { type ClickHouseClient, createClient } from '@clickhouse/client';

import { getClickHouseConfig } from '@/server/env';

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

/**
 * Runs a SELECT and returns rows as objects.
 * Always pass user input through `params` ({name:Type} placeholders in SQL), never by
 * string concatenation: that is what keeps query strings safe from injection.
 */
export async function queryRows<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const result = await getClient().query({ query, query_params: params, format: 'JSONEachRow' });
  return result.json<T>();
}
