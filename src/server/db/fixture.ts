import 'server-only';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// DATA_SOURCE=fixture: answers query() from recorded results committed in the repo, so the
// board runs with no database, Lambda or AWS credentials (designers editing tokens.json).
// Record with `pnpm fixtures:record` (scripts/record-fixtures.mts) from a direct or lambda setup.
//
// Files: data/fixtures/queries/<key>.json  { sql, params, rows }
// The key is sha256 of the whitespace-normalized SQL and the params sorted by name, so a
// change in a data function's SQL shows up as a missing fixture, never as stale rows.

export const FIXTURE_DIR = path.join(process.cwd(), 'data', 'fixtures', 'queries');

export interface FixtureFile {
  sql: string;
  params: Record<string, unknown>;
  rows: unknown[];
}

export const normalizeSql = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const byName = ([a]: [string, unknown], [b]: [string, unknown]): number => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const sortedParams = (params: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(params).sort(byName));

export const fixtureKey = (sql: string, params: Record<string, unknown>): string =>
  createHash('sha256')
    .update(JSON.stringify({ sql: normalizeSql(sql), params: sortedParams(params) }))
    .digest('hex');

const MISSING = '녹화된 조회 결과가 없습니다';

/**
 * True for a fixture-mode query with no recording. Checks the message too: an error thrown inside
 * a 'use cache' function may reach the page as a plain Error.
 */
export const isFixtureMissing = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'FixtureMissingError' || error.message.startsWith(MISSING));

export class FixtureMissingError extends Error {
  constructor(key: string, sql: string, params: Record<string, unknown>) {
    super(
      [
        `${MISSING} (DATA_SOURCE=fixture, key ${key.slice(0, 12)}).`,
        `  SQL: ${normalizeSql(sql).slice(0, 160)}...`,
        `  params: ${JSON.stringify(sortedParams(params))}`,
        '  조회나 데이터가 바뀌었다면 DB에 접속되는 환경에서 pnpm fixtures:record로 다시 녹화하세요.',
      ].join('\n'),
    );
    this.name = 'FixtureMissingError';
  }
}

/** DATA_SOURCE=fixture implementation. Data functions call query() in ./query.ts, not this. */
export async function queryFixture<T>(
  sql: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const key = fixtureKey(sql, params);
  let text: string;
  try {
    text = await readFile(path.join(FIXTURE_DIR, `${key}.json`), 'utf8');
  } catch {
    throw new FixtureMissingError(key, sql, params);
  }
  return (JSON.parse(text) as FixtureFile).rows as T[];
}
