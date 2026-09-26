import { defineConfig } from '@playwright/test';

const evidence = process.env.EVIDENCE_DIR || '.omo/evidence/recruiter-ai-portfolio';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'primitives.spec.mjs',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: `${evidence}/task-5-results.json` }]],
  outputDir: `${evidence}/task-5-test-results`,
  use: { trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } }],
});
