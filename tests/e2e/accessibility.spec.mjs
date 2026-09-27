import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/projects/agent-workforce/', '/projects/local-rag/', '/projects/personal-assistant/', '/projects/recommender/', '/cv/', '/404.html'];
// Safari's macOS default uses Option+Tab for links, unlike other platforms.
const tabKey = browserName => browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';

test('portrait reserves its original ratio with an interrupted image and no JavaScript', async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const measurements = [];
  try {
    const page = await context.newPage();
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const image = page.getByAltText('Portrait of Don Le', { exact: true });
      expect(await image.evaluate(node => node.naturalWidth)).toBe(246);
      for (const interrupted of [false, true]) {
        if (interrupted) {
          await context.route('**/covers/herophoto.png', route => route.abort());
          await page.reload();
          expect(await image.evaluate(node => node.naturalWidth)).toBe(0);
        }
        await expect.poll(async () => {
          const bounds = await image.boundingBox();
          return bounds.height / bounds.width;
        }, { message: `${width}px portrait ratio; interrupted=${interrupted}` }).toBeCloseTo(263 / 246, 2);
        const box = await image.boundingBox();
        expect(box.width).toBe(width === 320 ? 112 : 160);
        expect(box.height / box.width).toBeCloseTo(263 / 246, 2);
        measurements.push({ width, interrupted, box });
      }
      await context.unroute('**/covers/herophoto.png');
    }
    await info.attach('portrait-ratio', { body: JSON.stringify(measurements), contentType: 'application/json' });
  } finally { await context.close(); }
});

for (const route of routes) {
  test(`axe and actual keyboard/hover/pressed states: ${route}`, async ({ page, browserName }, info) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    await info.attach('axe', { body: JSON.stringify(results), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
    const links = page.locator('a');
    for (let index = 0; index < await links.count(); index++) {
      await page.keyboard.press(tabKey(browserName));
      const link = links.nth(index);
      await expect(link).toBeFocused();
      await expect(link).toHaveCSS('outline-width', '3px');
      await expect(link).toHaveCSS('outline-offset', '4px');
      expect(await link.evaluate(node => node.matches(':focus-visible'))).toBe(true);
      const box = await link.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(7);
      expect(box.x + box.width).toBeLessThanOrEqual((await page.viewportSize()).width - 7);
    }
    await page.keyboard.press(`Shift+${tabKey(browserName)}`);
    await expect(links.nth(await links.count() - 2)).toBeFocused();
    await page.goto(route);
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.screenshot({ path: info.outputPath('skip-focus.png'), fullPage: true });
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.goto(route);
    await page.keyboard.press(tabKey(browserName));
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.site-identity')).toBeFocused();
    await page.screenshot({ path: info.outputPath('identity-focus.png'), fullPage: true });
    // All links use the same instantaneous 0ms primitive; exercise every anchor.
    for (const link of await page.locator('a:not(.skip-link)').all()) {
      await link.hover();
      await expect(link).toHaveCSS('text-decoration-thickness', '2px');
      await page.mouse.down();
      await expect(link).toHaveCSS('color', 'rgb(32, 38, 34)');
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
    await page.locator('.site-identity').hover();
    await page.screenshot({ path: info.outputPath('hover.png'), fullPage: true });
    await page.mouse.down();
    await page.screenshot({ path: info.outputPath('pressed.png'), fullPage: true });
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test(`noJS and interrupted assets retain reading order: ${route}`, async ({ browser, browserName, baseURL }, info) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto(route);
      const before = await page.locator('main').innerText();
      const order = await page.locator('h1, h2, h3, figure li').allTextContents();
      await page.screenshot({ path: info.outputPath('nojs.png'), fullPage: true });
      const failed = [];
      page.on('requestfailed', request => failed.push(request.url()));
      await context.route('**/*', request => ['stylesheet', 'image'].includes(request.request().resourceType()) ? request.abort() : request.continue());
      await page.reload();
      expect(failed.length).toBeGreaterThanOrEqual(3);
      const normalize = text => text.replace(/\s+/g, ' ').trim();
      expect(normalize(await page.locator('main').innerText())).toBe(normalize(before));
      expect(await page.locator('h1, h2, h3, figure li').allTextContents()).toEqual(order);
      await expect(page.locator('a[href="mailto:don.le@donske.com.au"]')).toBeVisible();
      if (route === '/') {
        const portrait = page.getByAltText('Portrait of Don Le', { exact: true });
        expect(await portrait.evaluate(image => image.naturalWidth)).toBe(0);
      }
      await page.keyboard.press(tabKey(browserName));
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toBeFocused();
      await page.screenshot({ path: info.outputPath('interrupted.png'), fullPage: true });
      await page.locator('.site-identity').click();
      await expect(page.locator('h1')).toHaveText('Don Le');
      await info.attach('fallback', { body: JSON.stringify({ route, order, failed, contentEqual: true }), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}
