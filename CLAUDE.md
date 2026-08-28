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

**Node version.** `.nvmrc` says 20 and both workflows read it via
`node-version-file`, so the runner and a working copy cannot drift; `engines`
allows `>=20 <27`. This started as a real failure: the suite passed on CI's Node
20 and failed 7 tests on Node 26, because **Node 22+ defines its own
`localStorage` global — `undefined` unless the process gets
`--localstorage-file` — and it shadows the one happy-dom provides.** So
`localStorage.clear()` threw in `StormWatchBanner.test.tsx` while
`geolocation.test.ts` passed, that one having stubbed storage itself. The pin
alone would have hidden it, so `src/test-setup.ts` now installs a working
`localStorage`/`sessionStorage` on any Node: 487/487 on both 20 and 26. Tests
that need to control storage still override it with `vi.stubGlobal`.

Run a single test file:
```bash
npx vitest run src/services/nigggApi.test.ts
```

**Пускай суита и разбъркан, и в чужд часови пояс — иначе крие бъгове.** Двете оси
хванаха неща, които 20+ обикновени пускания не хванаха (14.08):

```bash
npx vitest run --sequence.shuffle --sequence.seed=2   # ред на тестовете
TZ=Pacific/Chatham npx vitest run                     # 45-минутен offset
```

Разбъркването извади **два теста, които тровеха съседите си**, и двата невидими в
обявения ред, защото тестът-виновник стоеше последен:

- `useWebPush.test.ts` викаше `vi.doMock` за `AuthContext` вътре в един тест.
  **`doMock` регистрацията не се маха от `resetModules` нито от `afterEach`** —
  всеки следващ тест получаваше хук без потребител и не правеше нищо.
- `BlogPost.test.tsx` ползваше `mockReturnValue` за езика; стойността оцеляваше в
  следващия тест и статията се рендираше на български вътре в теста, който твърди
  английското заглавие.

И двата са поправени по един и същ начин: **променлива, нулирана в `beforeEach`,
вместо per-test mock състояние**. Ако пишеш тест, който сменя глобално състояние,
това е моделът — не `doMock`, не `mockReturnValue` без нулиране.

Часовият пояс на машината е другата ос: `TZ` работи и на Windows (проверено), а
`Asia/Kathmandu` и `Pacific/Chatham` чупят наивна аритметика, каквато 45 минути не
прощава.

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

One more Windows-machine fact: its `.env` holds a placeholder Supabase URL, so
sign-in/mood/profile are dead in local Android builds while NOAA/GFZ still work.

**Fixed 14.08 — `core.autocrlf=true` used to fail `blogMetadata.test.ts`** (CRLF
checkout vs LF generator output, byte comparison), permanently, on this machine
only. `.gitattributes` now pins `src/data/blog/metadata.ts` to `eol=lf`, which
fixes the checkout rather than the committed content — converting the file itself
is what would have broken CI on Linux. The suite is 396/396 locally now; a
failure here is real again. If another generated file ever gets a byte-comparison
test, give it the same line.

### Двата предпазителя около деплоя (от 2026-08-14)

Сайтът беше бял над час и **нищо не го хвана**: CI беше зелен, всички статуси 200,
Sentry с нула събития. Затова има две проверки, всяка родена от конкретен провал.

```bash
npm run check:vercel   # преди комит и в CI
npm run smoke          # срещу production; SMOKE_URL сочи другаде при нужда
```

**`scripts/check-vercel-config.mjs`** — бял списък на позволените ключове в
`vercel.json`. Сложих `"_comment"` вътре в rewrite, Vercel отхвърли **цялата**
конфигурация, двата деплоя отидоха в `ERROR` **без нито един ред build лог**, а CI
остана зелен, защото никой не гледа този файл. Проверява и че catch-all-ът изключва
`/assets/` — иначе липсващ бъндъл се връща като `index.html` с 200 и CDN-ът го
кешира **като бъндъла**, с година свежест.

**`scripts/smoke-production.mjs`** — обхожда целия граф от импорти на живия сайт и
твърди, че всеки `.js` наистина се сервира като JavaScript. Точно това пропуснаха
всички други проверки: `/assets/supabase-vendor-DI0HthDz.js` върна `index.html` със
статус 200 и `content-type: text/html`, модулът не се парсна и `#root` остана
празен. **HTTP/1.1 клиенти получаваха верния файл**, затова curl и `Invoke-WebRequest`
показваха здрав сайт, докато всеки истински браузър виждаше бяло.

`.github/workflows/production-smoke.yml` го пуска след успешен production деплой
**и на всеки 6 часа**. Разписанието не е излишно: отровеният запис живееше в кеша
много след деплоя, който го създаде, и щеше да живее там неопределено дълго.

И двата скрипта са доказани срещу счупено състояние, не само срещу здраво —
`check:vercel` вали и на `_comment`, и на catch-all без изключението; smoke тестът
беше пуснат срещу локален сървър, който имитира точно онзи отговор.

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

**Провалена заявка не бива да се превръща в стойност.** Това е най-често
повтаряният бъг в тази кодова база — вече шест пъти, всеки път в различен сървиз:
GFZ null бин → Kp 0, Dst 0, полярният ден → 100% облачност, отрязана нощ → `Kp 0.0`
за непрогнозирана нощ, `getUvIndex` → UV 0 („Low — no protection needed", тоест
твърдение за безопасност от паднала заявка), `getSkyVisibility` → „poor, 100%
облачност". Последните две са поправени 14.08 — сега **хвърлят**, а страниците им
вече имаха `catch` и ErrorCard с бутон „опитай пак", които бяха недостижими.

`apiCache` пази **само изпълнени** резултати и чисти `inflight` във `finally`, така
че хвърлянето не залепва грешката за TTL-а — следващият опит тегли наново. Значи
няма причина сървиз да гълта грешка: или стойност, или изключение, никога измислена
нула.

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

### Open-Meteo времената са в пояса на *локацията* — минавай през `parseOpenMeteoTime`

Същият капан като долния, но по-коварен: скрива се, докато посетителят и мястото,
което гледа, са в един часови пояс. Всички повиквания тук подават `timezone=auto`,
значи API-то отговаря по часовника **на локацията** и пак **без offset**, а
истинският offset идва в отделно поле, което кодът дълго не четеше:

```
"sunset": ["2026-08-14T21:56"]   +   "utc_offset_seconds": 7200
```

`new Date(...)` чете низа като време **на устройството**. Грешката е точно
`offset(устройство) − offset(локация)`, измерено на живо за Тромсьо: 0 от Осло,
−1 ч от София, **+10 ч от Анкъридж, −10 ч от Окланд**.

Сравненията **между две стойности от Open-Meteo** оцеляваха (и двете изместени
еднакво) — затова не гръмна по-рано. Чупеше се там, където изместено време срещне
истински момент: `Date.now()`, или NOAA Kp бин през `parseNoaaTime`. Тоест нощният
прозорец в Calendar, който решава кои бинове са „тази нощ" — а оттам пиковото Kp
за нощта и шансът за аврора.

Засегнати бяха **четири места в два сървиза**, не само аврората: нощният прозорец
и облачността ([skyApi.ts](src/services/skyApi.ts), 2 повиквания), кой час е „сега"
за UV и златният час ([uvApi.ts](src/services/uvApi.ts), 2 повиквания).
`getWeatherData` в `noaaApi.ts` ползва `current=` и не парсва времена — чист е.

[src/utils/openMeteoTime.ts](src/utils/openMeteoTime.ts) е единственият правилен
прочит: `parseOpenMeteoTime` за момент, `openMeteoHour` за часа по часовника на
локацията, `locationHourNow` за индекс в почасов масив, `formatOpenMeteoTime` за
показване (през IANA името, за да оцелее локалът 12ч/24ч), `parseOpenMeteoDay`
защото низ само с дата се парсва като UTC полунощ и на запад от Гринуич се
показва предният ден.

**Инвариантът, който тестовете пазят:** нощният прозорец описва небето **над
локацията**, значи трябва да е един и същ момент независимо къде е устройството.
`skyApi.timezone.test.ts` твърди абсолютни моменти, а суитът се пуска и в
`Asia/Kathmandu` и `Pacific/Chatham` — 45-минутните пояси са това, което наивната
аритметика бърка.

**`worldTime.test.ts` е проверката „наред ли е по света".** Дванайсет **истински**
записани отговора на Open-Meteo (`worldMeteo.fixture.ts`, от `UTC+12:45` до
`UTC−10`, двете полукълба), пуснати през реалните сървизи. Записани, а не измислени,
защото счупеното е свойство на това, което API-то наистина праща.

Носещото твърдение **не** е че парсването съвпада с формула — това би преразказало
имплементацията. То е че **слънцето е на хоризонта** в моментите, които приложението
нарича изгрев и залез, проверено със `solarAltitude` — нашата имплементация на
алгоритъма на NOAA, която не докосва Open-Meteo. Прозорец, прочетен в грешен пояс,
слага слънцето десетки градуси встрани.

Доказано с мутации, не със зелено: връщането на `new Date(t)` вали **39 от 73**
теста, а подмяната на `locationHourNow` с часа на устройството вали 14. Оцеляват
точно градовете, чийто пояс съвпада с този на машината — случаят, който криеше бъга
месеци наред.

Фикстурата се пресъздава с `node scripts/capture-world-meteo.mjs` (иска мрежа);
стойностите са замразени нарочно, за да са твърденията точни. Полярният ден и нощ са
отделно, в `skyApi.timezone.test.ts` — август не дава на нито един от дванайсетте
свит прозорец.

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

### Модел за видимост на аврора

Две функции, нарочно разделени. И двете живеят само в
[src/utils/auroraVisibility.ts](src/utils/auroraVisibility.ts) — **едно копие,
не две**: inline-ното в `send-kp-alerts/index.ts` е махнато на 13.08 заедно с
гейта, който единствен го ползваше.

- **`calcAuroraVisibility(lat, lon, kp)`** — само геомагнитно. Казва „доколко си
  на място за тази буря". Ползва се от сравнителните списъци с градове (Aurora,
  AuroraMap), където мащабиране по локален час би направило половината редове
  нула само заради часовата зона.
- **`auroraViewingChance(lat, lon, kp, at)`** — същото, умножено по `darknessFactor`.
  Отговаря на „виждам ли го сега". Ползва се от значката на Home и от AuroraMap
  за локацията на потребителя.

**Алармите не се гейтват по видимост изобщо — нито геомагнитно, нито по тъмнина.**
Те отговарят на „тече ли буря", а известието го казва буквално: „Kp has reached X,
above your threshold of Y". Гейт по тъмнина би заглушил дневните бури; гейт по
геомагнитна видимост мълчаливо отменяше потребителския праг (София: 0% до Kp 8.33,
тоест поискал аларми при Kp 5 не получаваше нито една). Прагът решава сам. Ако
гейтът някога се върне, да е изричен opt-in на абонамента, не скрит филтър.

**Константите са на NOAA SWPC, не измислени**
([tips-viewing-aurora](https://www.spaceweather.gov/content/tips-viewing-aurora)):
ръб на овала **66° при Kp 0**, движи се **2° на Kp единица**, и аврора се вижда
до **~1000 км (≈9°)** по-южно от ръба.

До 2026-08-13 наклонът беше **5.3°/Kp** — не препис на нищо публикувано. Слагаше
ръба на овала на 40.5° при Kp 5 и на 19.3° (тропиците) при Kp 9; София показваше
40% при Kp 6, където верният отговор е нула. Само смяна на наклона обаче щеше да
обърне грешката в другата посока: старият код клампваше всичко под границата на
нула, тоест **нямаше хоризонтна видимост изобщо** — а Шотландия вижда аврора при
Kp 5, стоейки ~3° под ръба. Затова двете се сменят заедно.

**Спадът е квадратичен и това е нашият избор, не цитат.** NOAA дава обхвата
(1000 км), не формата. Линейна рампа даваше на Шотландия 54% при Kp 1 и на Берлин
58% при Kp 5 — и двете твърде щедри спрямо реалните наблюдения. Физическото
основание: колкото по на юг, толкова по-ниско до хоризонта пада аврората, тоест
покрива по-малко небе и се гледа през повече атмосфера. **Това е най-слабо
подпряното число във файла.**

Калибрацията е закована в `auroraVisibility.test.ts` срещу документирани събития
(май 2024 G5, октомври 2024 G4) — прагове като диапазони, не точни стойности, за
да преживеят уточнение, което пази реалността.

Известни ограничения, съзнателни: няма магнитно местно време (овалът се третира
като окръжност, макар да е изместен към нощната страна), няма полюсна граница
(полярната шапка сатурира на 100%, а овалът е пръстен), и центрираният дипол
греши с няколко градуса при сибирските дължини и над Южноатлантическата аномалия.

### Светла тема: `text-white` върху тъмен фон не работи

`index.css` пребива `html.light {p,h1,h2,h3,span,label,div,a,button}.text-white`
на `#1e293b`, за да оцелеят нормалните надписи върху светлата повърхност.
Компонент с **нарочно тъмен фон** попада в същото правило и текстът му става тъмно
сиво върху тъмно — лентата за текуща буря стоя така, измерено на 1.6:1.

Файлът има изключение за `.text-white.bg-slate-900|800|black`. За произволен hex
фон вземи цвета **inline** (`style={{ color: '#ffffff' }}`) — inline бие класовото
правило. Не съди по код, измервай: `getComputedStyle(el).color`.

### `position: fixed` не значи „спрямо екрана" (платено 2026-08-28)

Поясненията на Dashboard излизаха извън левия ръб на телефона: панелът е 224px, а
картите на 430pt екран са ~195px, значи закачен **вътре в картата** той няма как да
се побере. Очевидната поправка — `fixed` плюс клампване към viewport-а — беше също
счупена, и по-коварно: панелът кацаше на **480px над екрана**.

Причината: `hover:scale-105` оставя картата с `transform: matrix(1,0,0,1,0,0)`.
Идентитет, но **не `none`** — а всяка стойност освен `none` прави елемента
containing block за `fixed` потомци. Тоест координатите се решаваха спрямо картата,
не спрямо екрана. Същото важи за `filter`, `backdrop-filter`, `perspective`,
`will-change` и `contain` — а `glass-surface` в този проект ползва `backdrop-filter`.

Затова панелът се рендира през `createPortal` в `<body>`. Порталът е носещ, не
разкрасяване: махне ли се, бъгът се връща веднага.

**Как се намира виновникът** — не по четене на CSS, а като се обходят
предшествениците и се питат за изчислените стойности:

```js
for (let el = node; el && el !== document.documentElement; el = el.parentElement) {
  const s = getComputedStyle(el);
  if (s.transform !== 'none' || s.filter !== 'none' ||
      s.backdropFilter !== 'none' || s.perspective !== 'none') console.log(el, s.transform);
}
```

Пази се от `e2e/dashboard-tooltips.spec.ts` — твърди, че всяко от петте пояснения
се отваря изцяло в 430×932 viewport, в двете колони. **Unit тест не върши работа:
happy-dom не прави layout**, значи само истински енджин може да каже къде е кацнал
панелът. Доказан е срещу двете счупени състояния, не само срещу зелено: без портала
вали с „starts above the viewport", със старата имплементация с „expected 0,
received 5".

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
Сървърната половина съществуваше отдавна и беше **мъртва**: таблица `push_subscriptions` с пълни RLS политики, VAPID ключове в edge функцията, `push` handler в `src/sw.ts`, `VITE_VAPID_PUBLIC_KEY` подаван от CI — и `send-kp-alerts`, което честно я заявява на всеки 5 минути. Никой никога не викаше `pushManager.subscribe()`, значи заявката винаги връщаше нула реда. (Втората пречка — SW-ът изобщо не се регистрираше на web, виж „Platform guard gotcha" — падна на 2026-08-09; env променливата е сложена — потвърдено 2026-08-28.)

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

### Одит на продукцията 2026-08-16
Пълен обход: 24 маршрута, бекенд, edge, производителност, достъпност. Сайтът
беше здрав — 200 навсякъде, нула JS изключения, LCP 120–316 ms, TTFB под 300 ms,
cron 288/0, smoke 72/72. Намереното и поправеното:

- **Googlebot 403** — виж „GSC възстановяване“ по-горе. Единственото активно.
- **`TimeSeriesChart` връщаше `<div>` без височина** и оставяше
  lightweight-charts да я сложи от вътрешността на ефекта. Контейнерът рисуваше
  на 0px и печелеше 300 чак когато `createChart` тръгне: картата на
  `/dashboard` скачаше 128 → 428px на 994 ms и буташе всичко под себе си.
  **0.115 от общия CLS 0.119 беше това едно изместване** (всяка друга страница
  е между 0.002 и 0.018). Височината вече се резервира в JSX-а → 0.004.
  Правилото: **компонент, чийто размер идва отвън, резервира мястото си сам.**
- **Rate limit-ът покриваше и `/api/stripe/webhook`** — 5 заявки/10s на IP за
  всичко под `/api/`. Пакет събития от Stripe идва от едно IP и можеше да го
  удари; събития не се губят (Stripe преповтаря 3 дни), но се бавят. Изразът вече
  изключва `/api/stripe/` и `/api/cron/` — и двата се автентикират сами (подпис,
  съответно `CRON_SECRET`). Проверено: 8 бързи заявки към `/api/cron/` → нула
  429; към `/api/gfz` → 5 минават, после 429.
- **WAF правило сочеше несъществуващ път** (`/api/cron/storm-alert`). Сега е
  `starts_with(…, "/api/cron/")`.
- **Заглавия от H1 право на H3** — Dashboard, Forecast и групите във футъра.
  Футърът е на всяка страница, значи страница, чието съдържание спира на H1,
  наследяваше скока. Секциите вече са H2; класовете не са пипани, видът е същият.

Съзнателно непипнати: **Sentry** (153 kB, 38% от JS-а на първо зареждане — но
свалянето му е решение за мониторинга, не оптимизация) и **езиковият redirect на
edge** (~140 ms, но пипа договор, който тъкмо беше построен и тестван).
Пълният доклад: артефактът „Одит на Storm Watcher“.

### Одит на продукцията 2026-08-28

Пълен обход след деплоя на `6935e63`. **Нищо счупено.** 28 маршрута → 200
(0.11–0.35 s, уникални заглавия), 12 езикови URL-а с верен `lang`, пет бота ×
пет пътя → 200, smoke 72/72, тестове 487/487 в три режима, CI и Production smoke
зелени, последен production деплой `READY`, Vercel runtime грешки за 7 дни: само
познатият `DEP0169` от зависимост.

**GSC възстановяването е потвърдено с числа.** Поправката от 16.08
(`ai_training: disabled`) държи:

| | Импресии/ден | Кликове/ден |
|---|---|---|
| 31.07–17.08 (блокирано) | ~10 | 0–1 |
| 18.08–27.08 | 64 → **190** | 3 → **10** |

**Нула блокирани заявки от Google ASN за 23 часа** през `firewallEventsAdaptive`
(на 16.08 бяха 80). Началната страница: обходена същия ден, `page_fetch_state:
SUCCESSFUL`, „Submitted and indexed". Sitemap: Valid, 395 URL-а, 0 грешки.
Забележка към метода: `firewallEventsAdaptiveGroups` иска платен план и връща
„does not have access"; **несгрупираният `firewallEventsAdaptive` работи на
безплатния**.

Намереното:

- **Bz ранното предупреждение падна 2 пъти от 289 прогона** (0.7%) с
  `Unterminated string in JSON at position ~1479000` — тоест **отрязано тяло**, не
  `NaN`. `repairNonStandardJson` не помага: липсващи байтове не се измислят.
  Поведението е правилното (предупреждава и прескача). **Съзнателно непипнато:**
  feed-ът е newest-first, значи отрязаното са старите проби — точно тези, с които
  се доказва „устойчиво 15 минути". Парсване на непълен документ би добавило нов
  начин за лъжа в единствената аларма, която изпреварва бурята.
- **`VITE_VAPID_PUBLIC_KEY` вече е сложена** — намерена в production бъндъла
  (87-знаков base64url до `applicationServerKey` и `pushManager`). TODO списъкът
  долу я водеше като чакаща; вече не е. `push_subscriptions` е 0 реда — никой не
  се е абонирал, при 6 профила общо.
- **Vercel билдва на Node 24, CI тества на Node 20.** Позволено от `engines`
  (`>=20 <27`) и суитът е проверен на 20 и 26, тоест 24 е в скоба. Но бележката
  „runner и работно копие не могат да се разминат" не покрива трета среда.
  Открито, защото локалните чънк хешове **не съвпадат** с production.
- **`/blog` в GSC е `ACCESS_FORBIDDEN`, но записът е отпреди поправката** —
  `last_crawled: 2026-08-09`, седмица по-рано. Живата заявка връща 200. Чака
  преобхождане; ръчният „Request indexing" ускорява.

**Непроверимо отвън: `CRON_SECRET`.** `webhook-health` праща имейл **само при
провал**, значи липсваща променлива → 401 всеки ден → мълчание, неразличимо от
здраво. Vercel Hobby пази runtime логове ~час назад — в прозореца се виждаха само
собствените ми заявки — а env променливите не се експонират през API. Иска поглед
в дашборда.

Дребни, без действие: Supabase съветници — `iap_purchases` с RLS без политики
(вярната стойка: deny-all, пише се със service role) и 10 неползвани индекса на
празни таблици. Sentry, 22 отворени — предимно NOAA флейкове по 1–5 събития
(коректното поведение по дизайн); `Error fetching pulse` (23) е Supabase,
недостъпен от Китай; CSP `eval:` на `/zh` от 2 потребителя с невъзможен
user-agent (Edge 114 върху iOS 13.2.3), почти сигурно инжектиран скрипт.

**Две неща за метода**, платени в брой този ден:

- **`curl` без User-Agent получава 403 от WAF-а** („Block Bad Bots") — обход, който
  не го знае, докладва 28 от 28 провалени страници на напълно здрав сайт.
- **`gh` е инсталиран на Mac-а** (`/opt/homebrew/bin/gh`), но **не е автентикиран**;
  бележката по-долу, че липсва, е за Windows машината. Анонимното GitHub REST API
  работи и на двете.

### Key utilities
- `src/utils/auroraVisibility.ts` — виж отделната секция по-долу
- `src/utils/solarPosition.ts` — `solarAltitude` / `darknessFactor` по алгоритъма на NOAA. Чиста математика, без API; валидиран срещу реални изгреви от Open-Meteo (дава −0.8° при обявения изгрев, при стандартни −0.833°)
- `src/utils/logger.ts` — `logError()` wrapper (console in dev, Sentry in prod)
- `src/utils/generateStormImage.ts` — generates OG share images for storm events
- `src/utils/stormOutlook.ts` — peak Kp in the NOAA 3-day forecast. React-free and app-import-free so it unit-tests standalone, the same reason `send-kp-alerts/bz.ts` is
- `src/utils/noaaTime.ts` — `parseNoaaTime` / `noaaTimeSeconds`. **The only correct way to read a NOAA `time_tag`** — the stamps carry no offset (see above)

## Ideas / Future Plans

_(Add ideas and future feature plans here as they come up)_

## TODO / Pending Work

### Състояние в края на 2026-08-28 (последна сесия)

`main` = `6935e63`, `staging` = `e58d346`, дърветата идентични, работното дърво
чисто, CI #790/#789 и Production smoke зелени. Деплойнато и проверено на живо.

Свършено този ден: поправка на Dashboard поясненията (виж „`position: fixed` не
значи спрямо екрана") и скриване на зеленото H1 на Home, плюс `e2e/dashboard-tooltips.spec.ts`
и изнасяне на `stubNoaa` в `e2e/fixtures/noaa.ts`. Приложението е билднато и
инсталирано на два физически iPhone-а (15 Pro Max и 13). Пълен production одит —
резултатът е горе.

**Следващият път започни оттук:**

1. **`CRON_SECRET` във Vercel** — единственото намерено, което иска действие и не
   се проверява отвън. Виж одита 2026-08-28.
2. **Request indexing за `/blog`** в GSC — записът е стар, но ръчното бутане
   ускорява преобхождането.
3. Ако Bz провалите минат над ~5% от прогоните, преразгледай решението да не се
   пипат (сега са 0.7%).

**Не е нужно да се пипа:** Sentry групите, Supabase съветниците, неползваните
индекси — всички са преценени в одита като коректни или неактуални.

### Състояние в края на 2026-08-14

`main` = `c8bb889`, CI #778 зелен по всички стъпки, production деплойнат и проверен
в браузър. **Кодова работа не чака нищо.** Шестнайсет комита; всеки поправен бъг е
доказан срещу счупено състояние, не само срещу зелено.

| Какво | Как е доказано |
|---|---|
| Трети бъг в алармите (`integer` праг срещу дробно Kp) | 65 cron run-а, 0 провала |
| Open-Meteo времената се четяха в пояса на устройството | 12 града, слънцето на хоризонта ±0.2° |
| Целият текущ ден изхвърлен от прогнозата (`estimated` редове) | Катманду: „Kp 0.0" → реален пик 4.00 |
| Непрогнозирана нощ се рисуваше като уверено `0.0` | тире; типът `number \| null` изкара всичките шест места |
| Два теста тровеха съседите си | 12 разбъркани seeds, всички зелени |
| Три сървиза връщаха измислена стойност при провал | тестове, че хвърлят |
| Flaky тест в CI (`lang` състезание) | мутационен тест + MutationObserver, 5/5 |
| CRLF на Windows | 307 CRLF двойки → 0, суитът зелен локално за пръв път |

**Срив на production, 14.08, ~1 час.** Catch-all-ът върна `index.html` за заявка
към чънк в прозореца на деплоя; `/assets/` носи `immutable` за година, значи CDN-ът
кешира HTML **като бъндъла**. HTTP/1.1 клиенти получаваха верния файл, затова
проверките по статуси показваха здрав сайт, докато всеки реален браузър виждаше
бяло. Поправката не стигна production още час, защото сложих `"_comment"` в
`vercel.json` и Vercel отхвърли конфигурацията — двата деплоя в `ERROR` **без нито
един ред build лог**, при зелен CI.

Оттам са двата предпазителя горе („Двата предпазителя около деплоя"). **Поуката,
която струва най-много: статус 200 не значи, че страницата работи.** Проверявай със
`npm run smoke` или с браузър, не с `Invoke-WebRequest`.

**Одит, направен същия ден:** 16 страници в браузър (0 грешки, 0 CSP нарушения,
`lang` верен за en/bg/de/ja), 72/72 чънка с правилен тип, Vercel `READY`, Supabase
cron чист, Sentry доставя (проверено с нарочна грешка, затворена веднага),
Googlebot/Bingbot/GPTBot → 200, `/api/gfz` и `/api/niggg` с истински данни, 487
теста × 5 пояса × 5 разбърквания.

Дребни, съзнателно оставени: `DEP0169 url.parse` warning от зависимост (15/24ч по
`/api/gfz`, `/api/niggg`, `/api/cron/webhook-health`); `429` от `ipapi.co` на
`/sky`, най-вероятно от собствените ми тестове — ако се повтори, е реален лимит;
`/api/niggg` връща `content-type: text/html` за JSON тяло (препредава типа на
източника, безвредно, защото `fetchJson` парсва текст).

**Sentry е сляп точно за бяла страница** — ако модулът не се зареди, SDK-ът никога
не се инициализира и мониторингът мълчи най-силно, когато е най-нужен. Затова
smoke тестът не е излишен дублаж.

### Какво остава — актуално към 2026-08-14

🔴 **Отменено 14.08: „кодова работа по алармите няма" беше грешно.** Логовете за
24 часа показват трети бъг в същите четири заявки, започнал **15 минути след**
вчерашния deploy: `push_subscriptions.threshold_kp` е `integer`, а
`device_push_tokens.threshold_kp` е `real`. Кодът филтрира и двете с един и същ
`.lte('threshold_kp', currentKp)`, а GFZ дава Kp в трети — PostgREST кастна
`2.333` към типа на колоната и web заявката пада с `22P02`, **79 пъти за 24 часа,
на всеки run с дробно Kp** (≈2 от 3).

**✅ Поправено и проверено на живо същия ден.**
`20260814000000_push_threshold_kp_real.sql` е приложена; и четирите прагови
колони в двете push таблици вече са `real`. Функцията **не е предеплойвана** —
кодът беше прав, схемата не беше. Доказателството е по новия стандарт, не по
един късметлийски ред:

| Прозорец | Run-ове | С дробно Kp | Провалени заявки |
|---|---|---|---|
| до 08:35 UTC | — | всеки | **всеки** (последен `08:35:01`) |
| след 08:36 UTC | 3 | **3** | **0** |

Плюс на самото API: `push_subscriptions?threshold_kp=lte.2.333` мина от `400
22P02` на `200 []`, същото и за `5.667`.

Пак същият модел: PGRST100 гърмеше преди каста и го **скриваше** — старата грешка
спира 13.08 22:40, новата тръгва 22:55. Три слоя досега в четири заявки.

**Затова рецептата за проверка отдолу е недостатъчна и е поправена:** трябва ред с
**дробно** Kp. Вчерашната проверка хвана `Kp=3.0` — цяло число, единственият
случай, в който тази заявка минава.

Останалото иска или потребителя, или устройство/акаунт.

**Накратко какво стана на 13.08 (сесията, която затвори алармите):**

| | |
|---|---|
| `send-kp-alerts` | v10 (11.08) → **v12**, deploy-нато през Supabase MCP |
| Аурора моделът | трите поправки стигнаха production за първи път |
| Гейтът `visibility > 0` | махнат — прагът на потребителя решава сам |
| Заявките към базата | и четирите гърмяха от два независими бъга; поправени |
| Миграция | `20260813000000_push_profiles_fk.sql`, приложена |
| Комити | `3fd06a5`, `a7d049d`, `c8cf441`, `495d89a` |

Проверено на живо, не по код: нова форма на заявката → 200, стара → 400, и cron
ред `Kp=3.0 | bz=-1.92 | web=0 | native=0 | bz_alerts=0` **без** придружаваща
грешка, при отрицателен Bz — тоест и Bz пътят реално се изпълни.

**Недостатъчно, знаем го от 14.08:** `Kp=3.0` е цяло число и е единствената форма,
при която падналата web заявка минава. Проверявай на ред с **дробно** Kp (`.333`
или `.667`), и не по един ред — агрегирай 24 часа, защото грешката се логва и се
прескача, вместо да се хвърли:
```sql
-- през Supabase MCP query_logs
select substring(event_message,1,90) as failure, count(*) n,
       min(timestamp) first_seen, max(timestamp) last_seen
from logs where source = 'function_logs' and event_message like '%failed%'
group by failure order by last_seen desc
```
`last_seen` е важната колона: тя разделя „поправено вчера" от „още тече" и точно
тя показа, че старите грешки спират на 22:40, а новата почва на 22:55.

**✅ Свършено 13.08: `send-kp-alerts` е deploy-ната (v11 → v12) и гейтът отпадна.**

Трите аурора поправки (`abs(gmlat)`, ръб `66 − 2·Kp`, хоризонтен обхват 9° с
квадратичен спад) са в production. Заедно с тях **гейтът `visibility > 0` е
махнат** и с него — inline копието на `calcAuroraVisibility`; прагът на
потребителя решава сам (`3fd06a5`). Причината е в самата функция: известието
казва „Kp has reached X, above your threshold of Y" — обещава буря, не гледка,
а гейт по видимост мълчаливо отменяше единствената настройка, която
потребителят е избрал (София: 0% до Kp 8.33).

**Deploy-ът НЕ иска Supabase CLI сесия.** Тази бележка стоеше тук като блокер и
е грешна: `SUPABASE_ACCESS_TOKEN` наистина липсва на Windows машината, но
**Supabase MCP връзката деплойва directly** — `deploy_edge_function` с
`project_id: srzfoxlmhxyulrgkchjr`. Пази `verify_jwt: false` (иначе cron-ът
почва да връща 401). Проверка, че реално е буутнала, а не само че deploy-ът е
върнал 200:

```powershell
# 401 "Unauthorized" = CRON_SECRET guard-ът е стигнат, значи модулът се е заредил.
# 500 BOOT_ERROR = import графът е счупен.
Invoke-WebRequest -Uri "https://srzfoxlmhxyulrgkchjr.supabase.co/functions/v1/send-kp-alerts" -Method POST
```

**🔴 НАМЕРЕНО 13.08 при проверката на логовете: и четирите заявки в
`send-kp-alerts` гърмяха. Двойно. Поправено на 13.08 (v12 + миграция).**

На всеки cron run, пет пъти на час, откакто функцията съществува:
```
DB query failed: "failed to parse logic tree
((profiles.plan.in.(pro,premium),profiles.subscription_status.eq.trialing))"
```

Две **независими** причини — само едната поправка не върши нищо, защото първата
гърми по-рано от втората и я скрива. И двете потвърдени срещу живия PostgREST с
anon ключа, преди и след:

1. **Излишен `profiles.` префикс вътре в `.or()`.** При подаден
   `{ referencedTable: 'profiles' }` имената на колоните трябва да са **голи** —
   `plan.in.(pro,premium)`, не `profiles.plan.in.(...)`. Иначе PostgREST чете
   `profiles.plan` като име на колона → PGRST100. Сега е една константа
   (`PAID_PLAN_FILTER`), за да не могат четирите места пак да се разминат.
2. **`profiles!inner(...)` изобщо не се разрешаваше** — PGRST200, „no relationship
   found". Push таблиците имат FK към `auth.users(id)`, `profiles.id` също, но
   **PostgREST не свързва две таблици през трета**. Миграция
   `20260813000000_push_profiles_fk.sql` добавя `user_id → profiles(id)` на
   `push_subscriptions` и `device_push_tokens`.

Значи Pro/Premium гейтингът и quiet hours **никога не са работили** — заявката
падаше преди тях. Остана невидимо, защото грешката се логва и се прескача, вместо
да се хвърли, и защото трите push таблици са с 0 реда.

Миграцията е **добавяща**: FK-овете към `auth.users` остават (каскадата при
изтриване на акаунт е документирана срещу тях), а само единият от двата сочи към
`profiles`, значи embed-ът е еднозначен. Нов индекс не трябва — `user_id` вече
води unique индекс и в двете таблици.

**Как се проверява, че наистина е минало** (deploy 200 не значи нищо):
```powershell
# новата форма → 200 [], старата → 400 PGRST100
$k = "<anon key>"; $h = @{ apikey = $k; Authorization = "Bearer $k" }
Invoke-WebRequest -Headers $h -UseBasicParsing -Uri ("https://srzfoxlmhxyulrgkchjr.supabase.co" +
  "/rest/v1/push_subscriptions?select=id,profiles!inner(plan)" +
  "&profiles.or=(plan.in.(pro,premium),subscription_status.eq.trialing)")
```
После в логовете: ред `Kp=… | web=… | native=…` **без** придружаващ
`DB query failed` / `Bz web query failed`.

**Некопнато нарочно:** `live_activity_tokens` се чете с `select('id, token')`, без
`profiles` embed — тоест Live Activity update-ите **не са план-гейтнати** изобщо.
Таблицата е празна и APNs е изключен, така че днес е теоретично; на нея FK не е
добавян, защото няма embed, който да го иска.

**При потребителя (минути):**
- **Vercel env — ✅ VAPID е сложена (проверено 2026-08-28), остава `CRON_SECRET`.**
  Ключът е в production бъндъла, значи web push вече е конфигуриран; хукът и SW-ът
  бяха готови отпреди. `push_subscriptions` е 0 реда — липсват абонати, не
  конфигурация.
  `CRON_SECRET` **не е потвърдена**: без нея `webhook-health` връща 401 и
  предпазителят за тихо паднал Stripe webhook мълчи (Vercel слага Authorization
  header-а само когато променливата съществува). **Отвън не се проверява** —
  функцията праща имейл само при провал, Hobby пази логове ~час назад, а env
  променливите не се експонират през API. Иска дашборда.
  **Откъде е стойността на VAPID (поправено 2026-08-09):** по-ранната бележка тук
  казваше „същият ключ, който CI подава като secret" — това е грешно, трите
  `VITE_*` repo secret-а никога не са съществували (виж `3816754`). Истинското
  копие е в **Supabase → Edge Functions → Secrets → `VAPID_PUBLIC_KEY`**,
  създадено 2026-04-25 заедно с `VAPID_PRIVATE_KEY`. `supabase secrets list`
  показва само дайджести, не стойности — трябва дашбордът.
- **CI: ✅ проверен 14.08, зелен.** Дългата червена серия от 26 април свърши —
  unit-env причината е поправена 09.08 (`0a38290` — hermetic placeholder env в
  ci.yml, `src/lib/supabase.ts` хвърля при import без него). **E2E стъпката вече
  минава на зелен runner** (run #753, `main` @ `38b6b21`) — тази бележка стоеше
  тук като следваща възможна изненада и вече не е такава.

  Единственото червено е run #752 (`staging` @ `da64ec5`), паднало на unit
  тестовете от **flaky тест, не от регресия**: `main` пусна същия tree
  (`f02ed587`, `git diff` празен) зелен 17 секунди по-късно. Поправено —
  `BlogPost.test.tsx` чакаше `<h1>` и твърдеше `document.documentElement.lang`,
  а ефектът в [BlogPost.tsx](src/pages/BlogPost.tsx) пише `lang` **след** commit-а
  на heading-а (измерено с MutationObserver: `lang` е още `da` в мига, в който
  h1 влиза в DOM, 5 от 5 пускания). Сега и двата теста чакат това, което
  твърдят. Общото правило: **не чакай едно нещо и не твърди друго** — RTL
  `findBy*` печели само по времеви марж, който натоварен runner изяжда.

  **`gh` не е инсталиран** (`gh: The term 'gh' is not recognized`) — но не е
  блокер: GitHub REST API работи анонимно за публично репо и дава и стъпките, и
  точното твърдение, без токен. Логовете (`/actions/runs/{id}/logs`) искат auth
  (403), **annotation-ите не искат** и съдържат самата грешка:
  ```powershell
  $h = @{ 'User-Agent'='claude-code'; 'Accept'='application/vnd.github+json' }
  $b = "https://api.github.com/repos/xvxvxvxvxv1914/The_Storm_Watcher"
  (Invoke-RestMethod "$b/actions/runs?per_page=6" -Headers $h).workflow_runs |
    Select-Object run_number, head_branch, conclusion, head_sha
  $id = (Invoke-RestMethod "$b/commits/<sha>/check-runs" -Headers $h).check_runs |
    Where-Object name -eq build | Select-Object -Expand id
  Invoke-RestMethod "$b/check-runs/$id/annotations" -Headers $h | Select-Object path, message
  ```
  Отделно, в annotation-ите: `checkout@v4`, `setup-node@v4` и `upload-artifact@v4`
  вече се форсират на Node 24 (Node 20 e deprecated). Днес само warning.

  Merge staging → main от 09.08 **е свършен** — беше вписан тук като чакащ,
  но `cd9a034` вече го съдържаше.

**Решения на потребителя:**
- **Live Activity не е план-гейтнат.** `live_activity_tokens` се чете със
  `select('id, token')` — без `profiles` embed, значи без plan, без
  `subscription_status`, без quiet hours. Всеки токен получава update независимо
  от плана, докато Kp ≥ 5. Днес е теоретично (0 реда, APNs изключен) и **не е
  пипано нарочно** — Live Activity е Phase B и не е ясно дали изобщо трябва да е
  платена функция, за разлика от push-а. Ако трябва: добавя се същият
  `profiles!inner(...)` + `PAID_PLAN_FILTER`, плюс FK на третата таблица.
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
- **GSC възстановяване — тръгна чак на 16.08.** „Коренът решен 05.08" беше
  невярно: Skip правилото за verified search crawlers **се задействаше и Google
  пак се блокираше**. Firewall events показват две събития за една и съща заявка
  в една и съща секунда — `skip | Allow verified search crawlers` и
  `block | Block AI training crawlers` (ASN 15169). Значи AI-training блокът не е
  в обхвата на skip по фаза, въпреки че се логва като `firewallManaged`. За 23
  часа на 16.08: **80 блокирани заявки от Google**.

  Затова `bot_management.ai_training` е `disabled` от 16.08 (само това поле —
  останалите 11 настройки са проверено непокътнати, вкл. `enable_js: false`).
  **Политиката срещу AI training не е загубена** — `public/robots.txt` я
  декларира (`Google-Extended`, `GPTBot`, `CCBot`, `ClaudeBot`, … плюс
  `Content-Signal: ai-train=no`); пада само edge enforcement-ът, който удряше и
  Googlebot, защото Google ползва същия бот и за AI grounding.

  Резултат същия ден: sitemap `last_downloaded` 05.07 → **16.08**, статус
  „Has errors" → **Valid**, 347 → 395 URL-а, и 0 блокирани заявки от Google след
  промяната. Пълното наваксване на 141/647 отнема седмици (crawl rate е снижен
  след месец 403-ки). Ръчно ускорение: Request indexing за `/`, `/blog`,
  `/aurora`, `/bg` — API не може.

  **✅ Потвърдено 12 дни по-късно (2026-08-28), виж одита по-горе.** Импресиите
  минаха от ~10 на ден на **190**, кликовете от 0–1 на **10**; възстановяването
  тръгва на 18.08, тоест два дни след промяната. Нула блокирани заявки от Google
  ASN за 23 часа. `/blog` още стои `ACCESS_FORBIDDEN` в GSC, но с
  `last_crawled: 2026-08-09` — стар запис отпреди поправката, живата заявка е 200.

  **Метод, не догадки:** авторитетно е `inspect_url_enhanced` →
  `page_fetch_state` + `last_crawled`, плюс `firewallEventsAdaptive` през
  GraphQL (макс 1 ден назад). „URL is available to Google" вече веднъж е
  докладвано като PASS, докато Google реално получаваше 403.

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
