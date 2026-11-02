import 'server-only';

import { getDataSource } from '@/server/env';

import { queryClickHouse } from './clickhouse';
import { queryLambda } from './lambda';

/**
 * The only way data functions reach ClickHouse. DATA_SOURCE picks the transport:
 *   direct  @clickhouse/client from this machine (local development)
 *   lambda  query Lambda over Vercel OIDC (deployments)
 * Both run the same SQL. Pass every value through `params` with {name:Type} placeholders,
 * never by string concatenation, so queries stay safe from injection.
 */
export async function query<T>(sql: string, params: Record<string, unknown> = {}): Promise<T[]> {
  return getDataSource() === 'lambda'
    ? queryLambda<T>(sql, params)
    : queryClickHouse<T>(sql, params);
}

export { QueryError } from './lambda';
