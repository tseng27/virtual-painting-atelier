import { defineConfig } from '@playwright/test';

const BASE = '/virtual-painting-atelier/';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:4173${BASE}`,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: `http://localhost:4173${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
