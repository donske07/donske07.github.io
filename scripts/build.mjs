import { copyFile, lstat, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(process.env.SITE_ROOT ?? defaultRoot);
const dist = path.resolve(process.env.DIST_DIR ?? path.join(root, 'dist'));
const manifest = path.resolve(process.env.MANIFEST_FILE ?? path.join(root, 'scripts/publish-files.json'));

function inside(parent, child) {
  return child.startsWith(`${parent}${path.sep}`);
}

function validateName(name) {
  if (typeof name !== 'string' || !name || path.posix.isAbsolute(name) || path.win32.isAbsolute(name) ||
      name.includes('\\') || /[*?\[\]{}\0]/.test(name) ||
      name.split('/').some(part => part.startsWith('.') && part !== '.nojekyll') ||
      name.split('/').some(part => !part || part === '.' || part === '..') ||
      path.posix.normalize(name) !== name) {
    throw new Error(`Unsafe manifest path: ${JSON.stringify(name)}`);
  }
}

async function assertRegular(rootDir, name) {
  let current = rootDir;
  const parts = name.split('/');
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) {
      throw new Error(`Not a regular manifest file: ${name}`);
    }
  }
}

async function main() {
  if (!inside(root, dist) || inside(dist, root) || dist === root) throw new Error('dist must be inside the source root');
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Unsafe source root');
  // Never delete through a symlink or through a symlinked parent.
  const relativeDist = path.relative(root, dist);
  let current = root;
  for (const part of relativeDist.split(path.sep)) {
    current = path.join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Unsafe dist path: ${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await rm(dist, { recursive: true, force: true });
  const entries = JSON.parse(await readFile(manifest, 'utf8'));
  if (!Array.isArray(entries) || !entries.length) throw new Error('Manifest must be a nonempty array');
  const seen = new Set();
  for (const name of entries) {
    validateName(name);
    if (seen.has(name)) throw new Error(`Duplicate manifest entry: ${name}`);
    seen.add(name);
    if (inside(dist, path.resolve(root, name))) throw new Error('Manifest cannot include dist files');
    await assertRegular(root, name);
  }
  for (const name of entries) {
    const destination = path.join(dist, name);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(root, name), destination);
  }
  console.log(`Published ${entries.length} allowlisted files to ${dist}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
