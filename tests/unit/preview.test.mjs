import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const preview = fileURLToPath(new URL('../../scripts/preview.mjs', import.meta.url));

test('preview serves GET/HEAD, real custom 404, and contains traversal', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-preview-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dist = path.join(root, 'dist');
  await mkdir(path.join(dist, 'nested'), { recursive: true });
  await writeFile(path.join(dist, 'index.html'), '<h1>Fixture home</h1>');
  await writeFile(path.join(dist, '404.html'), '<h1>Fixture missing</h1>');
  await writeFile(path.join(dist, 'nested/index.html'), '<h1>Nested</h1>');
  await writeFile(path.join(root, 'secret.txt'), 'DO_NOT_SERVE');
  await symlink(path.join(root, 'secret.txt'), path.join(dist, 'leak.txt'));
  const server = spawn(process.execPath, [preview, '--dir', dist, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { server.kill(); });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview startup timeout')), 5000);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`preview exited ${code}`)); });
    server.stdout.on('data', chunk => {
      const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const get = (route, init) => fetch(`${url}${route}`, init);
  const home = await get('/');
  assert.equal(home.status, 200);
  assert.equal(await home.text(), '<h1>Fixture home</h1>');
  assert.equal(home.headers.get('cache-control'), 'no-store');
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.equal((await get('/nested/')).status, 200);
  const missing = await get('/missing');
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), '<h1>Fixture missing</h1>');
  assert.equal((await get('/', { method: 'HEAD' })).status, 200);
  assert.equal((await get('/', { method: 'POST' })).status, 405);
  for (const route of ['/%2e%2e/secret.txt', '/%252e%252e/secret.txt', '/%GG', '/leak.txt', '/nested']) {
    const response = await get(route);
    assert.ok(response.status >= 400, `${route}: ${response.status}`);
    assert.doesNotMatch(await response.text(), /DO_NOT_SERVE/);
  }
});
