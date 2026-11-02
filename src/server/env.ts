import 'server-only';

// Environment variables are read only under src/server (lint rule n/no-process-env).
// Real values live in .env.local, which git ignores. See .env.example for the names.

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name}가 없습니다. .env.example을 보고 .env.local에 채워 주세요.`);
  }
  return value;
};

export interface ClickHouseConfig {
  url: string;
  username: string;
  password: string;
  database: string;
}

/** Read lazily so `next build` works on machines without database credentials. */
export const getClickHouseConfig = (): ClickHouseConfig => ({
  url: required('CLICKHOUSE_URL'),
  username: required('CLICKHOUSE_USER'),
  password: process.env.CLICKHOUSE_PASSWORD ?? '',
  database: required('CLICKHOUSE_DB'),
});

/** Undefined when unset; the revalidate route then refuses every request. */
export const getRevalidateToken = (): string | undefined =>
  process.env.REVALIDATE_TOKEN || undefined;

export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
