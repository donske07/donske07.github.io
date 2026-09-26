import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const evidence = '.omo/evidence/recruiter-ai-portfolio';
const sourceMode = process.env.RECOMMENDER_SOURCE === '1';
const require = createRequire(import.meta.url);
const tabKey = browserName => process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
const stages = ['Rating history', 'User representation', 'Candidate retrieval', 'Feature-based ranking', 'Recommendations'];
const styles = ['tokens', 'site', 'print'];
const save = (name, data) => writeFile(`${evidence}/task-9-${name}.json`, JSON.stringify(data, null, 2));
const capture = (page, name) => page.screenshot({ path: `${evidence}/task-9-${name}.png`, fullPage: true });
const misleading = /\d|MMR|live demo|real-time recommendations|achieved|outperforms/i;

async function load(page) {
  if (!sourceMode) {
    const response = await page.goto('http://127.0.0.1:4173/projects/recommender/');
    expect(response.status()).toBe(200);
    return;
  }
  const html = await readFile('projects/recommender/index.html', 'utf8');
  const css = await Promise.all(styles.map(name => readFile(`assets/css/${name}.css`, 'utf8')));
  // Parser-loaded exact CSS also works with JavaScript disabled.
  await page.setContent(html.replace(/<link\b[^>]*rel="(?:stylesheet|icon)"[^>]*>/g, '')
    .replace('</head>', `<style>${css.join('\n')}</style></head>`));
}

async function fits(page) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    main: document.querySelector('main').getBoundingClientRect().width,
    stages: [...document.querySelectorAll('.text-flow li')].map(el => ({
      text: el.textContent, top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom,
    })),
    links: [...document.querySelectorAll('a')].map(el => ({
      text: el.textContent, width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
    })),
  }));
  expect(result.width).toBeLessThanOrEqual(result.viewport);
  for (const link of result.links) {
    expect(link.width, link.text).toBeGreaterThanOrEqual(44);
    expect(link.height, link.text).toBeGreaterThanOrEqual(44);
  }
  for (let i = 1; i < result.stages.length; i++) {
    expect(result.stages[i].top).toBeGreaterThanOrEqual(result.stages[i - 1].bottom);
  }
  return result;
}

async function story(page) {
  await expect(page.locator('h1')).toHaveText('Two-stage recommendation engine');
  await expect(page.locator('.status')).toHaveText('ML prototype');
  await expect(page.locator('.text-flow ol > li')).toHaveText(stages);
  await expect(page.locator('main h2')).toHaveText([
    'Problem', 'Implemented approach', 'Trade-offs', 'Evaluation and limits',
  ]);
  const text = await page.locator('main').innerText();
  for (const phrase of ['MovieLens', 'semantic candidate retrieval', 'OpenSearch', 'XGBoost',
    'pairwise learning objective', 'NDCG evaluation metric', 'not a reproduced benchmark',
    "ranker can't recover", 'leakage', 'score scales', 'no claim of production deployment']) {
    expect(text).toContain(phrase);
  }
  expect(text).not.toMatch(misleading);
  await expect(page.locator('script, iframe, canvas, form, input, button, output, meter, progress, [role="status"], [role="slider"]')).toHaveCount(0);
  await expect(page.locator('.site-nav a')).toHaveCount(4);
}

test('approved story and truthful static boundaries', async ({ page }) => {
  await load(page);
  await story(page);
  expect(await page.locator('.site-nav a').evaluateAll(links => links.map(link => link.getAttribute('href'))))
    .toEqual(['/#work', '/#experience', '/cv/', '/#contact']);
  expect(await page.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))))
    .toEqual(['#main', '/', '/#work', '/#experience', '/cv/', '/#contact', 'mailto:don.le@donske.com.au', 'https://github.com/donske07', '/cv/']);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.donske.com.au/projects/recommender/');
  const html = await readFile('projects/recommender/index.html', 'utf8');
  expect(html).not.toMatch(/\[(?:M|H)\d{2}\]|\/Users\/|0\.82|<style|style=|\son\w+=/);
});

for (const width of [320, 375, 768, 1280]) {
  test(`reading order, native focus and axe at ${width}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await load(page);
    await story(page);
    const geometry = await fits(page);
    expect(geometry.main).toBe(width === 1280 ? 1120 : width - (width < 768 ? 40 : 80));
    await capture(page, `recommender-${width}`);
    if (width === 1280) await capture(page, 'recommender');
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.skip-link')).toBeFocused();
    await expect(page.locator('.skip-link')).toHaveCSS('outline-width', '3px');
    await capture(page, `focus-${width}`);
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    const link = page.locator('.site-nav a').first();
    await link.focus();
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.site-nav a').nth(1)).toBeFocused();
    await page.keyboard.press(`Shift+${tabKey(browserName)}`);
    await expect(link).toBeFocused();
    await link.evaluate(el => el.blur());
    await link.hover();
    await expect(link).toHaveCSS('text-decoration-thickness', '2px');
    await capture(page, `hover-${width}`);
    // WebKit's full-page capture can restore a different scroll position.
    await link.hover();
    await page.mouse.down();
    await expect(link).toHaveCSS('color', 'rgb(32, 38, 34)');
    await capture(page, `active-${width}`);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(() => globalThis.axe.run(document));
    await save(`axe-${width}`, axe);
    expect(axe.violations).toEqual([]);
    await save(`geometry-${width}`, geometry);
  });
}

test('no JavaScript at 320 retains story and native reading order', async ({ browser, browserName }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  try {
    const page = await context.newPage();
    await load(page);
    await story(page);
    await save('nojs', await fits(page));
    await capture(page, 'nojs-320');
    await page.keyboard.press(tabKey(browserName));
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.locator('style, link[rel="stylesheet"]').evaluateAll(nodes => nodes.forEach(node => node.remove()));
    await story(page);
    await capture(page, 'nojs-no-css-320');
  } finally {
    await context.close();
  }
});

test('long labels reflow and stale or misleading content is rejected', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await load(page);
  await page.locator('.text-flow li').first().evaluate(el => {
    el.textContent = `Rating history with a deliberately long label ${'W'.repeat(160)} <script>literal</script>`;
  });
  await save('long', await fits(page));
  await expect(page.locator('script')).toHaveCount(0);
  await capture(page, 'long-320');
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const longAxe = await page.evaluate(() => globalThis.axe.run(document));
  expect(longAxe.violations).toEqual([]);
  await save('axe-long', longAxe);
  await load(page);
  for (const injected of ['NDCG 0.82 achieved', 'Live demo', 'MMR-powered production recommendations']) {
    await page.locator('article p').last().evaluate((el, text) => { el.textContent = text; }, injected);
    expect(await page.locator('main').innerText()).toMatch(misleading);
  }
  await load(page);
  await story(page);
  await expect(page.locator('.text-flow li').first()).toHaveText(stages[0]);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const axe = await page.evaluate(() => globalThis.axe.run(document));
  expect(axe.violations).toEqual([]);
  await save('axe-reset', axe);
});
