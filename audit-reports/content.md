# Одит: съдържание и преводи — The Storm Watcher

- **Дата:** 2026-10-31
- **Проверен код:** `main` @ `3ca6bca`. Номерата на редовете са спрямо него. След това `4af5618` махна празни преводи на три статии (виж §8).
- **Статус: частичен.** Спрян по искане на собственика, преди да довърша прегледа. Всичко долу е проверено в кода или в данните. Непотвърденото е отбелязано изрично.

**Метод.** Извлякох с TypeScript AST JSX текста, атрибутите и литералите от `src/pages` и `src/components`: 591 и 967 кандидата, пресяти на ръка. Разпънах всичките 16 локала (972 ключа × 16) и проверих със скрипт: стойности, идентични с английските; плейсхолдъри; неизползвани и липсващи ключове. После:

- прегледах на ръка bg, ko, es, de и ja за всичките 972 ключа;
- проверих фактите във FAQ (en плюс извадки), Magnetic Effects (en и bg) и 10-те статии (en плюс извадки на bg, ko, ja, de и es);
- сравних Privacy и Terms с кода;
- прегледах `public/llms.txt`, `pageMeta` и `scripts/meta-translations.mjs`, `api/emails` и push текстовете;
- в Supabase само четох — региона на проекта.

**Важно за четеца.** `t()` в `src/contexts/LanguageContext.tsx` връща самия ключ, когато той липсва (`translations[key] || key`). Затова всеки резерв `t('x') || 'English'` в кода е мъртъв: липсващ ключ означава сурово име на ключ на екрана.

---

## 0. Най-важното (подредено по риск)

1. 🔴 **Здравни твърдения с риск за отговорност.** Засягат Magnetic Effects (на 16 езика), NIGGG картата на Dashboard и „фактите“ в Mood. Пример: пейсмейкъри, „бременните да ограничат престоя навън“, „отложете операции“, мелатонин „в отговор на магнитното поле на Земята“. → §1.1
2. 🔴 **Банерът за бисквитки.** Бутонът „Отхвърли“ (Ablehnen, Afvis, Avvis, Avvisa, Hylkää, Hafna, Odrzuć, Відхилити) записва `accepted`. → §1.2
3. 🔴 **Privacy.** Липсват повечето обработващи: Vercel, Cloudflare, Sentry със Session Replay, Google Fonts, ipapi.co/geojs, Nominatim, Resend и Stripe. Не казва, че наблюденията и снимките публикуват име и координати. За Mood твърди нещо невярно. 8 езика я виждат на английски. → §2
4. 🔴 **„Aurora Log“ (личен дневник) не е личен.** Пише в същата таблица като публичния Hunt, така че бележките и мястото се виждат от всички. → §2.3
5. 🟠 **Нивата на бури са объркани.** Етикетите в Settings са с една степен нагоре (Kp 7 „Severe“, Kp 8 „Extreme“, Kp 9 „Extreme+“). Алармата в таба нарича Kp 3–4 „G1“. Push заглавието казва „Geomagnetic Storm“ и при праг 3. → §3.1
6. 🟠 **Неверни твърдения за продукта на началната страница, на всички езици.** „Powered by Cloudflare Stream“, „снимки, проверени от AI“, ESA като източник. FAQ обещава, че push известието съдържа Bz, вятър и облачност, а то съдържа само Kp. → §4
7. 🟠 **Блогът „What is the Kp index“ (на 11 езика)** съдържа правилото „извадете ширината си от 90“, което за Единбург дава Kp 35. Статията за G-скалата нарича бурята от октомври 2024 „G3“, а тя беше G4. → §6
8. 🟠 **Три липсващи ключа** показват суровото си име на всички езици, вкл. английски: `iss.signalLost`, `gallery.fileTooLarge`, `hunt.cooldownActive`. → §5.1
9. 🟠 **UV страницата** (с реални корейски импресии):
   - H1 е „UV Index“ на всички езици;
   - съветът „безопасно навън“ е по текущия час;
   - линиите „Low 3 / Moderate 6 / High 8“ противоречат на скалата;
   - ko „극단적“ вместо стандартното „위험“.

   → §3.3
10. 🟡 **Български.** „Авроrite“ (латиница в кирилицата), „коронарни“ (сърдечни!) вместо „коронални“ изхвърляния, „Бурени известия“, 63 латински „aurora“ в българските статии. → §7.1

---

## 1. Безопасност и отговорност

### 1.1 Здравни твърдения (задача 5)

**A. `src/content/magnetic/*.ts`.** 16 файла с еднаква структура; en.ts, редове 8–12. Страницата няма собствен дисклеймър, а само реда `sources` (`src/pages/MagneticEffects.tsx:118`). Медицинският дисклеймър е в Terms, но 8 езика виждат Terms на английски.

| Текущ текст (en) | Проблем | Предложение |
|---|---|---|
| „The pineal gland produces melatonin … in response to darkness and the Earth's natural magnetic field. Geomagnetic storms interfere with this process, suppressing melatonin…“ (Sleep) | Мелатонинът се регулира от светлината и тъмнината. „В отговор на магнитното поле“ е невярно, а потискането е представено като факт. | „Melatonin is regulated mainly by light and darkness. A few small studies have reported lower melatonin metabolites on geomagnetically active days; the findings are not consistent.“ |
| „People with pacemakers or implanted cardiac defibrillators — strong storms can in rare cases affect device function“ (Who is most at risk) | Няма доказателства. Промяната на полето по време на буря е малка част от нормалното поле на Земята (~50 µT), в което тези устройства работят постоянно. | Да се махне. Ако темата остане: „Geomagnetic storms do not affect pacemakers or ICDs: the change in the field is a small fraction of Earth's normal field, which these devices are always exposed to.“ |
| „Pregnant women are also advised to limit prolonged outdoor exposure during extreme G4–G5 events“ | Без основание. Сградите не екранират геомагнитното поле, така че съветът е и безсмислен. | Да се махне. |
| „Postpone demanding tasks — surgeries, long flights…“ | Съвет да се отложи операция — потенциално опасен. | Да се махне цялата точка. |
| „grounding … has been shown to reduce physiological stress markers“ (bg: „е доказано“) | Изследванията са слаби. Българският превод засилва твърдението до „доказано“. | Да се махне. |
| „During a G2–G3 storm or higher, if you have cardiovascular conditions, avoid intense physical exertion, … keep your medication close.“ | Това е медицински съвет. | „If you have a heart condition, follow your doctor's advice; there is no evidence-based reason to change treatment because of a geomagnetic storm.“ |
| „Multiple peer-reviewed studies have found a correlation … heart attacks … sudden cardiac deaths“; „which explains why…“; „nights coinciding with Kp ≥ 5 correlate with increased reports of insomnia across large populations“ | Асоциации, представени като установени причини, и то без цитати. | „Some studies report associations…; others find none; no causal link has been established.“ Плюс конкретни цитати — или да се махне. |

Предложен дисклеймър най-горе на страницата, на 16-те езика:
- en: „This page summarises research that is still debated. It is not medical advice. If you feel unwell, contact a doctor.“
- bg: „Тази страница обобщава изследвания, по които няма научен консенсус. Не е медицински съвет. Ако не се чувствате добре, потърсете лекар.“

**B. Dashboard, картата на NIGGG.** Логиката е в `src/services/nigggApi.ts:37-58`. Картата казва „STORM“ при ΔH < −100 nT.
- `niggg.storm.humanEffect` (en.ts:705, bg.ts:606, ko.ts:661, ja.ts:638, de.ts:638, es.ts:638)
  - Сега: „May cause headaches, sleep disturbances, and changes in blood pressure. People with pacemakers should be careful.“
  - Предложение (en): „Some people report headaches or poor sleep during storms; the evidence is mixed. Storms do not affect pacemakers.“
  - Предложение (bg): „Някои хора съобщават за главоболие или лош сън по време на бури; данните са противоречиви. Бурите не влияят на пейсмейкъри.“
- `niggg.storm.detail` (en.ts:704)
  - Сега: „Radio communications are disrupted. Possible aurora visibility over Bulgaria.“
  - Проблем: „are disrupted“ е твърдо, без „може“. Сияние над България изисква Kp 8–9 — така казва и собственият български отговор `home.faq.a2` (bg.ts:545). ΔH от −100 nT не е достатъчно.
  - Предложение: „HF radio may be disrupted, mainly on polar paths. Aurora over Bulgaria needs an extreme storm (Kp 8–9).“
- `niggg.disturbed.humanEffect` (en.ts:708) е формулиран предпазливо. В корейския обаче „과민성“ е медицинският термин за свръхчувствителност; по-добре „예민함“.

**C. Mood и свързаните текстове.** `src/pages/Mood.tsx` показва и ключовете DID_YOU_KNOW.
- `mood.fact.headaches` (en.ts:840)
  - Сега: „Studies show migraine attacks increase by up to 27% during major geomagnetic storms (Kp ≥ 5), especially in latitudes above 50°N.“
  - Проблем: конкретна цифра без източник. Kp 5 е G1 „minor“, не „major“.
  - Предложение: да се махне числото или да се цитира източник; „Some studies report more migraine attacks on geomagnetically active days; results vary between studies.“
- `mood.fact.sleep` (en.ts:841): същото като в точка A.
- `mood.fact.intuition` (en.ts:843): „storm intuition … hours before a major event reaches Earth“ е фолклор, представен като наблюдение. Да се махне.
- `mood.didYouKnowText` (en.ts:72)
  - Сега: „Geomagnetic storms can trigger headaches, insomnia…“ — причинно твърдение.
  - Противоречи на `home.faq.a3` (en.ts:648: „no definitive medical evidence“).
  - Предложение: „Some people report headaches or poor sleep during storms. Research is ongoing and results are mixed.“
- `effects.kpStorm` (en.ts:615) казва „many people report symptoms“, а `effects.kpSevere` (en.ts:614) — „effects may be strongly felt“.
  - Предложение: „Some people report feeling unwell during storms; there is no proven health risk.“
- `about.whoText` (en.ts:633)
  - Сега: „For people who want to know why they have a headache during a magnetic storm.“
  - Предложение: „…who want to know whether their headaches line up with magnetic storms.“
- `mood.anonymous` (en.ts:68): „helps research the Sun-Earth connection“. В кода няма изследователско партньорство.
  - Предложение: „Anonymous · see how the community feels“.
- `mood.aboutText2` (en.ts:61): „completely anonymous“. Записите са псевдонимни — случаен UUID в localStorage (`supabase/functions/submit-mood/index.ts:100-104`).
  - Предложение: „pseudonymous: we store a random ID kept in your browser, not your account“.

### 1.2 Банерът за бисквитки: „Отхвърли“ означава приемане

В `src/components/CookieConsent.tsx` и двата бутона (`:37` и `:43`) викат `accept()` (`:22`), което записва `localStorage['cookie-consent']='accepted'`.

Анализите и Sentry Session Replay работят независимо от избора. Replay записва 5 % от сесиите и 100 % при грешка (`src/main.tsx:98-105`).

`cookie.dismiss` е преведен като **отказ** в 9 езика: bg „Отхвърли“ (bg.ts:585), de „Ablehnen“, da „Afvis“, fi „Hylkää“, is „Hafna“, no „Avvis“, pl „Odrzuć“, sv „Avvisa“, uk „Відхилити“. В es, fr, ja, ko, ru и zh е „Затвори“. Потребител, който „отказва“, се записва като съгласил се.

Има два честни варианта:
- **Истински отказ.** `reject()` записва `rejected` и спира Replay и анализите.
- **Информационен банер.** Един бутон „OK“/„Разбрах“ и текст, който не обещава избор.

И при двата `cookie.dismiss` трябва да стане „Close“ в 9-те езика.

---

## 2. Privacy и Terms (задача 2)

### 2.1 Кои езици липсват

`src/pages/Privacy.tsx:13-270` и `src/pages/Terms.tsx:14-575` имат само **en, bg, de, es, fr, ja, ru и zh**.

Липсват **da, fi, is, ko, no, pl, sv и uk**. За тях `content[language] ?? content.en` (Privacy.tsx:274, Terms.tsx:578) връща английския текст. Последствия:
- `<title>` е на техния език (от pageMeta), но съдържанието е на английски;
- hreflang обявява `/ko/privacy` и останалите като страници на съответния език;
- сред засегнатите са корейският (с реален трафик) и украинският.

### 2.2 Точност спрямо кода

| Твърдение в Privacy | Реалност | Ред |
|---|---|---|
| Трети страни: само Supabase, NOAA, NASA DONKI и Open-Meteo | Не са назовани:<br>• **Vercel** — хостинг; `<Analytics/>` и `<SpeedInsights/>` (`App.tsx:219-220`)<br>• **Cloudflare** — WAF/прокси, вижда IP<br>• **Sentry** — грешки и Session Replay (`main.tsx:93-105`)<br>• **Google Fonts** — IP към Google при всяко зареждане (`index.html:50-53`)<br>• **ipapi.co** и **get.geojs.io** — IP → приблизително място без разрешение (`src/utils/geolocation.ts:78,88`); викат се през `resolveLocation` от UV, Aurora, Dashboard, Sky и ISS<br>• **Nominatim/OSM** — точни координати (`src/utils/reverseGeocode.ts:20`)<br>• **Resend** — имейли (`api/lib/resend.ts`, седмичният дайджест)<br>• **Stripe** — плащания и портал за съществуващите клиенти<br>• push услугите на браузъра — endpoint в `push_subscriptions`<br>• flagcdn.com (`Home.tsx:742`)<br>• wheretheiss.at и tle.ivanstanojevic.me | Privacy.tsx:33-36 |
| „Mood logs … linked to your account … personal geomagnetic sensitivity profile“ | Не са свързани с акаунта — пази се само случаен `user_session_id` (`submit-mood/index.ts:100-104`). Функция „профил на чувствителност“ не съществува. | Privacy.tsx:22 и 7-те превода |
| „Usage data: anonymous analytics … (no personal identifiers)“ | Sentry Session Replay записва сесии (маскирани). Sentry, Vercel и Cloudflare получават IP. | Privacy.tsx:24 |
| „minimal session cookies required for authentication“ | Supabase auth пази сесията в localStorage. За вход не се ползват бисквитки. | Privacy.tsx:38 |
| Не споменава публично съдържание | **Hunt** публикува `display_name` (= „Пълно име“ от регистрацията), място и бележки. Записва и `latitude/longitude` от запазената локация (`Hunt.tsx:181-190`). `select('*')` (`Hunt.tsx:122`) ги връща на всеки клиент.<br>**Gallery** публикува име, надпис и място (`Gallery.tsx:163-170`). EXIF се маха при прекодиране — това е добре. | — |
| Не споменава формата за контакт | `contact_messages` (`Contact.tsx:60`): име, имейл, съобщение | — |
| „stored on Supabase servers in the EU region“ | ✅ Вярно. Проектът `srzfoxlmhxyulrgkchjr` е в регион `eu-north-1` (проверено). | Privacy.tsx:33 |
| Дати | Privacy казва „May 2026“ (Privacy.tsx:16), Terms — „May 2025“ (Terms.tsx:17 и всички преводи). Несъответствие. | — |
| Липсващи елементи по чл. 13 GDPR (риск, не проверка на кода) | Самоличност и адрес на администратора, правни основания, срокове по категории, право на жалба до КЗЛД, трансфер към САЩ (Vercel, Sentry, Google). | — |

Предложен нов раздел „Публично съдържание“:
- en: „Aurora sightings and gallery photos are public. They show your display name, the place name you enter and your notes/caption. Sightings also store the coordinates of your saved location. You can delete them at any time.“
- bg: „Наблюденията на сияния и снимките в галерията са публични. Показват вашето показвано име, мястото, което въведете, и бележките/надписа. Към наблюденията се записват и координатите на запазеното ви местоположение. Можете да ги изтриете по всяко време.“

Освен това в регистрацията `auth.fullName` (en.ts:273) да стане „Display name (shown publicly on photos and sightings)“.

**Terms** не споменават планове, пробни периоди или възстановяване на суми — това е добре. Липсва клауза за потребителско съдържание (снимки, наблюдения): лиценз и правила за премахване.

### 2.3 „Aurora Log“ не е личен

`src/pages/AuroraLog.tsx:87-94` пише в `aurora_sightings`. Това е същата таблица, чиито последни 20 реда Hunt показва на всички — с бележки и място (`Hunt.tsx:122`, рендер в `:536-544`). Записите влизат и в класацията.

Страницата обаче обещава „Keep a diary“ (AuroraLog.tsx:131), а meta описанието казва „Personal diary“ (`:149`).

Решение — едно от двете:
- отделна таблица или флаг `is_private`;
- изричен текст: „Entries are public and appear in Aurora Hunt.“

### 2.4 Планове и пробни периоди при `FREE_ACCESS_ENABLED`

Проверено: всички видими текстове за планове са скрити зад флага. Това са `TrialBanner`, `ProTrialNudge`, `PlanGuard`, pro бариерата в Forecast, CTA бутонът на Home, „Premium“ във Footer, „Pro“ в Livestream, Referrals, плановите бутони в Profile и Pricing → `FreePricing`.

FAQ, Magnetic Effects, блогът, llms.txt и pageMeta не съдържат цени или пробни периоди.

Остатъци:
- `src/pages/Profile.tsx:57` — бързият линк „Storm Alerts — **Push & SMS**“. SMS не съществува, а линкът се вижда и сега. → „Push alerts“.
- `api/emails/templates.ts:149-263` (Stripe webhook): „Reactivate Plan“ води към `/pricing`, а текстът казва „moved to the Free plan“. Тези имейли ще стигнат до съществуващи абонати, ако има такива.
- Латентно, при връщане на плащанията:
  - `PlanGuard.tsx:157` прави `.replace('Pro','').replace('Premium','')` и дава „Available on  and  plans.“;
  - `trial.nudge.desc` обещава „ad-free experience“, а реклами няма;
  - `pricing.nativeDesc`, `pricing.nativeFooter` и `pricing.restorePurchases` са на английски в 14 езика.

---

## 3. Нива на бури, прогноза като измерване, UV (задачи 4 и 5)

### 3.1 Етикети на бури

- **`src/pages/Settings.tsx:84-91`.** Сега: Kp 4 „Moderate“, 6 „Strong Storm“, 7 „Severe Storm“, 8 „Extreme“, 9 „Extreme+“. По NOAA: 5 = G1 Minor, 6 = G2 Moderate, 7 = G3 Strong, 8 = G4 Severe, 9 = G5 Extreme.
  - Предложение (ключовете `settings.kp.*` на 16-те езика): `Kp 3 — Unsettled`, `Kp 4 — Active`, `Kp 5 — G1 Minor storm`, `Kp 6 — G2 Moderate`, `Kp 7 — G3 Strong`, `Kp 8 — G4 Severe`, `Kp 9 — G5 Extreme`.
- **`src/hooks/useKpAlert.ts:46-47`.** `gLevel … : 1` означава, че при праг 3–4 известието казва „Geomagnetic Storm — G1 (Kp 3.7)“. При безплатния достъп всеки може да избере такъв праг.
  - Предложение: под Kp 5 без G ниво — „Kp 3.7 — above your threshold“.
  - Странично: същият хук още гейтва по `calcAuroraVisibility === 0` (`:42-44`). Според CLAUDE.md това е махнато от сървъра.
- **`supabase/functions/send-kp-alerts/index.ts:460, 517`.** Заглавието „Geomagnetic Storm — Kp X“ се праща и при праг 3.
  - Предложение: „Kp X reached your alert threshold“; „Geomagnetic storm“ само при Kp ≥ 5.
  - Всички push и in-tab текстове са само на английски: `:460-461`, `:517-522`, `:626-628` и `useKpAlert.ts:47-48`.
- **`dashboard.tooltip.kp` (en.ts:156).** Сега: „3-4 = moderate, 5-6 = geomagnetic storm, 7-9 = severe storm“.
  - Предложение: „Kp 0–2 quiet, 3 unsettled, 4 active, 5 G1 minor, 6 G2 moderate, 7 G3 strong, 8 G4 severe, 9 G5 extreme“.
  - Японският превод добавя сигурност: „見られます“, без „може би“.
- **`dashboard.tooltip.xray` (en.ts:159) и `src/pages/Alerts.tsx:191-205`.** Всеки X-клас е „Extreme“, M е „Moderate“, а текстът казва „M and X class flares can cause … geomagnetic storms“.
  - По NOAA R-скалата: M1 = R1 minor, M5 = R2 moderate, X1 = R3 strong, X10 = R4 severe, X20 = R5 extreme.
  - Бурите идват от CME, не от самото изригване.
  - Предложение: „…can cause radio blackouts on the sunlit side; a storm follows only if a CME is launched toward Earth.“
  - `Alerts.tsx:205`: думата „Class“ е твърдо на английски.
- **`alerts.impact.flare.x` (en.ts:992).** Сега: „Aurora possible at mid-latitudes if Earth-directed“.
  - Предложение: „…if a CME launched with it is Earth-directed (1–3 days later)“.
- **`alerts.impact.geoStorm.high` (en.ts:980; при g ≥ 4, Alerts.tsx:94-97).** Казва „visible from southern Europe“. По NOAA G4 е около 45° геомагнитна ширина, а Южна Европа е G5.
  - Предложение: „Aurora possible across central Europe and the northern half of the USA.“
- **`alerts.impact.cme.high` (en.ts:988).** Казва „Aurora visible“ за прогнозна CME. → „may be visible“. Твърдо е и в bg, de и es; японският е правилен („可能性“).
- **Storm Score на Home** (`Home.tsx:26-31`, `:603-606`, `home.meaning*` en.ts:98-101). Скалата Kp 0–9 е разделена на равни четвъртинки, така че „Storm“ започва от Kp 4.5, а „Severe“ — от 6.75.
  - `home.meaningQuiet` казва „No aurora expected anywhere in Europe“ при Kp ≤ 2.25. Това е невярно за Тромсьо, Лапландия и Исландия.
    - Предложение: „Quiet. Aurora only in the Arctic (northern Norway, Finland, Sweden, Iceland).“
  - `home.meaningStorm` казва „Aurora is visible“ → „may be visible“.
  - Текстовете казват „Tonight“, а се изчисляват от текущия Kp.
- **Livestream (`src/pages/Livestream.tsx:168-174`).**
  - Kp ≥ 5 е наречено „Active“, а Kp 5 е G1.
  - При Kp 0 пише „unlikely to see aurora now“, а камерите са точно в авроралната зона, където при Kp 0–1 сияние има.
  - Целият блок е на английски.
- **`push.grantedMsg` (en.ts:480).** Сега: „for strong geomagnetic storms“.
  - Предложение: „when Kp reaches your threshold (default Kp 5)“.

### 3.2 Прогноза или модел, представени като измерване

- **`aurora.ovalDesc` (en.ts:212) и `Aurora.tsx:552`.** Сега: „Real-time aurora oval showing current auroral activity“. OVATION е краткосрочен модел — прогноза за следващите 30–90 минути.
  - Предложение: „NOAA OVATION model: where aurora is likely in the next 30–90 minutes. Updated every 5 minutes.“
  - Изречението след него в `Aurora.tsx:552` („Use your mouse to rotate…“) е твърдо на английски.
- **„GO! Perfect Conditions“ (`Aurora.tsx:483-489, 498-502`).** Показва се при облачност под 40 % и Kp ≥ 4, независимо от ширината и от часа. Казва го и в София, Сеул и Мадрид по пладне.
- **Фаза на Луната.** `getMoonPhase()` (`Aurora.tsx:65-80`) връща 0–8. Зелената отметка се показва при 4, тоест при **пълнолуние**, а 8 (новолуние) излиза като „Bright Moonlight“ (`:475-479`).
  - Предложение: вердиктът да ползва `auroraViewingChance(lat, lon, kp, now)`; Луната да се брои за тъмна при 0, 1, 7 и 8.
- **`aurora.quality.desc.excellent` (en.ts:1000).** Казва „Exceptional aurora display likely tonight“, а се изчислява от текущия слънчев вятър, без да гледа ширината.
  - Предложение: „Conditions right now strongly favour aurora at high latitudes.“
- **`aurora.qualityWeights` (en.ts:1005).** Твърди „More accurate than Kp alone“ — недоказано за собствен индекс. Да се махне.
- **`forecast.aboutText2` (en.ts:178).** Казва „Forecasts are updated every 5 minutes“. NOAA издава 3-дневната прогноза около 3 пъти дневно, а 27-дневната — седмично; приложението проверява на 15 минути.
  - Предложение: „NOAA issues the 3-day forecast about three times a day and the 27-day outlook weekly.“
- **`about.dataText` (en.ts:625).** Казва „We don't guess … Data is updated every 60 seconds.“ Видимостта и „Quality Index“ обаче са собствени евристики, а Kp е 3-часов индекс.
  - Предложение: „Data comes directly from NOAA, NASA, GFZ and NIGGG. Live feeds refresh every minute; the Kp index is published every 3 hours.“
- **„Веднага щом“ / „преди пика“.** `home.feature.alerts.desc` (en.ts:119) казва „the moment … — before it peaks“. FAQ казва „notified the moment conditions peak“, а блогът — „sends instant alerts the moment a storm begins“. Kp е ретроспективен 3-часов индекс, а cron проверява на 5 минути.
  - Предложение: „Get an alert when the measured Kp reaches your threshold (checked every 5 minutes). For earlier warning, enable the Bz alert.“
- **`settings.subtitle` (en.ts:532).** Казва „Preferences are saved locally on this device.“ Прагът, Bz и тихите часове обаче се синхронизират със сървъра чрез push записите.
  - Предложение: „…saved on this device; alert settings are also stored with your push subscription.“

### 3.3 UV (корейските UV и календарни страници имат реални импресии)

- **`src/pages/UV.tsx:116`.** H1 е „UV Index“ на всички езици. → `t('uv.currentUvIndex')` или нов ключ.
- **`UV.tsx:137-150`.** Съветът и редът за SPF са за **текущия час**: „No protection needed. Safe to be outside.“ (en.ts:314). Сутрин при UV 1 и дневен максимум 8 това подвежда.
  - Предложение: „Low right now. Check today's maximum ({max}) before going out later.“
- **`UV.tsx:180-185`.** Референтните линии на графиката са „Low 3“, „Moderate 6“, „High 8“, а скалата под тях (`UV.tsx:192-197`) казва, че 3–5 е Moderate.
  - Предложение: „Moderate ≥3“, „High ≥6“, „Very high ≥8“, с цвета на следващата лента.
- **`uv.spf.high` и `uv.spf.veryHigh` (en.ts:462).** „Reapply every 90 min / every hour“ — такъв стандарт няма. Общата препоръка е на 2 часа и след плуване или изпотяване.
- **Превод на UV категориите спрямо националните метеорологични служби:**

  | Език | Сега | Стандарт | Къде |
  |---|---|---|---|
  | ko | Extreme = „극단적“ | КМА: „위험“ | `uv.level.extreme.label`, `uv.scaleExtreme` (ko.ts:289) |
  | ja | „低い / 中程度 / 高い / 非常に高い / 極端“ | JMA: „弱い / 中程度 / 強い / 非常に強い / 極端に強い“ | ja.ts:300-308 |
  | de | „Moderat“ | BfS: „mittel“ | de.ts:301 |
  | is | „Extreme“ | непреведено | — |

- **Промени в смисъла:**
  - de `uv.level.veryHigh.advice` (de.ts:306) казва „Spaziergänge 10–16 Uhr meiden“ — тоест разходки. → „Sonne zwischen 10 und 16 Uhr meiden“.
  - de и ja `uv.level.high.advice` (de.ts:304, ja.ts:304) изпускат „Limit time outdoors“.
  - bg `uv.level.extreme.advice` (bg.ts:319) изпуска „по обед“. → „Останете на закрито по обед. Навън — пълна защита.“
  - ja `uv.advExtreme` казва „昼間“ (целия ден). → „正午前後は屋内に“.

---

## 4. Неверни твърдения за продукта

На всички 16 езика, освен ако не е казано друго.

- **`home.feature.livestream.desc` (en.ts:125)** казва „powered by Cloudflare Stream“. Livestream само дава линкове към YouTube и уебкамери; Cloudflare Stream не се ползва никъде.
  - Предложение: „Links to live aurora cameras in Norway, Sweden, Finland, Iceland and Canada.“
- **`home.feature.gallery.desc` (en.ts:121)** казва „aurora photos verified by AI“. В `Gallery.tsx` и `supabase/functions` няма никаква проверка.
  - Предложение: „Users share aurora photos from around the world.“
- **ESA като източник.** Споменава се в `Home.tsx:738`, `home.trustedSourcesDesc` (en.ts:127) и `about.dataSource3` (en.ts:629), но данни от ESA не се теглят никъде.
  - Липсват реалните източници: GFZ (има собствена карта), Kyoto Dst и Open-Meteo.
  - Предложение: да се махне ESA.
- **FAQ, въпрос 20** („How do I get aurora alerts on my phone?“, `src/content/faq/*.ts`).
  - Казва: „The alert includes current Kp, Bz, solar wind speed, and estimated cloud cover.“ Реалното известие е само „Kp has reached X, above your alert threshold of Y“ (`send-kp-alerts/index.ts:461`).
  - Казва и „the moment NOAA data…“, а основният източник е GFZ.
  - Проверено на en, bg, de, es, ja и ko.
  - Предложение: „…you'll get a push notification when the measured Kp reaches that level (checked every 5 minutes). Web push needs a signed-in account; on iPhone, add the site to your Home Screen first.“
- **Блогът `what-is-solar-flare`** обещава: „When a significant CME is directed toward Earth, you'll get notified 1–3 days before the aurora arrives.“ CME известия няма — `send-kp-alerts` праща само Kp и Bz.
  - Предложение: „…check the Alerts page: Earth-directed CMEs appear there with an estimated arrival time.“
- **„NOAA DONKI“.** DONKI е на NASA. Грешката е във:
  - FAQ en, въпрос 13: „NOAA's DONKI database“;
  - блога `what-is-solar-flare`: „NOAA's DONKI system“;
  - META за `/alerts` (`scripts/meta-translations.mjs:139-155`, 16 езика): „NOAA DONKI notifications“ — а и такива известия няма.
- **`public/llms.txt`:**
  - „Storm Calendar: Historical geomagnetic storm calendar“. `/calendar` е прогноза за 3 нощи. → „Aurora Calendar: 3-night viewing outlook (Kp forecast + cloud cover)“.
  - „free PWA and mobile app (iOS/Android)“. Приложенията не са в магазините. → „free web app (PWA)“.
  - „Livestream: … from Norway and Iceland“. Има камери и от Канада, Швеция и Финландия.
  - „astronomical seeing“ не се показва никъде.
- **`Profile.tsx:57`: „Push & SMS“** (виж §2.4).

---

## 5. Твърдо кодиран текст и механика на локалите (задачи 1 и 3)

### 5.1 Липсващи ключове показват суровия ключ (на всички езици, вкл. английски)

- `src/pages/ISS.tsx:190` — `iss.signalLost`. Потребителят вижда „iss.signalLost“.
- `src/pages/Gallery.tsx:117` — `gallery.fileTooLarge`. Освен това `Gallery.tsx:113` ползва `gallery.uploadError` („Failed to upload photo“) за грешен тип файл.
- `src/pages/Hunt.tsx:162` — `hunt.cooldownActive`. Новият ключ трябва да има `{time}` за оставащото време.

Причината е в `t = translations[key] || key` в `LanguageContext.tsx`: всички резерви `t('x') || '…'` в кода са мъртви. Решение: да се добавят трите ключа в 16-те локала.

### 5.2 Твърдо кодиран текст, подреден по видимост

**Ниво 1 — публични страници, вижда ги всеки посетител.**
- **Глобално:**
  - `Footer.tsx:28` „Aurora Log“; `Footer.tsx:37` и `:98` „Blog“.
  - aria-етикети на английски: `BottomTabBar.tsx:175, 192, 204, 244, 287`; `Navigation.tsx:333`; `Footer.tsx:51`; `ScrollToTop.tsx:21`; `InstallPrompt.tsx:103`; `KpAlertPrompt.tsx:104`; `ProTrialNudge.tsx:53`.
- **Home:**
  - текстът за споделяне в `Home.tsx:26-31`, `:507` и `:515` („Storm Score is X/100 right now! Space weather is …“);
  - og/twitter таговете в Helmet (`Home.tsx:202-205`) са винаги на английски.
- **Dashboard:**
  - етикетите и заглавието при споделяне (`Dashboard.tsx:456`, `:475`);
  - текстът в картинката (`src/utils/generateStormImage.ts:63-129`);
  - aria-етикетът в `Dashboard.tsx:608`;
  - картата за експорт сега се вижда от всички, защото PlanGuard premium е отворен (виж §5.3).
- **Aurora:** `Aurora.tsx:351-354` („Wind“, „Density“); `:552` (изречението за глобуса); `:500-502` (текстът за споделяне „Aurora conditions right now… GO!/WAIT“).
- **H1 на английски:**
  - UV: „UV Index“ (`UV.tsx:116`);
  - Sky: „Sky“ плюс преведеното „tonight“ — смесено (`SkyVisibility.tsx:145`);
  - ISS: „ISS Tracker“ (`ISS.tsx:173`);
  - FAQ: „Aurora FAQ“ (`FAQ.tsx:83`) — а FAQ е SEO страница.
- **`ISSGlobe.tsx:238`:** „Globe unavailable“, макар че ключът `aurora.globeUnavailable` съществува.
- **Alerts:** `Alerts.tsx:205` — „Class …“.
- **Calendar:** наред, ползва ключове.

**Ниво 2.**
- **Contact — цялата страница:** категориите (`Contact.tsx:23-26`), грешката (`:70`), всички етикети и плейсхолдъри (`:90-215`) и етикетите на картите (`:224-226`).
- **Рамката около преведените статии (BlogPost):** `BlogPost.tsx:180` „All articles“, `:196` „min read“, CTA блокът `:215-216`, `:222` „More Articles“ и CATEGORY_LABELS (`src/data/blog/categories.ts:5-10`). Също `Blog.tsx:99` „min read“; индексът на блога е английски по замисъл.
- **Livestream:**
  - имената, описанията и таговете на камерите (`Livestream.tsx:30-164`);
  - текстовете за условията (`:168-174`);
  - „YouTube“/„Webcam“ (`:182`, `:189`) — ключовете `livestream.kindYouTube` и `livestream.kindWebcam` съществуват, но не се ползват;
  - „Current viewing conditions:“ (`:274`);
  - „Community Streams… Feature coming soon…“ (`:315-343`).
- **Hunt:** имената и описанията на значките (`Hunt.tsx:46-58`); текстът за споделяне (`:265-266`); броячът в `:511` ползва ключа-заглавие и излиза „3 Sightings“ (ja „3 目撃数“).
- **Gallery:** `Gallery.tsx:378` „Sign in to Upload“; alt „preview“ (`:270`); alt „Aurora photo“ (`:400`); „Delete photo“ (`:427-428`); плейсхолдърите в `:281` и `:294`.
- **Pricing (безплатната страница):** точките са на английски в da, fi, is, no, pl и sv (проблем на локалите, §5.3).

**Ниво 3 — за влезли потребители.**
- **Profile — около 35 низа:**
  - конфигурационните масиви в `Profile.tsx:20-60` (PLAN_CONFIG, PLAN_FEATURES, QUICK_LINKS вкл. „English (US)“);
  - текстовете в `:206-556` („Back“, „PROFILE“, „Joined“, „Days“, „Status“, „Quick Access“, „Account“, „Display name“, „Changes saved successfully.“, „Save changes“, „Danger Zone“, „Delete account“, „Type … to confirm“, „Delete everything“, „Cancel“);
  - грешките в `:140, 159, 174, 542`.

  **24 ключа `profile.*` с точно тези преводи вече съществуват и не се ползват** (en.ts:502-528 и :831) — остава само да се свържат.
- **AuroraLog — цялата страница:** нивата на интензивност (`AuroraLog.tsx:24`) и текстовете в `:118-309`, вкл. „sighting(s) recorded“ (`:161`).
- **Компоненти:** AvatarCropper (`:70, 73, 80, 105`); LocationPicker (`:74`, `:93` — „Save “…“).
- **Имейли и push:** имейлите за вход (`api/emails/templates.ts:90-147`) и push известията са само на английски за всички потребители.

### 5.3 Стойности, идентични с английските (минават теста за пълнота)

- **20 ключа са на английски в 14 езика (всички освен bg):**
  - **видими на Dashboard сега:** `dashboard.exportTitle`, `exportDesc`, `exportKp`, `exportWind`, `exportForecast`;
  - **видими на Aurora:** `aurora.qualityIndex`, `aurora.qualityWeights`;
  - при грешка: `aurora.globeError`, `aurora.globeRetry`;
  - бета: `settings.beta`, `betaEmpty`, `betaWatch`, `betaDesc` (betaDesc е отрязан английски);
  - скрити зад плащанията: `settings.thresholdProHint`, `settings.thresholdPremiumHint`, `pricing.nativeDesc` (отрязан), `pricing.nativeFooter`, `pricing.restorePurchases`, `planguard.goBack`, `footer.premiumSupport`.
- **13 ключа са на английски в da, fi, is, no, pl и sv:**
  - `forecast.sevenDaySubtitle` — видим на Forecast;
  - `pricing.pro.feat.*` и `pricing.premium.feat.*` — три от тях са на безплатната `/pricing` и в Profile сега;
  - `forecast.proGateTitle`, `forecast.proGateDesc`;
  - `niggg.minDelta` — на Dashboard;
  - `about.dataSource1`.
- **Градовете `aurora.city.*`:**
  - ja, zh, ru — всичките 9 на латиница;
  - es — „Stockholm“, „Copenhagen“, „Berlin“, „Warsaw“, „Prague“, „Vienna“, „Sofia“;
  - de — „Copenhagen“, „Warsaw“, „Prague“, „Vienna“.
- **bg:**
  - `nav.livestream` и `home.feature.livestream.title` са „Livestream“, `livestream.title` е „Aurora Livestream“. → „На живо“ / „Сиянието на живо“;
  - `about.dataSource2` съдържа „(Space Weather Database)“.
- **is:** `uv.level.extreme.label` и `uv.scaleExtreme` са „Extreme“.

Плейсхолдъри `{…}`: **0 разминавания** в 16-те езика. Дублирани ключове в локал файл: няма.

### 5.4 Неизползвани ключове

164 ключа не се срещат в кода (без динамичните). Освен 24-те `profile.*` от §5.2:
- `livestream.disclaimer`, `openExternal`, `noEmbed`, `preview`, `open`, `kindYouTube`, `kindWebcam`;
- `aurora.heatmap.*` (7 ключа, от махнатата карта);
- `alerts.cme`, `alerts.fetchErrorDesc`;
- `settings.useGPS`, `settings.noLocation`, `settings.gpsUnsupported`;
- `push.noSupport`;
- `home.pulse.desc`, `home.pulse.participants`;
- старите `home.feature1-4.*`;
- 12 ключа `forecast.*` и 25 ключа `alerts.*`.

Не съм проверил кои от тях са за триене и кои — за свързване, освен изброените.

### 5.5 Множествено число и обръщение

**Множествено число.**
- `Mood.tsx:568` (серия) различава само 1 и много. В ru излиза „2 дней“ вместо „2 дня“, в uk — „2 днів“ вместо „2 дні“.
- `Mood.tsx:867` (гласове): en „1 votes“, bg „1 гласа“, ru „1 голосов“, pl „1 głosów“ и „2 głosów“.
- `Hunt.tsx:511`: виж §5.2.
- `AuroraLog.tsx:161`: правилото е твърдо английско.
- Решение: `Intl.PluralRules` и ключове `_one/_few/_many/_other`.

**Обръщение.**
- **de** смесва „Sie“ и „du“, понякога в едно изречение: `iss.noPassesDesc` — „Ihrem Standort … Versuche … deinen“. `freeAccess.*`, `mood.heroSubtitle` и `auth.reset*` са на „du“, останалото — на „Sie“.
- **bg** смесва „Вие“ и „ти“: `mood.title` срещу `mood.heroSubtitle`, `push.signInRequired` срещу `push.noSupport`, и `onboarding.welcome.title` „Добре дошъл“.

---

## 6. Фактическа проверка — блог и FAQ (задача 5)

### 6.1 Блог (`src/data/blog/posts/`)

**`what-is-kp-index.ts`** (en плюс 10 превода, вкл. bg, ko, ja, de и es):
- Правилото „subtract your latitude from 90 to get the minimum Kp…“ дава за 55°N Kp 35.
  - Предложение: „Rough guide for Europe: aurora overhead needs about Kp ≈ (66 − your latitude) ÷ 2; for the northern horizon, about 2 Kp less.“ Съвпада с модела в `auroraVisibility.ts` (ръб 66° − 2° на единица Kp).
- „13 observatories between 44° and 60° geographic latitude“ → трябва „**геомагнитна**“.
- „updated every 3 hours by NOAA's SWPC“ → официалният Kp е на GFZ Potsdam; самата Home страница го казва.
- „Kp 0–1: No aurora visible except at the poles“ → „only in the auroral zone (northern Norway, Lapland, Iceland, Alaska)“.

**`g1-to-g5-storm-levels.ts`:**
- „A G3 storm in October 2024…“ → бурята на 10.10.2024 стигна **G4**. Така е калибриран и `auroraVisibility.test.ts`.
- „G1: Above 65°N“ противоречи на статията за Kp (Kp 5 → 55°N) и на NOAA (около 60° геомагнитна ширина).
- „G5 … as far south as the tropics“ противоречи на собствения списък на статията („G5: Above 40°N“).
- Ширините са географски, с примери от Европа и САЩ. За Корея и Япония геомагнитната ширина е с около 8–10° по-ниска, така че „45°N“ там не важи.

**`what-is-geomagnetic-storm.ts`:**
- „G5 only a few times per century“ противоречи на статията за G-скалата („about 4 per solar cycle“; по NOAA — 4 дни на цикъл).
- „solar flare or CME — a much denser … cloud of plasma“: изригването не изпраща плазма.
- Пропуснати са бързите потоци от коронални дупки.
- Споменава DSCOVR (виж следващата статия).

**`what-is-solar-wind.ts`:**
- „NASA's DSCOVR“: DSCOVR е на NOAA и вече не е в потока — той е ACE/IMAP/SOLAR-1 (по CLAUDE.md, 25.09).
- „The solar wind is constant background radiation“ → слънчевият вятър е плазма, не лъчение.
- Скоростта на CME „1,000–3,000 km/s“ противоречи на FAQ („250–3,000“).

**`best-places-aurora-europe.ts`:**
- Svalbard: „aurora is possible year-round“ → не е вярно, от април до август е светло.
- „record-breaking G5 storm of May 2024“ → това е най-силната буря от 2003 г. насам (така пише и другата статия), не рекорд.

**`aurora-forecast-explained.ts`:**
- „OVATION updates every minute“ противоречи на `aurora.ovalDesc` („every 5 minutes“).
- В същата статия прагът е веднъж 20 %, веднъж 10 %.
- „Kp 7 for 45°N overhead“: сияние над главата на 45° иска около Kp 9 и повече.

**`how-to-see-northern-lights.ts`:**
- „between 65° and 72° north latitude … Reykjavik, Whitehorse, Yellowknife“: тези градове са на 60–64° географска ширина; 65–72° е геомагнитна.
- „solar maximum expected around 2025“: максимумът мина през 2024 г.

**Проверено и вярно:**
- май 2024 г. е G5, най-силната буря от около 20 години, със сияние до Мексико;
- Квебек 1989 г. — 6 милиона души без ток за 9 часа;
- честотите G1–G5: 1700 / 600 / 200 / 100 / 4 на цикъл;
- Карингтън;
- данните за МКС: 400 км, 420 т, 90 минути, −5.9 mag;
- праговете на Dst: −50 / −100 / −250.

### 6.2 FAQ (`src/content/faq/en.ts`)

- „Kp … updated every 3 hours by NOAA“ и „updated every minute from GFZ and NOAA“ — Kp е 3-часов индекс.
- DONKI е приписан на NOAA (виж §4).
- Споменава DSCOVR (виж §6.1).
- Съдържанието на известията (виж §4).
- „Solar Cycle 25 maximum (2024–2026)“.
  - Предложение: „Solar Cycle 25 peaked in late 2024; the declining phase still brings strong storms.“
- ko, въпрос 13: „최대 수십억 톤“ — десет пъти повече от „a billion“ в оригинала.

### 6.3 FAQ на началната страница (JSON-LD, en.ts:643-650)

- `home.faq.a2`: „A Kp index of at least 5 is typically needed for visible aurora“ — невярно за Скандинавия и Исландия, където стига Kp 1–3.
  - Предложение: „Near the Arctic Circle Kp 1–3 is often enough; around 55° you need Kp 5; in Central Europe Kp 7–8.“
- `home.faq.a4`: „highly accurate for … 1-2 hours“.
  - Предложение: „Satellites 1.5 million km upstream give 15–60 minutes of warning; forecasts days ahead are uncertain by many hours.“

---

## 7. Човешки преглед на преводите (задача 4)

### 7.1 Български (езикът на собственика)

- **`aurora.auroraDesc` (bg.ts:218):** „**Авроrite** са…“ — латиница в думата. → „Сиянията са природни светлинни явления…“.
- **„Коронарни“ (сърдечни) вместо „коронални“.** Среща се в:
  - `alerts.cme` (bg.ts:251);
  - FAQ на български (`src/content/faq/bg.ts:17, 25, 27, 29`): „Коронарните масови изхвърляния“, „коронарни дупки“, „коронарно масово изхвърляне“.

  Правилно е „коронални изхвърляния на маса (КИМ)“ и „коронални дупки“. Съкращението `alerts.filter.cmes` „КМИ“ → „КИМ“.
- **`push.grantedTitle` (bg.ts:466):** „Бурени известия са включени“ → „Известията за бури са включени“.
- **`aurora.oval` и `aurora.ovalDesc` (bg.ts:208-209):** „Авророва овала“, а „овал“ е от мъжки род. → „Авроралният овал на живо“, „…показващ…“.
- **`sky.partlyCloudy` (bg.ts:361):** „Предимно ясно“ — обратен смисъл. → „Частично облачно“. `sky.overcast` „Облачно“ → „Плътна облачност“.
- **`alerts.status.watch`:** „Издадено наблюдение“. NOAA Watch е предупреждение за възможно събитие. → „Обявена готовност“.
- **Заглавието на Sun (`SunTimes.tsx:148`):** `sun.title` + `sun.times` дават „Слънце Времена“. → един ключ „Изгрев и залез“.
- **Навигация:** `nav.magneticEffectsShort` „Магнетизъм“ → „Магнитни бури“; `nav.magneticEffects` „Магнитни бури & Здраве“ → „Магнитни бури и здраве“.
- **`cookie.dismiss`:** „Отхвърли“ (виж §1.2).
- **META на български (`meta-translations.mjs`):**
  - всяка дума е с главна буква по английски модел („Прогноза за Аврора Тази Нощ — Ще Видя ли Северното Сияние?“, „Политика за Поверителност“, „За Нас“). На български — само първата буква;
  - английски думи в текста: `/iss` „Позиция, **altitude**, скорост“ → „височина“; `/sun` „**outdoor** дейности“ → „дейности на открито“.
- **Българските преводи на статиите:** латинското „aurora“ се среща 63 пъти, „Kp index“ е непреведено, а родът не съгласува („Няма видимо aurora“). Изглежда като машинен превод с непреведен термин. → „сияние“/„полярно сияние“ и „Kp индекс“.
- **`forecast.tapToExpand`:** „3-часово разбивка“ → „3-часова разбивка“ (ключът не се ползва).

### 7.2 Корейски (страници с реални импресии)

- **„Northern Lights“ е преведено като „북쪽 하늘“ — „северното небе“:**
  - `aurora.subtitle` (ko.ts:167), показва се на Home;
  - `home.faq.q2` (ko.ts:601) — **в JSON-LD на началната страница**: „Кога мога да видя северното небе?“;
  - `about.subtitle` (ko.ts:577).

  → „오로라(북극광)“.
- **`storm.quiet` (ko.ts:346) и `niggg.calm.desc`:** „조용“ е отрязано. → „평온“.
- **`sky.verdict.fair.desc` (ko.ts:342):** „맑은 창문이 열릴 수 있습니다“ — буквален „прозорец“. → „구름 사이로 맑은 틈이 생길 수 있습니다“.
- **`mood.symptom.irritability` (ko.ts:49):** „과민성“ → „짜증·예민함“.
- **`mood.betterThan` (ko.ts:787):** → „커뮤니티의 {n}%가 더 나쁘다고 느낍니다“, с плейсхолдър.
- **`aurora.approxChance` (ko.ts:379):** „현재 Kp =와의 …“ е неграматично пред числото.
- **UV:** „위험“ (виж §3.3).
- **Блог:** „aurora가“ и „Kp index는“ са на латиница.

### 7.3 Японски

- **„嵐 G1/G2“ и „激甚嵐 G3+“ (ja.ts:368-370):** „嵐“ е метеорологична буря. → „磁気嵐 G1“, „大規模磁気嵐 G3+“.
- **`aurora.calendar.tipsBestViewing` (ja.ts:842):** „現地**時制**22時“ → „現地時間22時“.
- **META:**
  - заглавията на /aurora, /faq, /calendar и /livestream ползват „北極光“ — китайски термин, а японците търсят „オーロラ“;
  - заглавието на `/about` е „について — ストームウォッチャー“ → „ストームウォッチャーについて“.
- **Статията за Kp:** „未穏“ не е дума → „やや不安定“. „Kp index“ и „aurora“ са на латиница.
- **`home.feature.calendar.desc` (ja.ts:106):** „太陽フレア予報“, а английският казва „solar forecasts“ (Kp). → „宇宙天気予報“.
- **Други:** UV категориите (§3.3); имената на градовете са на латиница.

### 7.4 Испански

- `hunt.leaderboardEmpty` (es.ts:746): „la primera avistamiento“ → „el primer avistamiento“.
- `livestream.subtitle`: „zona aurora“ → „zona auroral“.
- Имената на градовете (виж §5.3).
- Блог: „El Kp index“ → „El índice Kp“.

### 7.5 Немски

- `alerts.type.radStorm` (de.ts:896): „Solare Strahlungssturm“ → „Solarer Strahlungssturm“.
- `alerts.status.watch`: „Beobachtung ausgegeben“ → „Vorwarnung ausgegeben“.
- `alerts.filter.cmes`: „KMEs“ → „KMAs“ или „CMEs“.
- `mood.symptom.palpitations`: „Herzrasen“ → „Herzklopfen“.
- UV (виж §3.3); Sie/du (виж §5.5).
- META: главни букви по английски модел („Kann Ich die Nordlichter Sehen?“).
- Блог: „Der Kp index“; „keine aurora“ с малка буква.

---

## 8. Какво не стигнах (за продължение на собствения компютър)

- **Човешки преглед** на da, fi, is, no, pl, sv, uk, fr, ru и zh. За тях минаха само механичните проверки и търсенето на латиница в кирилица и CJK.
- **FAQ и Magnetic Effects на другите езици** — само извадки: Magnetic изцяло на bg; FAQ въпроси 13 и 20 на bg, de, es, ja и ko.
- **Преводите на статиите** — само статията за Kp и извадки.
  - **След `4af5618`** (main, 31.10) празните преводи на `best-places-aurora-europe`, `how-to-see-northern-lights` и `what-is-solar-wind` са махнати. Броевете на преводите в §6 и §7 са спрямо `3ca6bca`.
  - Статията за Kp не е засегната от тази промяна.
- **Непрегледани:**
  - pageMeta на останалите 10 езика;
  - текстовете в `api/og.tsx`;
  - нативните низове (widget strings, iOS/Android).
- **Седмичният дайджест** — нито съдържанието, нито дали cron-ът изобщо е пуснат. Щях да проверя `cron.job`. Ако не е пуснат, превключвателят в Settings обещава имейли, които не идват.
- **Подредбата по видимост** е по тип страница, не по реален трафик. Vercel Web Analytics връща 404 „not found“ за проекта — вероятно не е включен.
- **RLS на `aurora_sightings`** не проверих наново. Разчитам на известния факт, че координатите са публични.

## 9. Въпроси към собственика

1. **Magnetic Effects:** пренаписване с дисклеймър или съкращаване до „какво казва науката“? Препоръчвам второто.
2. **Банерът за бисквитки:** истински отказ (спира Replay и анализите) или информационен банер с един бутон?
3. **Aurora Log:** да остане публичен (и да го казва ясно) или да има отделна лична таблица?
4. **Корейски и японски посетители:** да показваме ли съвета за ширина в геомагнитни градуси, или да го изчисляваме локално с `auroraViewingChance`?
5. **Мобилните приложения** налични ли са в App Store и Google Play? От това зависят текстовете в llms.txt и във FAQ за известията.
