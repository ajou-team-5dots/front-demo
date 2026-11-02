import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { cacheLife, cacheTag } from 'next/cache';

import { getAwsCredentials } from '@/server/db/aws-credentials';
import { AWS_DATA_REGION, getPrecomputedConfig } from '@/server/env';

// Values SQL alone cannot produce (H2 same-condition ratio, risk vs expected, pentagon) are
// computed in Python after each load and written as JSON. This reads them by name:
//   PRECOMPUTED_SOURCE=local  <PRECOMPUTED_DIR>/<name>.json   (default: repo data/precomputed)
//   PRECOMPUTED_SOURCE=s3     s3://<PRECOMPUTED_BUCKET>/<PRECOMPUTED_PREFIX><name>.json

export const PRECOMPUTED_TAG = 'precomputed';

// Names become file paths and S3 keys, so only plain names are allowed (no "../").
const NAME = /^[a-z0-9][a-z0-9_-]*$/;

let s3: S3Client | undefined;

const getS3 = (roleArn: string | undefined): S3Client => {
  if (!s3) {
    s3 = new S3Client({
      region: AWS_DATA_REGION,
      credentials: getAwsCredentials(roleArn),
    });
  }
  return s3;
};

async function readText(name: string): Promise<string> {
  const config = getPrecomputedConfig();
  if (config.source === 'local') {
    return readFile(path.join(config.dir, `${name}.json`), 'utf8');
  }
  const object = await getS3(config.roleArn).send(
    new GetObjectCommand({ Bucket: config.bucket, Key: `${config.prefix}${name}.json` }),
  );
  if (!object.Body) {
    throw new Error(`미리 계산한 파일이 비어 있습니다: ${name}`);
  }
  return object.Body.transformToString('utf-8');
}

/** One precomputed JSON file, parsed. The caller states its shape with T. */
export async function readPrecomputed<T>(name: string): Promise<T> {
  'use cache';

  cacheTag(PRECOMPUTED_TAG);
  cacheLife('hours');

  if (!NAME.test(name)) {
    throw new Error(`잘못된 파일 이름입니다: ${name} (소문자, 숫자, _, -만)`);
  }
  return JSON.parse(await readText(name)) as T;
}
