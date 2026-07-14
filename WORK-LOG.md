# Work Log — The Storm Watcher

> Текущ статус на свършеното и оставащото. Поддържай го при по-големи сесии.

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

**1. Cloudflare — довърши performance фикса (НАЙ-ВАЖНО, наполовина готово)**
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

**2. Lighthouse 64 → 85+ (следва СЛЕД Cloudflare фикса, за да се мери чисто)**
- Preload на LCP изображението `/logos/icon.svg` в index.html (`<link rel="preload" as="image">`)
- Отложен Sentry init (спестява ~88KB + ~490ms от критичния път; Replay вече е lazy)
- Splash анимацията само на native (или по-къса на web) — тя бави първото рисуване
- LCP сега е ~8s: render delay от JS + splash; TBT без CF е 10ms (кодът е ОК)

**3. Supabase (1 клик, dashboard)**
- Authentication → Passwords → включи **Leaked password protection** (единственият останал security advisor)

**4. iPhone тест на location auto-follow**
- `npm run ios:open` (resync-ва dist) → билд на телефона → провери: смяна на локация
  (симулатор: Features → Location → Custom) обновява всички табове; Settings превключвателят auto/manual

**5. Android push (FCM) — критично преди Play Store**
- Ти: Firebase Console → Add app → package `com.stormwatcher.app` → изтегли google-services.json → в android/app/
- Аз: POST_NOTIFICATIONS в манифеста, махам iOS gate-а в usePushNotifications.ts, FCM в send-kp-alerts
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
