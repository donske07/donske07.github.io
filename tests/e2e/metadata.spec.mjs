import { test, expect } from '@playwright/test';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const origin = 'https://www.donske.com.au';
const routes = ['/', '/projects/agent-workforce/', '/projects/local-rag/', '/projects/personal-assistant/', '/projects/recommender/', '/cv/'];
const evidence = process.env.EVIDENCE_DIR ?? '.omo/evidence/recruiter-ai-portfolio';

async function enumerate(dir, prefix = '') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await enumerate(path.join(dir, entry.name), `${name}/`));
    else files.push(name);
  }
  return files.sort();
}

test('actual artifact metadata DOM, sitemap, public files and HTTP statuses', async ({ page, request }) => {
  const results = [];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response.status(), route).toBe(200);
    const meta = await page.evaluate(() => {
      const value = selector => [...document.querySelectorAll(selector)].map(node => node.content ?? node.href);
      return {
        lang: document.documentElement.lang,
        title: document.title,
        description: value('meta[name="description"]'),
        viewport: value('meta[name="viewport"]'),
        canonical: value('link[rel="canonical"]'),
        ogTitle: value('meta[property="og:title"]'),
        ogDescription: value('meta[property="og:description"]'),
        ogUrl: value('meta[property="og:url"]'),
        ogImage: value('meta[property="og:image"]'),
      };
    });
    expect(meta.lang).toBe('en');
    expect(meta.title.length).toBeGreaterThan(8);
    expect(meta.description).toHaveLength(1);
    expect(meta.viewport).toEqual(['width=device-width, initial-scale=1']);
    expect(meta.canonical).toEqual([`${origin}${route}`]);
    expect(meta.ogTitle).toEqual([meta.title]);
    expect(meta.ogDescription).toEqual(meta.description);
    expect(meta.ogUrl).toEqual([`${origin}${route}`]);
    expect(meta.ogImage).toEqual([]);
    results.push({ route, status: response.status(), ...meta });
  }
  expect(new Set(results.map(row => row.title)).size).toBe(6);
  expect(new Set(results.map(row => row.description[0])).size).toBe(6);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const $ = load(await sitemap.text(), { xmlMode: true });
  expect($('urlset > url > loc').toArray().map(node => $(node).text())).toEqual(routes.map(route => `${origin}${route}`));
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
  const missing = await page.goto('/definitely-not-a-page/');
  expect(missing.status()).toBe(404);
  const errorMeta = await page.evaluate(() => ({
    noindex: [...document.querySelectorAll('meta[name="robots"]')].map(node => node.content),
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
  }));
  expect(errorMeta).toEqual({ noindex: ['noindex'], canonical: 0 });
  const manifest = JSON.parse(await readFile('scripts/publish-files.json', 'utf8'));
  const files = await enumerate('dist');
  expect(files).toEqual([...manifest].sort());
  expect(files).toHaveLength(19);
  await writeFile(`${evidence}/task-12-metadata.json`, JSON.stringify({ routes: results, sitemap: routes.map(route => `${origin}${route}`), robotsStatus: robots.status(), missingStatus: missing.status(), errorMeta }, null, 2));
  await writeFile(`${evidence}/task-12-public-files.json`, JSON.stringify({ files, count: files.length }, null, 2));
});
