#!/usr/bin/env node
/**
 * Rejects a vercel.json that Vercel itself would reject.
 *
 * On 2026-08-14 a "_comment" key was added inside a rewrite to explain the rule
 * next to it. JSON has no comments and Vercel refuses unknown properties, so both
 * deployments failed configuration validation and went straight to ERROR **with no
 * build logs at all**. CI was green for those same commits, because nothing in CI
 * ever looked at this file — so the only signal was a blank production site, found
 * an hour later by opening it in a browser.
 *
 * This is deliberately a whitelist. A typo'd or invented key is exactly the class
 * of mistake that cost that hour, and an allow-list is the only shape that catches
 * a key nobody thought of.
 */
import { readFileSync } from 'node:fs';

const TOP = new Set([
  'version', 'name', 'alias', 'scope', 'env', 'build', 'builds', 'routes',
  'cleanUrls', 'trailingSlash', 'redirects', 'rewrites', 'headers', 'functions',
  'regions', 'crons', 'github', 'images', 'framework', 'installCommand',
  'buildCommand', 'outputDirectory', 'devCommand', 'ignoreCommand', 'public',
  'rootDirectory', 'framework', 'git', 'projectSettings', 'headers',
]);

const SHAPES = {
  rewrites: { allowed: new Set(['source', 'destination', 'has', 'missing', 'statusCode']), required: ['source', 'destination'] },
  redirects: { allowed: new Set(['source', 'destination', 'permanent', 'statusCode', 'has', 'missing']), required: ['source', 'destination'] },
  headers: { allowed: new Set(['source', 'headers', 'has', 'missing']), required: ['source', 'headers'] },
  crons: { allowed: new Set(['path', 'schedule']), required: ['path', 'schedule'] },
};

const problems = [];
const file = new URL('../vercel.json', import.meta.url);

let cfg;
try {
  cfg = JSON.parse(readFileSync(file, 'utf-8'));
} catch (err) {
  console.error(`vercel.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

for (const key of Object.keys(cfg)) {
  if (!TOP.has(key)) problems.push(`top level: unknown key "${key}"`);
}

for (const [section, shape] of Object.entries(SHAPES)) {
  const entries = cfg[section];
  if (entries === undefined) continue;
  if (!Array.isArray(entries)) { problems.push(`${section}: expected an array`); continue; }

  entries.forEach((entry, i) => {
    const where = `${section}[${i}]`;
    if (entry === null || typeof entry !== 'object') { problems.push(`${where}: expected an object`); return; }

    for (const key of Object.keys(entry)) {
      if (!shape.allowed.has(key)) {
        problems.push(`${where}: unknown key "${key}" — Vercel rejects the whole config for this`);
      }
    }
    for (const key of shape.required) {
      if (!(key in entry)) problems.push(`${where}: missing required key "${key}"`);
    }

    // headers[].headers is its own little schema.
    if (section === 'headers' && Array.isArray(entry.headers)) {
      entry.headers.forEach((h, j) => {
        for (const key of Object.keys(h ?? {})) {
          if (key !== 'key' && key !== 'value') problems.push(`${where}.headers[${j}]: unknown key "${key}"`);
        }
        if (typeof h?.key !== 'string' || typeof h?.value !== 'string') {
          problems.push(`${where}.headers[${j}]: key and value must both be strings`);
        }
      });
    }
  });
}

/**
 * The SPA catch-all must not answer for /assets/. Those are served with
 * immutable, year-long freshness, so an index.html body returned there with
 * status 200 gets cached by the CDN *as that bundle* — which is how the site went
 * blank for every HTTP/2 browser while HTTP/1.1 clients saw a healthy file.
 */
const catchAll = (cfg.rewrites ?? []).find(r => r.destination === '/index.html' && /^\/\(\(?\?|^\/\(\.\*\)/.test(r.source ?? ''));
if (catchAll && !catchAll.source.includes('?!assets/')) {
  problems.push(
    `rewrites: the catch-all "${catchAll.source}" also matches /assets/. A missing bundle must 404, `
    + 'not fall through to index.html — see the 2026-08-14 outage.',
  );
}

if (problems.length) {
  console.error('vercel.json would be rejected or is unsafe:\n');
  problems.forEach(p => console.error('  • ' + p));
  process.exit(1);
}

console.log('vercel.json OK — no unknown keys, catch-all excludes /assets/');
