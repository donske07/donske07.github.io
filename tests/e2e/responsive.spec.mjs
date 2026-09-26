import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/projects/local-rag/', '/projects/personal-assistant/', '/projects/recommender/', '/cv/', '/404.html'];

async function geometry(page) {
  const result = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    clipped: [...document.querySelectorAll('main *, header *, footer *')].filter(node => {
      const box = node.getBoundingClientRect();
      // Inline boxes have clientWidth=0 in Firefox even when their text fits.
      const overflow = node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1;
      return box.width && (box.left < -1 || box.right > document.documentElement.clientWidth + 1 || overflow);
    }).map(node => `${node.tagName}: ${node.textContent.slice(0, 60)}`),
    links: [...document.querySelectorAll('a:not(.skip-link)')].map(node => {
      const box = node.getBoundingClientRect();
      return { text: node.textContent, width: box.width, height: box.height };
    }),
    stages: [...document.querySelectorAll('figure li')].map(node => {
      const box = node.getBoundingClientRect();
      return { text: node.textContent, top: box.top, bottom: box.bottom };
    }),
  }));
  expect(result.scroll).toBeLessThanOrEqual(result.viewport);
  expect(result.clipped).toEqual([]);
  for (const link of result.links) {
    expect(link.width, link.text).toBeGreaterThanOrEqual(44);
    expect(link.height, link.text).toBeGreaterThanOrEqual(44);
  }
  for (let index = 1; index < result.stages.length; index++) expect(result.stages[index].top).toBeGreaterThanOrEqual(result.stages[index - 1].bottom);
  return result;
}

for (const route of routes) {
  for (const width of [320, 375, 768, 1280]) {
    test(`responsive ${route} at ${width}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      expect((await page.goto(route)).status()).toBe(200);
      await page.screenshot({ path: info.outputPath('page.png'), fullPage: true });
      const measured = await geometry(page);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations).toEqual([]);
      await info.attach('geometry-axe', { body: JSON.stringify({ route, width, measured, violations: axe.violations }), contentType: 'application/json' });
    });
  }

  test(`200 percent enlargement and reduced motion: ${route}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    const content = await page.locator('main').innerText();
    await page.locator('html').evaluate(node => { node.style.fontSize = '200%'; });
    await expect(page.locator('html')).toHaveCSS('font-size', '32px');
    const measured = await geometry(page);
    expect(await page.locator('main').innerText()).toBe(content);
    expect(await page.evaluate(() => [...document.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return style.animationDuration !== '0s' || style.transitionDuration !== '0s' || style.scrollBehavior !== 'auto';
    }).length)).toBe(0);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({ path: info.outputPath('enlarged-reduced-motion.png'), fullPage: true });
    await info.attach('enlargement', { body: JSON.stringify({ measured, violations: axe.violations, rootFont: '32px', cssViewport: 320 }), contentType: 'application/json' });
  });
}
