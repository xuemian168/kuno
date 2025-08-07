import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Change from 'standalone' to support static generation with ISR
  // output: 'standalone', // 移除此行以启用 SSG + ISR
  
  // Enable static generation with ISR support
  experimental: {
    // Enable static generation optimization
    optimizePackageImports: ['lucide-react'],
  },
  
  // Disable source maps in production to reduce build time and size
  productionBrowserSourceMaps: false,
  
  // Image optimization configuration for static generation
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8085',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/api/uploads/**',
      },
    ],
  },

  // Enable trailing slash for consistent URLs
  trailingSlash: true,

  // Configure static generation
  generateEtags: false,
  
  // Optimize bundle
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
};

export default withNextIntl(nextConfig);
