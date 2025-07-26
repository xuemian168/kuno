import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Optimize build for Docker
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/**/*'],
    },
  },
  // Disable source maps in production to reduce build time and size
  productionBrowserSourceMaps: false,
  // Optimize images
  images: {
    unoptimized: true,
  },
  // Reduce bundle analysis overhead
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize for production builds
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
