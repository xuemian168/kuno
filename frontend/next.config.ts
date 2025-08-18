import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable source maps in production to reduce build time and size
  productionBrowserSourceMaps: false,
  // Optimize images
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Monaco Editor webpack plugin configuration
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          // Available languages for Monaco Editor
          languages: ['markdown', 'typescript', 'javascript', 'json', 'html', 'css'],
          // Features to include
          features: [
            'codeAction',
            'comment',
            'contextmenu',
            'find',
            'folding',
            'format',
            'gotoLine',
            'hover',
            'multicursor',
            'suggest',
            'wordHighlighter',
          ],
          // Configure output paths
          filename: 'static/vs/[name].worker.js',
          publicPath: '/_next/',
          // Ensure all Monaco assets are included
          globalAPI: true,
        })
      );

      // Ensure Monaco worker files are handled correctly
      config.output.globalObject = 'self';

      // Optimize Monaco code splitting for lazy loading
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            monaco: {
              test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
              name: 'monaco',
              chunks: 'async',
              priority: 30,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Alias for Monaco Editor
    config.resolve.alias = {
      ...config.resolve.alias,
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
    };

    return config;
  },
};

export default withNextIntl(nextConfig);
