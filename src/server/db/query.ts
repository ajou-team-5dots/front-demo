import 'server-only';

import { getDataSource } from '@/server/env';

import { queryClickHouse } from './clickhouse';
import { queryFixture } from './fixture';
import { queryLambda } from './lambda';

/**
 * Set only by the fixture recorder script. `lookup` answers a query it already holds (outside Next
 * there is no 'use cache', so the same inner query would hit the shared DB again); `save` gets
 * each query that did run.
 */
export interface QueryRecorder {
  lookup: (sql: string, params: Record<string, unknown>) => unknown[] | undefined;
  save: (sql: string, params: Record<string, unknown>, rows: unknown[]) => void;
}

let recorder: QueryRecorder | undefined;

/** For scripts/record-fixtures.mts only. The app never sets this. */
export const setQueryRecorder = (fn: QueryRecorder | undefined): void => {
  recorder = fn;
};

const run = <T>(sql: string, params: Record<string, unknown>): Promise<T[]> => {
  switch (getDataSource()) {
    case 'lambda':
      return queryLambda<T>(sql, params);
    case 'fixture':
      return queryFixture<T>(sql, params);
    default:
      return queryClickHouse<T>(sql, params);
  }
};

/**
 * The only way data functions reach ClickHouse. DATA_SOURCE picks the transport:
 *   direct   @clickhouse/client from this machine (local development)
 *   lambda   query Lambda over Vercel OIDC (deployments)
 *   fixture  recorded results in data/fixtures (no database; designers)
 * All run the same SQL. Pass every value through `params` with {name:Type} placeholders,
 * never by string concatenation, so queries stay safe from injection.
 */
export async function query<T>(sql: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const held = recorder?.lookup(sql, params);
  if (held) return held as T[];
  const rows = await run<T>(sql, params);
  recorder?.save(sql, params, rows);
  return rows;
}

export { isFixtureMissing } from './fixture';
export { QueryError } from './lambda';
