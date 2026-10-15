import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The dashboard is the entry point; the 3D blueprint view lives inside topic T1 and the
  // short-lived /insights pages were folded into the topic dashboards.
  redirects: async () => [
    { source: '/', destination: '/topics', permanent: false },
    { source: '/insights', destination: '/topics', permanent: false },
    { source: '/insights/draft', destination: '/topics/postrun', permanent: false },
    { source: '/insights/prepare', destination: '/topics/loop', permanent: false },
    { source: '/insights/manual', destination: '/topics/friction', permanent: false },
    { source: '/blueprint-edits', destination: '/topics/postrun', permanent: false },
    { source: '/blueprint-edits/:id', destination: '/topics/postrun/bp-:id', permanent: false },
  ],
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
