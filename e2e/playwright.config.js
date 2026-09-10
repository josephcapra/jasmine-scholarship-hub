// Playwright E2E Test Configuration
// Install: npm install -D @playwright/test
// Run: npx playwright test

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'Mobile Safari',
      use: {
        browserName: 'webkit',
        ...require('@playwright/test').devices['iPhone 12'],
      },
    },
  ],
  webServer: {
    command: 'npx vercel dev',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
};

module.exports = config;
