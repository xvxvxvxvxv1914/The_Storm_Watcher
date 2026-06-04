# Session Handoff — The Storm Watcher

_Last updated: 2026-06-04 · branch `staging` · written for the next agent picking
this up on another machine._

## 0. TL;DR / how to resume
- All work lives on **`staging`** (the de-facto production branch on Vercel —
  see the ⚠️ topology note in §3). Local is in sync with `origin/staging`.
- After cloning/pulling on the new machine: `npm install`, then `npm run dev`.
- Verify before any deploy: `npm run typecheck && npm run lint && npm run test:run`.

## 1. What this session changed (all on `staging`, pushed)
- **Referral program fixes**: `PlanGuard` now honors `referral_pro_until`
  (earned Pro unlocks gated routes); Stripe `invoice.payment_succeeded` makes the
  reward **idempotent** (atomic claim before granting); `referred_by` FK →
  `ON DELETE SET NULL` (migration `20260529000003`, **applied to prod Supabase**).
- **iOS Live Activity** (storm banner): Phase A works on device (lock screen +
  Dynamic Island). Phase B (push-to-update) code is built (`live_activity_tokens`
  table applied; `send-kp-alerts` edge fn v5 deployed) **but the APNs push token
  could NOT be validated in a local dev build** (`Activity.request(pushType:.token)`
  throws `ActivityInput error 0`). `start()` falls back to a no-push activity so
  Phase A still works. → **Validate Phase B in a TestFlight build.**
- **SEO**: removed a stale `HreflangTags` component that conflicted with the
  prerendered hreflang; refreshed sitemap; Lighthouse desktop SEO 100, Perf 81→94
  (fixed CLS 0.27→0.09 via font `display=optional` + LoadingFallback height);
  a11y 86→96 (button-name, target-size, render-blocking font). Remaining a11y
  item: `color-contrast` on `#64748b` muted text (design decision).
- **Dependabot**: 40 alerts were all stale (deps already patched/removed) →
  dismissed via API. `npm audit`: 0 prod, 3 dev-only moderate (ajv via
  @vercel/static-config, no upstream fix; harmless build-time).
- **Sentry**: only issue was NIGGG 404 (external, handled) → downgraded to
  `logWarning`.
- **Design refresh (aurora-green signature)** — shared web layer, applies to
  web + iOS + Android:
  - New `src/components/KpGauge.tsx` (0–9 severity scale with G-zones + marker).
  - New `.gradient-emerald` class in `src/index.css` (#10b981→#34d399).
  - Home, Aurora, Dashboard titles → green; KpGauge added to Home + Aurora;
    Dashboard active tab/CTA → green. Severity colours (yellow/orange/red) kept
    for storm-level DATA only.
- **Kp bug fix** (`src/services/noaaApi.ts`): `GFZ_BASE` was a hardcoded relative
  `/api/gfz/...` proxy path that only exists on web → on native it failed and Kp
  fell back to NOAA's `estimated_kp` (0.0 during quiet minutes) → showed Kp 0.
  Now native calls `https://kp.gfz.de` directly (same pattern as `nigggApi`).
- Removed dead `SvgStackedBars` chart component.
- Verified Android build (Galaxy A34, `RZCX12LXB0A`) and iOS build
  (iPhone 15 Pro Max, `F7351923-…`) both compile/run with all the above.

> NOTE: after my work, `origin/staging` also received brand/favicon/livestream
> commits from another machine (logos, og-image.png, Footer, nigggApi `apiCache`
> refactor). They're merged in; my changes survived. Current HEAD = `9a44dc3`.

## 2. ⚠️ CRITICAL OPEN DECISION — production topology (unresolved)
**`main` is NOT a lean copy of `staging` — it is an OLD/minimal version** (~35
files, 18 in `src/`, has a `.bolt` marker). **Production `www.thestormwatcher.com`
deploys from `main`**, so the LIVE SITE is running the old app (title still
"Space Weather Monitoring"). The full current app (this whole session + more)
only exists on `staging` and only deploys to the staging preview URL.

- This is why the user reported "some pages don't load on the live site" — the
  old `main` app genuinely lacks most pages.
- The user asked to **"push everything to main"** (make production = current app).
  This was NOT done — it's a high-stakes change to the live, public branch and
  the divergence is huge (main is missing ~300 files). **Confirm intent + method
  before doing it.** Options discussed: (A) bring full app but keep main without
  android/ios/CLAUDE.md/.env.example/CI; (B) make main identical to staging.
- Also confirm whether Vercel's **Production Branch** is actually `main` or
  `staging` (Vercel project `prj_punB6ZlhOejkRrJS2MxviywQzALA`, team
  `team_RHWxsbGrH3CwUhpWFvDyZWlQ`). The deploy metadata says production=main but
  the served content didn't match — verify in Vercel settings before merging.

## 3. Other open items (not blocking)
- Phase B Live Activity push: validate in TestFlight.
- IAP / payments: App Store launch blocker (see CLAUDE.md TODO).
- Android FCM: `google-services.json` missing → Android push notifications off.
- a11y `color-contrast` (bump `#64748b`) → a11y ~100.
- Mobile Perf 54 (LCP ~6s): architectural (lazy-loaded SPA body); only worth a
  fix if mobile-web organic matters — check Search Console field CWV first.

## 4. Useful facts
- **Supabase**: project ref `srzfoxlmhxyulrgkchjr` (region de). Migrations in
  `supabase/migrations/`; edge fns in `supabase/functions/` (deploy with
  `supabase functions deploy <name> --project-ref srzfoxlmhxyulrgkchjr`).
- **iOS build**: `npm run ios:deploy` (build + sync + xcodebuild + install +
  launch). Device must be **unlocked & foreground** for Live Activity to start.
- **Android build**: needs JDK 21 (system Java 25 is incompatible with Gradle
  9.4/AGP 9.2): `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
  + `ANDROID_HOME=~/Library/Android/sdk`, then `cd android && ./gradlew assembleDebug`.
- **Git rule** (from project memory): push only to `staging`; touch `main` only
  on explicit user order.
- Clean on-device screenshots without modals: Playwright + seed
  `localStorage['tsw_location_asked']='1'` and `['tsw-onboarding-seen']='1'`.
