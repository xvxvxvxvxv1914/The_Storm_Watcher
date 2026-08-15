#!/usr/bin/env node
/**
 * Asks production the one question that mattered on 2026-08-14: is every script
 * the page asks for actually a script?
 *
 * That day /assets/supabase-vendor-DI0HthDz.js was answered with index.html —
 * status 200, content-type text/html — so the module never parsed and the app
 * rendered nothing. Every check that looked at status codes said the site was
 * healthy, because it was: 200 on every request, correct byte counts, no 4xx
 * anywhere. Only the content type gave it away.
 *
 * It also outlived the deploy that caused it, sitting in the CDN cache with a
 * year of freshness, so this runs on a schedule rather than only after a release.
 *
 * Walks the whole import graph, not just the entry chunks, because a route behind
 * a paywall is still a route a paying visitor loads.
 */
const SITE = process.env.SMOKE_URL ?? 'https://www.thestormwatcher.com';
const MAX_ASSETS = 400;

const fail = [];
const note = (m) => console.log(m);

const res = await fetch(SITE + '/', { headers: { 'cache-control': 'no-cache' } });
const html = await res.text();

if (res.status !== 200) fail.push(`homepage: status ${res.status}`);
if (!html.includes('id="root"')) fail.push('homepage: no #root element in the served HTML');
if (!/<title>/i.test(html)) fail.push('homepage: no <title> in the served HTML');

const entries = [...new Set(
  [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]),
)];
if (entries.length === 0) fail.push('homepage: references no /assets/ bundles at all');
note(`entry bundles: ${entries.length}`);

const seen = new Set();
const queue = [...entries];
let checked = 0;

while (queue.length && seen.size < MAX_ASSETS) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);

  let r, body;
  try {
    r = await fetch(SITE + path);
    body = await r.text();
  } catch (err) {
    fail.push(`${path}: request failed — ${err.message}`);
    continue;
  }

  const ct = r.headers.get('content-type') ?? '(none)';
  const wantsJs = path.endsWith('.js');
  const typeOk = wantsJs ? ct.includes('javascript') : ct.includes('css');

  if (r.status !== 200) fail.push(`${path}: status ${r.status}`);
  else if (!typeOk) fail.push(`${path}: content-type ${ct} — served as ${ct.includes('html') ? 'HTML, the 2026-08-14 failure' : 'the wrong type'}`);
  else checked++;

  if (wantsJs && typeOk) {
    for (const ref of body.matchAll(/"(?:\.\/)?(assets\/[A-Za-z0-9_./-]+\.js)"/g)) {
      const next = '/' + ref[1];
      if (!seen.has(next)) queue.push(next);
    }
  }
}

note(`bundles served correctly: ${checked} of ${seen.size}`);

if (fail.length) {
  console.error('\nPRODUCTION SMOKE TEST FAILED\n');
  fail.forEach(f => console.error('  • ' + f));
  console.error('\nIf a bundle came back as HTML, the CDN is holding index.html for that URL.');
  console.error('Purge the CDN cache for it; the rewrite guard in vercel.json stops it recurring.');
  process.exit(1);
}

console.log('\nproduction smoke test passed');
