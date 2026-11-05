import 'server-only';

import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { AWS_DATA_REGION, getLambdaConfig } from '@/server/env';

import { getAwsCredentials } from './aws-credentials';

// DATA_SOURCE=lambda implementation: Next server → Vercel OIDC → AWS IAM role → query Lambda
// (inside the VPC) → ClickHouse. The Lambda itself is written by the backend developer.
//
// Contract the Lambda implements:
//   request  { "sql": string, "params": object }   params bind {name:Type} placeholders
//   success  { "rows": [...], "elapsedMs": number }
//   failure  { "error": { "code": string, "message": string } }
// Lambda responses are capped at 6 MB, so data functions aggregate in SQL instead of
// pulling raw rows.

export class QueryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'QueryError';
  }
}

interface LambdaSuccess<T> {
  rows: T[];
  elapsedMs: number;
}

interface LambdaFailure {
  error: { code: string; message: string };
}

let client: LambdaClient | undefined;

const getClient = (): LambdaClient => {
  if (!client) {
    const { roleArn } = getLambdaConfig();
    client = new LambdaClient({
      region: AWS_DATA_REGION,
      // Vercel OIDC when AWS_ROLE_ARN is set; AWS_PROFILE etc. under `next dev` otherwise.
      credentials: getAwsCredentials(roleArn),
    });
  }
  return client;
};

const isFailure = (body: unknown): body is LambdaFailure =>
  typeof body === 'object' && body !== null && 'error' in body;

const isSuccess = <T>(body: unknown): body is LambdaSuccess<T> =>
  typeof body === 'object' && body !== null && Array.isArray((body as { rows?: unknown }).rows);

export async function queryLambda<T>(sql: string, params: Record<string, unknown>): Promise<T[]> {
  const { functionName } = getLambdaConfig();
  const response = await getClient().send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: new TextEncoder().encode(JSON.stringify({ sql, params })),
    }),
  );

  const text = response.Payload ? new TextDecoder().decode(response.Payload) : '';
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new QueryError(
      'bad_response',
      `조회 Lambda 응답이 JSON이 아닙니다: ${text.slice(0, 200)}`,
    );
  }

  // FunctionError is set when the Lambda crashed (unhandled exception), not for contract errors.
  if (response.FunctionError) {
    throw new QueryError('lambda_error', `조회 Lambda 실행 오류: ${text.slice(0, 500)}`);
  }
  if (isFailure(body)) {
    throw new QueryError(body.error.code, body.error.message);
  }
  if (!isSuccess<T>(body)) {
    throw new QueryError('bad_response', '조회 Lambda 응답에 rows가 없습니다');
  }
  return body.rows;
}
