import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
        // Exclude heavy 3D chunks — only needed on Aurora page, let browser cache them
        globIgnores: ['**/globe-vendor*', '**/three-vendor*'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
      // Manifest is served from public/manifest.json; vite-plugin-pwa skips generation.
      manifest: false,
      devOptions: { enabled: false },
    }),
  ],
  base: './',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Strip console.* and debugger from production bundles only — dev keeps them
  // for debugging. Replace with Sentry integration in Phase 6.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : undefined,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three'],
          'globe-vendor': ['react-globe.gl', 'three-globe'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'charts-vendor': ['lightweight-charts'],
          'icons-vendor': ['lucide-react'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
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
        rewrite: () => '/pagcal2.php',
      },
      '/api/gfz': {
        target: 'https://kp.gfz.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gfz/, ''),
      },
      '/api/stripe': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));
