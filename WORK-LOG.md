# Work Log — The Storm Watcher

> Текущ статус на свършеното и оставащото. Поддържай го при по-големи сесии.

---

## 2026-07-24 — Уеднаквяване на Kp цветовете + мобилен визуален одит

### Kp цветови ленти — един източник на истина по всички повърхности
Зелено <4 (calm) · жълто 4–5 · оранжево 5–7 (G1–G2) · червено 7–9 (G3–G5).
Синхронизирани: [KpGauge.tsx](src/components/KpGauge.tsx) (ZONES, marker, деления 4/5/7),
[noaaApi.ts](src/services/noaaApi.ts) `getKpGradientStyle`, iOS [StormWidget.swift](ios/App/StormWidget/StormWidget.swift)
`kpScaleGradient` (hard stops 4/9, 5/9, 7/9), [StormLiveActivity.swift](ios/App/StormWidget/StormLiveActivity.swift)
`gColor` (G1–G2 оранжево, G3–G5 червено). Нова `pulse-number` анимация (drop-shadow по
цифрите вместо box glow) за голямото Kp число; `pulse-alert` остава за кутиите (banner + storm бутон).

### Мобилен визуален одит (iOS + Android, тъмна + светла тема)
Прегледан нативният слой (6 widget формата + Live Activity, Capacitor config, Android
styles/colors) + жив рендер на 6 екрана в двете теми. Присъда: визуално силно, safe-area
коректно, светло-тъмните бъгове от 07-19 са изчистени. Два фикса:
- 🐛 **Cookie банерът се показваше и в native app** — [CookieConsent.tsx](src/components/CookieConsent.tsx)
  нямаше native guard. Добавен `if (isNative()) return;` (native декларира data use през
  App Store/Play privacy labels, не уеб banner).
- 🐛 **Android nav bar оставаше тъмен (#0a0a1a) в светла тема** — `@capacitor/status-bar`
  не пипа nav бара. Добавен плъгин `@capgo/capacitor-navigation-bar@8.2.6` (Cap 8-съвместим);
  [ThemeContext.tsx](src/contexts/ThemeContext.tsx) оцветява nav бара по темата (guard `isAndroid()`).
  **Непроверено на устройство** — няма gradle build оттук; на API 36 (forced edge-to-edge)
  ефектът е no-op (nav bar прозрачен), видим е на API ≤35.

### Остава
- Android widget още липсва (iOS: 6 формата + Live Activity, Android: 0).
- Дребно: widget `brandNavy #0a0e27` vs app `#0a0a1a` — два леко различни navy.

---

## 2026-07-22 — Верификация на статуса (без промени по кода)

Проверка на всяко твърдение от TODO списъка на 2026-07-08 срещу реалния код и живия сайт.
Кодът е чист: typecheck 0, lint 0, **163/163 теста**.

### ✅ Оказаха се вече свършени (TODO-то беше остаряло)
- **Cloudflare JSD (беше „НАЙ-ВАЖНО, ОСТАВА")** — в HTML-а на production няма **нито една**
  `cdn-cgi` референция (curl с браузърски UA). JS Detections е изключен, скриптът не се
  инжектира. API token-ът вече не е нужен.
- **Lighthouse точки 1 и 2** — и двете са в кода от `397501d`: preload на LCP изображението
  (`index.html:49`) и `sentryLazy.ts` без нито един статичен `@sentry/react` import.
- **`/api/og`** — 200, `image/png`, 155KB. (Стоеше като ръчна проверка от 2026-05-27.)

### ⚠️ Твърдение, което вече е невярно
„Leaked password protection е **единственият** останал security advisor" — сега са **4**:
1. `contact_messages` има INSERT политика с `WITH CHECK (true)` — вероятно нарочно
   (публична контактна форма), но не е документирано като съзнателно решение.
2. + 3. `check_sighting_cooldown()` е `SECURITY DEFINER` и е извикаема от `anon` **и** от
   `authenticated` през `/rest/v1/rpc/`.
4. Leaked password protection (известното).

Уточнение: 1–3 може да са **нови lint правила** на Supabase, а не нови дупки — не може да се
различи без история на advisor-ите.

### ✅ Потвърдено, че още е вярно
- Android FCM блокажът — gate-ът стои на `usePushNotifications.ts:43`, `google-services.json` липсва.
- `assetlinks.json` още е с `YOUR_SHA256_FINGERPRINT_HERE`.
- IAP plugin (`@capgo/capacitor-purchases`) не е инсталиран.
- Supabase perf миграцията от 8 юли е издържала — 0 RLS initplan предупреждения, останаха
  само INFO за 9 неизползвани индекса.

### 🔺 npm audit се е върнал на 12 (6 high) — но 0 production експозиция
Траекторията: 0 (8 юли) → 11 → 7 (`95facea`, 20 юли) → **12** сега, от новопубликувани CVE-та.
- `@vercel/og` → `sharp` (libvips CVE-2026-33327/33328/35590/35591) изглежда production, защото
  `/api/og` е жив. **Не е**: `api/og.tsx` е `runtime: 'edge'`, а на edge `@vercel/og` минава през
  satori/resvg WASM — `sharp` изобщо не се зарежда. Фиксът иска мажорен скок до `@vercel/og@1.0.0`.
- `js-yaml`, `@vercel/node`, `@capacitor/assets` — само build/dev инструменти.
- `fast-uri` + `brace-expansion` — имат **non-breaking** фикс, безплатно чистене.

### 💡 Отбелязано
В базата има таблица `referrals` и индекс `profiles.referred_by` — referral програмата е
построена на ниво база, докато бележките я водят като „бъдеща идея". Не е проверено дали има UI.

---

## 2026-07-19/20 — Мобилен спринт (iOS + Android)

### iOS
- **Универсални линкове** (`ea47a03`): AASA беше с placeholder `TEAMID` → реален appID
  (`2W6YCTFKNA`), модерен `appIDs`/`components` формат, `/api/*` и `/donki/*` изключени,
  webcredentials за autofill. `vercel.json` сервира AASA като `application/json` и изключва
  `/.well-known/` от apex→www redirect-а (Apple иска директен 200 и на двата домейна).
  Deep-link handler-ът в `App.tsx` вече приема https URL-и с езиков префикс.
- **Локализация на системните стрингове** (16 езика): `{lang}.lproj/InfoPlist.strings` за
  четирите permission диалога + трите quick action заглавия — дотогава винаги на английски.
- **Widget + Live Activity локализирани** (`23c8a56`): „No signal", „Kp SCALE", lock-screen
  „KP INDEX", G-scale описанията; `WL.stormAdjective`/`WL.stormSubtitle` с падежно-безопасни
  фрази. `CFBundleLocalizations` (16 езика) в двата Info.plist — App Store показваше само English.
- **Kp 0.0 вече е валидно четене**, не „няма данни" — `-1` е sentinel-ът; свежестта (не стойността)
  решава дали кешът е използваем.
- 🐛 **`CODE_SIGN_ENTITLEMENTS` беше сирак** (`e2725ae`) — `App.entitlements` и
  `StormWidget.entitlements` съществуваха на диска, но **нито един build не ги е ползвал**.
  Всеки build се е подписвал без app groups и без `aps-environment`. Това обяснява две стари
  загадки: споделянето на App Group кеша беше мъртво (widget-ът работеше само със собствен
  fetch), и „ActivityInput error 0" при заявка за Live Activity push токен — редакциите по
  `aps-environment` са отивали във файл, който build-ът не е чел.
- 🐛 **Widget-ът показваше различен Kp от приложението** (`481615a`) — и `AppDelegate`, и
  `KpProvider` четяха NOAA `estimated_kp` (per-minute, скача 0.33 → 0.67 → 0.33), докато
  приложението чете GFZ (стабилни 3-часови бинове). Нов споделен `KpSource.swift` с **същата
  каскада GFZ → NOAA**. Kp и wind вече носят отделни timestamp-и — преди се пишеха само по
  двойки, тъй че прекъсване на solar wind изхвърляше напълно валиден Kp.

### Android
- **App Links** (`993af7b`) — intent-filter за `https://www.thestormwatcher.com/*` с `autoVerify`.
  Сайтът вече сервираше `assetlinks.json`, но без intent-filter Android никога не отваряше
  приложението от уеб линк — asset links-овете бяха мъртъв товар.
- **Edge-to-edge opt-out** — `targetSdk 35` форсира edge-to-edge на Android 15 и игнорира
  `statusBarColor`/`navigationBarColor`. Opt-out-ът връща предвидими барове; no-op под API 35,
  **спира да работи на API 36** — да се преразгледа при вдигане на targetSdk.
- 🐛 **`capacitor-browser` липсваше изцяло** от Android проекта — OAuth deep-link кракът
  (`Browser.close()`) е щял да се счупи. Хванато при `cap sync`.
- 🐛 **Приложението крашваше ~3s след старт** (`e4b4835`) — `IllegalStateException: Default
  FirebaseApp is not initialized` от `PushNotificationsPlugin.register()`. Старият коментар
  твърдеше, че това е преживяемо и „catch-ът го логва"; **не е** — хвърля се на
  `CapacitorPlugins` thread-а, извън обсега на `.catch()`, и сваля процеса през uncaught handler-а.
  Обхватът е бил по-широк от Pro: при `VITE_PAYMENTS_ENABLED=false` `hasPro` е true за всички,
  значи всеки Android build с изключени плащания е крашвал за **всички** потребители.
  Внесено от `e2725ae`, който махна iOS-only gate-а, без конфигурацията да го последва.
  Проверено на Galaxy A34 / Android 16 (API 36): процесът оцелява 24s, crash буферът празен.

### Друго
- **Design audit на 30 страници в двете теми** (`e6a74ec`) — тъмната беше чиста, светлата
  имаше наследени бъгове от inline стилове, до които theme override-ите не стигат: бяло-на-бяло
  карти на Home, невидим wordmark във Footer/Aurora, изгубени pill контури в Contact.
  Alerts рендерираше целия NOAA feed (**36 000px височина**) → капнат на 8 + „Show {n} more".
  FAQ: махнати 4 почти-дублирани въпроса от 16-те езика.
- `95facea` — `npm audit fix` 11 → 7, CLAUDE.md пренаписан към текущото състояние (i18n беше
  документиран като 8 локала, а са 16).

---

## 2026-07-14/15 — Уеб фиксове

- **Тиха резолюция на локацията** (`44754b6`) — вече никога не изскача permission промпт при
  отваряне на страница; GPS/IP се четат наум с fallback верига.
- **hreflang спря да претендира за непреведени блог варианти** (`db1153e`) + `noindex` на
  служебните route-ове.
- **Kp gauge** (`04198da`) — G-level етикетите се разминаваха с цветните си ленти.
- **CSP** (`9f0d9f6`) — `vercel.live` добавен във `frame-src`.

---

## 2026-07-08 — Пълен одит (сайт + мобилни) и фиксове

### ✅ Направено
- **Локация auto-follow** (`ef063dc`): при отваряне/foreground тихо чете GPS и мести локацията при > 25 км; ръчно избраната остава фиксирана (нов превключвател в Settings). Оправя „в Гърция всичко показваше България".
- **Бъг: /auth?verify=pending игнориран** — непотвърден потребител виждаше гол login без обяснение; сега вижда „Check your email" екрана (+ signOut при връщане).
- **a11y/UX Auth форма**: label↔input връзки (htmlFor/id) + autocomplete атрибути.
- **E2E: 23/23 минават** (бяха 17/23) — тестовете бяха срещу стар UI (стари етикети, счупен GFZ mock regex); бавните run-ове идваха от студен vite dep-кеш.
- **npm audit: 0 уязвимости** (ws high + tar moderate — фикснати).
- **Sentry шум**: 'Failed to fetch' мрежови грешки вече не се репортват (55 events/14д бяха такива).
- **Supabase perf миграция** (приложена в prod): 4 RLS initplan fix-а + 4 FK индекса.
- **iOS**: simulator build минава чисто; widget/app версии изравнени (1.1/2).

### ✅ Проверено (наред е)
- Production: всички route-ове 200, apex→www 308, ?lang= strip 301, sitemap/feed/robots 200. Данни: NOAA (Kp/wind/mag/xray/alerts/forecast), GFZ/NIGGG/DONKI проксита, ISS, Open-Meteo — работят. GSC: **/bg и /de/aurora вече ИНДЕКСИРАНИ**; само /blog чака. Vercel: 0 реални грешки.
- Cloudflare връща 403 challenge на curl-подобни UA — реални браузъри и Googlebot минават (не е проблем).

### ✅ SEO: trailing-slash дубликати (2026-07-08 късно, `91f7363`, в main 2026-07-09)
- GSC: `/ru/`, `/pl`, `/pl/` = "Duplicate without user-selected canonical"; `/uk/` = unknown.
  Причина: `/ru` и `/ru/` живееха като два отделни 200 URL-а без redirect + language
  switcher-ът беше JS `window.location.assign` (никакви crawlable вътрешни линкове към локалите).
- Fix: middleware.ts — single-hop 301 `/ru/` → `/ru` (и комбинирано с ?lang= strip);
  Navigation + BottomTabBar switcher → истински `<a href>` с hreflang.
- Проверено: canonical таговете са били коректни през цялото време (curl с Googlebot UA);
  „/uk с noindex" от GSC report-а е бил Cloudflare 403 blocking page (има собствен noindex),
  не реалният сайт. sitemap.xml чист (само non-slash форми).
- След деплой: поискай re-indexing в GSC за slash-вариантите (очаквай 301 при inspect).

### ✅ Performance: FCP/LCP фикс (2026-07-09, `397501d` + `9369514`, staging)
- Причина за бавното: нищо не се рисуваше преди целия entry JS граф (вкл. sentry-vendor
  75KB + ~430ms CPU) + React mount; LCP елементът беше LocationPrompt параграфът.
- Fix 1: статичен brand splash в index.html (рисува се с пристигането на HTML-а,
  preload на icon.svg); SplashAnimation го маха на mount и стартира от 'show' фаза
  (пиксел-идентично предаване). За no-JS: display:none + inline script (НЕ hidden
  атрибут — inline display го надписва).
- Fix 2: sentryLazy.ts фасада — @sentry/react вече не е статичен import никъде;
  SDK-то се зарежда след window load; ранните грешки се буферират и препращат.
- Резултат: реален LCP 860ms (PerformanceObserver). Lighthouse devtools-throttling:
  **95 точки** (FCP 1.9s / LCP 1.9s / TBT 120ms). ВНИМАНИЕ: default (simulated)
  Lighthouse/PSI lab показва ~64 заради lantern артефакт — грешно приписва LCP на
  React-копието на логото; реалните CrUX/Speed Insights полеви данни са меродавни.
- Cloudflare JSD изключен същия ден (виж по-долу) — измерването вече е чисто.

### 📌 TODO списък за следващи сесии (записано 2026-07-08 вечерта)

> ⚠️ **Остарял — виж верификацията от 2026-07-22 горе.** Точки 1 и 2 са свършени;
> точка 3 вече не е „единственият останал advisor" (станали са 4).

**1. ✅ СВЪРШЕНО (проверено 2026-07-22) — Cloudflare, довърши performance фикса**
- Открито: Speed Insights падна 66 → 38 mobile заради Bot Fight Mode — инжектираният
  `/cdn-cgi/challenge-platform/scripts/jsd/main.js` изяжда 2765ms CPU (TBT 10ms → 1410ms).
  Доказано: същият код през vercel.app deploy URL = 64 т., през www = 38 т.
- Направено: Bot Fight Mode = OFF, Browser Integrity Check = OFF (през Chrome AI агента).
- ❗ ОСТАВА: JS Detections остава ON и след изключването (CF quirk) — скриптът още се
  инжектира на `/`. Трябва **API token** (Create Token → Custom → Zone → Bot Management →
  Edit → zone thestormwatcher.com), после: `PUT /zones/{id}/bot_management {"enable_js": false}`.
- След фикса: re-run Lighthouse (очаквано ~64), curl тестове, re-валидация в GSC.
- Бележка: 403 за curl-подобни клиенти идва от НАШЕТО WAF правило „Block Bad Bots" —
  умишлено е, Googlebot минава (200), не го пипай.

**2. ✅ ЦЕЛТА ПОСТИГНАТА (в `397501d`) — Lighthouse 64 → 85+**
Резултатът е **95** и реален LCP 860ms (виж секцията за FCP/LCP по-горе), тъй че целта е
надмината. Първите две мерки са в кода — проверено 2026-07-22:
- ✅ Preload на LCP изображението `/logos/icon.svg` (`index.html:49`)
- ✅ Отложен Sentry init — `sentryLazy.ts`, 0 статични `@sentry/react` импорта
- ⏭️ Splash анимацията само на native — не е правено и вече е безпредметно (целта е постигната
  без нея); прави се само ако бъдещо измерване пак покаже проблем
- ⏭️ „LCP сега е ~8s" — остаряло число отпреди фикса

**3. Supabase (1 клик, dashboard) — ОТВОРЕНО, но формулировката е остаряла**
- Authentication → Passwords → включи **Leaked password protection**
- ⚠️ Вече **не е** единственият останал security advisor — станали са 4 (виж 2026-07-22).

**4. iPhone тест на location auto-follow**
- `npm run ios:open` (resync-ва dist) → билд на телефона → провери: смяна на локация
  (симулатор: Features → Location → Custom) обновява всички табове; Settings превключвателят auto/manual

**5. Android push (FCM) — критично преди Play Store. КОДЪТ Е ГОТОВ, чака само конфигурация**
- ✅ Направено (20 юли): `POST_NOTIFICATIONS` в манифеста, FCM HTTP v1 в `send-kp-alerts`
  (service-account OAuth, per-platform dispatch, изчистване на мъртви токени). Функцията е
  guard-ната — без `GOOGLE_SERVICE_ACCOUNT` поведението е байт-идентично за iOS/web.
- 🔲 Ти: Firebase Console → Add app → package `com.stormwatcher.app` → `google-services.json`
  в `android/app/`; service account JSON като `GOOGLE_SERVICE_ACCOUNT` secret в Supabase;
  после `supabase functions deploy send-kp-alerts`.
- ❗ **ЗАДЪЛЖИТЕЛНО след това:** махни `if (isAndroid()) return;` от `register()` в
  `usePushNotifications.ts:43`. Този gate спира краш, който сваляше процеса ~3s след старт
  (виж 2026-07-20). Докато стои, Android push не работи изобщо.
- Бележка: Gradle иска Java 21 → `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`

**6. GSC (след ~3-5 дни)**
- Провери дали `/blog` е влязъл в индекса (езиковите /bg, /de/aurora ВЛЯЗОХА ✅)
- След Cloudflare фикса: URL Inspection на страница, която даваше „URL is not available to Google"

**7. По-нататък (от CLAUDE.md TODO, непроменено)**
- Android Glance widget; Android 15 edge-to-edge тест (API 35)
- IAP: plugin install + продукти в App Store Connect / Play Console + secrets + deploy verify-iap
- Stripe CLI тест преди web go-live; Apple Watch app (идея)
- Опционално: изтриване на branch `redesign/premium-dark`; споделен `<Input>` компонент

---

## 2026-06-30 — SEO/индексиране, одит, theming, проверка на данните

### ✅ Направено (в PRODUCTION, branch `main`)

**SEO / индексиране**
- apex `thestormwatcher.com` → www вече е **308** (постоянен), не 307 (промяна във Vercel Domains).
- Махнат **дублиран sitemap** в GSC (apex версията); остана само `www.../sitemap.xml`.
- **Footer линк към `/blog`** (desktop + mobile) — блогът вече е достъпен за обхождане от всяка страница.
- Локализираните страници (`/bg /de …`) — старият `noindex` е поправен в production (потвърдено, че Googlebot вижда `index,follow`); чакат само recrawl.

**Дизайн / theming фиксове**
- 🐛 **Полета четими в светла тема** — `input/textarea/select` ползваха `text-white`, но light override-ът не ги покриваше → въведеният текст беше бял/невидим. Фикс в `src/index.css`.
- **Pricing фон** = като home (черно `#000008` + starfield), вместо собствено тъмно синьо → без seam преди footer-а.
- **Blog/BlogPost фон** → `transparent` (махнат one-off `#050510`) за пълна консистентност.
- **Focus цвят на полетата** унифициран към брандово оранжево (`#f97316`) — беше 4 различни акцента.
- **a11y**: aria-label на 2 иконни бутона (avatar-cropper close, remove-favorite).

**Инфраструктура / достъп**
- Настроен **Google Search Console достъп** (service account + `gscServer` MCP) — виж паметта `gsc-mcp-setup`.
- Rollback точки: таг `stable-2026-06-20-pre-design`, клон `backup/pre-design-2026-06-20`.

### ✅ Проверено (работи коректно)
- **Магнитни бури / Kp данни**: GFZ (primary) + `/api/gfz` proxy + NOAA fallback + прогноза + alerts + solar wind — всички HTTP 200, кръстосано съгласувани. G-scale мапинг коректен спрямо NOAA. `noaaApi` тестове 27/27. (Към 2026-06-30 Kp ≈ 0.0, тихо; прогноза за G1 на 30 юни.)
- **Code health**: typecheck 0, lint 0, тестове минават.
- **Production грешки** (Vercel): 0 реални; само 1 безобиден `url.parse` deprecation warning от зависимост (не наш код).
- **Theming**: тъмна тема консистентна на всички страници (черно + starfield + стъклени карти).

---

### ⏳ Остава (само на потребителя — GSC UI, няма API)
1. **Request indexing** в GSC за езиците (`/bg /de /es /fr /ja /ru /zh`) + блога (`/blog` + постовете). Лимит ~10/ден; Day-1 приоритет: `/aurora-map`, `/blog`, ключови блог постове.
2. **„URL is not available to Google"** — ако се появи пак, провери точния ред в „details" (или е Cloudflare **Bot Fight Mode**, който подхвърля challenge на Googlebot → Cloudflare dashboard → Security → Bots).
3. **След ~5-7 дни**: повторна проверка в GSC дали езиците/блогът са влезли в индекса след recrawl-а.

### 💡 По избор / отложено (с причина)
- **`redesign/premium-dark` branch** — потребителят revert-на редизайна (не му хареса); branch-ът е запазен като fallback. Да се изтрие само при изрично желание.
- **Споделен `<Input>` компонент** — рефактор за поддръжка; не е спешно (бъгът е фикснат глобално), рисково за критичните auth форми.
- **Cloudflare** — изчистване на противоречивите AI-bot правила в live robots.txt (нужен dashboard/token).
- **Dev vulnerabilities** (vite/esbuild/tsx) — само dev/build, 0 production експозиция; fix иска breaking vite 8 ъпгрейд — отложено.
- **CLAUDE.md TODO** — стоящи mobile задачи (Android FCM push, Glance widget, IAP plugin install) — извън обхвата на тази сесия.

---

### Git workflow (важно)
- Push по подразбиране **само в staging**; **main само при изричен ред** за всеки feature.
- staging и main са **разклонени** (main има merge commits) → `git push origin staging:main` се отхвърля; за единичен commit в main използвай **cherry-pick**.
