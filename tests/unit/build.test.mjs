import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const builder = path.join(repo, 'scripts/build.mjs');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('baseline: CNAME and portrait retain task-1 bytes', async () => {
  const portrait = JSON.parse(await readFile(path.join(repo, 'tests/fixtures/portrait.json'), 'utf8'));
  const image = await readFile(path.join(repo, portrait.path));
  assert.equal(digest(image), portrait.sha256);
  assert.equal(image.length, portrait.bytes);
  assert.equal(image.readUInt32BE(16), portrait.width);
  assert.equal(image.readUInt32BE(20), portrait.height);
  assert.equal((await readFile(path.join(repo, 'CNAME'))).toString('hex'), '7777772e646f6e736b652e636f6d2e61750a');
});

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets'), { recursive: true });
  const bytes = Buffer.from([0, 255, 42, 13, 10]);
  await writeFile(path.join(root, 'assets/picture.png'), bytes);
  await writeFile(path.join(root, 'index.html'), '<h1>Fixture</h1>');
  await writeFile(path.join(root, '.env'), 'PRIVATE_TOKEN=test');
  await mkdir(path.join(root, '.omo'));
  await writeFile(path.join(root, '.omo/private.md'), 'private');
  const manifest = path.join(root, 'publish.json');
  const dist = path.join(root, 'dist');
  const run = entries => {
    writeFileSync(manifest, JSON.stringify(entries));
    return spawnSync(process.execPath, [builder], {
      env: { ...process.env, SITE_ROOT: root, DIST_DIR: dist, MANIFEST_FILE: manifest },
      encoding: 'utf8', timeout: 10000,
    });
  };
  return { root, dist, bytes, run };
}

test('allowlisted build copies bytes and removes stale/unlisted files', async t => {
  const { dist, bytes, run } = await fixture(t);
  assert.equal(run(['index.html', 'assets/picture.png']).status, 0);
  assert.deepEqual(await readFile(path.join(dist, 'assets/picture.png')), bytes);
  await writeFile(path.join(dist, 'retired.html'), 'old');
  assert.equal(run(['index.html']).status, 0);
  assert.deepEqual(await readdir(dist), ['index.html']);
});

test('invalid manifest entries fail nonzero without publishing secrets or escape files', async t => {
  const { root, dist, run } = await fixture(t);
  await writeFile(path.join(root, 'outside.txt'), 'outside');
  await symlink(path.join(root, '.env'), path.join(root, 'linked'));
  await symlink(path.join(root, '.omo'), path.join(root, 'assets/private-link'));
  await mkdir(dist);
  await writeFile(path.join(dist, 'retired.html'), 'stale');
  for (const entries of [
    ['index.html', 'index.html'], ['/index.html'], ['../outside.txt'],
    ['assets/*.png'], ['assets'], ['missing.html'], ['linked'],
    ['assets/private-link/private.md'], ['.env'], ['.omo/private.md'],
    ['a\\b'], ['C:\\secret.txt'], ['index.html?x=1'], [],
  ]) {
    const result = run(entries);
    assert.notEqual(result.status, 0, JSON.stringify(entries));
    await assert.rejects(readFile(path.join(dist, 'retired.html')), { code: 'ENOENT' });
  }
  assert.equal(run(['index.html']).status, 0);
  assert.deepEqual(await readdir(dist), ['index.html']);
});
