import assert from 'node:assert/strict';
import test from 'node:test';

test('Playwright uses one worker in CI', async () => {
  // Given
  const previousCI = process.env.CI;
  process.env.CI = 'true';

  try {
    // When
    const { default: config } = await import(`../../playwright.config.mjs?ci=${Date.now()}`);

    // Then
    assert.equal(config.workers, 1);
  } finally {
    if (previousCI === undefined) delete process.env.CI;
    else process.env.CI = previousCI;
  }
});
