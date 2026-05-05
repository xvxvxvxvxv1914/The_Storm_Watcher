# Storm Watcher — Audit Progress
Last updated: 2026-05-05

## ✅ DONE — Critical (5/5)

- [x] **C1.** Премахнат `android:usesCleartextTraffic="true"` от `android/app/src/main/AndroidManifest.xml`
- [x] **C2.** `SUPABASE_SERVICE_ROLE_KEY` преместена в Vercel Production env (изтрита от `.env`)
- [x] **C3.** `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` преместени в Vercel Production env (изтрити от `.env`)
- [x] **C4.** ProGuard/R8 активиран в `android/app/build.gradle` (`minifyEnabled true`) + Capacitor keep rules в `proguard-rules.pro`
- [x] **C5.** iOS icon set — генерирани всички 15 размера (20/29/40/60/76/83.5/1024px) в `AppIcon.appiconset/` + обновен `Contents.json`

---

## ✅ DONE — High (7/24)

- [x] **H1.** CSRF protection — добавена Origin/Referer проверка в `api/stripe/create-checkout-session.ts`
- [x] **H2.** Input validation в `api/niggg.ts` — whitelist само `chdate1` и `chdate2` с regex `DD-MM-YYYY`
- [ ] **H3.** Supabase JWT в localStorage — SKIP (стандарт за SPA; реалната защита е CSP от H7)
- [x] **H4.** `session_id` мигриран от `localStorage` → `sessionStorage` в `src/lib/supabase.ts` и `src/contexts/AuthContext.tsx`
- [ ] **H5.** PlanGuard server-side RLS — изисква конфигурация в Supabase Dashboard (не е в кода)
- [ ] **H6.** ~~`EnableSafeBrowsing=false`~~ — **вече направено заедно с C1** ✅
- [x] **H7.** CSP headers в `vercel.json` — добавени CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cache-Control
- [x] **H8.** iOS `Info.plist` — добавен `NSAppTransportSecurity` с `NSAllowsArbitraryLoads=false`
- [x] **H9.** `Aurora.tsx` — Three.js lighting setup еднократен (не се пресъздава при aurora update); geometry/material/texture dispose при overlay update; разделени на 2 отделни `useEffect`-а
- [x] **H10.** Page Visibility API — добавен за всичките 13 `setInterval`-а:
  - `Aurora.tsx` — 3 интервала (aurora model, Kp, space weather) → `useVisibilityInterval` hook
  - `Dashboard.tsx` — 2 интервала (fetchData, countdown) → `useVisibilityInterval` + inline check
  - `Forecast.tsx` — 1 интервал → `useVisibilityInterval`
  - `Home.tsx` — 2 интервала (fetchAll, timeAgo) → inline check
  - `ISS.tsx` — 1 интервал → inline check
  - `Alerts.tsx` — 1 интервал → inline check
  - `Navigation.tsx` — 1 интервал → inline check
  - Нов hook: `src/hooks/useVisibilityInterval.ts`
- [ ] **H11.** `public/og-image.png` 633 KB → конвертирай в WebP (~150 KB)
- [ ] **H12.** iOS `AppDelegate.swift:85,96,169,181,194` — NOAA API без TLS verification. Добави certificate pinning
- [ ] **H13.** `ios/App/StormWidget/StormWidget.swift:168-189` — widget без error handling/timeout
- [ ] **H14.** `android/app/src/main/AndroidManifest.xml:5` — `allowBackup="true"` без backup rules. Добави `backup_rules.xml` или изключи
- [ ] **H15.** Helmet tags липсват на: `Terms.tsx`, `Pricing.tsx`, `Profile.tsx`, `Auth.tsx`, `AuthReset.tsx`
- [ ] **H16.** hreflang в `index.html` — всички сочат към root. Имплементирай path-based или query-based с правилни alternates
- [ ] **H17.** JSON-LD schema — добави на Aurora, Dashboard, Forecast, About, Pricing, Privacy, Terms
- [ ] **H18.** `public/sitemap.xml` — lastmod дати остарели. Обнови към 2026-05-05
- [ ] **H19.** Light mode счупен — `index.css:220-229` overrid-ва text-white глобално. Преработи с CSS variables
- [ ] **H20.** Tailwind config почти празен — добави design tokens
- [ ] **H21.** Няма focus rings (a11y) — добави `*:focus-visible` глобален стил
- [ ] **H22.** Icon-only бутони без aria-label (theme toggle и др.)
- [ ] **H23.** Desktop ↔ mobile feature parity — theme toggle и language picker само в "More" sheet на mobile

---

## ⬜ TODO — Medium (0/27)

### Performance
- [ ] **M1.** `StarField.tsx` — debounce resize (200ms), early return при light theme, CSS animations вместо canvas
- [ ] **M2.** `Aurora.tsx` — three.js не е lazy-imported (1.2 MB chunk). Wrap Globe с `lazy()`
- [ ] **M3.** `Aurora.tsx:82-111` — auroraTexture useMemo не dispose-ва стария texture *(частично оправено в H9 — dispose се прави в useEffect, но useMemo още връща нов обект)*
- [ ] **M4.** Shared poller hook — централизирай `getKpIndex()` polling (Dashboard 60s, Forecast 5m, Home 60s, Navigation 5m)
- [ ] **M5.** `SvgBarChart.tsx`, `SvgStackedBars.tsx` — wrap в `React.memo`
- [ ] **M6.** `Dashboard.tsx` countdown setInterval 1s re-render цял Dashboard → изнеси в memo'd подкомпонент
- [ ] **M7.** `AuthContext.tsx:59,75` — добави AbortController на Supabase queries
- [ ] **M8.** `TimeSeriesChart.tsx` — chart cleanup без `chart.remove()` (1-5 MB leak per navigation)

### Native
- [ ] **M9.** iOS `Info.plist` — `LocationWhenInUse` деклариран без Geolocation plugin. Премахни или имплементирай
- [ ] **M10.** Android adaptive icon липсва в `mipmap-anydpi-v26/` — регенерирай с monochrome layer за Android 13+
- [ ] **M11.** `proguard-rules.pro` — добави keep rules за Capacitor *(вече направено в C4)* ✅

### SEO
- [ ] **M12.** Канонични URL-и динамични — замени с статични `https://thestormwatcher.com/...`
- [ ] **M13.** Twitter Card tags непълни — добави `twitter:title`, `twitter:description`, `twitter:creator`
- [ ] **M14.** `vercel.json` без Cache-Control *(вече направено в H7)* ✅
- [ ] **M15.** `sitemap.xml` пропуска: about, alerts, forecast, pricing, privacy, terms, magnetic-effects

### Design
- [ ] **M16.** Border radius inconsistent — дефинирай scale
- [ ] **M17.** Heading sizes хаотични — дефинирай h1/h2/h3 scale в Tailwind
- [ ] **M18.** `Dashboard.tsx:304` — duplicate `sm:text-lg sm:text-lg sm:text-2xl` (typo)
- [ ] **M19.** Добави `@media (prefers-reduced-motion: reduce)` в `index.css`
- [ ] **M20.** `Home.tsx` — 6 от 8 feature cards са "Coming Soon" с `opacity-60`
- [ ] **M21.** `Profile.tsx` — няма confirmation dialog преди account deletion
- [ ] **M22.** Добави глобален ErrorBoundary около routes в `App.tsx` *(вече има ErrorBoundary, но може да се разшири)*
- [ ] **M23.** Skeleton shimmer не се вижда в light mode

### Code Quality
- [ ] **M24.** 27 `console.error` → замени със `Sentry.captureException()`
- [ ] **M25.** Date formatting дублирано 21+ пъти → изнеси в `utils/dateFormat.ts`
- [ ] **M26.** `Pricing.tsx:99` — `void session;` workaround
- [ ] **M27.** Hardcoded meta description в `Home.tsx:180` → премести в locale keys
- [ ] **M28.** Test coverage минимална — добави unit tests + Playwright e2e за auth flow

---

## ⬜ TODO — Low (0/12)

### Performance
- [ ] **L1.** Reduce blur в `.solar-orb`/`.magnetic-orb` (60px → 40px)
- [ ] **L2.** Добави Sentry performance monitoring в Service Worker

### Native
- [ ] **L3.** Widget `Info.plist` — bundle version да наследи от main app
- [ ] **L4.** AGP версия не pin-ната — добави в `build.gradle`
- [ ] **L5.** `AppDelegate` `requestAuthorization()` на launch → премести към explicit user gesture

### SEO
- [ ] **L6.** Heading hierarchy одит за всяка страница
- [ ] **L7.** Manifest `short_name` mismatch с `index.html` title
- [ ] **L8.** Verify `public/og-image.png` е 1200x630

### Design
- [ ] **L9.** Touch target — close button `BottomTabBar.tsx:140` е 28px (под 44px WCAG) → `w-10 h-10`
- [ ] **L10.** Bottom sheet appears instantly — добави `slide-in-from-bottom` animation
- [ ] **L11.** `Pricing.tsx` subscription card border inline style → Tailwind utility

### Code Quality
- [ ] **L12.** Премини на React Query/SWR за централизирано data fetching

---

## ⬜ TODO — Deployment Gaps

- [ ] Privacy policy URL в App Store Connect
- [ ] Apple App Tracking Transparency (ако има tracking)
- [ ] Play Store data safety form
- [ ] Universal Links: `apple-app-site-association` файл
- [ ] Android App Links: `assetlinks.json` файл

---

## Статистика
- **Critical:** 5/5 ✅
- **High:** 7/24 (H6 и H3 са special cases — H6 направено с C1, H3 skip)
- **Medium:** 0/27 (M11 и M14 вече направени като части от C4/H7)
- **Low:** 0/12
- **Следващо:** H11 (og-image WebP), H14 (Android backup rules), H15-H18 (SEO/Helmet), H19 (light mode fix)
