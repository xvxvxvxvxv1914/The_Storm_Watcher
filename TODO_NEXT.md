# The Storm Watcher — Следваща сесия

Последен commit: `f8973a9` (2026-05-14)

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
- 1 WARN в audit остава незатворен без Pro

---

## 🟡 ТЕХНИЧЕСКИ (може автоматично)

### iOS DEVELOPMENT_TEAM в xcconfig
- `/ios/debug.xcconfig` и нов `release.xcconfig` трябва да включват:
  `DEVELOPMENT_TEAM = <твоят Apple Team ID>`
- Нужен е платен Apple Developer акаунт ($99/год)

### CSP report-uri (M6)
- Добавяне на Sentry CSP endpoint в `vercel.json` за violation tracking
- Изисква Sentry проект с DSN

---

## ✅ НАПРАВЕНО В ПОСЛЕДНИТЕ 2 СЕСИИ

**UX подобрения:**
- Aurora Globe ErrorBoundary (спира infinite spinner)
- Livestream: LIVE badge / External label по камери
- ISS: подобрен empty state за пасажи (обяснение + link to Settings)
- Gallery: empty state с Upload button / Sign in CTA
- Hunt: leaderboard + recent sightings — насочващ текст
- Forecast карти: "No cloud data — set location" link
- Gallery: delete confirmation modal
- Profile: type-email-to-delete guard
- Mood: показва час на submitted
- Hunt: cooldown обяснение
- Alerts: error card + retry при total failure

**Code quality:**
- useEffect deps fix: SkyVisibility, Hunt, Gallery, Aurora, UV, SunTimes
- Settings: LocationPicker (city search) + GPS reverse geocode
- logError migration: donkiApi, uvApi, skyApi, nigggApi, Dashboard, Home, Mood
- Home Calendar card → `<Link to="/calendar">`
- Hunt `??/||` precedence bug fix

**Нови страници:**
- `/calendar` — Aurora Calendar (3-night outlook, hourly Kp bars, cloud cover)
- `/livestream` — 8 камери, iframe player, live badges
- `/gallery` — Community photos (Supabase Storage, compression, delete confirm)
- `/hunt` — Aurora Hunt gamification (sightings, badges, leaderboard)

**Сигурност (audit):**
- С1-С5 CRITICAL done
- H1-H13 HIGH done (H3 skip — payments disabled)
- M1-M4, M8, M10, M11, M14 MEDIUM done
- M5 useEffect deps — почти всички fixed

---

## 📦 STACK REMINDER
- React + TypeScript + Vite, Vercel, Supabase (srzfoxlmhxyulrgkchjr)
- Capacitor v8 (iOS + Android)
- Stripe payments hidden behind `VITE_PAYMENTS_ENABLED=false`
- Локали: en, bg, de, es, fr, ru, zh, ja — нови ключове само в en.ts + bg.ts (останалите fallback)
- `t('key') || 'fallback'` pattern навсякъде
- `LocationPicker` props: `{ lat, lon, locationName, onSelect, onRequestGPS }` (без compact/onChange)
- `getKpGradientStyle()` → CSS gradient (text-fill), `getKpColor()` → plain hex за background
