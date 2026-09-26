import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const evidence = path.resolve(root, process.env.EVIDENCE_DIR || '.omo/evidence/recruiter-ai-portfolio', `task-13-audit-${Date.now()}-${process.pid}`);
const routes = ['/', '/projects/local-rag/', '/projects/personal-assistant/', '/projects/recommender/', '/cv/'];
const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
const presets = { mobile: undefined, desktop: desktopConfig };
const samples = 3;
const maxRunMs = 120_000;

function median(values) {
  if (values.length !== samples || values.some(value => !Number.isFinite(value))) {
    throw new Error(`Missing or invalid Lighthouse samples: ${JSON.stringify(values)}`);
  }
  return [...values].sort((a, b) => a - b)[1];
}

function requirePerfect(routesToCheck) {
  const failures = Object.entries(routesToCheck).flatMap(([key, row]) => categories
    .filter(category => !Number.isFinite(row.median[category]) || row.median[category] < 1)
    .map(category => `${key} ${category}=${row.median[category] * 100}`));
  if (failures.length) throw new Error(`Lighthouse median below 100: ${failures.join('; ')}`);
}

if (process.argv.includes('--probe-low-score')) {
  requirePerfect({ 'mobile:/': { median: { performance: 0.999, accessibility: 1, 'best-practices': 1, seo: 1 } } });
  throw new Error('Low-score negative probe unexpectedly passed');
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child?.exitCode !== null) throw new Error(`Preview exited before ready: ${child.exitCode}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* Startup has not completed. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function main() {
  await mkdir(evidence, { recursive: true });
  const result = { environment: { node: process.version, platform: process.platform, arch: process.arch,
    lighthouse: JSON.parse(await readFile(path.join(root, 'node_modules/lighthouse/package.json'), 'utf8')).version,
    playwright: JSON.parse(await readFile(path.join(root, 'node_modules/playwright/package.json'), 'utf8')).version,
    samples, maxRunMs, presets: { mobile: 'Lighthouse default mobile', desktop: 'Lighthouse desktop preset' } },
  artifact: 'fresh npm run build', routes: {}, status: 'failed' };
  let preview;
  let context;
  let profile;
  let watchdog;
  try {
    watchdog = setTimeout(() => { console.error(`Audit exceeded 45 minutes; evidence: ${evidence}`); process.exit(1); }, 45 * 60_000);
    execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', timeout: 60_000 });
    const previewPort = await freePort();
    const chromePort = await freePort();
    const origin = `http://127.0.0.1:${previewPort}`;
    result.environment.previewOrigin = origin;
    result.environment.chromeDebugPort = chromePort;
    preview = spawn(process.execPath, [path.join(root, 'scripts/preview.mjs'), '--port', String(previewPort)],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let previewOutput = '';
    preview.stdout.on('data', chunk => { previewOutput += chunk; });
    preview.stderr.on('data', chunk => { previewOutput += chunk; });
    await waitFor(origin, preview);
    const notFound = await fetch(`${origin}/this-route-does-not-exist/`);
    if (notFound.status !== 404 || !/<meta\s+name="robots"\s+content="noindex(?:,\s*nofollow)?"/i.test(await notFound.text())) {
      throw new Error('404 must return HTTP 404 and noindex; it is excluded from the five indexable-page SEO gate');
    }
    result.environment.notFound = 'HTTP 404, noindex, excluded from indexable-page audit';
    profile = await mkdtemp(path.join(os.tmpdir(), 'portfolio-audit-chrome-'));
    context = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true,
      args: [`--remote-debugging-port=${chromePort}`] });
    result.environment.chrome = context.browser().version();
    const cdp = await (await fetch(`http://127.0.0.1:${chromePort}/json/version`)).json();
    if (!cdp.Browser.startsWith('Chrome/')) throw new Error('No real Google Chrome CDP endpoint');
    result.environment.cdpBrowser = cdp.Browser;
    result.environment.settingsByPreset = {};
    for (const [preset, config] of Object.entries(presets)) {
      for (const route of routes) {
        const key = `${preset}:${route}`;
        const row = { scores: [], median: {}, diagnostics: [] };
        result.routes[key] = row;
        for (let sample = 1; sample <= samples; sample++) {
          const page = await context.newPage();
          const consoleErrors = [];
          const networkErrors = [];
          page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
          page.on('pageerror', error => consoleErrors.push(error.message));
          page.on('requestfailed', request => networkErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
          page.on('response', response => { if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`); });
          try {
            const response = await page.goto(`${origin}${route}`, { waitUntil: 'load', timeout: 30_000 });
            if (response?.status() !== 200) throw new Error(`${route} returned ${response?.status()}`);
          } finally {
            await page.close();
          }
          const filename = `${preset}-${route === '/' ? 'home' : route.split('/').filter(Boolean).join('-')}-${sample}.json`;
          const timer = AbortSignal.timeout(maxRunMs);
          const run = lighthouse(`${origin}${route}`, { port: chromePort, output: 'json',
            onlyCategories: categories, maxWaitForLoad: 45_000 }, config);
          const audit = await Promise.race([run, new Promise((_, reject) => timer.addEventListener('abort',
            () => reject(new Error(`Lighthouse timeout: ${key} sample ${sample}`)), { once: true }))]);
          if (!audit?.lhr || typeof audit.report !== 'string') throw new Error(`Missing Lighthouse report: ${key} sample ${sample}`);
          await writeFile(path.join(evidence, filename), audit.report);
          if (audit.lhr.configSettings?.formFactor !== preset || audit.lhr.runtimeError) {
            throw new Error(`Invalid ${preset} Lighthouse run: ${JSON.stringify(audit.lhr.runtimeError ?? audit.lhr.configSettings?.formFactor)}`);
          }
          const scores = Object.fromEntries(categories.map(category => [category, audit.lhr.categories?.[category]?.score]));
          if (Object.values(scores).some(score => typeof score !== 'number' || !Number.isFinite(score))) {
            throw new Error(`Missing category score: ${key} sample ${sample}: ${JSON.stringify(scores)}`);
          }
          row.scores.push(scores);
          row.diagnostics.push({ sample, file: filename, consoleErrors, networkErrors,
            runtimeError: audit.lhr.runtimeError ?? null,
            failedAudits: Object.entries(audit.lhr.audits).filter(([, value]) => value.score !== null && value.score < 1)
              .map(([id, value]) => ({ id, score: value.score, title: value.title })) });
          result.environment.settingsByPreset[preset] = audit.lhr.configSettings;
          await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(result, null, 2));
          console.log(`${key} sample ${sample}: ${JSON.stringify(scores)}`);
        }
        for (const category of categories) row.median[category] = median(row.scores.map(score => score[category]));
      }
    }
    requirePerfect(result.routes);
    result.status = 'passed';
    result.environment.previewOutput = previewOutput;
  } catch (error) {
    result.error = String(error.stack ?? error);
    throw error;
  } finally {
    await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(result, null, 2));
    try {
      await context?.close();
    } finally {
      await stop(preview);
      if (profile) await rm(profile, { recursive: true, force: true });
      clearTimeout(watchdog);
      console.log(`Private audit evidence: ${evidence}`);
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
