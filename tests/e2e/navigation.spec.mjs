import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const routes = ['/', '/projects/agent-workforce/', '/projects/local-rag/', '/projects/personal-assistant/', '/projects/recommender/', '/cv/', '/404.html'];
const projects = [
  { title: 'Agent Workforce', heading: 'Agent Workforce', route: '/projects/agent-workforce/', profile: false },
  { title: 'Local-first RAG for coding agents', heading: 'Local-first RAG for coding agents', route: '/projects/local-rag/', profile: true },
  { title: 'Personal AI assistant', heading: 'Personal AI assistant', route: '/projects/personal-assistant/', profile: true },
  { title: 'Two-stage recommendation engine', heading: 'Two-stage recommender', route: '/projects/recommender/', profile: true },
];
const retired = JSON.parse(await readFile(new URL('../fixtures/legacy-routes.json', import.meta.url), 'utf8')).retired;

for (const route of routes) test(`every internal anchor reaches a real destination and fragment: ${route}`, async ({ page, context, baseURL }) => {
  const destination = await context.newPage();
  try {
    expect((await page.goto(route)).status()).toBe(200);
    const destinations = await page.locator('a').evaluateAll(links => [...new Map(links.map(link => [link.href, {
      href: link.href,
      download: link.hasAttribute('download'),
    }])).values()]);
    for (const { href, download } of destinations) {
      const url = new URL(href);
      if (url.origin !== new URL(baseURL).origin) continue;
      expect((await page.request.get(href, { maxRedirects: 0 })).status(), `${route} -> ${href}`).toBe(200);
      if (download) continue;
      await destination.goto(href);
      if (url.pathname !== '/404.html') await expect(destination.locator('h1')).not.toHaveText('Page unavailable');
      if (url.hash) await expect(destination.locator(`[id="${decodeURIComponent(url.hash.slice(1))}"]`)).toBeVisible();
    }
  } finally { await destination.close(); }
});

for (const javaScriptEnabled of [true, false]) {
  test(`recruiter and hiring manager walkthrough; JavaScript=${javaScriptEnabled}`, async ({ browser, baseURL }, info) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled, viewport: { width: 375, height: 900 } });
    try {
      const page = await context.newPage();
      const requests = [];
      page.on('request', request => requests.push({ url: request.url(), type: request.resourceType() }));
      await page.goto('/');
      await expect(page.locator('h1 + p')).toHaveText('Staff Engineer · Data Platforms & Applied AI');
      await expect(page.locator('.current-role')).toHaveText('Staff Engineer / Tech Lead — Data Platform at mod.io');
      await page.getByRole('link', { name: 'Selected projects', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/#work`);
      for (const { title, heading, route } of projects) {
        await page.getByRole('link', { name: `Read project ${title}`, exact: true }).click();
        await expect(page).toHaveURL(`${baseURL}${route}`);
        await expect(page).toHaveTitle(`${title} | Don Le`);
        await expect(page.locator('h1')).toHaveText(heading);
        await expect(page.locator('.status').first()).toBeVisible();
        await expect(page.getByRole('heading', { name: title === 'Two-stage recommendation engine' ? 'Quality depends on both stages' : 'Trade-offs', exact: true })).toBeVisible();
        await expect(page.locator('figure ol > li')).toHaveCount(5);
        await expect(page.getByRole('heading', { name: /Project scope|Training and evaluation design/ })).toBeVisible();
        if (title === 'Agent Workforce') {
          await expect(page.getByRole('link', { name: 'View Agent Workforce on GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/donske07/agent-workforce');
          await expect(page.locator('.project-media img')).toHaveCount(2);
          for (const index of [0, 1]) {
            await expect(page.locator('.project-media img').nth(index)).toHaveAttribute('loading', 'lazy');
            await expect(page.locator('.project-media img').nth(index)).toHaveAttribute('decoding', 'async');
          }
          await expect(page.getByAltText('Pixel Agent Office showing the coordinator and nine specialist agents at individual desks', { exact: true })).toBeVisible();
          await expect(page.getByAltText('Agent Workforce command-line help listing install, session, diagnostics, office and lifecycle commands', { exact: true })).toBeVisible();
        } else {
          await expect(page.getByRole('link', { name: /source|demo/i })).toHaveCount(0);
        }
        if (title === 'Personal AI assistant') {
          await expect(page.locator('.status')).toHaveText('Local prototype · In development');
          await expect(page.locator('[aria-labelledby="limits-title"]')).toContainText('not a deployed service');
        }
        await page.getByRole('navigation').getByRole('link', { name: 'Work', exact: true }).click();
        await expect(page).toHaveURL(`${baseURL}/#work`);
      }
      await page.getByRole('navigation').getByRole('link', { name: 'CV', exact: true }).click();
      await expect(page.getByText("Use your browser's Print command to save a copy.", { exact: true })).toBeVisible();
      for (const { title, heading, route } of projects.filter(project => project.profile)) {
        await page.getByRole('link', { name: title, exact: true }).click();
        await expect(page).toHaveURL(`${baseURL}${route}`);
        await expect(page).toHaveTitle(`${title} | Don Le`);
        await expect(page.locator('h1')).toHaveText(heading);
        await page.goBack();
        await expect(page).toHaveURL(`${baseURL}/cv/`);
      }
      await page.getByRole('navigation').getByRole('link', { name: 'Contact', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/#contact`);
      await expect(page.getByRole('link', { name: 'Email: don.le@donske.com.au', exact: true })).toHaveAttribute('href', 'mailto:don.le@donske.com.au');
      await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/donske07');
      expect(requests.filter(request => new URL(request.url).origin !== new URL(baseURL).origin)).toEqual([]);
      expect(requests.filter(request => ['script', 'fetch', 'xhr', 'eventsource', 'websocket'].includes(request.type))).toEqual([]);
      await info.attach('walkthrough-network', { body: JSON.stringify({ javaScriptEnabled, requests }), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}

test('all retired and unknown routes remain true 404 and recover natively', async ({ page, baseURL }) => {
  for (const route of [...retired, '/not-a-page/', '/missing/deep/path/']) {
    const response = await page.goto(route);
    expect(response.status(), route).toBe(404);
    expect(response.request().redirectedFrom(), route).toBeNull();
    await expect(page.locator('h1')).toHaveText('Page unavailable');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  }
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
  await page.goBack();
  await page.getByRole('link', { name: 'Selected work', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/#work`);
});
