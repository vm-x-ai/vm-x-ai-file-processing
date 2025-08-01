//@ts-check

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  output: 'standalone',
  compress: true,
  basePath: '/ui',
  async headers() {
    return [
      {
        source: '/:path*{/}?',
        headers: [
          {
            key: 'X-Accel-Buffering',
            value: 'no',
          },
        ],
      },
    ];
  },
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@rspack/*',
      'node_modules/esbuild/*',
      'node_modules/@swc/core',
      'node_modules/@swc/core*/*',
      'node_modules/@swc+helpers',
      'node_modules/webpack',
      'node_modules/sass',
      'node_modules/caniuse-lite',
    ],
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
