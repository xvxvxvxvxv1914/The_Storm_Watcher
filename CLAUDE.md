# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build → dist/
npm run typecheck    # TypeScript check (tsconfig.app.json)
npm run lint         # ESLint (0 warnings allowed in pre-commit hook)
npm run test         # Vitest watch mode
npm run test:run     # Vitest single run (CI)
npm run test:e2e     # Playwright end-to-end tests
```

Run a single test file:
```bash
npx vitest run src/services/nigggApi.test.ts
```

Mobile (requires Xcode):
```bash
npm run ios:open     # Build + sync + open Xcode
npm run ios:livereload  # Live reload on device
```

## Architecture

**The Storm Watcher** is a space-weather PWA + Capacitor mobile app (iOS/Android). It shows real-time geomagnetic data, aurora forecasts, UV index, ISS tracking, and community mood tracking. Deployed on Vercel; backend on Supabase.

### Frontend stack
- React 18 + React Router 7 + Framer Motion (page transitions via `AnimatedPage`)
- TailwindCSS, lucide-react icons
- All pages are lazy-loaded via `React.lazy` in [src/components/AnimatedRoutes.tsx](src/components/AnimatedRoutes.tsx)
- Three.js + react-globe.gl for the 3D aurora globe (Aurora page only — chunked separately to avoid preloading 3D on every page)

### Context providers (wrap order matters)
```
HelmetProvider → Router → ThemeProvider → SettingsProvider → AuthProvider
```
- **AuthContext** — Supabase session, user profile, plan (`free | pro | premium`)
- **SettingsContext** — persisted to `localStorage` under key `tsw_settings` (Kp threshold, unit system, preferred location)
- **ThemeContext** — `light | dark`, persisted to `localStorage`
- **LanguageContext** — i18n via flat key-value locale files in `src/locales/`

### Data services (`src/services/`)
All NOAA/external fetches go through an in-memory TTL cache + single-flight dedup in [src/services/noaaApi.ts](src/services/noaaApi.ts) to prevent hammering endpoints when multiple pages mount simultaneously. TTL constants: 1 min for live feeds, 15 min for forecasts.

| Service | Source | Notes |
|---------|--------|-------|
| `noaaApi.ts` | NOAA SWPC + GFZ | Kp index (GFZ primary, NOAA fallback), solar wind, X-ray, aurora OVATION model, 3-day outlook |
| `nigggApi.ts` | NIGGG Bulgaria | Local magnetic field (H/F components). On native Capacitor, calls the endpoint directly; on web goes through `/api/niggg` Vercel rewrite |
| `donkiApi.ts` | NOAA DONKI | CME/solar flare alerts, proxied via `/donki` |
| `uvApi.ts` | Open-Meteo | UV index by coords |
| `skyApi.ts` | Open-Meteo | Cloud cover + astronomy data |
| `issApi.ts` | Where The ISS At | ISS position |

### API proxies
- **Dev**: Vite proxy in `vite.config.ts` handles `/donki`, `/api/niggg`, `/api/gfz`, `/api/stripe`
- **Prod**: `vercel.json` rewrites handle `/donki` and `/api/gfz`; NIGGG has a dedicated Vercel serverless function at `api/niggg.ts`; Stripe is handled by `api/stripe/` serverless functions

### Access control
`PlanGuard` component wraps routes/sections that require `pro` or `premium`. It reads `profile.plan` from AuthContext. When `VITE_PAYMENTS_ENABLED !== 'true'`, all content is accessible regardless of plan — useful for development.

### Supabase backend
- **Edge Functions** in `supabase/functions/`: `delete-account`, `donki-proxy`, `send-kp-alerts` (cron), `submit-mood`
- **Migrations** in `supabase/migrations/` — run sequentially; `_MANUAL` suffix means the SQL must be applied manually in the Supabase dashboard (cron job setup)
- Key tables: `profiles` (plan, stripe fields), `mood_entries`, `push_subscriptions`, `favorite_locations`, `stripe_processed_events`

### PWA / Service Worker
Custom service worker at `src/sw.ts` using Workbox. Heavy 3D chunks (`globe-vendor`, `three-vendor`, `charts-vendor`) are excluded from precaching — they're loaded on-demand and cached by the browser separately.

### Capacitor (mobile)
`CapacitorHttp` is enabled globally — it patches `fetch()` on native to bypass WKWebView CORS for third-party APIs. This means native builds can call NOAA/GFZ/NIGGG directly without going through the Vercel proxy.

### i18n
Translation keys live in `src/locales/{en,bg,de,es,fr,ja,ru,zh}.ts` as flat `Record<string, string>`. The `useLanguage()` hook provides `t(key)`. All 8 locales must stay in sync — there is a completeness test at `src/locales/localeCompleteness.test.ts`.

### Build chunking
Manual chunks in `vite.config.ts` keep the initial bundle small:
- `three-vendor`, `globe-vendor` — only loaded on `/aurora`
- `charts-vendor` — only loaded where lightweight-charts is used
- `supabase-vendor`, `react-vendor`, `icons-vendor` — shared infrastructure

### Key utilities
- `src/utils/auroraVisibility.ts` — pure math aurora visibility % from lat/lon/Kp (dipole approximation, no API)
- `src/utils/logger.ts` — `logError()` wrapper (console in dev, Sentry in prod)
- `src/utils/generateStormImage.ts` — generates OG share images for storm events

## Ideas / Future Plans

_(Add ideas and future feature plans here as they come up)_

### Apple Watch App
watchOS companion app за The Storm Watcher. Данните вече са в App Group (`group.com.stormwatcher.app`) от iOS widget-а.

**Планирано съдържание:**
- Главен екран: Kp index (голям) + solar wind speed + storm status (G0–G5)
- Complication за watch face (Corner, Circular, Graphic Rectangular) с Kp
- Фонова refresh на данните на всеки 15 мин (Background App Refresh)
- Тактилна нотификация при Kp > потребителски праг

**Имплементация (всичко нативен Swift/SwiftUI):**
1. Добави watchOS target в Xcode (`StormWatcherWatch` extension)
2. App Group sharing — чете `widget_kp`, `widget_wind`, `widget_updated` от `group.com.stormwatcher.app`
3. WatchConnectivity (WCSession) за live sync от iOS при отворено приложение
4. SwiftUI интерфейс: тъмен фон, aurora зелено (#10b981), orange (#f97316) за high Kp
5. Complications в `CLKComplicationDescriptor` формат

## TODO / Pending Work

### API Data Quality — остатък от одита (2026-06-04)

Направено: `||` → `??` на Kp полета, guard в useKpLive, TTL cache за NIGGG/UV/Sky/ISS, dedup в Alerts.

**Остава:**

#### Medium приоритет
1. **NIGGG re-fetch при смяна на регион** (`src/pages/Dashboard.tsx`)
   - Проблем: ако `inNigggRegion` се промени (IP detection → GPS), `fetchNigggData()` не се извиква отново
   - Fix: добави отделен `useEffect(() => { if (inNigggRegion) fetchData(); }, [inNigggRegion])`

2. **Home.tsx — silent failure** (`src/pages/Home.tsx`)
   - Проблем: ако `useKpLive()` върне `null` (network fail), Home показва "Kp 0.0 · Quiet" без грешка
   - Fix: при `kpValue === null && !loading` → покажи retry бутон или error state вместо "0.0"

3. **UV и SkyVisibility — spinner при грешка** (`src/pages/UV.tsx`, `src/pages/SkyVisibility.tsx`)
   - Проблем: при грешка или липсваща локация показват безкраен spinner без retry
   - Fix: добави error state + retry бутон (виж как Alerts.tsx го прави)

#### Low приоритет
4. **ISS — тиха грешка** (`src/pages/ISS.tsx`)
   - При network error показва последната позиция без индикация
   - Fix: добави "last updated" timestamp и/или error toast

5. **Pull-to-refresh** — UV, SkyVisibility, ISS нямат pull-to-refresh (Dashboard го има)
   - `usePullToRefresh` hook вече съществува — само трябва да се добави в тези страници



### Mobile App Payments (преди пускане в App Store / Play Store)
IAP инфраструктурата е готова — остава само plugin install + конфигурация в магазините:

**Готово:**
- `src/hooks/useIAP.ts` — purchase/restore hooks, product ID map, verifyReceipt()
- `src/pages/Pricing.tsx` — native platform вижда IAP UI (не Stripe)
- `supabase/functions/verify-iap/index.ts` — Apple + Google receipt validation

**Остава (4 стъпки):**
1. `npm install @capgo/capacitor-purchases && npx cap sync`
2. Създай продукти в App Store Connect + Play Console с ID-та:
   - `com.stormwatcher.app.pro.monthly` / `pro.yearly`
   - `com.stormwatcher.app.premium.monthly` / `premium.yearly`
3. Добави в Supabase Edge Function secrets:
   - `APPLE_SHARED_SECRET` (App Store Connect → Apps → My Apps → App Information → App-Specific Shared Secret)
   - `GOOGLE_SERVICE_ACCOUNT` (Play Console → Setup → API access → Service account JSON)
   - Deploy: `supabase functions deploy verify-iap --project-ref srzfoxlmhxyulrgkchjr`
4. Uncomment plugin calls в `src/hooks/useIAP.ts` (маркирани с `// TODO`)

**Stripe CLI тест (ръчна стъпка преди web go-live):**
```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
stripe trigger checkout.session.completed --add checkout_session:metadata.supabase_user_id=<your-uid>
stripe trigger customer.subscription.trial_will_end
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```
Verify: `profiles.plan` се обновява, emails пристигат в Resend dashboard.

**Без тези промени Apple/Google ще отхвърлят приложението при ревю.**
