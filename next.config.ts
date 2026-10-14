import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The 3D blueprint view now lives inside topic T1; the dashboard is the entry point.
  redirects: async () => [
    { source: '/', destination: '/topics', permanent: false },
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
