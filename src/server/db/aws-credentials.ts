import 'server-only';

import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

import { isDevelopment } from '@/server/env';

/**
 * Credentials for the query Lambda and the precomputed S3 bucket.
 *   AWS_ROLE_ARN set          Vercel OIDC → assume that role (deployments)
 *   unset, `next dev`         AWS SDK default chain: AWS_PROFILE, SSO, env keys (local testing)
 *   unset, anything else      error, so a deployment never falls back to local credentials
 */
export function getAwsCredentials(roleArn: string | undefined) {
  if (roleArn) {
    return awsCredentialsProvider({ roleArn });
  }
  if (isDevelopment()) {
    return fromNodeProviderChain();
  }
  throw new Error('AWS_ROLE_ARN이 없습니다. 배포 환경에서는 Vercel OIDC 역할 ARN이 필요합니다.');
}
