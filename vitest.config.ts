import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    // Edge functions are Deno and mostly untestable here (esm.sh / npm: imports),
    // but their pure logic is split into import-free modules so it can be.
    include: [
      'src/**/*.test.ts', 'src/**/*.test.tsx', 'api/**/*.test.ts',
      'supabase/functions/**/*.test.ts',
    ],
    setupFiles: ['src/test-setup.ts'],
    restoreMocks: true,
  },
});
