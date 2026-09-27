import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const checker = path.join(repo, 'scripts/check-site.mjs');
const files = JSON.parse(await readFile(path.join(repo, 'scripts/publish-files.json'), 'utf8'));
function rejects(run, pattern) {
  const result = run();
  assert.notEqual(result.status, 0, `misleading success: ${result.stdout}`);
  assert.match(result.stderr, pattern);
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-artifact-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dist = path.join(root, 'dist');
  for (const name of files) {
    await mkdir(path.dirname(path.join(dist, name)), { recursive: true });
    await copyFile(path.join(repo, name), path.join(dist, name));
  }
  // Task 11 owns the source 404; isolate the metadata contract from its parallel edit.
  await writeFile(path.join(dist, '404.html'), '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"></head><body><a href="/">Home</a></body></html>');
  const manifest = path.join(root, 'publish.json');
  await writeFile(manifest, JSON.stringify(files));
  const run = () => spawnSync(process.execPath, [checker], {
    env: { ...process.env, SITE_ROOT: root, DIST_DIR: dist, MANIFEST_FILE: manifest },
    encoding: 'utf8', timeout: 10000,
  });
  return { dist, manifest, run };
}

test('exact public artifact and six metadata routes pass', async t => {
  const { run } = await fixture(t);
  assert.equal(run().status, 0, run().stderr);
});

test('reject stale matching descriptions and mismatched OG descriptions on every route', async t => {
  const { dist, run } = await fixture(t);
  for (const name of files.filter(name => name.endsWith('index.html'))) {
    const file = path.join(dist, name);
    const original = await readFile(file, 'utf8');
    for (const pattern of [
      /(<meta (?:name="description"|property="og:description") content=")[^"]+/g,
      /(<meta property="og:description" content=")[^"]+/,
    ]) {
      const mutated = original.replace(pattern, '$1Obsolete project description.');
      assert.notEqual(mutated, original, `${name}: mutation must change metadata`);
      await writeFile(file, mutated);
      rejects(run, /description/);
      await writeFile(file, original);
    }
  }
  assert.equal(run().status, 0);
});

test('reject wrong canonical host and a retired sitemap URL', async t => {
  const { dist, run } = await fixture(t);
  const home = path.join(dist, 'index.html');
  const original = await readFile(home, 'utf8');
  await writeFile(home, original.replace('rel="canonical" href="https://www.donske.com.au/"', 'rel="canonical" href="https://donske.com.au/"'));
  rejects(run, /canonical|host|retired public domain/i);
  await writeFile(home, original);
  const sitemap = path.join(dist, 'sitemap.xml');
  await writeFile(sitemap, (await readFile(sitemap, 'utf8')).replace('</urlset>', '<url><loc>https://www.donske.com.au/tag/</loc></url></urlset>'));
  rejects(run, /sitemap|URL/i);
});

test('reject extra private artifact and malicious expanded manifest', async t => {
  const { dist, manifest, run } = await fixture(t);
  await writeFile(path.join(dist, '.env'), 'SECRET=private');
  rejects(run, /Artifact files differ|private|manifest/i);
  await rm(path.join(dist, '.env'));
  await writeFile(manifest, JSON.stringify([...files, '.env']));
  rejects(run, /manifest|public/i);
});

test('reject missing fragments and root-relative asset targets', async t => {
  const { dist, run } = await fixture(t);
  const home = path.join(dist, 'index.html');
  const original = await readFile(home, 'utf8');
  await writeFile(home, original.replace('href="#work"', 'href="#missing-section"'));
  rejects(run, /fragment|missing-section/i);
  await writeFile(home, original.replace('href="\/assets\/favicon.svg"', 'href="/assets/no-icon.svg"'));
  rejects(run, /missing linked artifact|no-icon/i);
});

test('reject stale retired artifact and missing 404 noindex', async t => {
  const { dist, run } = await fixture(t);
  await writeFile(path.join(dist, 'retired.html'), 'old content');
  rejects(run, /Artifact files differ/);
  await rm(path.join(dist, 'retired.html'));
  await writeFile(path.join(dist, '404.html'), '<html lang="en"><body>Missing</body></html>');
  rejects(run, /noindex/);
});

test('reject untrusted executable link without fetching it', async t => {
  const { dist, run } = await fixture(t);
  const home = path.join(dist, 'index.html');
  await writeFile(home, (await readFile(home, 'utf8')).replace('href="#work"', 'href="javascript:alert(1)"'));
  rejects(run, /unsafe linked URL/);
});
