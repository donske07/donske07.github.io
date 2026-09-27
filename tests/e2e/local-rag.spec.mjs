import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sourceOnly = process.env.RAG_SOURCE_ONLY === '1';
const route = '/projects/local-rag/';
const stages = ['Sources', 'Chunks', 'Embeddings', 'Vector index', 'Retrieved context'];

async function openStory(page) {
  if (sourceOnly) {
    const html = await readFile('projects/local-rag/index.html', 'utf8');
    const css = await Promise.all(['tokens', 'site', 'print'].map(name => readFile(`assets/css/${name}.css`, 'utf8')));
    await page.setContent(html.replace('</head>', `<style>${css.join('\n')}</style></head>`));
  } else {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Implementation overview');
  }
}

test('RAG story has server text, qualified claims and native destinations', async ({ page, browserName }) => {
  await openStory(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Local-first RAG for coding agents');
  await expect(page.locator('.status')).toHaveText('Developer-tooling prototype');
  for (const heading of ['Search project context, not every document', 'Source indexing and traceable retrieval', 'Trade-offs', 'Project scope and source judgment']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('figure', { name: 'Implementation overview' }).locator('ol > li')).toHaveText(stages);
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const [name, href] of [['Work', '/#work'], ['Experience', '/#experience'], ['Profile', '/cv/'], ['Contact', '/#contact']]) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    if (!sourceOnly) {
      const destination = await page.request.get(href);
      expect(destination.status()).toBe(200);
      const fragment = href.split('#')[1];
      if (fragment) expect(await destination.text()).toContain(`id="${fragment}"`);
    }
  }
  await expect(page.getByRole('link', { name: 'Don Le', exact: true })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/donske07');
  await expect(page.getByRole('link', { name: 'Email: don.le@donske.com.au' })).toHaveAttribute('href', 'mailto:don.le@donske.com.au');
  const text = await page.locator('main').innerText();
  for (const phrase of ['explicit confirmation argument', 'selected independently', 'Chunk size and overlap',
    'tokens and document structure', 'A local model embeds', 'Postgres vector index', 'cosine distance',
    'source-type filters', 'source references', 'source changes need reindexing', 'separate data-handling boundaries',
    'traceable, not authoritative', 'untrusted source content, not instructions', "doesn't decide whether the content is safe to follow"]) {
    expect(text).toContain(phrase);
  }
  const html = await page.content();
  expect(html).not.toMatch(/\/Users\/|\.omo\/|localhost|api[_-]?key|fetch\(|XMLHttpRequest|production-ready|coming soon/i);
  expect(text).not.toMatch(/\d+%/);
  expect(await page.locator('script, iframe, form, a[href="#"], a[href=""]').count()).toBe(0);
  await expect(page.getByRole('link', { name: /source|demo/i })).toHaveCount(0);
  await page.keyboard.press(process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('RAG story is accessible and wraps at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openStory(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator('h1').evaluate(node => { node.textContent = 'Long title '.repeat(12) + 'x'.repeat(160); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('RAG story and schematic survive JavaScript and CSS unavailability', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  try {
    const page = await context.newPage();
    await openStory(page);
    await expect(page.locator('figure ol > li')).toHaveText(stages);
    await expect(page.locator('.status')).toBeVisible();
    await page.locator('style, link[rel="stylesheet"]').evaluateAll(nodes => nodes.forEach(node => node.remove()));
    await expect(page.locator('figure ol > li')).toHaveText(stages);
    await expect(page.getByRole('heading', { name: 'Project scope and source judgment' })).toBeVisible();
  } finally {
    await context.close();
  }
});
