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

/** Data lives in ap-northeast-2 (Seoul); fixed so Vercel's per-function AWS_REGION can't move it. */
export const AWS_DATA_REGION = 'ap-northeast-2';

export type DataSource = 'direct' | 'lambda';

/** direct = @clickhouse/client from this machine (local dev), lambda = query Lambda over OIDC. */
export const getDataSource = (): DataSource => {
  const value = process.env.DATA_SOURCE ?? 'direct';
  if (value !== 'direct' && value !== 'lambda') {
    throw new Error(`DATA_SOURCE는 direct 또는 lambda여야 합니다 (지금: ${value})`);
  }
  return value;
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

/** local = a folder outside the repo (analysts' JSON), s3 = bucket + key prefix over OIDC. */
export const getPrecomputedConfig = (): PrecomputedConfig => {
  const source = process.env.PRECOMPUTED_SOURCE ?? 'local';
  if (source === 'local') {
    return { source, dir: required('PRECOMPUTED_DIR') };
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
