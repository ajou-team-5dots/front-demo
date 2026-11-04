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
  // The detail used to be its own route; it now opens on the board (/?m=). A config redirect
  // answers with a real 307 (the page's redirect() streams inside Suspense under
  // cacheComponents). The request's other query values (filters, picks) pass through.
  redirects: async () => [{ source: '/monsters/:id', destination: '/?m=:id', permanent: false }],
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
