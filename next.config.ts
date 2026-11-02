import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // readPrecomputed() picks its folder from an env var, so file tracing cannot see these JSON
  // files. Include them in every server route so PRECOMPUTED_SOURCE=local works on Vercel.
  outputFileTracingIncludes: {
    '/*': ['./data/precomputed/**/*.json'],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
