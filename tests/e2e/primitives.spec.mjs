import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const evidence = process.env.EVIDENCE_DIR || '.omo/evidence/recruiter-ai-portfolio';
const require = createRequire(import.meta.url);
const tabKey = browserName => process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
const fixture = await readFile('tests/fixtures/primitives.html', 'utf8');
const portrait = await readFile('covers/herophoto.png');
const source = fixture.replace('/covers/herophoto.png', `data:image/png;base64,${portrait.toString('base64')}`);
const styles = ['tokens', 'site', 'print'];
const save = async (name, data) => writeFile(`${evidence}/task-5-${name}.json`, JSON.stringify(data, null, 2));
const capture = (page, name) => page.screenshot({ path: `${evidence}/task-5-${name}.png`, fullPage: true });

async function load(page, styled = true) {
  await page.setContent(source);
  if (styled) for (const name of styles) await page.addStyleTag({ path: `assets/css/${name}.css` });
  await page.locator('.portrait').evaluate(image => image.decode());
}

async function geometry(page) {
  return page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    content: document.querySelector('main').getBoundingClientRect().width,
    links: [...document.querySelectorAll('a')].map(link => {
      const box = link.getBoundingClientRect();
      return { text: link.textContent.trim(), x: box.x, y: box.y, width: box.width, height: box.height };
    }),
  }));
}

async function fits(page) {
  const measured = await geometry(page);
  expect(measured.width).toBeLessThanOrEqual(measured.viewport);
  for (const link of measured.links) {
    expect(link.width, link.text).toBeGreaterThanOrEqual(44);
    expect(link.height, link.text).toBeGreaterThanOrEqual(44);
  }
  return measured;
}

async function axe(page, name) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const result = await page.evaluate(() => globalThis.axe.run(document));
  await save(`axe-${name}`, result);
  expect(result.violations).toEqual([]);
  return { violations: result.violations.length, incomplete: result.incomplete.map(item => item.id) };
}

test.beforeAll(async () => { await mkdir(evidence, { recursive: true }); });

test('native fixture and preservation baseline', async ({ page, browserName }) => {
  await load(page, false);
  expect(createHash('sha256').update(portrait).digest('hex')).toBe('5f476b810f513cd73089ee7aaf5439791de1b0ca918ee2b591ad8e82804cf8b7');
  expect(portrait.readUInt32BE(16)).toBe(246);
  expect(portrait.readUInt32BE(20)).toBe(263);
  await expect(page.locator('h1')).toHaveText('Don Le');
  await expect(page.locator('.project-row')).toHaveCount(3);
  await expect(page.locator('.text-flow li')).toHaveCount(5);
  await page.keyboard.press(tabKey(browserName));
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(fixture).not.toMatch(/<script|\[(?:I|H|R|A|M|C)\d{2}\]|\/Users\//);
  const manifest = JSON.parse(await readFile('scripts/publish-files.json', 'utf8'));
  expect(manifest.some(file => file.startsWith('tests/') || file.startsWith('.omo/'))).toBe(false);
  await capture(page, 'css-unavailable');
});

for (const width of [375, 768, 1280]) {
  test(`shared primitives, keyboard, pointer and axe at ${width}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await load(page);
    const measured = await fits(page);
    expect(measured.content).toBe(width === 1280 ? 1120 : width - (width < 768 ? 40 : 80));
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 246, 243)');
    const image = await page.locator('.portrait').boundingBox();
    expect(image.width).toBe(width < 768 ? 112 : 160);
    expect(image.height / image.width).toBeCloseTo(263 / 246, 2);
    await capture(page, `primitives-${width}`);
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.skip-link')).toBeFocused();
    await expect(page.locator('.skip-link')).toHaveCSS('outline-width', '3px');
    await expect(page.locator('.skip-link')).toHaveCSS('outline-offset', '4px');
    await capture(page, `focus-${width}`);
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    const link = page.locator('.site-nav a').first();
    await link.focus();
    await capture(page, `nav-focus-${width}`);
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('.site-nav a').nth(1)).toBeFocused();
    await page.keyboard.press(`Shift+${tabKey(browserName)}`);
    await expect(link).toBeFocused();
    await link.evaluate(element => element.blur());
    await link.hover();
    await expect(link).toHaveCSS('text-decoration-thickness', '2px');
    await capture(page, `hover-${width}`);
    await page.mouse.down();
    await expect(link).toHaveCSS('color', 'rgb(32, 38, 34)');
    await capture(page, `active-${width}`);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await save(`geometry-${width}`, { ...measured, axe: await axe(page, String(width)) });
  });
}

test('stress: 320, long literal content, optional absence, text enlargement and spacing', async ({ page }) => {
  const results = [];
  for (const mode of ['320', 'long', 'no-optional', 'text-200', 'zoom-equivalent', 'text-spacing', 'reduced-motion']) {
    await page.setViewportSize({ width: mode === 'text-200' ? 768 : 320, height: 900 });
    await load(page);
    if (mode === 'long') await page.evaluate(() => {
      document.querySelector('h3').textContent = `A deliberately long project title. All of this text must remain readable, with a natural row height. ${'W'.repeat(160)} <script>alert('literal')</script>`;
      const link = document.querySelector('.prose a');
      link.textContent = `https://example.invalid/${'a'.repeat(160)}`;
      link.href = 'https://example.invalid/';
      document.querySelector('.text-flow li').textContent = 'Stage'.repeat(40);
      document.querySelector('.site-nav a').textContent = 'LongNavigationLabel'.repeat(10);
    });
    if (mode === 'no-optional') {
      await page.evaluate(() => {
        const optional = document.createElement('div');
        optional.dataset.optional = '';
        optional.innerHTML = '<a href="https://example.invalid/">Source</a>';
        document.querySelector('.project-content').append(optional);
        optional.remove();
      });
      await expect(page.locator('[data-optional], a[href="#"], a[href=""]')).toHaveCount(0);
      await page.locator('.portrait').evaluate(element => element.remove());
    }
    if (mode === 'text-200') await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    if (mode === 'text-spacing') await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
    if (mode === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    const measured = await fits(page);
    if (mode === '320') expect(measured.content).toBe(280);
    await expect(page.locator('script')).toHaveCount(0);
    await page.locator('.prose a').focus();
    await expect(page.locator('.prose a')).toHaveCSS('outline-width', '3px');
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
    await expect(page.locator('.project-row').first()).toHaveCSS('animation-duration', '0s');
    await capture(page, `stress-${mode}`);
    results.push({ mode, ...measured, axe: await axe(page, mode) });
  }
  await save('stress', results);
});

test('no JavaScript and interrupted portrait preserve native content', async ({ browser, browserName }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  try {
    const page = await context.newPage();
    const css = await Promise.all(styles.map(name => readFile(`assets/css/${name}.css`, 'utf8')));
    await page.setContent(source.replace('</head>', `<style>${css.join('\n')}</style></head>`));
    await fits(page);
    await page.keyboard.press(tabKey(browserName));
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.locator('.portrait').evaluate(image => { image.src = 'data:image/png;base64,broken'; });
    await expect(page.locator('.portrait')).toHaveAttribute('alt', 'Portrait of Don Le');
    await expect.poll(() => page.locator('.portrait').evaluate(image => image.naturalWidth)).toBe(0);
    const box = await page.locator('.portrait').boundingBox();
    expect(box.height / box.width).toBeCloseTo(263 / 246, 2);
    await expect(page.locator('.status')).toHaveCount(4);
    await capture(page, 'nojs-image-fallback');
  } finally { await context.close(); }
});

test('print media preserves content and destinations; Chromium exports A4 and Letter', async ({ page, browserName }, info) => {
  await load(page);
  const before = await page.locator('main').innerText();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-nav')).toBeHidden();
  await expect(page.locator('.skip-link')).toBeHidden();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  expect(normalize(await page.locator('main').innerText())).toBe(normalize(before));
  expect(await page.locator('a[href="https://github.com/donske07"]').evaluate(element => getComputedStyle(element, '::after').content)).toContain('https://github.com/donske07');
  info.annotations.push({ type: 'print-coverage', description: 'All engines validate print media/content/URLs; Playwright PDF serialization supports Chromium only.' });
  for (const format of browserName === 'chromium' ? ['A4', 'Letter'] : []) {
    await page.pdf({ path: `${evidence}/task-5-print-${format}.pdf`, format, printBackground: true, tagged: true });
  }
  await capture(page, 'print');
});

test('all link focus boxes clear neighboring targets and forced colors retain outlines', async ({ page }) => {
  const checks = [];
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await load(page);
    for (const link of await page.locator('a').all()) {
      await link.focus();
      const result = await link.evaluate(element => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const extent = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
        const overlaps = [...document.querySelectorAll('a')].filter(other => {
          if (other === element) return false;
          const target = other.getBoundingClientRect();
          return box.left - extent < target.right && box.right + extent > target.left && box.top - extent < target.bottom && box.bottom + extent > target.top;
        }).map(other => other.textContent.trim());
        return { text: element.textContent.trim(), left: box.left - extent, right: box.right + extent, viewport: innerWidth, overlaps };
      });
      expect(result.left).toBeGreaterThanOrEqual(0);
      expect(result.right).toBeLessThanOrEqual(width);
      expect(result.overlaps).toEqual([]);
      checks.push({ width, ...result });
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('.site-nav a').first().focus();
  await expect(page.locator('.site-nav a').first()).toHaveCSS('outline-style', 'solid');
  await expect(page.locator('.site-nav a').first()).toHaveCSS('outline-width', '3px');
  await capture(page, 'forced-colors');
  await save('focus-clearance', checks);
});

test('SVG assets parse, render and contain only approved vector treatment', async ({ page }) => {
  for (const name of ['favicon', 'social-card']) {
    const svg = await readFile(`assets/${name}.svg`, 'utf8');
    expect(svg).not.toMatch(/<script|<image|<foreignObject|https?:\/\/(?!www\.w3\.org)/);
    const parsed = await page.evaluate(text => new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror')?.textContent, svg);
    expect(parsed).toBeUndefined();
    await page.setViewportSize({ width: name === 'favicon' ? 64 : 1200, height: name === 'favicon' ? 64 : 630 });
    await page.setContent(`<html><body style="margin:0"><img alt="Don Le" src="data:image/svg+xml,${encodeURIComponent(svg)}"></body></html>`);
    await page.locator('img').evaluate(image => image.decode());
    await capture(page, name);
  }
});
