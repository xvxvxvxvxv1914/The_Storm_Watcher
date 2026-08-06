# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Отговори

Кратко и ясно. Без дълги обяснения, без изброяване на алтернативи, които няма да следваш. Казвай какво си направил и какъв е резултатът.

Изключение: когато има намерен бъг, риск или нещо непотвърдено — това се казва изрично, дори да удължи отговора. Кратко не значи да се премълчава лоша новина.

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

Android — gradle pins JDK 21, and the only system JDK is Temurin 25, so
`./gradlew` fails with "Cannot find a Java installation matching {languageVersion=21}"
unless you point it at Android Studio's bundled JBR:
```bash
npm run build && npx cap sync android
cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./gradlew installDebug     # assembleDebug to build without installing
```

iOS device build (headless). **The Apple team is free/personal**, which cannot sign
Push Notifications or Associated Domains — a plain build fails at signing. Override
the entitlements to app-groups-only (App Groups *is* provisioned); never edit
`App.entitlements` itself:
```bash
npx cap sync ios
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination 'id=<device-udid>' -allowProvisioningUpdates \
  CODE_SIGN_ENTITLEMENTS=/tmp/AppGroupsOnly.entitlements build
xcrun devicectl device install app --device <udid> <path>/App.app
```
Free-team provisioning profiles expire ~7 days after they are issued; the app stops
launching until rebuilt. Profiles live in `~/Library/Developer/Xcode/UserData/Provisioning Profiles`
(Xcode 16 moved them — the old `~/Library/MobileDevice/…` path is empty and misleading).

Read the shared App Group cache off a connected device (useful for checking what the
widget actually sees):
```bash
xcrun devicectl device copy from --device <udid> --user mobile \
  --domain-type appGroupDataContainer --domain-identifier group.com.stormwatcher.app \
  --source Library/Preferences/group.com.stormwatcher.app.plist --destination /tmp/ag.plist
plutil -p /tmp/ag.plist
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

### iOS widget data flow
The widget does **not** receive data from the React app — there is no JS→widget channel. Two independent Swift paths fill it, and both must agree with what the app shows:

1. `AppDelegate.refreshWidgetData()` — runs every 60s while the app is foregrounded, plus a `BGAppRefresh` task (~15 min, heavily throttled by iOS). Writes the App Group cache and calls `WidgetCenter.reloadTimelines(ofKind: "StormWidget")`.
2. `KpProvider.fetchAll()` in `StormWidget.swift` — reads the cache when fresh (`sharedDataMaxAge`, 5 min) and otherwise fetches on its own. This is the path that runs hours after the app was last opened, so it is the one that decides what the widget usually displays.

Both go through **`ios/App/StormWidget/KpSource.swift`**, a file shared by the App and StormWidget targets (like `StormActivityAttributes.swift` — one `PBXFileReference`, one `PBXBuildFile` per target). It mirrors the JS cascade in `getKpIndex`: **GFZ primary, NOAA fallback**.

Keeping that source aligned is load-bearing, not cosmetic. GFZ publishes stable 3-hour bins; NOAA's `estimated_kp` is a per-minute estimate that swings between them (0.33 → 0.67 → 0.33 across consecutive minutes while GFZ held 0.333). When the widget fetched NOAA while the app read GFZ, the two surfaces showed different numbers. **There are now three implementations of this cascade** — `getKpIndex` in [src/services/noaaApi.ts](src/services/noaaApi.ts), `KpSource.swift`, and `KpSource.kt` (Android, see below). Change one endpoint and you must change all three, or the divergence comes straight back.

Cache keys in `group.com.stormwatcher.app`: `widget_kp` / `widget_updated`, and `widget_wind` / `widget_wind_updated`. Kp and wind carry separate timestamps deliberately — they used to be written only as a pair, so a solar-wind outage discarded a perfectly good Kp. `-1` is the "no data" sentinel; **Kp 0.0 is a real ultra-quiet reading**, so freshness (never the value) decides whether the cache is usable.

### Android widget (Glance)
`android/app/src/main/java/com/stormwatcher/app/widget/` — a Jetpack Glance app
widget, the Android counterpart of the iOS one. Three responsive layouts
(2×2 / 4×2 / 4×4) instead of iOS's six families; Android has no lock-screen widgets.

- **`KpSource.kt`** repeats the same GFZ→NOAA cascade as the Swift and JS versions
  (see above). Plain `HttpURLConnection` + `org.json` — no HTTP or JSON library was
  added for it.
- There is **no App Group and no JS→widget channel here**. The widget is the only
  writer of its `SharedPreferences` cache (`storm_widget`), which exists so several
  widget instances updating together fetch once. Key names and the split Kp/wind
  timestamps mirror iOS; `-1` is the "no data" sentinel and Kp 0.0 is real data.
- `updatePeriodMillis` is 30 min — the platform floor. Smaller values are clamped
  silently.
- Kotlin and the Compose compiler are in the build **only** for this widget; the
  Capacitor app itself is still Java. Both plugins are pinned to `kotlinVersion`
  in `android/build.gradle` and must move together.
- Widget strings live in `res/values*/strings.xml` across the same 16 locales as
  the app. Adding those folders makes lint fail any untranslated string in
  `values/strings.xml`, which is why the four Capacitor-generated ones are marked
  `translatable="false"`.

### i18n
Translation keys live in `src/locales/{en,bg,da,de,es,fi,fr,is,ja,ko,no,pl,ru,sv,uk,zh}.ts` as flat `Record<string, string>`. The `useLanguage()` hook provides `t(key)`. All 16 locales must stay in sync — there is a completeness test at `src/locales/localeCompleteness.test.ts`.

Long-form page content lives in `src/content/`, **one file per language**: `faq/{lang}.ts` (FAQ) and `magnetic/{lang}.ts` (Magnetic Effects). `faqContent.ts` / `magneticEffectsContent.ts` keep only the types plus a `loadFaq(lang)` / `loadMagnetic(lang)` dynamic-import loader, mirroring how `LanguageContext` loads `src/locales/`. They used to be single `Record<lang, …>` literals, which shipped all 16 translations (176 kB + 90 kB) in the route chunk to render one; the split cut the FAQ page's JS from 176 kB to ~17 kB.

Both are consumed **positionally** — FAQ answers map to categories by index (`faqCategories` in `src/pages/FAQ.tsx`), magnetic sections to icons by index (`sectionMeta` in `src/pages/MagneticEffects.tsx`) — so adding or reordering an entry means touching the same index in all 16 files. `src/content/contentCompleteness.test.ts` enforces the parity and pins the expected counts; `src/pages/longFormContent.test.tsx` asserts the loaders actually resolve (a broken loader renders a permanent skeleton, not a build error).

The FAQ's `FAQPage` JSON-LD is **not** rendered by React — `scripts/prerender-meta.mjs` injects it into each prerendered `/faq` HTML variant in that page's own language, so it needs no JS to be crawled and the structured data matches the visible Q&A (the old client-side version always declared the English questions, even on `/de/faq`).

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
2. App Group sharing — чете `widget_kp`/`widget_updated` и `widget_wind`/`widget_wind_updated` от `group.com.stormwatcher.app`. Преизползвай `KpSource.swift` (виж „iOS widget data flow") вместо нов fetch — иначе часовникът ще показва различно число от приложението, точно както widget-ът правеше до 2026-07-20.
3. WatchConnectivity (WCSession) за live sync от iOS при отворено приложение
4. SwiftUI интерфейс: тъмен фон, aurora зелено (#10b981), orange (#f97316) за high Kp
5. Complications в `CLKComplicationDescriptor` формат

## TODO / Pending Work

### Mobile одити 2026-06-11 и 2026-07-19/20 — статус
Поправено дотук: NSCameraUsageDescription, launch-time permission промпт, widget версии, storm safe-area падинг, deep link allowlist, дублирани push listener-и, autoVerify, Kp 0.0 widget логика, пълна локализация на widget + Live Activity (16 езика), CFBundleLocalizations, InfoPlist.strings (16 lproj), universal links (AASA + entitlement + App.tsx handler), **CODE_SIGN_ENTITLEMENTS верзан** (беше сирак — build-овете се подписваха без app groups/aps!), Android FCM код (manifest permission, hook без iOS gate, FCM v1 в send-kp-alerts). Live Activity tap → /alerts е свободна страница (не paywall) — решено.

**Остава (изисква акаунти/устройства):**
1. **Платено Apple Developer членство** — ПРЕДПОСТАВКА за всичко останало по iOS. Установено 2026-07-20: екип `2W6YCTFKNA` е **безплатен/личен**, не платен. Xcode отказва: „Personal development teams do not support the Associated Domains and Push Notifications capabilities".
   Това обезсмисля предишната формулировка на тази точка („един Xcode GUI build да добави capability-тата") — GUI-ят удря същата стена, проблемът не е headless vs GUI, а правата на екипа. Блокира: push нотификации, universal links, Live Activity push токени (`ActivityInput error 0` вероятно е точно оттук), TestFlight и App Store.
   Дотогава device build-овете минават с app-groups-only entitlements override (виж Commands) — App Groups работи, значи widget-ът и Live Activity Phase A са тестваеми.
2. **Android FCM активация** — Firebase Console: `google-services.json` в `android/app/`; service account JSON като `GOOGLE_SERVICE_ACCOUNT` secret в Supabase; `supabase functions deploy send-kp-alerts`. Кодът е готов и guard-нат — без secret-а функцията е байт-идентична.
   **ЗАДЪЛЖИТЕЛНО след добавяне на `google-services.json`:** махни `if (isAndroid()) return;` от `register()` в `src/hooks/usePushNotifications.ts`. Този gate е временен — без него `register()` хвърля native `IllegalStateException` („Default FirebaseApp is not initialized"), която JS не може да хване и която убива процеса ~3s след старт (потвърдено на Galaxy A34 / Android 16, 2026-07-20). Докато gate-ът стои, Android push не работи изобщо.
3. **assetlinks.json** — още е с `YOUR_SHA256_FINGERPRINT_HERE`; SHA-256 от Play Console → Setup → App signing.
4. ~~**Android Glance widget**~~ — написан 2026-08-05 (виж „Android widget (Glance)"). Компилира се и се мърджва в манифеста, но **още не е пускан на екран** — няма свързано устройство. Първото пускане да провери: рендерира ли се на 2×2/4×2/4×4, минава ли мрежата от widget процеса, работи ли tap → `stormwatcher://dashboard`.
5. ~~**Android 15 edge-to-edge тест**~~ — проверено 2026-07-20 на Galaxy A34 / **Android 16 (API 36)**, тъмна тема: header-ът започва под статус бара, таб барът стои над системната навигация, няма отрязване. Уговорка: гледан е един екран (UV Index), не пълен обход на всички страници и не в светла тема.
6. **Push-to-start Live Activity (iOS 17.2+)** — сървърът да вдига Live Activity при буря без отворено приложение; тества се само в TestFlight (dev-signed build-ове не дават push токени).

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
