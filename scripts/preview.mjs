import { createReadStream } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const options = process.argv.slice(2);
function option(name, fallback) {
  const index = options.indexOf(name);
  if (index < 0) return fallback;
  if (!options[index + 1]) throw new Error(`Missing ${name} value`);
  return options[index + 1];
}
const dist = path.resolve(option('--dir', fileURLToPath(new URL('../dist', import.meta.url))));
const port = Number(option('--port', '4173'));
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
const distStat = await lstat(dist);
if (!distStat.isDirectory() || distStat.isSymbolicLink()) throw new Error('Preview root must be a real directory');

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

async function regularFile(name) {
  let current = dist;
  const parts = name.split('/');
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) return null;
  }
  return current;
}

const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let name;
  try {
    const raw = request.url.split(/[?#]/, 1)[0];
    if (!raw.startsWith('/') || raw.includes('\\')) throw new Error('Invalid path');
    const decoded = decodeURIComponent(raw);
    if (decoded.includes('\\') || decoded.includes('\0') || decoded.includes('%') ||
        decoded.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid path');
    name = decoded.slice(1);
    if (!name || name.endsWith('/')) name += 'index.html';
  } catch {
    response.writeHead(400).end();
    return;
  }
  try {
    const file = await regularFile(name);
    if (file) {
      const stat = await lstat(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': stat.size });
      if (request.method === 'HEAD') response.end();
      else createReadStream(file).pipe(response);
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
      console.error(error);
      response.writeHead(500).end();
      return;
    }
  }
  try {
    const notFound = await regularFile('404.html');
    const body = notFound ? await readFile(notFound) : Buffer.from('Not found');
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end();
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Preview listening at http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
