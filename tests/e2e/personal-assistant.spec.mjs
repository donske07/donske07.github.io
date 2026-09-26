import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { load as parseHtml } from 'cheerio';

if (process.env.TASK8_CHROME === '1') test.use({ channel: 'chrome' });

const evidence = '.omo/evidence/recruiter-ai-portfolio';
const route = '/projects/personal-assistant/';
const stages = ['Request', 'Context selection', 'Budget admission', 'Model stream', 'Execution state'];
const mode = process.env.TASK8_SOURCE === '1' ? 'source' : 'production';
const tabKey = browserName => process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
const save = (name, data) => writeFile(`${evidence}/task-8-${mode}-${name}.json`, JSON.stringify(data, null, 2));
const capture = (page, name) => page.screenshot({ path: `${evidence}/task-8-${mode}-${name}.png`, fullPage: true });
test.beforeAll(async () => { await mkdir(evidence, { recursive: true }); });

async function fits(page) {
  const result = await page.evaluate(() => ({
    width: innerWidth, scroll: document.documentElement.scrollWidth,
    targets: [...document.querySelectorAll('a:not(.skip-link)')].map(link => {
      const box = link.getBoundingClientRect();
      return { label: link.textContent, width: box.width, height: box.height };
    }),
  }));
  expect(result.scroll).toBeLessThanOrEqual(result.width);
  for (const target of result.targets) {
    expect(target.width, target.label).toBeGreaterThanOrEqual(44);
    expect(target.height, target.label).toBeGreaterThanOrEqual(44);
  }
  return result;
}

async function load(page) {
  if (process.env.TASK8_SOURCE === '1') {
    const source = await readFile(`projects/personal-assistant/index.html`, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return '<!doctype html><html lang="en"><title>Absent route baseline</title><body><h1>Not found</h1></body></html>';
      throw error;
    });
    const css = await Promise.all(['tokens', 'site', 'print'].map(name => readFile(`assets/css/${name}.css`, 'utf8')));
    await page.setContent(source.replace(/<link[^>]+>/g, '').replace('</head>', `<style>${css.join('\n')}</style></head>`));
  } else {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
  }
}

test('readiness and complete conceptual story', async ({ page }) => {
  await load(page);
  await expect(page.getByText('This project is not production-ready.', { exact: true })).toBeVisible();
  await expect(page.locator('h1')).toHaveText('Personal AI assistant');
  await expect(page.locator('.status').first()).toHaveText('Local prototype · In development');
  for (const heading of ['Problem', 'Implemented approach', 'Architecture in words', 'Trade-offs', 'Limits and current status']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.locator('.text-flow li')).toHaveText(stages);
  await expect(page.getByText(/not a guarantee of exact internal call ordering/)).toBeVisible();
  await expect(page.locator('#trade-offs h3')).toHaveCount(2);
  await expect(page.locator('script, form, input, iframe, button')).toHaveCount(0);
  const content = await page.locator('body').innerText();
  expect(content).not.toMatch(/\/Users\/|\[A\d\d\]|api[_-]?key|production-ready assistant/i);
  expect(content.replace(/not production-ready/gi, '')).not.toMatch(/production-ready/i);
  await expect(page.getByText('Retrieval providers, tools and uploads are not enabled in the documented chat contract.', { exact: true })).toBeVisible();
  await expect(page.getByText(/their existence isn't a claim that they passed/)).toBeVisible();
});

for (const width of [320, 375, 768, 1280]) {
  test(`readable layout, keyboard and accessibility at ${width}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await load(page);
    const geometry = await fits(page);
    await capture(page, `layout-${width}`);
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.skip-link')).toBeFocused();
    await expect(page.locator('.skip-link')).toHaveCSS('outline-width', '3px');
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    const results = await new AxeBuilder({ page }).analyze();
    await save(`geometry-${width}`, { geometry, violations: results.violations, incomplete: results.incomplete.map(item => item.id) });
    expect(results.violations).toEqual([]);
  });
}

test('native navigation and no AI, model or analytics network calls', async ({ page, context, baseURL }) => {
  const requests = [];
  const sockets = [];
  context.on('request', request => requests.push({ url: request.url(), method: request.method(), type: request.resourceType() }));
  page.on('websocket', socket => sockets.push(socket.url()));
  await context.route('**/*', intercepted => {
    const url = new URL(intercepted.request().url());
    return url.origin === baseURL ? intercepted.continue() : intercepted.abort();
  });
  await load(page);
  const links = [['Don Le', '/'], ['Work', '/#work'], ['Experience', '/#experience'], ['Profile', '/cv/'], ['Contact', '/#contact']];
  for (const [name, href] of links) {
    const link = page.locator('header').getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', href);
    if (mode === 'production') {
      await link.click();
      await expect(page).toHaveURL(`${baseURL}${href}`);
      if (href.includes('#')) await expect(page.locator(href.slice(1))).toBeVisible();
      await page.goBack();
      await expect(page.locator('h1')).toHaveText('Personal AI assistant');
    }
  }
  await expect(page.locator('a[href="#"], a[href=""], a[href^="javascript:"]')).toHaveCount(0);
  await save('network', { mode, requests, sockets, navigationExecuted: mode === 'production' });
  expect(requests.filter(request => new URL(request.url).origin !== baseURL)).toEqual([]);
  expect(requests.filter(request => ['fetch', 'xhr', 'eventsource', 'script'].includes(request.type))).toEqual([]);
  expect(requests.every(request => request.method === 'GET')).toBe(true);
  expect(sockets).toEqual([]);
});

test('no JavaScript at 320px retains the entire story', async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 }, baseURL });
  try {
    const page = await context.newPage();
    await load(page);
    await expect(page.locator('.text-flow li')).toHaveText(stages);
    await expect(page.getByText('This project is not production-ready.', { exact: true })).toBeVisible();
    const content = await page.locator('main').innerText();
    const source = parseHtml(await readFile('projects/personal-assistant/index.html', 'utf8'));
    const normalize = text => text.replace(/\s+/g, ' ').trim();
    expect(normalize(content)).toBe(normalize(source('main').text()));
    await fits(page);
    await capture(page, 'nojs-320');
    await page.keyboard.press(tabKey(browserName));
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  } finally { await context.close(); }
});

test('untrusted text, stale state, interrupted styles and misleading claims', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await load(page);
  const original = await page.locator('main').innerText();
  await page.locator('h1').evaluate(element => { element.textContent = `${'Untrusted'.repeat(24)} <script>window.injected=true</script> Claim: production-ready`; });
  expect(await page.evaluate(() => globalThis.injected)).toBeUndefined();
  await expect(page.locator('script')).toHaveCount(0);
  await fits(page);
  await capture(page, 'untrusted');
  await load(page);
  expect(await page.locator('main').innerText()).toBe(original);
  const hasPositiveReadiness = text => /production-ready/i.test(text.replace(/not production-ready/gi, ''));
  expect(hasPositiveReadiness(original)).toBe(false);
  expect(hasPositiveReadiness(original.replace('This project is not production-ready.', 'This project is production-ready.'))).toBe(true);
  if (mode === 'production') {
    await context.route('**/assets/**', intercepted => intercepted.abort());
    await page.reload();
  } else {
    await page.locator('style, link[rel="stylesheet"]').evaluateAll(elements => elements.forEach(element => element.remove()));
  }
  expect(await page.locator('main').innerText()).toBe(original);
  await expect(page.locator('.text-flow li')).toHaveText(stages);
  await capture(page, 'interrupted-assets');
  await save('negative-probes', { literalTextDidNotExecute: true, freshLoadRestoredContent: true, interruptedStylesRetainedContent: true, positiveReadinessMutationRejected: true, mode });
});
