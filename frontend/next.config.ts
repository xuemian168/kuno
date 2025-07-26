import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable source maps in production to reduce build time and size
  productionBrowserSourceMaps: false,
  // Optimize images
  images: {
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
