/**
 * Prerender script — generates static HTML for each public route.
 *
 * Run via:  npx tsx scripts/prerender.ts
 * Or:       npm run build:ssg   (vite build && this script)
 *
 * Strategy:
 *  1. Patch dist/index.html so relative asset paths (./assets/) become
 *     absolute (/assets/) — required for sub-route pages to load JS/CSS.
 *  2. Start `vite preview` on a free port.
 *  3. Use Playwright to visit each route, wait for react-helmet-async to
 *     inject the real <title>, capture full HTML.
 *  4. Write dist/{route}/index.html for each route.
 */

import { chromium } from '@playwright/test';
import { spawn }     from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join }      from 'path';
import { createServer, AddressInfo } from 'net';

// ── Routes to prerender (skip auth / profile / settings) ─────────────────────

const ROUTES = [
  '/',
  '/dashboard',
  '/forecast',
  '/aurora',
  '/alerts',
  '/mood',
  '/uv',
  '/sun',
  '/sky',
  '/iss',
  '/faq',
  '/magnetic-effects',
  '/pricing',
  '/about',
  '/privacy',
  '/terms',
  '/gallery',
  '/hunt',
  '/livestream',
  '/calendar',
];

// The static fallback title in index.html — we wait until Helmet replaces it.
const FALLBACK_TITLE = 'The Storm Watcher - Space Weather Monitoring';
const PAGE_TIMEOUT   = 15_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function startPreview(port: number): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['vite', 'preview', '--port', String(port), '--strictPort'],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes('localhost')) {
        proc.stdout!.off('data', onData);
        // Small delay to ensure the server is fully listening.
        setTimeout(() => resolve(() => proc.kill('SIGTERM')), 400);
      }
    };
    proc.stdout!.on('data', onData);
    proc.stderr!.on('data', (d: Buffer) => process.stderr.write(d));
    proc.on('error', reject);
    setTimeout(
      () => reject(new Error('Preview server did not start within 15 s')),
      15_000,
    );
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Patch dist/index.html: ./assets/ → /assets/ so sub-routes load assets.
  const indexPath   = join('dist', 'index.html');
  const originalHtml = await readFile(indexPath, 'utf-8');
  const patchedHtml  = originalHtml.replace(/(src|href)="\.\//g, '$1="/');
  await writeFile(indexPath, patchedHtml, 'utf-8');
  console.log('📝 Patched dist/index.html: relative → absolute asset paths\n');

  // 2. Start preview server.
  const port = await getFreePort();
  console.log(`🚀 Starting preview server on port ${port}...`);
  const stop = await startPreview(port);
  const base = `http://localhost:${port}`;
  console.log(`   Ready at ${base}\n`);

  // 3. Launch browser.
  const browser = await chromium.launch();
  const context  = await browser.newContext();

  console.log(`📄 Prerendering ${ROUTES.length} routes...\n`);

  let ok = 0, fail = 0;

  for (const route of ROUTES) {
    const page = await context.newPage();

    try {
      // Tell the app to skip splash animation and skip onboarding.
      await page.addInitScript(() => {
        localStorage.setItem('PRERENDER', 'true');
        sessionStorage.setItem('splash_shown', '1');
      });

      await page.goto(`${base}${route}`, {
        waitUntil: 'networkidle',
        timeout: PAGE_TIMEOUT,
      });

      // Wait until react-helmet-async has replaced the fallback <title>.
      await page.waitForFunction(
        (fallback: string) => {
          const t = document.title;
          return t.length > 0 && t !== fallback;
        },
        FALLBACK_TITLE,
        { timeout: PAGE_TIMEOUT },
      );

      const rawHtml = await page.content();
      // Fix any remaining relative paths Playwright may have preserved.
      const html = rawHtml.replace(/(src|href)="\.\//g, '$1="/');

      if (route === '/') {
        await writeFile(join('dist', 'index.html'), html, 'utf-8');
        console.log(`  ✅  /  →  dist/index.html`);
      } else {
        const slug = route.slice(1);
        const dir  = join('dist', slug);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'index.html'), html, 'utf-8');
        console.log(`  ✅  ${route}  →  dist/${slug}/index.html`);
      }

      ok++;
    } catch (err) {
      console.error(
        `  ❌  ${route}  →  ${err instanceof Error ? err.message : String(err)}`,
      );
      fail++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  stop();

  console.log(`\n✨ Done: ${ok} succeeded, ${fail} failed.\n`);
  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
