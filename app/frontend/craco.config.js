const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // ✅ OPTIMIZATION: Disable code splitting in dev mode for fastest startup
      // Code splitting slows down initial compilation significantly
      if (env === 'development') {
        // Disable code splitting completely in dev mode for fastest startup
        webpackConfig.optimization.splitChunks = {
          chunks: 'async', // Only split async chunks (lazy loaded)
          cacheGroups: {
            default: false,
            vendors: false,
          },
        };
        
        // Disable all optimizations for faster dev builds
        webpackConfig.optimization.removeAvailableModules = false;
        webpackConfig.optimization.removeEmptyChunks = false;
        webpackConfig.optimization.usedExports = false;
        webpackConfig.optimization.sideEffects = false;
      }

      // Production optimizations
      if (env === 'production') {
        // ============================================
        // ENHANCED CODE SPLITTING & CHUNKS
        // ============================================
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            // React core - highest priority
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 40,
              reuseExistingChunk: true,
            },

            // React Query - separate chunk for caching logic
            reactQuery: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
              name: 'react-query',
              chunks: 'all',
              priority: 35,
              reuseExistingChunk: true,
            },

            // UI libraries - Radix UI components
            ui: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'ui-vendor',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },

            // Icons - Lucide React
            icons: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'icons',
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },

            // Form libraries
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
              name: 'forms-vendor',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },

            // Utility libraries
            utils: {
              test: /[\\/]node_modules[\\/](axios|date-fns|dayjs|clsx|tailwind-merge|class-variance-authority)[\\/]/,
              name: 'utils-vendor',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },

            // PDF & Export libraries (these should be lazy loaded)
            pdfExport: {
              test: /[\\/]node_modules[\\/](jspdf|html2canvas)[\\/]/,
              name: 'pdf-export',
              chunks: 'async',
              priority: 12,
              reuseExistingChunk: true,
            },

            // Toast notifications
            toast: {
              test: /[\\/]node_modules[\\/](react-hot-toast|sonner)[\\/]/,
              name: 'toast',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },

            // Common modules (shared between 2+ chunks)
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              name: 'common',
            },

            // Default vendor chunk (catch-all)
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 1,
              reuseExistingChunk: true,
            },
          },
        };

        // ============================================
        // ADVANCED MINIFICATION
        // ============================================
        webpackConfig.optimization.minimize = true;
        webpackConfig.optimization.minimizer = [
          new TerserPlugin({
            terserOptions: {
              parse: { ecma: 2020 },
              compress: {
                ecma: 5,
                warnings: false,
                comparisons: false,
                inline: 2,
                drop_console: true, // Remove console.log
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
              },
              mangle: { safari10: true },
              output: {
                ecma: 5,
                comments: false,
                ascii_only: true,
              },
            },
            parallel: true,
            extractComments: false,
          }),
        ];

        // Runtime chunk for better long-term caching
        webpackConfig.optimization.runtimeChunk = {
          name: entrypoint => `runtime-${entrypoint.name}`,
        };

        // Tree shaking optimizations
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.sideEffects = false;

        // ============================================
        // COMPRESSION PLUGIN
        // ============================================
        webpackConfig.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240, // Only compress > 10kb
            minRatio: 0.8,
          })
        );

        // ============================================
        // DISABLE SOURCE MAPS IN PRODUCTION
        // ============================================
        webpackConfig.devtool = false;
      }

      // ============================================
      // BUNDLE ANALYZER
      // ============================================
      if (process.env.ANALYZE === 'true') {
        webpackConfig.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: true,
            reportFilename: 'bundle-report.html',
          })
        );
      }

      // ============================================
      // ✅ PWA: Service Worker
      // ============================================
      // Note: CRA automatically copies all files from public/ to build/
      // So service-worker.js will be available at /service-worker.js in production
      // No additional configuration needed

      // ============================================
      // MODULE RESOLUTION ALIASES
      // ============================================
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@': paths.appSrc,
        '@components': paths.appSrc + '/components',
        '@services': paths.appSrc + '/services',
        '@utils': paths.appSrc + '/utils',
        '@contexts': paths.appSrc + '/contexts',
        '@hooks': paths.appSrc + '/hooks',
        '@config': paths.appSrc + '/config',
        // Replace moment.js with dayjs
        moment: 'dayjs',
      };

      // ============================================
      // ✅ FIX: React 19 compatibility
      // ============================================
      // Fix for libraries that haven't updated to React 19 yet
      // Some libraries import from 'react-dom' but React 19 changed exports
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Ignore source map errors for some packages
      if (!webpackConfig.module.rules) {
        webpackConfig.module.rules = [];
      }
      
      // Add rule to handle .mjs files
      const existingMjsRule = webpackConfig.module.rules.find(
        rule => rule.test && rule.test.toString().includes('mjs')
      );
      
      if (!existingMjsRule) {
        webpackConfig.module.rules.push({
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
          resolve: {
            fullySpecified: false,
          },
        });
      }

      // ✅ FIX: Completely disable source-map-loader
      // Some packages (react-dom, eventemitter3, immer) don't include source map files
      // This causes build errors. We'll remove source-map-loader entirely.
      if (webpackConfig.module && webpackConfig.module.rules) {
        webpackConfig.module.rules = webpackConfig.module.rules.filter(rule => {
          // Check if this rule uses source-map-loader
          if (rule.enforce === 'pre') {
            // Check if rule.use is an array
            if (Array.isArray(rule.use)) {
              const hasSourceMapLoader = rule.use.some(use => {
                if (typeof use === 'string') {
                  return use.includes('source-map-loader');
                }
                if (use && use.loader) {
                  return use.loader.includes('source-map-loader');
                }
                return false;
              });
              if (hasSourceMapLoader) {
                return false; // Remove this rule
              }
            }
            // Check if rule.use is a single loader string
            if (typeof rule.use === 'string' && rule.use.includes('source-map-loader')) {
              return false; // Remove this rule
            }
          }
          return true; // Keep other rules
        });
      }

      // ============================================
      // PERFORMANCE HINTS
      // ============================================
      webpackConfig.performance = {
        maxEntrypointSize: 512000, // 500kb warning
        maxAssetSize: 512000,
        hints: env === 'production' ? 'warning' : false,
      };

      // ✅ FIX: Reduce ESLint warnings in terminal
      // Disable ESLint warnings overlay in development (only show errors)
      if (webpackConfig.plugins) {
        const eslintPlugin = webpackConfig.plugins.find(
          plugin => plugin.constructor.name === 'ESLintWebpackPlugin'
        );
        if (eslintPlugin && env === 'development') {
          // Only show errors, not warnings
          eslintPlugin.options.failOnWarning = false;
          eslintPlugin.options.failOnError = false;
          eslintPlugin.options.emitWarning = false; // Don't emit warnings to terminal
        }
      }

      return webpackConfig;
    },
  },

  // ============================================
  // DEV SERVER
  // ============================================
  devServer: {
    compress: true,
    hot: true,
    open: false,
    historyApiFallback: true,
    // Optimize for faster startup
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    // Reduce initial compilation time
    watchFiles: {
      options: {
        ignored: ['**/node_modules', '**/.git'],
      },
    },
  },

  // ✅ OPTIMIZATION: Use faster source maps in development for better performance
  // 'eval-source-map' is faster than 'source-map' but still provides good debugging
  // Alternative: 'cheap-module-source-map' for even faster builds (less accurate)
  devtool: process.env.NODE_ENV === 'development' ? 'eval-cheap-module-source-map' : false,
};
