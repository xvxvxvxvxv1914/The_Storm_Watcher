import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // CI runs `playwright install chromium` and uses the bundled build.
        // Locally that download is large and can fail; PW_CHANNEL=chrome runs
        // the suite against an installed Chrome instead. Unset by default so CI
        // keeps using the pinned browser.
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    // Port 5174 avoids conflict with the regular dev server on 5173.
    // --mode test loads .env.test (VITE_PAYMENTS_ENABLED=true).
    command: 'npm run dev -- --mode test --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
