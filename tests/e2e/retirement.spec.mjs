import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';

const fixture = JSON.parse(await readFile(new URL('../fixtures/legacy-routes.json', import.meta.url), 'utf8'));
const evidence = process.env.EVIDENCE_DIR;

test('retired routes return the recovery document, never misleading success', async ({ request }) => {
  expect(fixture.retired).toHaveLength(36);
  const rows = [];
  for (const route of [...fixture.retired, '/definitely-not-a-page/', '/missing/deep/path/']) {
    const response = await request.get(route, { maxRedirects: 0 });
    const html = await response.text();
    const $ = load(html);
    rows.push({ route, status: response.status(), location: response.headers().location ?? null });
    expect.soft(response.status(), route).toBe(404);
    expect.soft(response.headers().location, route).toBeUndefined();
    expect.soft($('h1').text(), route).toBe('Page unavailable');
    expect.soft($('meta[name="robots"]').attr('content'), route).toBe('noindex');
    expect.soft($('link[rel="canonical"]').length, route).toBe(0);
    expect.soft($('main a').map((_, link) => $(link).attr('href')).get(), route).toEqual(['/', '/#work']);
    expect.soft($('script').length, route).toBe(0);
  }
  if (evidence) await writeFile(`${evidence}/task-11-retired-routes.json`, JSON.stringify(rows, null, 2));
});

test('direct error document and preserved routes distinguish success from missing resources', async ({ request }) => {
  for (const route of ['/404.html', ...fixture.preserve]) {
    expect((await request.get(route, { maxRedirects: 0 })).status(), route).toBe(200);
  }
});

test('nested recovery works without JavaScript and loads root-relative styles', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const styles = [];
    page.on('response', response => {
      if (response.url().endsWith('.css')) styles.push({ url: response.url(), status: response.status() });
    });
    const base = test.info().project.use.baseURL;
    expect((await page.goto(`${base}/missing/deep/path/`)).status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page unavailable');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 246, 243)');
    expect(styles).toHaveLength(3);
    expect(styles.every(style => style.status === 200)).toBe(true);
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('Don Le');
    await page.goBack();
    await page.getByRole('link', { name: 'Selected work', exact: true }).click();
    await expect(page).toHaveURL(`${base}/#work`);
    await expect(page.locator('#work')).toBeVisible();
  } finally { await context.close(); }
});

test('interrupted styles leave native recovery usable', async ({ page }) => {
  await page.route('**/*.css', route => route.abort());
  expect((await page.goto('/missing/deep/path/')).status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page unavailable' })).toBeVisible();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Don Le');
});
