import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  testIgnore: '**/primitives.spec.mjs',
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['json', { outputFile: process.env.EVIDENCE_DIR ? `${process.env.EVIDENCE_DIR}/playwright-results.json` : 'test-results/results.json' }], ['html', { outputFolder: process.env.EVIDENCE_DIR ? `${process.env.EVIDENCE_DIR}/playwright-report` : 'playwright-report', open: 'never' }]],
  outputDir: process.env.EVIDENCE_DIR ? `${process.env.EVIDENCE_DIR}/test-results` : 'test-results',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
