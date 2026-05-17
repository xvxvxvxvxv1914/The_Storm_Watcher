# The Storm Watcher — Следваща сесия

Последен commit: `757677b` (2026-05-17)

---

## ⚠️ ИЗИСКВА РЪЧНА НАМЕСА (не може автоматично)

### X Auto-posting — "Invalid consumer tokens"
- Отиди в [developer.twitter.com](https://developer.twitter.com) → твоя app
- Regenerate: Consumer Key, Consumer Secret, Access Token, Access Token Secret (4 токена)
- Обнови в Vercel: Settings → Environment Variables:
  - `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`
- Redeploy от Vercel dashboard

### Supabase Leaked Password Protection
- Изисква Supabase Pro план (~$25/мес)
- Supabase Dashboard → Authentication → Security → Enable leaked password check

### Sentry Source Maps (P9)
- Изисква `VITE_SENTRY_DSN` в Vercel env vars
- Сетъп: `npm install @sentry/vite-plugin` + добави в vite.config.ts
- После: `SENTRY_AUTH_TOKEN` в Vercel за upload при build

### M6 — CSP report-uri
- Изисква Sentry проект с DSN
- Добави в `vercel.json`: `report-uri https://o...sentry.io/api/.../security/?sentry_key=...`

### M9 — iOS DEVELOPMENT_TEAM
- Изисква платен Apple Developer акаунт ($99/год)
- `/ios/debug.xcconfig` и `release.xcconfig`: `DEVELOPMENT_TEAM = <твоят Apple Team ID>`

### M12 — Password strength (Supabase Dashboard)
- Supabase Dashboard → Authentication → Policies → задай минимум 10 char + complexity

---

## ✅ НАПРАВЕНО В ПОСЛЕДНИТЕ 3 СЕСИИ

**Сигурност (audit 2026-05-12):**
- C1–C5 CRITICAL ✅
- H1–H13 HIGH ✅ (H3 skip — payments disabled)
- M1–M14 ✅ (M6/M9/M12/M13 — manual/pending)
- L1–L3 ✅ (L2 localStorage cleanup на logout, L3 a11y OK)

**Performance:**
- P3: charts-vendor изключен от PWA precache (1.59 MiB → 1.37 MiB) ✅
- P6: Globe пауза при off-screen (IntersectionObserver) ✅
- P8: mood.submittedAt i18n ключ добавен ✅
- P10: husky + lint-staged pre-commit hooks ✅
- P11: GitHub Actions CI/CD (вече беше направено) ✅

**UX подобрения:**
- Aurora Globe ErrorBoundary (спира infinite spinner)
- Livestream: LIVE badge / External label по камери
- ISS: подобрен empty state за пасажи
- Gallery: empty state + Upload button / Sign in CTA
- Hunt: leaderboard + recent sightings насочващ текст
- Gallery/Hunt: useCallback за loadData/fetchPhotos
- Settings: LocationPicker (city search) + GPS reverse geocode
- Home Calendar card → `<Link to="/calendar">`
- Hunt `??/||` precedence bug fix
- logError migration: всички сервиси

**Нови страници:**
- `/calendar` — Aurora Calendar (3-night outlook, hourly Kp bars, cloud cover)
- `/livestream` — 8 камери, iframe player, live badges
- `/gallery` — Community photos (Supabase Storage, compression, delete confirm)
- `/hunt` — Aurora Hunt gamification (sightings, badges, leaderboard)

---

## 📦 STACK REMINDER
- React + TypeScript + Vite, Vercel, Supabase (srzfoxlmhxyulrgkchjr)
- Capacitor v8 (iOS + Android)
- Stripe payments hidden behind `VITE_PAYMENTS_ENABLED=false`
- Локали: en, bg — нови ключове само в en.ts + bg.ts (останалите fallback)
- `t('key') || 'fallback'` pattern навсякъде
- `LocationPicker` props: `{ lat, lon, locationName, onSelect, onRequestGPS }` (без compact/onChange)
- `getKpGradientStyle()` → CSS gradient (text-fill), `getKpColor()` → plain hex за background
- Pre-commit hook: eslint + tsc (lint-staged + husky)
- CI: GitHub Actions — typecheck, lint, vitest, build, playwright
