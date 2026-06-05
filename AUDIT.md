# Storm Watcher — Одит и TODO

Генериран: 2026-06-05. Работи се от горе надолу по приоритет.

---

## Приоритет 1 — Бързи оправки (< 30 мин всяка)

- [x] **Theme: prefers-color-scheme при first load**
  - Файл: `src/contexts/ThemeContext.tsx` ред 17
  - Fix: `if (saved === 'light' || saved === 'dark') return saved; return window.matchMedia(...)` ✓

- [x] **Accessibility: aria-label на иконни бутони в Navigation и BottomTabBar**
  - Всички icon-only бутони вече имат aria-label (theme toggle, lang, user menu, bell, close) ✓

- [x] **prefers-reduced-motion в JS анимациите (Framer Motion)**
  - Файл: `src/App.tsx` — добавен `<MotionConfig reducedMotion="user">` глобално ✓

- [x] **offline.html — добави превод на BG поне**
  - Файл: `public/offline.html` — добавен JS language detection за 8 езика (bg, de, es, fr, ru, ja, zh) ✓

---

## Приоритет 2 — SEO подобрения

- [x] **Провери и обнови llms.txt**
  - Добавени липсващи страници: Gallery, Hunt, Livestream, Referrals ✓

- [x] **Sitemap.xml — автоматично regenerate**
  - `scripts/generate_sitemap.py` обновен: per-post дати, fixed ISS slug (`what-is-iss-how-to-track`)
  - `package.json` build script добавен: `python3 scripts/generate_sitemap.py &&` преди vite build ✓

- [x] **BlogPost OG image — динамичен title в изображението**
  - `api/og.tsx` разширен с `?type=blog&title=...&emoji=...&category=...` handler ✓
  - `BlogPost.tsx` подава динамичен `image` prop на PageMeta ✓

---

## Приоритет 3 — Accessibility (по-голям обхват)

- [x] **Charts — role="img" + aria-label**
  - `TimeSeriesChart`, `SvgBarChart`, `SvgDonut` — добавен `ariaLabel` prop + `role="img"` ✓
  - Call-сайтове в Dashboard, Forecast, UV, Mood — подадени конкретни описателни label-и ✓

- [x] **Focus-visible outline**
  - Вече съществува в `src/index.css` (ред 340): `*:focus-visible { outline: 2px solid #10b981; }` ✓

- [x] **Color-only индикатори**
  - Всички цветни индикатори вече имат text label: Kp badge → `stormStatus.statusKey`, Bz → числов знак, Storm Watch → G1–G5 текст ✓

---

## Приоритет 4 — Тестове

- [x] **Component тест за PlanGuard**
  - Нов `src/utils/planAccess.ts` — логиката е извлечена в чиста функция (testable без env)
  - Нов `src/components/PlanGuard.test.tsx` — 14 теста: free/pro/premium, trialing, referral expiry, native bypass, dev mode ✓
  - `vitest.config.ts` обновен: globals=true, setupFiles, .tsx включени ✓
  - Бележка: `noaaApi.test.ts` има pre-existing timeout flake (не е от одита)

- [x] **Auth flow тест (E2E)**
  - Файл: нов `e2e/auth.spec.ts` — 7 теста: login form, invalid credentials, signup mode, successful signup, verify=pending URL, forgot password, reset confirmation ✓

- [x] **Stripe webhook тест — edge cases**
  - Файл: `api/stripe/webhook.test.ts` — добавени 3 теста за `trial_will_end`: sends email с daysLeft, skips when no userId, skips when no email ✓

---

## Приоритет 5 — Нови функции (по стойност)

- [x] **Location-based aurora alerts** ✓
  - `supabase/functions/send-kp-alerts/` + `src/hooks/usePushNotifications.ts` обновени
  - DB migration: `push_subscriptions` + `favorite_locations` с lat/lon columns

- [x] **Storm Event Share Card** ✓
  - Share бутон в Dashboard header, Web Share API + canvas fallback

- [x] **Aurora Personal Log / Diary** ✓
  - Нова страница `/log`, Supabase таблица `aurora_sightings`

- [x] **Contact форма страница** ✓
  - `/contact` с форма → Supabase backend

- [x] **Седмичен email digest (Space Weather)** ✓
  - `supabase/functions/send-weekly-digest/index.ts` — Resend, NOAA 3-day Kp, weekly HTML email
  - `profiles.weekly_digest` column (migration 20260605000001)
  - Settings.tsx — toggle (auth-aware), всички 16 локала
  - Cron migration 20260605000002 (MANUAL) — Monday 08:00 UTC

- [x] **Light pollution overlay в Aurora Map** ✓
  - Toggle бутон в AuroraMap.tsx + `showLightPollution` prop на AuroraHeatmap
  - NASA GIBS VIIRS Black Marble tile layer (безплатен, CORS-enabled)
  - Всички 16 локала обновени

- [x] **Dashboard widget персонализация** ✓
  - HTML5 drag-and-drop на 4-те stat cards (Kp, Wind, Bz, X-ray)
  - localStorage persistence (`tsw_dashboard_order`)
  - GripVertical handle (hover) + ring highlight на drop target


---

## Mobile / IAP (отделен track — преди App Store submission)

- [ ] `npm install @capgo/capacitor-purchases && npx cap sync`
- [ ] Създай продукти в App Store Connect (4 SKU)
- [ ] Създай продукти в Google Play Console (4 SKU)
- [ ] Добави secrets в Supabase: `APPLE_SHARED_SECRET`, `GOOGLE_SERVICE_ACCOUNT`
- [ ] Deploy: `supabase functions deploy verify-iap --project-ref srzfoxlmhxyulrgkchjr`
- [ ] Uncomment plugin calls в `src/hooks/useIAP.ts`
- [ ] Настрой APNS certificates (Apple Developer account)
- [ ] Настрой FCM credentials (Google Firebase)

---

## Бележки

- Stripe API версия `2026-04-22.dahlia` — изглежда валидна за текущата дата, не е грешка
- Всички 30 pages имат PageMeta/Helmet — SEO baseline е ОК
- FAQPage schema ✓ в FAQ.tsx, Article schema ✓ в BlogPost.tsx — добре
- IAP блокира App Store / Play Store submission докато не е завършен
