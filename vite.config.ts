import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: [
          // Heavy 3D chunks — only needed on /aurora, let the browser cache them
          '**/globe-vendor*', '**/three-vendor*', '**/charts-vendor*', '**/map-vendor*',
          // Per-language and per-article chunks (see `ondemand` in chunkFileNames).
          // A visitor uses one of 16 locales and reads one of ten articles, but the
          // precache pulled all of them: 1.3 MB of the 2.6 MB install, undoing for
          // PWA users exactly what splitting these files won for web visitors.
          // src/sw.ts caches them at runtime instead, so whatever is actually
          // opened still works offline afterwards.
          '**/assets/ondemand/**',
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
      // Manifest is served from public/manifest.json; vite-plugin-pwa skips generation.
      manifest: false,
      devOptions: { enabled: false },
    }),
    sentryVitePlugin({
      org: 'thestormwatcher',
      project: 'javascript-react',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      telemetry: false,
    }),
  ],
  base: '/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Strip console.* and debugger from production bundles only — dev keeps them
  // for debugging. Replace with Sentry integration in Phase 6.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : undefined,
  build: {
    rollupOptions: {
      output: {
        // Chunks that exist per language or per article go in their own folder so
        // the service worker can exclude them from precaching by path instead of
        // guessing from filenames — `is-<hash>.js` could be the Icelandic locale
        // or a chunk from a package called `is`, and precaching the wrong set is
        // silent either way. Keep this in sync with `globIgnores` above.
        chunkFileNames(chunkInfo) {
          const id = chunkInfo.facadeModuleId ?? '';
          const onDemand = /[\\/]src[\\/](locales|content[\\/](faq|magnetic)|data[\\/]blog[\\/]posts)[\\/]/.test(id);
          return onDemand ? 'assets/ondemand/[name]-[hash].js' : 'assets/[name]-[hash].js';
        },
        manualChunks: {
          'three-vendor':   ['three'],
          'globe-vendor':   ['react-globe.gl', 'three-globe'],
          'supabase-vendor':['@supabase/supabase-js'],
          'charts-vendor':  ['lightweight-charts'],
          'icons-vendor':   ['lucide-react'],
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          // Split out large optional libs to shrink the root bundle
          'map-vendor':     ['leaflet', 'react-leaflet'],
          'motion-vendor':  ['framer-motion'],
          'sentry-vendor':  ['@sentry/react', '@sentry/core', '@sentry/browser'],
        },
      },
    },
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    watch: {
      ignored: ['**/android/**', '**/ios/**'],
    },
    proxy: {
      '/donki': {
        target: 'https://kauai.ccmc.gsfc.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/donki/, '/DONKI/WS/get'),
      },
      '/api/niggg': {
        target: 'https://pagmag.ngic.bg',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace('/api/niggg', '/assets/php/datacalendar26.php'),
      },
      '/api/gfz': {
        target: 'https://kp.gfz.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gfz/, '/app/json/'),
      },
      '/api/stripe': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));
