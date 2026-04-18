import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'globe': ['react-globe.gl'],
          'recharts': ['recharts'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/donki': {
        target: 'https://kauai.ccmc.gsfc.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/donki/, '/DONKI/WS/get'),
      },
    },
  },
});
