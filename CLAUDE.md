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
PW_CHANNEL=chrome npm run test:e2e   # ...against an installed Chrome
```

The bundled Playwright browser is a large download and can fail to install on
this machine; `PW_CHANNEL=chrome` runs the suite against Google Chrome instead.
CI leaves it unset and uses the pinned browser.

Run a single test file:
```bash
npx vitest run src/services/nigggApi.test.ts
```

Mobile (requires Xcode):
```bash
npm run ios:open     # Build + sync + open Xcode
npm run ios:livereload  # Live reload on device
```

Android **on macOS** — gradle pins JDK 21, and the only system JDK there is
Temurin 25, so `./gradlew` fails with "Cannot find a Java installation matching
{languageVersion=21}" unless you point it at Android Studio's bundled JBR:
```bash
npm run build && npx cap sync android
cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./gradlew installDebug     # assembleDebug to build without installing
```

Android **on the Windows machine** — none of that applies: Temurin **21** is the
system JDK and is already on PATH, so `gradlew.bat` runs with no `JAVA_HOME`
override and there is no Android Studio to borrow a JBR from. Only the SDK is
installed, and `adb` is not on PATH:
```powershell
npm run build; npx cap sync android
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android; .\gradlew.bat assembleDebug --console=plain
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r `
  app\build\outputs\apk\debug\app-debug.apk
```
A first clean build is ~4 min (Kotlin + the Compose compiler for the Glance
widget); incremental ones are 10-25s.

**Installing over a build signed on the Mac fails** with
`INSTALL_FAILED_UPDATE_INCOMPATIBLE` — the two machines have different debug
keystores. The only way through is `adb uninstall com.stormwatcher.app` first,
which wipes the app's data on the device (settings, saved location, local cache).

### Driving the device from the terminal

Synthetic swipes and taps are unreliable on One UI — they open the app drawer,
land on the wrong home page, or hit a widget and launch the app. Navigate the
app by deep link instead, which goes straight to the route:
```powershell
& $adb shell am start -a android.intent.action.VIEW -d "stormwatcher://forecast" com.stormwatcher.app
```
Screenshots must go through device storage. `adb exec-out screencap -p > out.png`
**corrupts the file in PowerShell** — the redirect adds a BOM and re-encodes the
binary, and the result is not a valid PNG:
```powershell
& $adb shell screencap -p /sdcard/s.png; & $adb pull /sdcard/s.png out.png; & $adb shell rm /sdcard/s.png
```
The screen sleeps between steps and blanks the capture; `adb shell svc power
stayon true` holds it while the device is charging (**set it back to `false`
afterwards**).

Judge colour by sampling pixels out of the PNG, not by eye — screenshots are
1080px downscaled in review, and that is how the widget's Kp scale was caught
rendering 5 segments instead of 18, and how the storm badge was confirmed as
`#F97316` against the gauge band. `uiautomator dump` is useless for anything
inside the app: WebView exposes no accessibility tree, so the dump contains one
opaque `android.webkit.WebView` node and none of the page's text.

A debuggable build also raises a system "Android App Compatibility" dialog on
every fresh install (the 16 KB page-size warning). It covers the page and will
silently invalidate a screenshot or a pixel sample taken right after installing —
dismiss it before capturing.

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
Custom service worker at `src/sw.ts` using Workbox. Two groups are excluded from the precache:

- **Heavy 3D chunks** (`globe-vendor`, `three-vendor`, `charts-vendor`, `map-vendor`) — loaded on demand, left to the browser cache.
- **`assets/ondemand/**`** — the 16 locales, the 16 FAQ and magnetic translations and the ten blog articles. These are cached at runtime by a `CacheFirst` route in `src/sw.ts` instead, so a page works offline once it has been opened online. Precaching them made the install 2.6 MB, of which 1.3 MB was content a visitor uses one sixteenth of — undoing for PWA users exactly what splitting these files won for web visitors. **The tradeoff is deliberate:** a language or article never opened while online is not available offline.

`chunkFileNames` in `vite.config.ts` routes those modules into `assets/ondemand/` **so the exclusion can be by path, not by filename** — `is-<hash>.js` could be the Icelandic locale or a chunk from a package called `is`, and precaching the wrong set fails silently either way. The two lists must stay in sync.

### Capacitor (mobile)
`CapacitorHttp` is enabled globally — it patches `fetch()` on native to bypass WKWebView CORS for third-party APIs. This means native builds can call NOAA/GFZ/NIGGG directly without going through the Vercel proxy.

### Android Material skin (Android build only)

The same React bundle serves web, iOS and Android, so the Android app gets a
Material 3 look through a **scoped CSS layer plus two component branches** — no
fork, no second build.

- `applyPlatformClass()` (`src/utils/platform.ts`) puts `md3` on `<html>` when
  Capacitor reports Android. It runs in `main.tsx` **before `createRoot`**, not in
  an effect: set later, the iOS chrome paints for a frame and then swaps. In dev
  only, `?md3=1` / `?md3=0` forces it either way for browser checks.
- `src/styles/material.css` is the whole skin, every rule scoped under `html.md3`.
  Web and iOS never match those selectors, so this file cannot regress them.
- Components read `isMaterial()` (reads the class, so the dev override applies to
  JSX too) — `Navigation` renders an M3 top app bar, `BottomTabBar` an M3
  navigation bar with the active-indicator pill, `StarField` returns null.

**Colour carries meaning — flatten gradients to their own hue, never to a token.**
The storm badge on Home picks its gradient from the Kp bands (red 7+, orange 5+,
yellow 4+, green below), the same bands as the gauge and both widgets. A first
version mapped the orange and green gradients onto `--md-primary`, which turned a
live G1 badge green: it flattened the severity signal along with the gradient.
Every `from-[…]` now flattens to that exact colour.

Two more traps, both found only on a device:

- **No `letter-spacing` on `body`.** M3's per-role tracking looks right in
  isolation but inherits everywhere and *adds* to Tailwind's `tracking-wide`, which
  this app puts on 10px labels. Inside the three-up card grid that was enough to
  wrap "Peak Kp · 7 days" onto two lines.
- **The fixed nav wrapper carries the safe-area inset, so it — not the bar inside
  it — must be painted.** Left transparent, page content scrolls up into the
  status-bar strip and shows above the app bar.

Verify on a device, not by reading CSS. `adb shell am start -a
android.intent.action.VIEW -d "stormwatcher://<route>"` navigates without synthetic
taps, and sampling pixels out of `screencap` beats judging a downscaled screenshot
by eye — that is how the storm badge was confirmed as `#F97316` against the gauge
band. Note `uiautomator dump` is useless here: WebView content has no accessibility
tree, so the dump shows one opaque `android.webkit.WebView` node.

### iOS widget data flow
The widget does **not** receive data from the React app — there is no JS→widget channel. Two independent Swift paths fill it, and both must agree with what the app shows:

1. `AppDelegate.refreshWidgetData()` — runs every 60s while the app is foregrounded, plus a `BGAppRefresh` task (~15 min, heavily throttled by iOS). Writes the App Group cache and calls `WidgetCenter.reloadTimelines(ofKind: "StormWidget")`.
2. `KpProvider.fetchAll()` in `StormWidget.swift` — reads the cache when fresh (`sharedDataMaxAge`, 5 min) and otherwise fetches on its own. This is the path that runs hours after the app was last opened, so it is the one that decides what the widget usually displays.

Both go through **`ios/App/StormWidget/KpSource.swift`**, a file shared by the App and StormWidget targets (like `StormActivityAttributes.swift` — one `PBXFileReference`, one `PBXBuildFile` per target). It mirrors the JS cascade in `getKpIndex`: **GFZ primary, NOAA fallback**.

Keeping that source aligned is load-bearing, not cosmetic. GFZ publishes stable 3-hour bins; NOAA's `estimated_kp` is a per-minute estimate that swings between them (0.33 → 0.67 → 0.33 across consecutive minutes while GFZ held 0.333). When the widget fetched NOAA while the app read GFZ, the two surfaces showed different numbers. **There are now four implementations of this cascade** — `getKpIndex` in [src/services/noaaApi.ts](src/services/noaaApi.ts), `KpSource.swift`, `KpSource.kt` (Android, see below), and `fetchCurrentKp` in [supabase/functions/send-kp-alerts/index.ts](supabase/functions/send-kp-alerts/index.ts). Change one endpoint and you must change all four, or the divergence comes straight back. The cron is not cosmetic: its Kp decides *whether an alert fires at all*, so when it was NOAA-only a GFZ 5.0 / NOAA 4.67 split was a storm the app displayed and the phone never announced.

The contract they share is [src/services/kpSource.contract.json](src/services/kpSource.contract.json) — endpoints, field priority and null handling in one place. `src/services/kpContract.test.ts` pins the TypeScript implementation to it; the Swift, Kotlin and Deno copies are checked against it by hand. **Read it before touching any of the four.**

Inside the app, use `resolveKp(row)` from `noaaApi.ts` rather than writing the field priority out again. It used to be inline at nine call sites in three variants, two of which used `||` — which treats a genuine ultra-quiet **Kp 0.0 as missing** and silently shows the estimate instead.

Endpoints are not the only thing that has to match — two field-level rules bit us on 2026-08-06, both producing a widget number that disagreed with the app on the same phone:

- **NOAA fallback reads `kp_index` first, `estimated_kp` only as a backstop.** `estimated_kp` is the per-minute estimate; `kp_index` is the 3-hour bin, which is what GFZ (the primary) publishes. The widgets had the priority inverted.
- **GFZ trailing bins arrive as `null` until the period closes — skip back to the last real value, never substitute 0.** The JS side mapped null to 0, and since Kp 0.0 is a real ultra-quiet reading, nothing downstream could tell a fabricated 0 from a genuine one. `src/services/noaaApi.test.ts` covers this.

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

### IAP валидация (`verify-iap`)
Одитирана 2026-08-07, преди пускане — IAP още не е активен (плъгинът не е инсталиран), значи нищо от долното не е било експлоатирано.

- **Google даваше плана при неплатена сметка.** Условието отхвърляше само когато има `cancelReason` **и** `paymentState !== 1`, така че `paymentState: 0` („payment pending" — т.е. неплатено) минаваше и качваше абонамента. Сега се дава само при `1` (получено) или `2` (безплатен пробен). Таблица на решенията в комита.
- **Нямаше защита срещу повторно използване.** Разписката си остава валидна, независимо кой я представя, затова една реална покупка можеше да качи произволен брой акаунти — всеки получавайки честен „valid" отговор от магазина. Новата `iap_purchases` е ключирана по идентификатора на самия магазин (Apple `original_transaction_id`, Google purchase token). **Не е upsert** — това би позволило втори акаунт да презапише първия; прави insert и при `23505` проверява чий е редът.
- `plan` и `billing` идват от клиента и се интерполират в Play API URL-а — вече се валидират срещу разрешените стойности.

Остава несвършено: няма webhook за подновяване, тоест изтекъл IAP абонамент не сваля плана сам. `expires_at` вече се пази, така че периодична задача може да го направи.

### Изтриване на акаунт
`delete-account` проверява JWT-то с anon клиент и трие само `user.id`, така че никой не може да изтрие чужд акаунт. Всички таблици с лични данни имат `ON DELETE CASCADE` към `auth.users` (пряко или през `profiles`), с едно нарочно изключение:

`contact_messages.user_id` е `ON DELETE SET NULL`, за да оцелее историята на поддръжката. Но `name` и `email` са **отделни колони, не FK** — нулирането на връзката оставяше идентификаторите в таблицата и правеше изтриването да изглежда пълно, без да е. Функцията вече ги замества с `[deleted]` / `deleted@account.invalid` (запазена `.invalid` зона) преди да изтрие акаунта, и **отказва цялата операция**, ако анонимизирането не мине — половинчато изтриване е по-лошо от такова, което може да се повтори.

`mood_entries` няма FK към `auth.users` по замисъл — псевдонимна е (`user_session_id` + `ip_hash`), не е свързана със самоличност.

### Web push (браузър)
Сървърната половина съществуваше отдавна и беше **мъртва**: таблица `push_subscriptions` с пълни RLS политики, VAPID ключове в edge функцията, `push` handler в `src/sw.ts`, `VITE_VAPID_PUBLIC_KEY` подаван от CI — и `send-kp-alerts`, което честно я заявява на всеки 5 минути. Никой никога не викаше `pushManager.subscribe()`, значи заявката винаги връщаше нула реда.

- [src/hooks/useWebPush.ts](src/hooks/useWebPush.ts) прави абонамента и записва реда. Иска **влязъл потребител** — редът е собственост на `auth.uid()` под RLS.
- Без `VITE_VAPID_PUBLIC_KEY` хукът връща `unconfigured` и не прави нищо; остава само алармата в отворен таб (`useKpAlert`).
- Камбаната различава двете обещания: абонамент = известия при затворен таб; само разрешение = само докато табът е отворен. Ползва `push.subscribed` / `push.signInRequired` — низове, които вече съществуваха на 16 езика от по-ранен дизайн и не бяха свързани с нищо.
- Настройките (Kp праг, Bz) пътуват със записа и се синхронизират при промяна, иначе cron-ът филтрира по това, което е било вярно при абонирането.

### Bz ранно предупреждение (реализирано 2026-08-06)
Единствената аларма, която изпреварва бурята. Kp е ретроспективен 3-часов индекс, значи Kp алармата винаги съобщава за буря, която вече тече; устойчиво южно Bz предхожда покачването на Kp с 15–45 минути.

- Математиката е в [supabase/functions/send-kp-alerts/bz.ts](supabase/functions/send-kp-alerts/bz.ts) — **без Deno/npm импорти**, за да е тестваема с vitest (`bz.test.ts`; `vitest.config.ts` включва `supabase/functions/**`). Останалата част от edge функцията не е тестваема тук.
- `sustainedBz` връща **най-слабата** проба в прозореца, за да отговаря едно сравнение на „било ли е Bz под X през целия прозорец". Връща `null` при непълен прозорец или при дупка във feed-а — иначе „устойчиво 15 минути" тихо се изражда в „някога през последния час".
- NOAA rtsw feed-ът е **newest-first** (потвърдено на живо), затова редовете се сортират, а не се реже краят.
- Три неща я държат отделна от Kp алармата: собствена cooldown колона (`last_bz_notified_at`) — иначе прогнозата изяжда Kp алармата за същата буря; opt-in (`bz_alerts_enabled`, по подразбиране изключено); и текст, който казва „may" и назовава Bz, защото известието идва докато Kp още е ниско.
- Праговете са ограничени в `[-50, 0)` от DB constraint; при неюжно Bz секцията изобщо не пуска заявки.

### i18n
Translation keys live in `src/locales/{en,bg,da,de,es,fi,fr,is,ja,ko,no,pl,ru,sv,uk,zh}.ts` as flat `Record<string, string>`. The `useLanguage()` hook provides `t(key)`. All 16 locales must stay in sync — there is a completeness test at `src/locales/localeCompleteness.test.ts`.

Long-form page content lives in `src/content/`, **one file per language**: `faq/{lang}.ts` (FAQ) and `magnetic/{lang}.ts` (Magnetic Effects). `faqContent.ts` / `magneticEffectsContent.ts` keep only the types plus a `loadFaq(lang)` / `loadMagnetic(lang)` dynamic-import loader, mirroring how `LanguageContext` loads `src/locales/`. They used to be single `Record<lang, …>` literals, which shipped all 16 translations (176 kB + 90 kB) in the route chunk to render one; the split cut the FAQ page's JS from 176 kB to ~17 kB.

Both are consumed **positionally** — FAQ answers map to categories by index (`faqCategories` in `src/pages/FAQ.tsx`), magnetic sections to icons by index (`sectionMeta` in `src/pages/MagneticEffects.tsx`) — so adding or reordering an entry means touching the same index in all 16 files. `src/content/contentCompleteness.test.ts` enforces the parity and pins the expected counts; `src/pages/longFormContent.test.tsx` asserts the loaders actually resolve (a broken loader renders a permanent skeleton, not a build error).

### Blog data
Article bodies are 89% of the post payload, so they are split from the metadata the list page renders:

- `src/data/blog/posts/*.ts` — one full post each, fetched on demand via `loadPost(slug, lang)` in `src/data/blog/loadPost.ts`.
- `src/data/blog/metadata.ts` — **generated**, committed. Run `node scripts/generate-blog-metadata.mjs` after changing a post's title, description or translations; `blogMetadata.test.ts` fails on drift (same arrangement as `scripts/blog-translations.json`).
- `src/data/blog/index.ts` — every post, eagerly. **Never import it from a page** — it pulls all ten bodies (152 kB) into that chunk. It is for build-time consumers only: the prerender script, the metadata generator, the coverage tests. `CATEGORY_LABELS` lives in `categories.ts` for the same reason.

`/blog` went from ~157 kB to ~22 kB; a short article from ~157 kB to ~29 kB. `BlogPost` distinguishes "still loading" (`undefined`) from "no such slug" (`null`) — collapsing them into one falsy check redirects every visitor to `/blog` before the body arrives, which `BlogPost.test.tsx` checks.

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

### Докъде стигнахме (2026-08-08) — Android сесия на устройство

Първата сесия със **свързан Galaxy A34 (Android 16, API 36)**. Свършено и
проверено на екран: widget layout-ът, пълен Material 3 скин за Android (виж
„Android Material skin"), и обход на Home/Dashboard/Forecast/Alerts/Settings/
Pricing/Aurora/UV/FAQ/ISS/Mood/Sky в **двете теми**.

`typecheck` и `lint` чисти. **312/313 unit теста.** Падащият е
`blogMetadata.test.ts` и е **Windows-специфичен, не регресия**: `core.autocrlf=true`
дава `metadata.ts` с CRLF, генераторът бълва LF, байтовото сравнение гърми.
Проверено чрез stash на цялото дърво — пада и без никакви промени. Не пипай
файла, за да го „поправиш" — ще счупиш CI на Linux.

**Пуснато в main (2026-08-08).** Merge-ът прекара не само Android работата:
staging беше напред с 34 комита, значи в production отидоха и седмичният
дайджест (`kpWindow.ts`), DONKI native fix-ът, `submit-mood`, `donki-proxy`,
`middleware.ts` и промени в Alerts/Mood/Dashboard/Hunt/ISS. `20260605000002_weekly_digest_cron_MANUAL.sql`
е в main, но `_MANUAL` значи че **не се прилага само** — включването праща
истински имейли.

**Отворено след тази сесия:**

1. **Widget-ът спря да се рендира и причината е неизвестна.** След преинсталация
   изчезна от началния екран, докато инстанцията остава bound (`id=11`, host view
   401×216dp) и Glance продължава да push-ва RemoteViews **без изключение никъде в
   logcat** (`updateAppWidget() appWidgetIds = [11]`). Махането на `cornerRadius`
   не помогна — тоест хипотезата беше грешна. Най-вероятно launcher състояние след
   `isProviderChange` (логът показва `getDefaultView`), но това е предположение.
   **Следваща стъпка: махни widget-а от екрана и го сложи наново.** Ако пак е
   празен — проблемът е в кода, не в launcher-а.
2. **16 KB page size — ще блокира Play Store.** Устройството хвърля системен диалог
   „Android App Compatibility": `libsentry.so`, `libsentry-android.so` и
   `libdatastore_shared_counter.so` не са 16 KB подравнени. Google изисква това за
   приложения към Android 15+. Иска ъпгрейд на Sentry Android SDK и на
   androidx.datastore (Glance го тегли транзитивно).
3. **`.env` тук е с placeholder Supabase** (`https://placeholder.supabase.co`).
   Logcat: `Unable to resolve host`. В локалните Android build-ове backend-ът е
   мъртъв — sign in, mood, профил, favourites не работят. NOAA/GFZ минават, защото
   не са през Supabase.
4. **`ScrollToTop` покрива текст** на Home (отряза „Northern" на „Norther").
   Съществуващо на всички платформи, не е от редизайна — не е пипано.

### Докъде стигнахме (2026-08-07)
Одитът на шестте edge функции е **завършен**. 313 unit + 23 e2e теста минават локално.
`send-kp-alerts` (v9), `delete-account` и `verify-iap` са deploy-нати и проверени.

**Още не са deploy-нати:** `submit-mood` и `send-weekly-digest` (поправките от долния
раздел са само в кода).

**Не е проверено:** дали CI е зелен след днешните комити. На машината няма `gh` CLI;
локално всичко минава, но това не е runner-ът.

### Седмичният дайджест никога не е тръгвал (одит 2026-08-07)
Settings показва превключвател „Weekly digest", функцията е deploy-ната (v1) — и
**нито едно писмо не е излизало**. Три независими причини, всяка достатъчна:

1. **Няма cron.** `SELECT * FROM cron.job` съдържа само `send-kp-alerts-every-5min`;
   `20260605000002_weekly_digest_cron_MANUAL.sql` никога не е пускана.
2. **Дори пусната, щеше да върне 401.** Функцията е deploy-ната с `verify_jwt: true`,
   а cron-ът праща само `x-cron-secret` — gateway-ът отказва преди функцията да тръгне.
   `send-kp-alerts` работи именно защото е `verify_jwt: false` → deploy с `--no-verify-jwt`.
3. **И секретът щеше да е null** — `current_setting('app.cron_secret', true)` е NULL,
   освен ако GUC-ът не е зададен; работещият cron вместо това вписва стойността.

Поправеният MANUAL файл описва и трите. **Не е приложен** — включването праща
истински имейли, значи е решение на потребителя. Към момента 0 профила са opt-in.

Освен това вътре в самата функция (щяха да важат от първото писмо нататък):
- **Историята се четеше като масив от масиви с header ред.** NOAA
  `products/noaa-planetary-k-index.json` връща **обекти** (`{time_tag, Kp}`) и няма
  header, така че `raw[i][1]` даваше NaN на всеки ред: peak Kp тихо ставаше равен на
  текущия, а броят бури — винаги 0. Седмицата 31.07–07.08 връхна на Kp 5.67 и пак
  щеше да се съобщи като „no major storms".
- **Kp идваше само от NOAA** — пета имплементация на каскадата извън договора. Сега
  минава през GFZ → NOAA (`kpWindow.ts`, тестван).
- **Бурите се брояха на 3-часови кошчета**, не на епизоди: една 12-часова G1 е
  „4 geomagnetic storm events".
- **Етикетът казваше „Peak Kp (3 days)"** върху 7-дневен прозорец (177 ч).
- **Всички писма тръгваха наведнъж** — Resend на безплатен план дава 2 заявки/сек,
  значи излишъкът се връщаше 429 и се броеше за „failed" без повторен опит. Сега
  е последователно, ~1.7/сек, с един повторен опит при 429.

### DONKI на мобилно устройство изобщо не работеше
`donkiApi.ts` ползваше `/donki` — Vercel rewrite, който съществува само в уеб. На
native се разрешаваше спрямо Capacitor origin-а (`capacitor://localhost/donki`) и
връщаше 404 при всяко извикване, а `catch` връщаше `[]`: списъците с CME и изригвания
бяха постоянно празни на iOS и Android. Сега на native се вика upstream-ът директно
(CapacitorHttp заобикаля CORS), точно както прави `nigggApi`.

Затова и **`donki-proxy` не се вика от никого** — уеб минава през rewrite-а, native
вече отива директно. Функцията стои deploy-ната (`verify_jwt: true`); може да се
изтрие, но това е решение на потребителя.

### Светлата тема: приглушеният цвят е обърнат — чака решение
Визуален одит 2026-08-07 (30 маршрута × тъмна/светла, десктоп + мобилно): 0 console
грешки, 0 хоризонтално преливане, всички заглавия верни. Поправено е всичко под
2:1 контраст (виж комита). Остава едно, което е дизайнерско, не поправка:

`html.light .text-\[\#64748b\] { color: #94a3b8 }` в `index.css` прави приглушения
текст **по-светъл** върху по-светлия фон. На `#eef2f8` това е **2.56:1** — под AA
(4.5:1) — и оттам идват почти всички останали ~84 слаби места: футър линкове,
подписи под графики, етикети в Settings. Обръщането към по-тъмно (напр. `#475569`,
~7:1) ги затваря наведнъж, но променя вида на цялата светла тема — затова не е
пипнато.

**Втори случай от същото семейство, намерен 2026-08-08 — важи и за web.** Блокът
`html.light … .text-white { color: #1e293b }` в `index.css` пребоядисва всяко
`text-white` в тъмно за цялата светла тема. Това е вярно за текст върху
страницата и **грешно за етикет върху тъмен фон**: активният филтърен чип в
Alerts е `bg-slate-900 text-white`, значи в светла тема е почти черно върху
почти черно. Възпроизведено на устройство; същото е и в браузъра.

Поправено е **само за Android** (`html.md3.light [class~='bg-slate-900']` в
`material.css`), защото общото правило е в споделения `index.css` и пипането му
излиза извън обхвата на Android редизайна. Уловка при поправката: първият опит
хвана и наследниците със селектор ` *` и скри брояча вътре в чипа, който седи на
собствен бял pill — правилото трябва да е **само върху самия елемент**, етикетът
го наследява като текстов възел. Ако някой поправя това глобално за web, търси и
другите `text-white` върху тъмни запълвания, не само този чип.

### `mood_entries.ip_hash` е мъртва колона — чака решение
Колоната е декларирана в първата миграция изрично „for rate limiting", но
`submit-mood` (единственият писач, RLS INSERT политиката е свалена през
`20260514000000`) никога не я пише. Значи ограничението „по едно на ден" виси
изцяло на `user_session_id` — UUID, който клиентът си генерира сам: изчистен
localStorage или подменен UUID дава неограничени записи в данните, които хранят
корелацията настроение/Kp.

Не е поправено нарочно: попълването на `ip_hash` въвежда събиране на нов
идентификатор, а Privacy страницата **не споменава IP адреси изобщо**. Или се
пише колоната и се обявява в политиката, или колоната се маха.

### Одит 2026-08-06 — затворен
Всичко от онзи одит е поправено и е в main. `send-kp-alerts` е deploy-нато (v9,
проверено в продукция) и вече носи GFZ каскадата + Bz алармата. Затворени също:
SW precache 2586 → 1303 KiB, `globe-vendor` 1257 → 633 kB, мъртвите cron-ове,
`kpSource.contract.json` + `resolveKp`, Sentry fingerprint, rate-limit sweep.

### Чака решение — езикът на браузъра пише върху английските URL-и
`LanguageContext` избира език по реда: URL префикс → запазено предпочитание →
`navigator.language`. Третата стъпка се прилага и върху URL-и, които вече са
езиково определени, затова каноничният английски `/faq` рендира български на
bg-BG браузър и немски на de-DE (възпроизведено в Chrome с три локала). Prerender-нат
файл на същата страница казва `lang="en"` и `canonical=/faq`.

Резултат: `/faq` и `/bg/faq` сервират едно и също на български посетител, докато
hreflang клъстерът ги обявява за различни версии — дублирано съдържание върху две
URL-а. Не е регресия; така е открай време.

Предложение: при първо посещение на непрефиксиран URL с не-английски браузър —
**redirect** към префиксирания, вместо тиха смяна на съдържанието. URL и съдържание
се изравняват, canonical/hreflang стават верни, потребителят пак получава езика си.
Но е redirect със SEO последствия → решение на потребителя, не рутинна поправка.

### Чакат по една променлива в Vercel env
- **`VITE_VAPID_PUBLIC_KEY`** — довършеният уеб push (`src/hooks/useWebPush.ts`) е
  инертен без нея; остава само алармата в отворен таб. Стойността е публичният VAPID
  ключ, същият, който CI вече подава като secret.
- **`CRON_SECRET`** — `webhook-health` cron-ът връща 401 без нея, тоест предпазителят
  за тихо падналия Stripe webhook пак мълчи. Vercel слага `Authorization` header-а
  само когато променливата съществува.

### Mobile одити 2026-06-11 и 2026-07-19/20 — статус
Поправено дотук: NSCameraUsageDescription, launch-time permission промпт, widget версии, storm safe-area падинг, deep link allowlist, дублирани push listener-и, autoVerify, Kp 0.0 widget логика, пълна локализация на widget + Live Activity (16 езика), CFBundleLocalizations, InfoPlist.strings (16 lproj), universal links (AASA + entitlement + App.tsx handler), **CODE_SIGN_ENTITLEMENTS верзан** (беше сирак — build-овете се подписваха без app groups/aps!), Android FCM код (manifest permission, hook без iOS gate, FCM v1 в send-kp-alerts). Live Activity tap → /alerts е свободна страница (не paywall) — решено.

**Остава (изисква акаунти/устройства):**
1. **Платено Apple Developer членство** — ПРЕДПОСТАВКА за всичко останало по iOS. Установено 2026-07-20: екип `2W6YCTFKNA` е **безплатен/личен**, не платен. Xcode отказва: „Personal development teams do not support the Associated Domains and Push Notifications capabilities".
   Това обезсмисля предишната формулировка на тази точка („един Xcode GUI build да добави capability-тата") — GUI-ят удря същата стена, проблемът не е headless vs GUI, а правата на екипа. Блокира: push нотификации, universal links, Live Activity push токени (`ActivityInput error 0` вероятно е точно оттук), TestFlight и App Store.
   Дотогава device build-овете минават с app-groups-only entitlements override (виж Commands) — App Groups работи, значи widget-ът и Live Activity Phase A са тестваеми.
2. **Android FCM активация** — Firebase Console: `google-services.json` в `android/app/`; service account JSON като `GOOGLE_SERVICE_ACCOUNT` secret в Supabase; `supabase functions deploy send-kp-alerts`. Кодът е готов и guard-нат — без secret-а функцията е байт-идентична.
   **ЗАДЪЛЖИТЕЛНО след добавяне на `google-services.json`:** махни `if (isAndroid()) return;` от `register()` в `src/hooks/usePushNotifications.ts`. Този gate е временен — без него `register()` хвърля native `IllegalStateException` („Default FirebaseApp is not initialized"), която JS не може да хване и която убива процеса ~3s след старт (потвърдено на Galaxy A34 / Android 16, 2026-07-20). Докато gate-ът стои, Android push не работи изобщо.
3. **assetlinks.json** — още е с `YOUR_SHA256_FINGERPRINT_HERE`; SHA-256 от Play Console → Setup → App signing.
4. **Android Glance widget** — пуснат на екран 2026-08-08 (Galaxy A34). Потвърдено
   работещо: рендерира се на 4×2, мрежата минава от widget процеса (Kp 5.7, wind
   356 km/s, 8 прогнозни стълба — реални данни през GFZ), tap отваря приложението.
   Поправени тогава: празната долна половина (`SizeMode.Responsive` даваше bucket
   размера, не клетката) и скалата, която рендираше 5 сегмента от 18. **Не е
   потвърдено на 2×2 и 4×4** — и виж отворена точка 1 по-горе: след последната
   преинсталация widget-ът спря да се появява по неизвестна причина.
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
