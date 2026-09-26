import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const fixtureMode = process.env.HOME_SOURCE_QA === '1';
const evidence = process.env.EVIDENCE_DIR || '.omo/evidence/recruiter-ai-portfolio';
const require = createRequire(import.meta.url);
const tabKey = browserName => process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
const titles = ['Local-first RAG for coding agents', 'Personal AI assistant', 'Two-stage recommendation engine'];
const routes = ['/projects/local-rag/', '/projects/personal-assistant/', '/projects/recommender/'];
const role = 'Staff Engineer / Tech Lead — Data Platform at mod.io';
const save = (name, data) => writeFile(`${evidence}/task-6-${name}.json`, JSON.stringify(data, null, 2));
const capture = (page, name) => page.screenshot({ path: `${evidence}/task-6-${name}.png`, fullPage: true });

async function load(page, noJS = false) {
  if (!fixtureMode) {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
  } else {
    const html = await readFile('index.html', 'utf8');
    const portrait = await readFile('covers/herophoto.png');
    const css = await Promise.all(['tokens', 'site', 'print'].map(name => readFile(`assets/css/${name}.css`, 'utf8')));
    let source = html.replace(/<link\b[^>]*>/g, '').replace('/covers/herophoto.png', `data:image/png;base64,${portrait.toString('base64')}`);
    if (noJS) source = source.replace('</head>', `<style>${css.join('\n')}</style></head>`);
    await page.setContent(source);
    if (!noJS) for (const content of css) await page.addStyleTag({ content });
  }
}

async function identity(page) {
  await expect(page.getByText('Staff Engineer · Data Platforms & Applied AI', { exact: true })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Don Le');
  await expect(page.locator('h1 + p')).toHaveText('Staff Engineer · Data Platforms & Applied AI');
  await expect(page.locator('.intro .current-role')).toHaveText(role);
  await expect(page.locator('#experience')).toContainText(role);
  await expect(page.locator('.project-list > li')).toHaveCount(3);
  await expect(page.locator('.project-list h3')).toHaveText(titles);
  await expect(page.locator('.project-list .status')).toHaveText(['Developer-tooling prototype', 'Local prototype · In development', 'ML prototype']);
  for (const [index, route] of routes.entries()) {
    await expect(page.getByRole('link', { name: `Read project ${titles[index]}`, exact: true })).toHaveAttribute('href', route);
  }
  await expect(page.getByText('Not production-ready; cloud deployment and live billing remain unverified.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Agent workforce tooling', exact: true })).toHaveCount(1);
  await supportingWork(page);
  await expect(page.locator('#experience a')).toHaveCount(0);
  await expect(page.locator('.site-nav a')).toHaveText(['Work', 'Experience', 'Profile', 'Contact']);
  await expect(page.locator('.site-nav a')).toHaveCount(4);
  const hrefs = await page.locator('.site-nav a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(hrefs).toEqual(['#work', '#experience', '/cv/', '#contact']);
  await expect(page.locator('a[href="mailto:don.le@donske.com.au"]')).toBeVisible();
  await expect(page.locator('a[href="https://github.com/donske07"]')).toBeVisible();
  await expect(page.locator('script, a[href="#"], a[href=""], [onclick]')).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toMatch(/freelance|blog|React\.js|GraphQL|Placeholder|\[(?:I|H)\d{2}\]/i);
  const image = page.getByAltText('Portrait of Don Le', { exact: true });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('width', '246');
  await expect(image).toHaveAttribute('height', '263');
  await expect.poll(() => image.evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([246, 263]);
  const box = await image.boundingBox();
  expect(box.height / box.width).toBeCloseTo(263 / 246, 2);
  expect(box.width).toBeLessThanOrEqual(246);
}

async function supportingWork(page) {
  const workforce = page.getByRole('heading', { name: 'Agent workforce tooling', exact: true });
  expect(await workforce.evaluate(element => element.closest('#experience'))).toBeNull();
  const supporting = page.locator('main > section#experience + section#supporting-work');
  await expect(supporting).toHaveCount(1);
  await expect(supporting).toHaveAttribute('aria-labelledby', 'supporting-title');
  await expect(supporting.locator('h2')).toHaveText('Supporting work');
  await expect(supporting.locator('h3')).toHaveText('Agent workforce tooling');
  await expect(supporting.locator('p')).toHaveText([
    'Agent tooling',
    'CLI and MCP tooling for managing specialist-agent definitions and dispatching work through an external agent runtime.',
    'The tooling manages definitions and dispatch; the external runtime carries out the agent work.',
  ]);
  await expect(supporting.locator('.status')).toHaveText('Agent tooling');
  await expect(supporting.locator('a, button')).toHaveCount(0);
  await expect(page.locator('#experience > *')).toHaveText([
    'Professional experience', role, 'Current focus: data platforms.',
  ]);
}

test('supporting workforce is separate from employer experience', async ({ page }) => {
  await load(page);
  await supportingWork(page);
});

async function fits(page) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    targets: [...document.querySelectorAll('a')].map(link => {
      const box = link.getBoundingClientRect();
      return { text: link.textContent.trim(), width: box.width, height: box.height };
    }),
  }));
  expect(result.width).toBeLessThanOrEqual(result.viewport);
  for (const target of result.targets) {
    expect(target.width, target.text).toBeGreaterThanOrEqual(44);
    expect(target.height, target.text).toBeGreaterThanOrEqual(44);
  }
  return result;
}

test('homepage identity and approved content', async ({ page }) => {
  await load(page);
  await identity(page);
});

for (const width of [320, 375, 768, 1280]) {
  test(`homepage layout and accessibility at ${width}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await load(page);
    await identity(page);
    const geometry = await fits(page);
    await capture(page, `home-${width}`);
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.skip-link')).toBeFocused();
    await expect(page.locator('.skip-link')).toHaveCSS('outline-width', '3px');
    await capture(page, `focus-${width}`);
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(() => globalThis.axe.run(document));
    await save(`axe-${width}`, axe);
    expect(axe.violations).toEqual([]);
    await save(`geometry-${width}`, geometry);
  });
}

test('native fragments and destination contract (route visits in production mode)', async ({ page }) => {
  await load(page);
  for (const id of ['work', 'experience', 'contact']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
    await page.locator(`.site-nav a[href="#${id}"]`).click();
    expect(new URL(page.url()).hash).toBe(`#${id}`);
  }
  if (!fixtureMode) {
    for (const [index, route] of routes.entries()) {
      await page.goto('/');
      await page.getByRole('link', { name: `Read project ${titles[index]}`, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.locator('h1')).toHaveText(titles[index]);
    }
    const response = await page.goto('/cv/');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Don Le');
  }
});

test('no JavaScript at 320 and 200% text retains every destination', async ({ browser, browserName, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  try {
    const page = await context.newPage();
    await load(page, true);
    await page.locator('html').evaluate(element => { element.style.fontSize = '200%'; });
    await identity(page);
    const measured = await fits(page);
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await capture(page, 'nojs-text-200');
    await save('nojs', { mode: fixtureMode ? 'source-setContent' : 'production-route', javaScriptEnabled: false, rootFont: await page.locator('html').evaluate(element => getComputedStyle(element).fontSize), ...measured });
  } finally { await context.close(); }
});

test('long literal title and contact text reflow without creating markup', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await load(page);
  await page.locator('.project-list h3').first().evaluate(element => { element.textContent = `Long project title with full natural wrapping. ${'W'.repeat(160)} <script>literal</script>`; });
  await page.locator('a[href^="mailto:"]').evaluate(element => { element.textContent = 'long-email-label'.repeat(20); });
  await expect(page.locator('script')).toHaveCount(0);
  const measured = await fits(page);
  await capture(page, 'long');
  await save('long', measured);
});
