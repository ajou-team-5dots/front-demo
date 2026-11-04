import 'server-only';

import path from 'node:path';

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

/** Data lives in ap-northeast-2 (Seoul); fixed so Vercel's per-function AWS_REGION can't move it. */
export const AWS_DATA_REGION = 'ap-northeast-2';

export type DataSource = 'direct' | 'lambda' | 'fixture';

const DATA_SOURCES: readonly DataSource[] = ['direct', 'lambda', 'fixture'];

/**
 * direct = @clickhouse/client from this machine (local dev), lambda = query Lambda over OIDC,
 * fixture = recorded results in data/fixtures (no DB or AWS variables needed). Each mode reads
 * only its own variables, when its first query runs. fixture is refused on Vercel production so
 * a stray env var can never serve recorded data as the live board.
 */
export const getDataSource = (): DataSource => {
  const value = process.env.DATA_SOURCE ?? 'direct';
  const source = DATA_SOURCES.find((s) => s === value);
  if (!source) {
    throw new Error(`DATA_SOURCE는 direct, lambda, fixture 중 하나여야 합니다 (지금: ${value})`);
  }
  if (source === 'fixture' && process.env.VERCEL_ENV === 'production') {
    throw new Error('DATA_SOURCE=fixture는 운영 배포에서 쓸 수 없습니다. lambda로 설정하세요.');
  }
  return source;
};

export interface LambdaConfig {
  functionName: string;
  /** Optional in `next dev`: unset means the AWS SDK default chain (AWS_PROFILE). */
  roleArn: string | undefined;
}

const optionalRoleArn = (): string | undefined => process.env.AWS_ROLE_ARN || undefined;

export const getLambdaConfig = (): LambdaConfig => ({
  functionName: required('QUERY_LAMBDA_NAME'),
  roleArn: optionalRoleArn(),
});

export type PrecomputedConfig =
  | { source: 'local'; dir: string }
  | { source: 's3'; bucket: string; prefix: string; roleArn: string | undefined };

// Default folder for PRECOMPUTED_SOURCE=local: the JSON committed in the repo. On Vercel the function
// runs from the project root, and next.config.ts traces these files into the deployment.
const DEFAULT_PRECOMPUTED_DIR = path.join(process.cwd(), 'data', 'precomputed');

/** local = a folder (repo data/precomputed by default), s3 = bucket + key prefix over OIDC. */
export const getPrecomputedConfig = (): PrecomputedConfig => {
  const source = process.env.PRECOMPUTED_SOURCE ?? 'local';
  if (source === 'local') {
    return { source, dir: process.env.PRECOMPUTED_DIR || DEFAULT_PRECOMPUTED_DIR };
  }
  if (source === 's3') {
    return {
      source,
      bucket: required('PRECOMPUTED_BUCKET'),
      prefix: process.env.PRECOMPUTED_PREFIX ?? '',
      roleArn: optionalRoleArn(),
    };
  }
  throw new Error(`PRECOMPUTED_SOURCE는 local 또는 s3여야 합니다 (지금: ${source})`);
};
