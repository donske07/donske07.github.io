import { test, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const E = process.env.EVIDENCE_DIR || '.omo/evidence/recruiter-ai-portfolio';
const require = createRequire(import.meta.url);
const tabKey = browserName => process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
const role = 'Staff Engineer / Tech Lead — Data Platform at mod.io';
const titles = ['Local-first RAG for coding agents', 'Personal AI assistant', 'Two-stage recommendation engine'];
const routes = ['/projects/local-rag/', '/projects/personal-assistant/', '/projects/recommender/'];
const statuses = ['Developer-tooling prototype', 'Local prototype · In development', 'ML prototype'];
const capture = (page, name) => page.screenshot({ path: `${E}/task-10-${name}.png`, fullPage: true });

async function load(page, styled = true) {
  // Source-only composition gate; no claim about dist or peer-route availability.
  let html = await readFile('cv/index.html', 'utf8');
  html = html.replace(/<link\b[^>]*>/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  if (styled) {
    const css = await Promise.all(['tokens', 'site', 'print'].map(name => readFile(`assets/css/${name}.css`, 'utf8')));
    html = html.replace('</head>', `<style>${css.join('\n')}</style></head>`);
  }
  await page.setContent(html);
}

async function supported(page) {
  await expect(page.locator('h1')).toHaveText('Don Le');
  await expect(page.locator('.current-role')).toHaveText(role);
  await expect(page.getByText('Staff Engineer · Data Platforms & Applied AI', { exact: true })).toBeVisible();
  await expect(page.locator('.project-row')).toHaveCount(3);
  await expect(page.locator('.status')).toHaveText(statuses);
  await expect(page.getByText('Data platforms and applied-AI prototypes, with selected work covering retrieval, conversation execution and recommendation ranking.', { exact: true })).toBeVisible();
  const summaries = [
    'A local-first retrieval plugin for coding agents, using local embeddings and a vector index to search project files and documentation.',
    'A local assistant prototype exploring streamed model responses, bounded context, persistent execution state and cost controls.',
    'A two-stage recommendation prototype combining semantic candidate retrieval with learning-to-rank over MovieLens data.',
  ];
  for (const summary of summaries) await expect(page.getByText(summary, { exact: true })).toBeVisible();
  for (let i = 0; i < titles.length; i++) await expect(page.getByRole('link', { name: titles[i], exact: true })).toHaveAttribute('href', routes[i]);
  await expect(page.getByText('Not production-ready; cloud deployment and live billing remain unverified.', { exact: true })).toBeVisible();
  await expect(page.locator('a[href="mailto:don.le@donske.com.au"]')).toBeVisible();
  await expect(page.locator('a[href="https://github.com/donske07"]')).toBeVisible();
  await expect(page.getByText("Use your browser's Print command to save a copy.", { exact: true })).toBeVisible();
  await expect(page.locator('a[download], a[href$=".pdf"], button, script, time')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toMatch(/\b(?:19|20)\d{2}\b|education|university|years of|Agent workforce/i);
}

async function fits(page) {
  const result = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    clipped: [...document.querySelectorAll('main *, footer *')].filter(element => {
      const box = element.getBoundingClientRect();
      const overflow = element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1;
      return box.width && (box.left < 0 || box.right > innerWidth + 1 || overflow);
    }).map(element => element.tagName + ':' + element.textContent.slice(0, 60)),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width);
  expect(result.clipped).toEqual([]);
  return result;
}

test.beforeAll(async () => { await mkdir(E, { recursive: true }); });

test('supported profile is native HTML with approved content and no fabricated history', async ({ page }) => {
  await load(page, false);
  await supported(page);
  const source = await readFile('cv/index.html', 'utf8');
  expect(source).not.toMatch(/<script|\[(?:I|H|C)\d{2}\]|\/Users\//);
  await capture(page, 'unstyled');
});

for (const width of [320, 375, 768, 1280]) {
  test(`profile responsive and keyboard contacts at ${width}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await load(page);
    await supported(page);
    const geometry = await fits(page);
    await capture(page, `profile-${width}`);
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    for (const link of await page.locator('a:not(.skip-link)').all()) {
      await link.focus();
      await expect(link).toHaveCSS('outline-width', '3px');
      const box = await link.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await capture(page, `contact-focus-${width}`);
    const contact = page.locator('a[href="https://github.com/donske07"]');
    await contact.evaluate(link => link.blur());
    await contact.hover();
    await expect(contact).toHaveCSS('text-decoration-thickness', '2px');
    await capture(page, `contact-hover-${width}`);
    await page.mouse.down();
    await expect(contact).toHaveCSS('color', 'rgb(32, 38, 34)');
    await capture(page, `contact-active-${width}`);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(() => globalThis.axe.run(document));
    expect(axe.violations).toEqual([]);
    await writeFile(`${E}/task-10-geometry-${width}.json`, JSON.stringify({ geometry, violations: axe.violations, incomplete: axe.incomplete.map(item => item.id) }, null, 2));
  });
}

test('noJS and interrupted assets retain content, contacts and native skip', async ({ browser, browserName }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  try {
    const page = await context.newPage();
    await page.route('**/*', route => route.abort());
    await load(page);
    await supported(page);
    await fits(page);
    await page.keyboard.press(tabKey(browserName));
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await capture(page, 'nojs');
    await load(page, false);
    await supported(page);
    await capture(page, 'assets-interrupted');
  } finally { await context.close(); }
});

test('200 percent text and long URL reflow', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await load(page);
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await supported(page);
  await fits(page);
  await capture(page, 'text-200');
  await load(page);
  await page.locator('a[href^="https://github"]').evaluate(link => {
    link.href = `https://example.invalid/${'a'.repeat(160)}`;
    link.textContent = link.href;
  });
  await fits(page);
  await capture(page, 'long-url');
  await page.emulateMedia({ media: 'print' });
  await fits(page);
  if (browserName === 'chromium') await page.pdf({ path: `${E}/task-10-long-url.pdf`, format: 'A4', tagged: true });
});

test('print media retains substantive content and URLs; Chromium exports A4 and Letter PDFs', async ({ page, browserName }, info) => {
  await load(page);
  await supported(page);
  const before = await page.locator('main').innerText();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-nav')).toBeHidden();
  expect(await page.locator('main').innerText()).toBe(before);
  for (const href of ['mailto:don.le@donske.com.au', 'https://github.com/donske07', ...routes]) {
    expect(await page.locator(`a[href="${href}"]`).evaluate(link => getComputedStyle(link, '::after').content)).toContain(href);
  }
  info.annotations.push({ type: 'print-coverage', description: 'All engines validate print media/content/URLs; Playwright PDF serialization supports Chromium only.' });
  await page.screenshot({ path: info.outputPath('print-media.png'), fullPage: true });
  for (const [format, name] of browserName === 'chromium' ? [['A4', 'a4'], ['Letter', 'letter']] : []) {
    const pdf = await page.pdf({ path: `${E}/task-10-profile-${name}.pdf`, format, tagged: true, printBackground: true });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(10000);
  }
  // PDF existence is not clipping approval: task-10-print-review records rendered-page inspection.
});
