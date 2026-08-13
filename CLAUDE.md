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

Two more Windows-machine facts: `core.autocrlf=true` there makes
`blogMetadata.test.ts` fail (CRLF file vs LF generator output, byte comparison)
— **do not "fix" the file, that breaks CI on Linux**; and its `.env` holds a
placeholder Supabase URL, so sign-in/mood/profile are dead in local Android
builds while NOAA/GFZ still work.

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
| `noaaApi.ts` | NOAA SWPC + GFZ | Kp index (GFZ primary, NOAA fallback), solar wind, X-ray, aurora OVATION model, 3-day outlook, **Kyoto Dst** |
| `nigggApi.ts` | NIGGG Bulgaria | Local magnetic field (H/F components). On native Capacitor, calls the endpoint directly; on web goes through `/api/niggg` Vercel rewrite |
| `donkiApi.ts` | NOAA DONKI | CME/solar flare alerts. Web goes through the `/donki` Vercel rewrite; native calls the upstream directly (CapacitorHttp) — the rewrite does not exist under `capacitor://localhost` |
| `uvApi.ts` | Open-Meteo | UV index by coords |
| `skyApi.ts` | Open-Meteo | Cloud cover + astronomy data |
| `issApi.ts` | Where The ISS At | ISS position |

**Dst не е Kp и не бива да се съгласува с него.** Kp е 3-часов *range* индекс от
среднищирочинни обсерватории — казва колко се е разлюляло полето. Dst мери самия
пръстенов ток и е това, което класифицира силата на бурята. Двата легитимно се
разминават (проверено: Kp 0.2 „quiet" срещу Dst −142 „intense"), затова картите
са независими; примиряването им би измислило число, което никой източник не
публикува. Праговете (−30 / −50 / −100 / −250) са публикуваните и **не се
подравняват** към Kp лентите.

`latestDst` прескача дупките назад, вместо да ги чете като 0 — **Dst 0 е реална
спокойна стойност**, същият капан като GFZ trailing null bins-овете при Kp. Без
използваема стойност картата показва `—`, не измислена нула. Тестове в
`src/services/dst.test.ts`.

Източникът (`services.swpc.noaa.gov/products/kyoto-dst.json`) връща
`Access-Control-Allow-Origin: *`, значи за разлика от GFZ **не иска proxy** на web
и няма нужда от CapacitorHttp специален случай на native.

### API proxies
- **Dev**: Vite proxy in `vite.config.ts` handles `/donki`, `/api/niggg`, `/api/gfz`, `/api/stripe`
- **Prod**: `vercel.json` rewrites handle `/donki` and `/api/gfz`; NIGGG has a dedicated Vercel serverless function at `api/niggg.ts`; Stripe is handled by `api/stripe/` serverless functions

### Двете ленти в хедъра (буря)

`Navigation` рендира **точно една** от две ленти, взаимно изключващи се:

1. **Текуща буря** — live Kp ≥ 5, пулсиращ градиент, `role="alert"`. Ретроспективна
   по конструкция: Kp е 3-часов индекс, значи докато тя се появи, изкачването е
   минало.
2. **Предстояща буря** — `StormWatchBanner`, когато няма измерена буря, а NOAA
   3-дневната прогноза дава пик Kp ≥ 5. Без вход и без план — push алармите са
   Pro-only, така че това е единственото предупреждение, което непознат посетител
   получава. Спокойна и статична, за да не звучи като измерване; скриваема.

**Свързаност, която лесно се чупи:** `<main>` в `App.tsx` резервира 2.25rem за
лентата и това виси на `isStorm || outlookVisible`. Добавиш ли трета лента или
пуснеш ли двете едновременно, съдържанието влиза под фиксирания хедър.

Скриването е ключирано на **времето на пика + G нивото**, не на суровия Kp
(`outlookToken`): NOAA преиздава прогнозата ~3 пъти дневно и мърда стойността с
трета от единица, което на суров ключ би отваряло скрит банер по няколко пъти на
ден. Качване през G граница нарочно го отваря пак.

### NOAA времената нямат offset — минавай през `parseNoaaTime`

NOAA стъмпва редовете си `2026-08-15T18:00:00` (понякога с интервал вместо `T`) —
ISO-подобно, но **без offset**, което ECMAScript чете като *локално* време.
Feed-ът е UTC. [src/utils/noaaTime.ts](src/utils/noaaTime.ts) е единственият
правилен прочит; `noaaTimeSeconds` е същото в epoch секунди за графиките.

Това не беше козметично. Нощният прозорец на Calendar е 20:00–06:00 **локално**, а
бин на 18:00Z е 21:00 в София — вътре в прозореца. Четен направо, ставаше 18:00 и
**изпадаше от нощта**, тоест пиковото Kp за нощта се занижаваше (измерено: 6.0
вместо 7.0) заедно с извлечения от него шанс за аврора. Forecast слагаше бинове на
грешен час по x-оста; Dashboard плъзгаше 24-часовия си прозорец за слънчев вятър.

Оцеляло беше защото **четенето беше разцепено**: четири места вече пишеха
`new Date(t.replace(' ', 'T') + 'Z')` на ръка, три — не. Същият модел като деветте
ръчни копия на Kp приоритета, станали `resolveKp`. Сега всички минават през
`parseNoaaTime`; `noaaTime.test.ts` пази и еквивалентността със стария ръчен израз.

### Светла тема: `text-white` върху тъмен фон не работи

`index.css` пребива `html.light {p,h1,h2,h3,span,label,div,a,button}.text-white`
на `#1e293b`, за да оцелеят нормалните надписи върху светлата повърхност.
Компонент с **нарочно тъмен фон** попада в същото правило и текстът му става тъмно
сиво върху тъмно — лентата за текуща буря стоя така, измерено на 1.6:1.

Файлът има изключение за `.text-white.bg-slate-900|800|black`. За произволен hex
фон вземи цвета **inline** (`style={{ color: '#ffffff' }}`) — inline бие класовото
правило. Не съди по код, измервай: `getComputedStyle(el).color`.

### Access control
`PlanGuard` component wraps routes/sections that require `pro` or `premium`. It reads `profile.plan` from AuthContext. When `VITE_PAYMENTS_ENABLED !== 'true'`, all content is accessible regardless of plan — useful for development.

### Supabase backend
- **Edge Functions** in `supabase/functions/`: `delete-account`, `send-kp-alerts` (cron), `submit-mood`, `send-weekly-digest`, `verify-iap` (`donki-proxy` deleted 2026-08-09 — nothing called it)
- **Migrations** in `supabase/migrations/` — run sequentially; `_MANUAL` suffix means the SQL must be applied manually in the Supabase dashboard (cron job setup)
- Key tables: `profiles` (plan, stripe fields), `mood_entries`, `push_subscriptions`, `favorite_locations`, `stripe_processed_events`

### PWA / Service Worker
Custom service worker at `src/sw.ts` using Workbox.

**Platform guard gotcha (битото 2026-08-09):** `window.Capacitor` съществува **и на
web** — `@capacitor/core` дефинира глобала при import, а целият модулен граф се
изпълнява преди тялото на `main.tsx`. Guard-ът `!('Capacitor' in window)` около
`registerSW()` беше винаги false, тоест **SW-ът не се е регистрирал за нито един
web посетител от 2026-05-26 (`edca150`)**: без offline, без precache, а web push
handler-ът в `sw.ts` беше недостижим. Същият грешен тест държеше PWA install
промпта изключен и пускаше нативния 1.9s splash на всяко зареждане. Всичко е на
`isNative()` от `src/utils/platform.ts` сега — **никога не проверявай
`'Capacitor' in window'`**; проверено на prod build: 1 регистрация, промптът и
splash-ът са с web поведение.

Two groups are excluded from the precache:

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
- Device lessons (2026-08-08): `SizeMode.Responsive` hands the composable the
  **bucket** size, not the cell — sizing to it left the bottom half of the 4×2
  empty; and Glance silently drops children beyond a container's limit, which is
  how the Kp scale rendered 5 of its 18 segments. Both fixed in
  `71a5a17`/`794f0a3`.
- Kotlin and the Compose compiler are in the build **only** for this widget; the
  Capacitor app itself is still Java. Both plugins are pinned to `kotlinVersion`
  in `android/build.gradle` and must move together.
- Widget strings live in `res/values*/strings.xml` across the same 16 locales as
  the app. Adding those folders makes lint fail any untranslated string in
  `values/strings.xml`, which is why the four Capacitor-generated ones are marked
  `translatable="false"`.

### Apple Watch (реализирано 2026-08-11)
Два нови таргета в същия `App.xcodeproj`: **`StormWatcherWatch`** (watchOS 10+
SwiftUI приложение) и **`StormWatchComplications`** (WidgetKit разширение,
вградено в него). Часовниковото приложение се вгражда в iOS бъндъла под
`App.app/Watch/`. Билд с `-destination`, **не** с `-sdk` — `-sdk iphonesimulator`
пренаписва SDK-то и за watch таргетите и ги компилира срещу iOS:
```bash
xcodebuild -project App.xcodeproj -scheme App -destination 'generic/platform=iOS Simulator' build
xcodebuild -project App.xcodeproj -target StormWatcherWatch -sdk watchsimulator build   # само часовника
```

**Часовникът тегли сам — не чете App Group-а на телефона.** Планът тук казваше
обратното; App Group се споделя между приложение и разширения **на едно
устройство**, а часовникът е друго устройство. По онзи дизайн екранът щеше да е
празен, докато някой не отвори телефона. Съгласуваността идва от това, че и
двете страни минават през `KpSource.swift` — GFZ → NOAA, същият приоритет на
полетата. App Group-ът се ползва, но локално на часовника: приложението пише
кеша, complication-ът го чете, за да не тегли всеки процес отделно. Ако
entitlement-ът липсва (безплатният Apple екип не може да provision-ва app groups
за тези bundle ID-та), `UserDefaults(suiteName:)` връща nil и двете страни просто
теглят — влошено, не счупено.

**`ios/App/Shared/StormShared.swift`** е новият споделен файл (палитра, Kp
лентите `kpColor`/`kpLevel`/`kpScaleGradient`, `WL` преводите за 16 езика,
`appGroupID`). Изнесен е от `StormWidget.swift`, защото иначе часовникът щеше да
е пето копие на лентите. При изнасянето излезе, че `StormLiveActivity.swift` е
държал **собствено копие** на `kpColor` с коментар „mirrors kpColor() in
StormWidget.swift" — идентично тогава, на един edit от това да не бъде. Махнато.

Дребни капани, платени в брой:
- **`.backgroundTask(.appRefresh)` чупи компилатора** (Xcode 26 / Swift 5.10):
  „failed to produce diagnostic for expression" върху целия `body`, без да сочи
  накъде. Фонoвото опресняване минава през `WKApplicationDelegate.handle(_:)`.
- **`CFBundleExecutable` в Info.plist на разширението не е по избор** — без него
  installd отказва **цялото** часовниково приложение, а съобщението сочи `.appex`-а.
- `CFBundleLocalizations` трябва да изброи 16-те езика и в двата plist-а, иначе
  `Locale.preferredLanguages` се свежда до единствения известен език и `WL`
  отговаря на английски навсякъде.
- Проектът пише в **`ios/App/build`** (Capacitor SYMROOT), не в DerivedData;
  `xcodebuild clean` и триенето на DerivedData не пипат това и билдът тихо ползва
  стар Info.plist. Ако промяна в plist не се появява — трий `ios/App/build`.

Непокрито нарочно: WatchConnectivity (часовникът тегли сам, WCSession би спестил
батерия само когато телефонът е наблизо) и тактилната аларма по потребителски
праг — прагът живее в localStorage на JS приложението и без WCSession часовникът
не го знае.

### NOAA сервира невалиден JSON — `NaN` (открито 2026-08-11)
`rtsw_wind_1m.json` съдържа голи `NaN` стойности за изпуснати проби:
```
{"time_tag": "...", "active": true, "proton_speed": NaN, ...}
```
RFC 8259 няма NaN. `JSONSerialization` и `JSON.parse` отхвърлят **целия
документ** — една лоша проба от 3590 реда и слънчевият вятър изчезва. Измерено
на живо: 8 срещания, парсването спира на байт 2593196 от 2662008.

Коварното е, че Python приема NaN по подразбиране, значи проверка със скрипт
показва напълно здрав feed.

Поправено и на четирите места (2026-08-11). Правилото е записано в
[kpSource.contract.json](src/services/kpSource.contract.json) под
`malformedUpstreamJSON`, за да не се разсинхронизират пак:

| | |
|---|---|
| **TypeScript** | `repairNonStandardJson` в [src/utils/fetchJson.ts](src/utils/fetchJson.ts) — включва се **само след като парсването вече е пропаднало**, значи здравите payload-и не плащат нищо. Тестван в `fetchJson.test.ts`. |
| **Swift** | `KpSource.repairingNaN(_:)` — същата замяна преди `JSONSerialization`. |
| **Deno** | `repairNonStandardJson` в `bz.ts` (тестваемият файл), ползван от `fetchSustainedBz`. Там залогът е най-голям: NaN в mag feed-а значи, че **ранното предупреждение тихо не се задейства**. |
| **Kotlin** | Не му трябва за парсването — org.json връща низа „NaN", а `optDouble` го прави `Double.NaN` — но стойността пак трябва да се отхвърли. |

**Второ правило, също в договора (`sampleSelection`):** вятърът взима най-новата
активна проба **със стойност**, после най-новата използваема изобщо, и чак тогава
се предава. Спирането на най-новата активна и предаване, ако тя е празна,
изхвърляше хилядите здрави проби зад нея. Поправено и в четирите.

Проверено срещу живия feed: преди — `JSON.parse` се чупи; след — 3635 реда,
443 km/s, една проба остава без стойност (истинската дупка).

### IAP валидация (`verify-iap`)
Одитирана 2026-08-07, преди пускане — IAP още не е активен (плъгинът не е инсталиран), значи нищо от долното не е било експлоатирано.

- **Google даваше плана при неплатена сметка.** Условието отхвърляше само когато има `cancelReason` **и** `paymentState !== 1`, така че `paymentState: 0` („payment pending" — т.е. неплатено) минаваше и качваше абонамента. Сега се дава само при `1` (получено) или `2` (безплатен пробен). Таблица на решенията в комита.
- **Нямаше защита срещу повторно използване.** Разписката си остава валидна, независимо кой я представя, затова една реална покупка можеше да качи произволен брой акаунти — всеки получавайки честен „valid" отговор от магазина. Новата `iap_purchases` е ключирана по идентификатора на самия магазин (Apple `original_transaction_id`, Google purchase token). **Не е upsert** — това би позволило втори акаунт да презапише първия; прави insert и при `23505` проверява чий е редът.
- `plan` и `billing` идват от клиента и се интерполират в Play API URL-а — вече се валидират срещу разрешените стойности.

Остава несвършено: няма webhook за подновяване, тоест изтекъл IAP абонамент не сваля плана сам. `expires_at` вече се пази, така че периодична задача може да го направи.

### Изтриване на акаунт
`delete-account` проверява JWT-то с anon клиент и трие само `user.id`, така че никой не може да изтрие чужд акаунт. Всички таблици с лични данни имат `ON DELETE CASCADE` към `auth.users` (пряко или през `profiles`), с едно нарочно изключение:

`contact_messages.user_id` е `ON DELETE SET NULL`, за да оцелее историята на поддръжката. Но `name` и `email` са **отделни колони, не FK** — нулирането на връзката оставяше идентификаторите в таблицата и правеше изтриването да изглежда пълно, без да е. Функцията вече ги замества с `[deleted]` / `deleted@account.invalid` (запазена `.invalid` зона) преди да изтрие акаунта, и **отказва цялата операция**, ако анонимизирането не мине — половинчато изтриване е по-лошо от такова, което може да се повтори.

`mood_entries` няма FK към `auth.users` по замисъл — псевдонимна е (само `user_session_id`; мъртвата `ip_hash` е махната 2026-08-09 по решение на потребителя — писането ѝ значеше събиране на IP, което Privacy не обявява). **Съзнателна последица:** дневният лимит „едно на ден" виси на клиентски UUID и е заобиколим с изчистен localStorage; ако mood данните някога станат важни, чистият път е гласуване само за влезли потребители.

### Web push (браузър)
Сървърната половина съществуваше отдавна и беше **мъртва**: таблица `push_subscriptions` с пълни RLS политики, VAPID ключове в edge функцията, `push` handler в `src/sw.ts`, `VITE_VAPID_PUBLIC_KEY` подаван от CI — и `send-kp-alerts`, което честно я заявява на всеки 5 минути. Никой никога не викаше `pushManager.subscribe()`, значи заявката винаги връщаше нула реда. (Втората пречка — SW-ът изобщо не се регистрираше на web, виж „Platform guard gotcha" — падна на 2026-08-09; сега липсва само env променливата.)

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

**URL ↔ language contract (от 2026-08-09):** непрефиксиран URL е каноничен
английски. Посетител, чийто език (запазен избор или `navigator.language`) е друг,
се пренасочва към префиксирания URL от `main.tsx` **преди `createRoot`** —
`languageRedirectPath` в [src/utils/langUrl.ts](src/utils/langUrl.ts), тестван в
`langUrl.test.ts`. Правила: префиксиран URL никога не се пипа; запазено `en` е
изричен избор (превключвателят го записва преди навигация) и бие браузърния език
— това е пътят обратно към английския root; боклук в localStorage не пренасочва.
Само web — native няма префикси. Преди това `/faq` рендираше български на bg-BG
браузър върху prerender с `lang="en"` — дублирано съдържание на две URL-а.

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
- `src/utils/auroraVisibility.ts` — pure math aurora visibility % from lat/lon/Kp (dipole approximation, no API). **Две копия** — второто е inline в `send-kp-alerts/index.ts`; движат се заедно, като Kp каскадата. Сравнението е на **`Math.abs(gmlat)`**: диполът е симетричен, южният овал стои на същата по големина геомагнитна ширина. Със знакова стойност (до 2026-08-13) цялото южно полукълбо връщаше 0% при всяко Kp — Хобарт 0% при Kp 9 — и понеже трите аларми гейтват на `visibility > 0`, южен потребител **не можеше да получи storm известие изобщо**. Старият тест подаваше южна координата, но твърдеше само че резултатът е в `[0, 100]`, което 0 удовлетворява
- `src/utils/logger.ts` — `logError()` wrapper (console in dev, Sentry in prod)
- `src/utils/generateStormImage.ts` — generates OG share images for storm events
- `src/utils/stormOutlook.ts` — peak Kp in the NOAA 3-day forecast. React-free and app-import-free so it unit-tests standalone, the same reason `send-kp-alerts/bz.ts` is
- `src/utils/noaaTime.ts` — `parseNoaaTime` / `noaaTimeSeconds`. **The only correct way to read a NOAA `time_tag`** — the stamps carry no offset (see above)

## Ideas / Future Plans

_(Add ideas and future feature plans here as they come up)_

## TODO / Pending Work

### Какво остава — актуално към 2026-08-13

Кодова работа няма. Всичко долу иска или потребителя, или устройство/акаунт.

**При потребителя (минути):**
- **Vercel env:** `VITE_VAPID_PUBLIC_KEY` (web push — хукът и SW-ът са готови) и
  `CRON_SECRET` (без нея `webhook-health` връща 401 и предпазителят за тихо
  паднал Stripe webhook мълчи; Vercel слага Authorization header-а само когато
  променливата съществува).
  **Откъде е стойността на VAPID (поправено 2026-08-09):** по-ранната бележка тук
  казваше „същият ключ, който CI подава като secret" — това е грешно, трите
  `VITE_*` repo secret-а никога не са съществували (виж `3816754`). Истинското
  копие е в **Supabase → Edge Functions → Secrets → `VAPID_PUBLIC_KEY`**,
  създадено 2026-04-25 заедно с `VAPID_PRIVATE_KEY`. `supabase secrets list`
  показва само дайджести, не стойности — трябва дашбордът.
- **CI: провери run-овете от 13.08.** CI не е бил зелен от 26 април (~712
  поредни червени; никой не е гледал). Unit-env причината е поправена 09.08
  (`0a38290` — hermetic placeholder env в ci.yml, `src/lib/supabase.ts` хвърля
  при import без него). **E2E стъпката още никога не е стигана на зелен
  runner** — тя е следващата възможна изненада. На 13.08 в main влязоха два
  merge-а (`0619199`, `8b725a9`), значи има пресни run-ове за гледане.

  Merge staging → main от 09.08 **е свършен** — беше вписан тук като чакащ,
  но `cd9a034` вече го съдържаше.

**Едно останало решение на потребителя:**
- **Cron на седмичния дайджест.** Функцията е поправена и deploy-ната правилно
  (v2, `verify_jwt: false`). Включването праща истински имейли; 0 профила opt-in
  към 08.08.
  **Блокер, намерен 2026-08-09: `RESEND_API_KEY` липсва в Supabase secrets.**
  Функцията го чете и без него връща 500 „RESEND_API_KEY not configured" —
  тоест cron-ът щеше да гърми всеки понеделник, тихо. Ключът съществува, но е
  **във Vercel** (`api/lib/resend.ts` го ползва за Stripe писмата), а Supabase е
  отделно хранилище. Стъпка 1 е да се копира там:
  `supabase secrets set RESEND_API_KEY=<от Vercel> --project-ref srzfoxlmhxyulrgkchjr`.
  Останалото е автоматизирано: `pg_cron` и `pg_net` вече са включени, а
  `CRON_SECRET` е в Supabase от 04-25 — литералът се чете от съществуващия
  `send-kp-alerts-every-5min` ред в `cron.job` (той **не** ползва GUC, въпреки
  каквото пише MANUAL файлът), така че не се налага да се задава `app.cron_secret`.

**Иска устройство (Apple Watch):**
- Часовниковото приложение е проверено само в симулатор (watchOS 26.5). На
  истински часовник иска сдвоено устройство и подписване, а **безплатният Apple
  екип най-вероятно няма да provision-ва App Groups за двата нови bundle ID-та**
  (`…watchkitapp`, `…watchkitapp.complications`). Кодът работи и без тях — просто
  и приложението, и complication-ът теглят поотделно.
- Complication-ите са билднати и вградени, но **не са слагани на циферблат** —
  това иска ръчна стъпка на часовника.

**Наблюдение, без действие:**
- **GSC възстановяване.** 141 indexed / 647 not е щетата от Cloudflare 403 към
  Googlebot (05.07–05.08; коренът решен 05.08 — виж паметта gsc-googlebot-403).
  Sitemap ресубмитнат 08.08, Request indexing пуснат за `/`, `/blog`, `/aurora`,
  `/bg`. Признак за възстановяване: нова дата в Sitemaps → `last_downloaded`;
  пълното отнема седмици. Нов проблем е само ако `last_crawled` > 05.08 пак
  показва ACCESS_FORBIDDEN.

**Иска устройството (Galaxy A34, Windows машината):**
- **Widget-ът спря да се рендира, причина неизвестна.** След преинсталация
  изчезна от началния екран, докато инстанцията остава bound (`id=11`, host view
  401×216dp) и Glance продължава да push-ва RemoteViews без изключение в logcat
  (`updateAppWidget() appWidgetIds = [11]`). `cornerRadius` хипотезата отпадна.
  **Следваща стъпка: махни widget-а от екрана и го сложи наново** — ако пак е
  празен, проблемът е в кода, не в launcher-а. Преди мистерията беше потвърден
  работещ на 4×2 (реални данни, tap отваря приложението); 2×2 и 4×4 не са
  проверявани.
- **16 KB потвърждение.** Кодът е готов (sentry-android 7.22.5 +
  datastore-preferences 1.1.7; трите `.so` проверени `align 0x4000` в APK-то).
  Диалогът „Android App Compatibility" на устройството може да не изчезне за
  debuggable билд — важното за Play е подравняването.

### Mobile — иска акаунти (статус от одитите 2026-06-11 / 07-19/20)
Всичко кодово по тези одити е поправено (детайлите — в git историята).
Остава само външното:
1. **Платено Apple Developer членство** — ПРЕДПОСТАВКА за всичко останало по iOS. Установено 2026-07-20: екип `2W6YCTFKNA` е **безплатен/личен**, не платен. Xcode отказва: „Personal development teams do not support the Associated Domains and Push Notifications capabilities".
   Това обезсмисля предишната формулировка на тази точка („един Xcode GUI build да добави capability-тата") — GUI-ят удря същата стена, проблемът не е headless vs GUI, а правата на екипа. Блокира: push нотификации, universal links, Live Activity push токени (`ActivityInput error 0` вероятно е точно оттук), TestFlight и App Store.
   Дотогава device build-овете минават с app-groups-only entitlements override (виж Commands) — App Groups работи, значи widget-ът и Live Activity Phase A са тестваеми.
2. **Android FCM активация** — Firebase Console: `google-services.json` в `android/app/`; service account JSON като `GOOGLE_SERVICE_ACCOUNT` secret в Supabase; `supabase functions deploy send-kp-alerts`. Кодът е готов и guard-нат — без secret-а функцията е байт-идентична.
   **ЗАДЪЛЖИТЕЛНО след добавяне на `google-services.json`:** махни `if (isAndroid()) return;` от `register()` в `src/hooks/usePushNotifications.ts`. Този gate е временен — без него `register()` хвърля native `IllegalStateException` („Default FirebaseApp is not initialized"), която JS не може да хване и която убива процеса ~3s след старт (потвърдено на Galaxy A34 / Android 16, 2026-07-20). Докато gate-ът стои, Android push не работи изобщо.
3. **assetlinks.json** — още е с `YOUR_SHA256_FINGERPRINT_HERE`; SHA-256 от Play Console → Setup → App signing.
4. **Push-to-start Live Activity (iOS 17.2+)** — сървърът да вдига Live Activity при буря без отворено приложение; тества се само в TestFlight (dev-signed build-ове не дават push токени).

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
