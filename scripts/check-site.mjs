import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = path.resolve(process.env.SITE_ROOT ?? fileURLToPath(new URL('..', import.meta.url)));
const dist = path.resolve(process.env.DIST_DIR ?? path.join(root, 'dist'));
const manifest = path.resolve(process.env.MANIFEST_FILE ?? path.join(root, 'scripts/publish-files.json'));
const origin = 'https://www.donske.com.au';
const routes = new Map([
  ['index.html', ['/', 'Don Le | Staff Engineer · Data Platforms & Applied AI', 'Don Le, Staff Engineer at mod.io, showcasing open-source agent tooling and independent work in local retrieval, assistant execution and recommendation ranking.']],
  ['projects/local-rag/index.html', ['/projects/local-rag/', 'Local-first RAG for coding agents | Don Le', 'A developer-tooling prototype using local embeddings, chunked sources and a vector index to retrieve project context for coding agents.']],
  ['projects/personal-assistant/index.html', ['/projects/personal-assistant/', 'Personal AI assistant | Don Le', 'An in-development assistant exploring reliable conversation execution through idempotent replay, persistent state, bounded context, stream validation and budget controls.']],
  ['projects/recommender/index.html', ['/projects/recommender/', 'Two-stage recommendation engine | Don Le', 'A two-stage MovieLens recommendation prototype: semantic candidate retrieval, feature-based reranking, score fusion, unknown-user fallback and evaluation design.']],
  ['cv/index.html', ['/cv/', 'Profile | Don Le', "Don Le's professional profile: data-platform engineering and independent applied-AI work in retrieval, conversation execution and recommendation ranking."]],
]);
// Independent of the editable manifest: expanding it must not authorize publication.
const publicFiles = [...routes.keys(), '404.html', 'assets/css/tokens.css', 'assets/css/site.css',
  'assets/css/print.css', 'assets/favicon.svg', 'assets/social-card.svg', 'covers/herophoto.png',
  'CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml'].sort();

function same(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function list(dir, prefix = '') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink in artifact: ${name}`);
    if (entry.isDirectory()) files.push(...await list(path.join(dir, entry.name), `${name}/`));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Non-file artifact entry: ${name}`);
  }
  return files;
}

function one($, selector, expected, label) {
  const matches = $(selector);
  if (matches.length !== 1 || matches.first().attr('content') !== expected) {
    throw new Error(`${label}: expected exactly one ${selector} with ${JSON.stringify(expected)}`);
  }
}

function localTarget(reference, page) {
  if (/^(mailto:|tel:)/i.test(reference)) return null;
  const url = new URL(reference, `${origin}/${page}`);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`${page}: unsafe linked URL ${reference}`);
  if (url.origin !== origin) return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { throw new Error(`${page}: invalid linked URL ${reference}`); }
  const file = pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
  return { file, fragment: url.hash ? decodeURIComponent(url.hash.slice(1)) : '' };
}

async function main() {
  if (!(await lstat(dist)).isDirectory()) throw new Error('Build artifact is not a directory');
  const allowed = JSON.parse(await readFile(manifest, 'utf8'));
  same([...allowed].sort(), publicFiles, 'Unsafe public manifest');
  const files = (await list(dist)).sort();
  same(files, publicFiles, 'Artifact files differ from manifest');
  const present = new Set(files);
  const pages = new Map();
  for (const name of files.filter(file => file.endsWith('.html'))) {
    const text = await readFile(path.join(dist, name), 'utf8');
    if (/https?:\/\/(?:lorisleiva\.com|(?:www\.)?donske\.com\.au)/i.test(text.replaceAll(origin, ''))) {
      throw new Error(`${name}: retired public domain`);
    }
    pages.set(name, load(text));
  }
  const titles = new Set();
  const descriptions = new Set();
  for (const [name, $] of pages) {
    if (routes.has(name)) {
      const [route, title, description] = routes.get(name);
      if ($('html').attr('lang') !== 'en') throw new Error(`${name}: lang must be en`);
      same($('head title').length, 1, `${name}: title count`);
      same($('head title').text(), title, `${name}: title`);
      one($, 'head meta[name="viewport"]', 'width=device-width, initial-scale=1', name);
      one($, 'head meta[name="description"]', description, name);
      one($, 'head meta[property="og:title"]', title, name);
      one($, 'head meta[property="og:description"]', description, name);
      one($, 'head meta[property="og:url"]', `${origin}${route}`, name);
      if ($('head meta[property="og:image"]').length) throw new Error(`${name}: unsupported SVG og:image`);
      const canonical = $('head link[rel="canonical"]');
      if (canonical.length !== 1 || canonical.attr('href') !== `${origin}${route}`) throw new Error(`${name}: wrong canonical host or route`);
      if (titles.has(title) || descriptions.has(description)) throw new Error(`${name}: duplicate metadata`);
      titles.add(title);
      descriptions.add(description);
    } else {
      one($, 'head meta[name="robots"]', 'noindex', name);
      if ($('head link[rel="canonical"]').length) throw new Error('404.html: error page cannot have a canonical');
    }
    for (const element of $('a[href], link[href], img[src], script[src]')) {
      const reference = $(element).attr('href') ?? $(element).attr('src');
      const target = localTarget(reference, name);
      if (!target) continue;
      if (!present.has(target.file)) throw new Error(`${name}: missing linked artifact ${target.file}`);
      if (target.fragment) {
        const destination = pages.get(target.file) ?? load(await readFile(path.join(dist, target.file), 'utf8'));
        if (!destination('[id]').toArray().some(node => destination(node).attr('id') === target.fragment)) {
          throw new Error(`${name}: missing fragment #${target.fragment} in ${target.file}`);
        }
      }
    }
  }
  const xml = load(await readFile(path.join(dist, 'sitemap.xml'), 'utf8'), { xmlMode: true });
  if (xml('urlset').length !== 1 || xml('urlset').attr('xmlns') !== 'http://www.sitemaps.org/schemas/sitemap/0.9' ||
      xml('urlset > url').length !== routes.size || xml('urlset > url > loc').length !== routes.size || xml('lastmod').length) {
    throw new Error('Invalid sitemap structure');
  }
  same(xml('urlset > url > loc').toArray().map(node => xml(node).text()).sort(),
    [...routes.values()].map(([route]) => `${origin}${route}`).sort(), 'Invalid sitemap URLs');
  same((await readFile(path.join(dist, 'robots.txt'), 'utf8')).trim(),
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`, 'Invalid robots sitemap pointer');
  same(await readFile(path.join(dist, 'CNAME'), 'utf8'), 'www.donske.com.au\n', 'CNAME bytes');
  same((await readFile(path.join(dist, '.nojekyll'))).length, 0, '.nojekyll');
  console.log(`Checked ${files.length} artifact files, five metadata routes, sitemap and local HTML references`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
