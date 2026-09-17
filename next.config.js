/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const repoName = 'Tota-Tola-3D-Canning-Simulation';

const nextConfig = {
  output: 'export',
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? `/${repoName}` : '',
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.externals = [...config.externals, 'canvas', 'jsdom'];
    return config;
  },
};

module.exports = nextConfig;
