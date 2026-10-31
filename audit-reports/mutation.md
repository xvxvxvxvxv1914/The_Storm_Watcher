# Одит: къде тестовете наистина пазят логиката (мутационно тестване)

Дата: 2026-10-31. Измерено върху `main` @ `3ca6bca`; новият `main` @ `4af5618`
пипа само блога, нито един от проверените файлове — резултатите важат и за него.

Инструменти: Stryker 10.1.1 + `@stryker-mutator/vitest-runner`, `coverageAnalysis:
perTest`, vitest 4.1.5, `@vitest/coverage-v8` 4.1.5, Node 22.23.4. Суитът е 600/600
зелен с CI плейсхолдърите (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`). Stryker
пуска само тестовете, свързани с мутирания файл — 418 от 600.

Хранилището не е пипано. Пробните тестове от раздел 6 живеят само в изхвърлимото
работно копие и **не са комитнати**; описани са достатъчно подробно, за да се
напишат наново.

---

## 1. Бъгове в текущото поведение (първо това)

Трите от 1.1–1.3 са доказани с проба срещу истинския код (тестът минава, като
твърди грешното поведение). Нито един не е открит от зелен тест — всичките лежат в
код с нулево покритие.

### 1.1 `getKpHistory3Day` още превръща непубликуван GFZ бин в Kp 0

`src/services/noaaApi.ts:406` — `Kp: data.Kp[i] ?? 0`. Точно бъгът, поправен в
`getKpIndex` и записан в CLAUDE.md като №1 в списъка „провалена заявка не бива да се
превръща в стойност“ — тук е оцелял, защото функцията няма нито един тест (всичките
ѝ мутанти са NoCoverage).

Проба, един и същ GFZ отговор `Kp: [1.667, 5.333, null]`:

```
getKpHistory3Day → [..., {"time_tag":"2026-08-06T06:00:00","Kp":0}]
getKpIndex       → [... 1.667, 5.333]          (null-ът е изпуснат)
```

Къде се вижда: sparkline-ът на Home (`src/pages/Home.tsx:86`, последните 24 бина —
отворения бин е почти винаги null, значи линията завършва с измислен спад до 0),
Kp графиката на Dashboard (`src/pages/Dashboard.tsx:314–320`, там има и второ
`item.Kp ?? 0`), и CSV експортът (`src/pages/Dashboard.tsx:967–968`), който пише
`0` във файл, който хората си свалят като данни.

Поправка: същият филтър като в `getKpIndex` (`typeof kp === 'number' && kp >= 0`).

### 1.2 Алармата в отворен таб още гейтва по видимост

`src/hooks/useKpAlert.ts:44` — `if (lat !== null && lon !== null &&
calcAuroraVisibility(lat, lon, kp) === 0) return;`

CLAUDE.md казва изрично, че гейтът е махнат на 13.08 („прагът решава сам“; София е 0%
до Kp 8.33) — махнат е само от `send-kp-alerts`. Клиентската аларма, единствената,
която работи без VAPID абонамент, още го прилага, а текстът ѝ обещава същото: „above
your alert threshold of Y“.

Проба: настройки София (42.7, 23.3), праг 5, Kp 6.0 (G2) → **нула известия**.

### 1.3 Същата аларма нарича Kp 4 „G1“

`src/hooks/useKpAlert.ts:46` — `const gLevel = kp >= 9 ? 5 : … : kp >= 6 ? 2 : 1;` —
всичко под 6 е G1. Праговете 3 и 4 вече са достъпни за всички (free launch; e2e
„anonymous visitors can save Kp 3“). Проба, праг 3, Kp 4.0:

```
🌌 Geomagnetic Storm — G1 (Kp 4.0)
```

G1 почва от Kp 5. Това е четвъртото копие на G-скалата (`gLevel` в
`useStormLiveActivity.ts`, `gLevelOf` в `send-kp-alerts/index.ts:325`, `getGLevel` в
`Calendar.tsx`) и единственото грешно. Поправка: `gLevel()` от
`useStormLiveActivity`, без „G“ под 5.

### 1.4 Празен тест: дедупликацията на Stripe webhook-а реално не се проверява

`api/stripe/webhook.test.ts:102–112` („returns 200 and skips DB update for duplicate
event“) праща `checkout.session.completed` с празен обект — без `metadata` и без
`subscription`. Handler-ът щеше да прескочи update-а **и без** проверката за дубликат
(`if (!userId || !session.subscription) break`). Резултат: всичките 9 мутанта на
`webhook.ts:72–74` оцеляват (плюс десетият на ред 71 — insert без `event_id`),
включително „игнорирай грешката при insert“ и
„`code === '23505'` → `false`“. Повторно доставено от Stripe събитие може да се
обработи два пъти, без тестовете да забележат.

### 1.5 Латентни — открити от мутанти или четене, НЕ са проверени на живо

- **Празен, но валиден GFZ отговор не пада към NOAA и трие офлайн копието.**
  `noaaApi.ts:141–148`: 200 без `datetime`/`Kp` (или само null-ове) дава `[]` — без
  fallback — и `persistSet('offline_kp', [])` презаписва последното добро копие.
  Deno копието в `send-kp-alerts/index.ts:75` в същия случай хвърля „GFZ returned no
  published bin“ и минава на NOAA, тоест четирите имплементации на каскадата се
  разминават. Издаде го оцелелият мутант `data.Kp?.[i]` → `data.Kp[i]` на ред 142 —
  мутантът се държи *по-добре* от оригинала. Не знам дали GFZ реално връща такъв
  отговор.
- **`fetchCurrentKp` измисля 0** (`send-kp-alerts/index.ts:86`,
  `latest.kp_index ?? latest.estimated_kp ?? 0`). При Kp 0 никой праг не се
  задейства, а Live Activity пасът праща `end` и трие **всички** токени
  (`index.ts:566–577`). Днес е теоретично (APNs е изключен).
- **HTTP 400 се чете като „мъртъв токен“** (`index.ts:230`, `:317`, `:365`). При APNs
  400 е и BadTopic, DeviceTokenNotForTopic, MissingTopic — грешна конфигурация би
  изтрила всеки iOS токен още при първия run. Днес е теоретично.
- **Писмата от Stripe webhook-а не се изчакват** (`webhook.ts:114, 172, 193, 225, 304`,
  `sendEmail(...).catch(...)` без `await`, после `res.json`). На Vercel функцията може
  да бъде замразена след отговора и писмото да не тръгне. Не е проверено —
  ръчната стъпка „emails пристигат в Resend“ от CLAUDE.md още не е правена.
- `sustainedBz` (`bz.ts:122, 128`) чете времето с `new Date(tag)` (локално), а
  `rankMagSources` със `stampMs` (UTC). Съгласувани са само защото Supabase върви в
  UTC. Ниско.
- `Calendar.tsx:100` брои бин само ако **началото** му е в нощта. Нощ, по-къса от 3
  часа, може да остане „не е прогнозирано“, макар бинът, започнал преди залеза, да я
  покрива. Касае ~69°N в края на полярния ден. Не е проверено.
- `supabase/functions/_shared/planAccess.ts`: `effectivePlan`, `referralActive` и
  `PLAN_RANK` не се импортират никъде — мъртъв код (22 от 28-те мутанта там са
  NoCoverage заради това).

---

## 2. Мутационен резултат по файл

`score` = убити / (убити + оцелели + непокрити). `покр.` = същото, но само върху
мутантите, които някой тест изобщо изпълнява.

| Файл | мутанти | убити | оцел. | непокр. | score | покр. |
|---|---:|---:|---:|---:|---:|---:|
| `src/utils/auroraVisibility.ts` | 35 | 34 | 1 | 0 | **97.1** | 97.1 |
| `src/utils/stormOutlook.ts` | 49 | 45 | 4 | 0 | 91.8 | 91.8 |
| `src/utils/planAccess.ts` | 41 | 37 | 4 | 0 | 90.2 | 90.2 |
| `src/utils/rtswSource.ts` | 32 | 28 | 4 | 0 | 87.5 | 87.5 |
| `src/utils/fetchJson.ts` | 44 | 38 | 6 | 0 | 86.4 | 86.4 |
| `src/utils/noaaTime.ts` | 14 | 12 | 2 | 0 | 85.7 | 85.7 |
| `src/utils/openMeteoTime.ts` | 25 | 21 | 0 | 4 | 84.0 | 100 |
| `src/utils/langUrl.ts` | 63 | 48 | 3 | 12 | 76.2 | 94.1 |
| `supabase/functions/send-kp-alerts/bz.ts` | 119 | 85 | 25 | 9 | 71.4 | 77.3 |
| `src/utils/solarPosition.ts` | 112 | 67 | 45 | 0 | 59.8 | 59.8 |
| `src/services/noaaApi.ts` | 726 | 358* | 246 | 122 | 49.3 | 59.3 |
| `src/services/uvApi.ts` | 96 | 43 | 33 | 20 | 44.8 | 56.6 |
| `api/stripe/create-checkout-session.ts` | 116 | 47 | 47 | 22 | 40.5 | 50.0 |
| `src/services/skyApi.ts` | 151 | 58 | 81 | 12 | 38.4 | 41.7 |
| `api/cron/webhook-health.ts` | 71 | 22 | 21 | 28 | 31.0 | 51.2 |
| `api/stripe/webhook.ts` | 313 | 92 | 86 | 135 | **29.4** | 51.7 |
| `src/services/nigggApi.ts` | 140 | 39 | 12 | 89 | 27.9 | 76.5 |
| `supabase/functions/_shared/planAccess.ts` | 28 | 5 | 1 | 22 | 17.9 | 83.3 |
| `middleware.ts` | 94 | 0 | 0 | 94 | **0.0** | — |
| **Общо** | **2269** | **1079** | **621** | **569** | **47.6** | **63.5** |

\* 357 убити + 1 timeout. Цял прогон: 10 мин 42 с на 4 ядра.

**Как се чете:** утилитите, чиято история разказва CLAUDE.md (времената, авроралният
модел, rtsw, outlook, fetchJson, planAccess), са добре пазени (84–97%), и оцелелите
там са предимно еквивалентни. Слабото е
**сървисите и сървърът**: точно там, където провалена заявка, парсване или Stripe
събитие се превръщат в това, което потребителят вижда или плаща.

### Доказателство, че препоръчаните тестове убиват мутантите

Тестовете от раздел 6 бяха написани временно (не са комитнати) и Stryker беше пуснат
отново само върху засегнатите файлове:

| Файл | преди | след | какво остана |
|---|---:|---:|---|
| `middleware.ts` | 0.0 | **87.2** | 12-те оцелели са еквивалентни (виж 3.12) → 100% от смислените |
| `api/cron/webhook-health.ts` | 31.0 | **91.5** | 6 козметични (apiVersion, текст на грешка) |
| `src/services/skyApi.ts` | 38.4 | **86.8** | ключове/TTL на кеша, граници на цикъла |
| `supabase/functions/send-kp-alerts/bz.ts` | 71.4 | **86.6** | 16, всичките еквивалентни |
| `src/services/noaaApi.ts` | 49.3 | **66.7** | най-вече неизпробвани fetcher-и (3.1) |
| `src/utils/solarPosition.ts` | 59.8 | **67.9** | 36, всичките под 0.1° или еквивалентни |

---

## 3. Оцелелите мутанти, които имат значение

Формат: **ред** — мутация → какъв бъг представлява → тестът, който я убива.
Еквивалентните и козметичните (текстове на грешки, CSS класове, ключове на кеша) са
пропуснати, освен където са отбелязани.

### 3.1 `src/services/noaaApi.ts`

- **143** `kp >= 0` → `kp > 0`: истински Kp 0.0 бин се изхвърля. Правилото „Kp 0.0 е
  истинско“ стои навсякъде в CLAUDE.md, но не е заковано тук. *Тест:* GFZ
  `Kp: [0, -1, null]` → точно `[{kp_index: 0}]`. ✔ доказан.
- **117, 124** `toGfzDate` (`split('.')` → `split('')`, `+ 'Z'` → `+ ''`) и
  прозорецът `end − 7 дни` → `+`/`÷`: `/api/gfz` отговаря 400 на грешен формат, а
  приложението **мълчаливо и завинаги** минава на NOAA — точно разминаването с
  уиджетите, което договорът предотвратява. *Тест:* `start`/`end` от URL-а минават
  през `ISO_DATE_RE` от `api/gfz.ts` и `start = now − 7d`. ✔ доказан.
- **47** `nonEmpty` → `false`/`undefined`: резултатът на `getKpIndex` вече не се
  кешира. **Пробата ми не го уби:** по GFZ пътя вътрешният кеш `gfz-kp` (ред 122, без
  `cacheIf`) отговаря на второто четене и маскира мутанта. Има значение по NOAA
  пътя — там всяко четене би теглило NOAA наново. *Тест:* GFZ пада, NOAA успява, две
  четения → NOAA е изтеглен веднъж. Не е доказан.
- **11** `NOAA_BASE_URL` → `""`: никой тест не заковаваше пълен адрес. *Тест:*
  fallback-ът удря `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` —
  по-добре прочетен от `kpSource.contract.json`. ✔ доказан. URL-ите на wind (189),
  forecast (338) и aurora (380) още оцеляват — по едно твърдение за всеки.
- **147/157** офлайн ключът `offline_kp`: офлайн fallback-ът не беше тестван. *Тест:*
  успех, после GFZ и NOAA падат → връщат се предишните редове. ✔ доказан. Ред **153**
  (записът след успешен NOAA fallback) още оцелява.
- **210** `proton_speed > 0` → `>= 0` / `true`: 0 km/s минава за жив замер.
  *Тест:* най-новата проба 0, предишната 420 → 420. ✔ доказан.
- **216–217** `latestMagSample` (Bz на Dashboard и Aurora) няма тест изобщо.
  *Тест:* най-новото `bz_gsm: null` → предишната стойност; `[]` → `null`. ✔ доказан.
- **400–416** `getKpHistory3Day`: 100% NoCoverage → бъг 1.1.
- **517–538** 27-дневната прогноза: fixture-ът е синтетичен с **единични интервали**
  (`2026 Oct 1 100 10 3`) и проверява само датите. Затова оцеляват `\s+` → `\s` и
  `rows.push({...})` → `{}`: флуксът, Ap и **най-големият Kp по дни** изобщо не се
  твърдят. *Тест:* реалистичен fixture (колони, разделени с много интервали) →
  `rows[0]` е `{radioFlux, apIndex, largestKp}`. ✔ доказан за колоните със стойности
  и за `{}`. Остават еквивалентни: `\s+` между година, месец и ден (и NOAA слага там
  по един интервал) и предикатът на ред 517, който дублира проверката на ред 538 —
  двойната валидация прави всяка от двете поотделно излишна.
- **566–613** 3-дневната прогноза: процентите S1 / R1-R2 / R3 и трите rationale не се
  твърдят. Оцелява дори `+s1Match[1]` → `-s1Match[1]` (отрицателни вероятности на
  /forecast). *Тест:* реалистичен 3-day-forecast.txt → точните масиви и текстове. ✔
  доказан.
- **508–512** `forecastSnapshot`: снимка с `fetchedAt` в бъдещето се приема
  (`saved.fetchedAt > Date.now()` → `false`), а `cacheIf` → `false` значи нищо не се
  кешира. *Тестове:* бъдещ `fetchedAt` → `null`; две свежи четения → един `fetch`.
- **295–299** `getDstStatus`: `statusKey` и цветът по ниво не са заковани
  (`'dst.intense'` → `""` оцелява). *Тест:* таблица Dst → `{statusKey, color}`.
- **423–431** `getKpGradientStyle`: NoCoverage — лентите, които по CLAUDE.md „носят
  смисъл“. *Тест:* 3.9 / 4 / 5 / 7 → зелено / жълто / оранжево / червено.
- **NoCoverage fetcher-и:** `getXrayFlux` (163–172), `getDst` (237–247),
  `getMagField` (303–313), `getAlerts` (317–326 — единственият, който **хвърля**,
  когато няма офлайн копие), `getWeatherData` (464–478). По един тест за успех и за
  провал на всеки.

### 3.2 `src/services/skyApi.ts` — присъдата на /sky не беше пазена изобщо

- **175–194** всеки аритметичен и прагов мутант на оценката оцеля: `100 −
  cloudCoverAvg` → `100 +` (облачна нощ излиза „ясна“), тегла 0.6/0.25/0.15, прагове
  75/50/25. Тестовете проверяваха часове и етикети, не присъдата. *Тест:* три
  fixture-а — облачност 30 / видимост 16 км / валеж 0 → `score 77`, „excellent“;
  90/4/60 → 17, „poor“; плюс „good“ и „fair“. ✔ доказан.
- **167** `visibility / 1000` → `* 1000` (метри → км). Покрито от горния тест.
- **197–200** шансът за аврора по ленти Kp 7/5/4/3. *Тест:* таблица. ✔ доказан.
- **84–87, 140–143** параметрите на заявката, **включително `timezone: 'auto'` →
  `""`**: целият дизайн с `parseOpenMeteoTime` виси на него — без него `daily`
  масивите са по UTC дни и часовете се печатат в GMT. *Тест:* `searchParams` на URL-а.
  ✔ доказан.
- **108** `known` → `true`: нечетим изгрев дава прозорец с Invalid Date (обект, т.е.
  truthy) вместо `null`, и Calendar филтрира спрямо него → „не е прогнозирано“.
  *Тест:* `sunrise: null` → `nightStart: null, noNight: false`. ✔ доказан.

### 3.3 `src/services/uvApi.ts`

- **60** `uv_index_max[0] ?? 0` → `&& 0`: дневният максимум винаги 0 („Low — no
  protection needed“ под максимума). *Тест:* твърди `max`.
- **52–55** почасовият масив за графиката не се твърди (`map` → `() => undefined`,
  закръгляването `*10/10`). *Тест:* `hourly[i]` = `{time, isoTime, uv_index}`.
- **84–123** `getSunData`: NoCoverage (страница SunTimes: изгрев, залез, златен час
  ±1 ч, продължителност на деня).
- **27–33** `timezone: 'auto'` → `""` — същото като в skyApi.
- Риск в същия клас, без мутант: `null` в `hourly.uv_index` от Open-Meteo става UV 0
  (`?? 0` и `Math.round(null * 10) / 10`).

### 3.4 `src/services/nigggApi.ts`

- **31** сортирането в `toDeltaSeries` може да се махне: тестът за „90-ия
  перцентил“ подава вече низходящи данни. *Тест:* същите стойности възходящо или
  разбъркано → същата база 99.
- **70–143** `fetchNigggData`: 89 мутанта, 100% NoCoverage — времената (UTC полунощ +
  ден·86400 + минута·60), sentinel-ът `1e300`, null-овете, празното тяло. *Тест:*
  fixture от 1441 точки (минава границата на деня) с `1e300` и `null`.

### 3.5 `supabase/functions/send-kp-alerts/bz.ts`

- **23–24** `repairNonStandardJson` — **Deno копието на NaN-поправката няма нито един
  тест**, а CLAUDE.md го нарича мястото „където залогът е най-голям“ (NaN в mag feed-а
  тихо спира ранното предупреждение). *Тест:* една таблица от входове, подадена и на
  двете имплементации (`bz.ts` и `fetchJson.ts`), както `bz.test` вече прави за
  `rankMagSources`. ✔ доказан.
- **70** `!active || t > active.t` → `true`: във feed, подреден newest-first (както
  NOAA го праща), печели **най-старият** активен ред и активният спътник никога не е
  предпочетен. Тестовете строят feed-а от старо към ново. *Тест:* „prefers the active“
  върху обърнат feed. ✔ доказан.
- **81** `s !== first` → `s === first`: когато активният е свеж, но с дупка, няма
  fallthrough към следващия спътник → алармата мълчи. Съществуващият тест за
  fallthrough няма активен спътник. *Тест:* SOLAR1 активен, свеж, 8 проби + ACE с
  пълен прозорец → стойността на ACE. ✔ доказан.
- **67** `!Number.isFinite(t)` → `false`: един боклук в `time_tag` прави cutoff-а NaN
  и алармата мълчи. *Тест:* един ред `'garbage'` + 15 добри → стойност. ✔ доказан.
- **75** `t >= cutoff` → `>`: границата на свежестта се разминава с приложението
  (договорът казва ≤10 мин). *Тест:* точно 10 мин закъснение → още предпочетен. ✔
  доказан.
- Остатъкът (16): regex за формати, които NOAA не праща, излишни `typeof`, равенства
  при еднакъв час, граница на span-а — еквивалентни.

### 3.6 `api/stripe/webhook.ts` — 29.4%, най-ниското място с пари

- **13** `bodyParser: false` → `true` (статичен): на Vercel суровото тяло се изяжда от
  parser-а и подписът пада за **всяко** събитие — класът на инцидента от 2026-05-29.
  *Тест:* `expect(config).toEqual({ api: { bodyParser: false } })`.
- **40** `chunks.push(...)` → `;`: mock-ът на `constructEvent` игнорира аргументите,
  значи връзката „сурово тяло + подпис + secret“ е непроверена. *Тест:*
  `constructEvent` е извикан с точния `Buffer`, `'valid-sig'` и
  `STRIPE_WEBHOOK_SECRET`.
- **71–74** дедупликацията — виж 1.4.
- **106/137/164/217** `updateError` → `false`, а клоновете 107–109, 138–140, 165–167,
  218–220 и `releaseDedupLock` (81–87) са NoCoverage: паднал запис в базата би бил
  потвърден с 200, Stripe не би повторил и планът **никога не се активира**. Без
  освобождаването на ключалката повторението удря 23505 и пак се губи. *Тест:* update
  връща грешка → 500 **и** `delete` по `stripe_processed_events` с id-то на събитието.
- **129** `sub.status === 'active'` → `false`: update събитие за **активен** платец
  слага план `free`. Тестват се само `trialing` и `canceled`. *Тест:* `active` + Pro
  цена → `pro`; `past_due` → `free` (заковава политиката).
- **104/135** `periodEnd * 1000` → `/ 1000`: датата на подновяване се записва като
  1970. *Тест:* `current_period_end: 1_800_000_000` →
  `subscription_period_end: '2027-01-15T08:00:00.000Z'`.
- **100/105, 132/136, 158/163, 214/216** таблицата `'profiles'` → `""` и
  `.eq('id', userId)` → `.eq('', …)`: WHERE клаузата не се проверява. *Тест:*
  `from('profiles')` и `eq('id', 'user-123')`.
- **26/28** (статични) годишните ценови ID-та → `""`: тестват се само месечните.
  *Тест:* таблица и за четирите ID-та; плюс тест, че `PRICE_TO_PLAN` тук и
  `ALLOWED_PRICES`/`PRO_PRICES` в checkout (същите 4 низа, написани два пъти) не са се
  разминали.
- **188** `daysLeft` (`/` → `*`, `−` → `+`): тестът приема всяко число (`/\d+ day/`).
  *Тест:* точната тема „⏰ Your Storm Watcher trial ends in 3 days“.
- **161** `'canceled'` не се твърди; **113/171/224** дали писмото тръгва — също не.
- **234–308** `invoice.payment_succeeded` (реферална награда): ~70 мутанта, 100%
  NoCoverage. Пробата показа, че поведението е правилно: фактура за $0 се прескача,
  +30 дни се трупат върху активна награда, грешка при claim дава 500 и освобождава
  ключалката. Липсва само тестът.

### 3.7 `api/stripe/create-checkout-session.ts`

Затворен е, докато `FREE_ACCESS_ENABLED = true`, но това е предпазителят за деня, в
който плащанията се върнат.

- **105, 114** `metadata: { supabase_user_id }` → `{}`: webhook-ът чете точно това
  поле. Без него платена поръчка **никога не активира план** — webhook-ът тихо прави
  `break` на `if (!userId …)`. *Тест:* `sessions.create` е извикан с `metadata` и
  `subscription_data.metadata`.
- **62–64, 69** годишните и Premium ID-тата → `""`; **82** `!customerId` → `false` и
  блокът 82–92 е NoCoverage: Stripe customer не се записва и порталът после дава „No
  active subscription found“; **15–23** rate limit-ът (429) е NoCoverage; **53**
  невалиден токен (тества се само липсващ); **121** idempotency ключът.

### 3.8 `api/cron/webhook-health.ts`

- **42** `events.length > 0` → `false` и **44** `shouldAlert` → `false` оцеляват:
  **health check, който никога не алармира, минава всички тестове.** Това е целият
  смисъл на функцията. **32** `since` (знак и единици), **36** `delivery_success:
  false` → `true`, **37** `created` → `{}`: заявката към Stripe не се проверява.
  **71–81** пътят „самата проверка гръмна“ е NoCoverage. *Тест:* 3 провалени събития →
  тема „⚠️ 3 Stripe webhook deliveries failed (last 24h)“, броене по тип, `{ok: true,
  failedCount: 3, alerted: true}`; единствено число; `?test=true`; Stripe хвърля →
  500 + писмо „ERRORED“. ✔ доказан, 31.0% → 91.5%.

### 3.9 `src/utils/planAccess.ts` (клиент)

- **25** `PLAN_RANK[userPlan] < PLAN_RANK['pro']` → `true`: Premium потребител с
  активна реферална награда (или `trialing`) пада до ефективен `pro` и губи Premium.
  Реалистично е: webhook-ът дава `referral_pro_until` на всеки препоръчал, и на
  Premium. *Тест:* premium + бъдещ `referralProUntil` + изискван premium → `true`.
- **7** `VITE_PAYMENTS_ENABLED === 'true'` → `true`: `src/test-setup.ts` слага `'true'`
  за всеки тест, значи комбинацията „free access изключен + флагът липсва → без
  paywall“ никога не се изпълнява. *Тест:* `vi.stubEnv` + mock на `accessPolicy`.

### 3.10 `src/utils/langUrl.ts`

- **65–68** `switchLangUrl`, **100–102** `persistLanguage`, **110–113**
  `navigateToLang`: NoCoverage — езиковият превключвател е на всяка страница. *Тест:*
  `/de/sky?x=1#h` → `switchLangUrl('fr')` = `/fr/sky?x=1#h`, `('en')` = `/sky?x=1#h`;
  `persistLanguage` преглъща хвърлящ `localStorage`.
- **21–23** `hreflangCode('zh')` → `'zh-Hans'` (статичните мутанти оцеляват) — SEO.

### 3.11 Малките утилити

- `rtswSource.ts:49` `t > newestActiveT` → `true`: тестът за независимост от реда не
  обръща активни редове. Латентно — днешните викащи подават сортирани данни. *Тест:*
  активни редове newest-first.
- `fetchJson.ts:87` `i < retries` → `false`: паузата от 1.5 s преди повторен опит
  изчезва. *Тест:* с fake timers вторият `fetch` идва чак след 1500 ms. `:76–77`
  махнат `clearTimeout` → изтичащ таймер (`vi.getTimerCount()`).
- `openMeteoTime.ts:58–60` fallback при непознато IANA име: NoCoverage. *Тест:*
  `formatOpenMeteoTime(d, 'Not/AZone')` не хвърля.
- `stormOutlook.ts:62` границата на хоризонта (точно +72 ч) — козметично; останалите
  3 са еквивалентни.
- `auroraVisibility.ts:69` и двата в `noaaTime.ts` — еквивалентни (при `margin = 0`
  и двата клона дават 100; regex-ът без `$` и махнатото `trim()` не засягат
  форматите, които NOAA праща).
- **`solarPosition.ts`**: цялата калибровка е от **средата на август** с толеранс
  ±0.5°. Деветте смислени оцелели (уравнението на центъра `×` → `÷`, уравнението на
  времето `4 *` → `4 /`, деленията около перихелия/афелия) се показват само в други
  сезони. *Тест:* оракул `solar-calculator` (вече е зависимост, ползва го
  `AuroraGlobe`) — височина −0.833° на всеки 4-ти ден от 2026, 4 места, толеранс
  0.25° (оракулът сам се разминава до 0.13°). ✔ доказан, 59.8 → 67.9%. Останалите 36 са
  пертурбации под 0.1° или еквиваленти на 360°.

### 3.12 `middleware.ts` — 0%, но поведението е вярно

Нито един тест. Таблица от 24 случая (trailing slash, `?lang=`, премахнати маршрути с
езиков префикс, съчетания, `matcher`) мина изцяло срещу текущия код — **бъг няма**.
Убива 82 от 94 мутанта. Останалите 12 са еквивалентни: предпазителят `length > 1`
(`replace(/\/+$/, '') || '/'` така или иначе пази `/`), мъртвият клон
`replacement === '/'`, излишното `lang !== null`.

---

## 4. Покритие (v8, целият суит)

| | statements | branches |
|---|---|---|
| `src/` (124 файла; без locales/content/data) | 1338 / 6095 = **22.0%** | 787 / 5170 = **15.2%** |
| `api/` (10 файла) | 140 / 390 = **35.9%** | 83 / 316 = **26.3%** |
| `supabase/functions/` (зарежданите) | 64 / 338 = 18.9% | 47 / 222 = 21.2% |
| `middleware.ts` | 0 / 24 = 0% | 0 / 32 = 0% |
| **Общо** | **1542 / 6847 = 22.5%** | **917 / 5740 = 16.0%** |

`send-kp-alerts/index.ts` (691 реда) и `src/main.tsx` изобщо не влизат в
отчета: v8 не успя да ги обработи, за `index.ts` най-вероятно заради Deno
импортите.

### Файлове с реална логика и нулево покритие

e2e суитът (`e2e/*.spec.ts`) отваря Home, Dashboard, Settings, Pricing, Aurora,
Alerts, Forecast, Auth и Log, но проверява, че се рендират — не логиката им.

**Страници (0%):** `Dashboard.tsx` (369 statements: подреждане на картите,
NIGGG клампването `kpValue < 3 ? max(minDelta, −29)`, CSV експорт), `Mood.tsx`
(256), `Forecast.tsx` (216), `Aurora.tsx` (176), `Hunt.tsx` (158: точки, cooldown),
`Gallery.tsx` (155), `Home.tsx` (141), `Profile.tsx` (130), **`Calendar.tsx`** (117 —
нощното групиране на Kp, най-ценното тук, `buildNights` трябва да се изнесе),
`ISS.tsx` (100), `Auth.tsx` (85: `scorePassword`), `SunTimes.tsx` (59), `UV.tsx`
(54), `SkyVisibility.tsx` (51), `AuthReset.tsx` (47: `scoreLevel`), `Referrals.tsx`
(42), `Contact.tsx` (40: лимитите на полетата), `LanguageSettings.tsx`,
`Livestream.tsx` (`kpCondition`). About, Blog, Privacy, Terms и NotFound са
тривиални.

**Contexts:** `LanguageContext.tsx` — 0%; `ThemeContext.tsx` — 0%;
`SettingsContext.tsx` — 9.5%, само зареждане (засичането на пътуване >25 км,
`loadSettings`, поправката на координатни имена не се изпълняват никъде).

**Hooks (0%):** `useKpAlert.ts` (бъговете 1.2 и 1.3), `usePushNotifications.ts`
(нативната регистрация и временният Android gate), `useIAP.ts`, `usePullToRefresh.ts`,
`useSwipeNavigation.ts`, `useOnboarding.ts`, `useVisibilityInterval.ts`,
`useChartHeight.ts`; `useKpLive.ts` е на 18%.

**Services/utils:** `issApi.ts` (0%), `icalExport.ts` (0%: UID-ът е
`night.date.toISOString().slice(0, 10)`, а `night.date` носи текущия час, значи
източно от UTC рано сутрин UID-ът се пада на предния ден), `generateStormImage.ts`,
`ripple.ts`, `lazyWithRetry.ts` (0%), `referral.ts` (17%), `reverseGeocode.ts`
(11%), `platform.ts` (31%), `src/sw.ts` (0%).

**API (0%):** `api/gfz.ts` (валидация и rate limit на проксито), `api/niggg.ts`,
`api/stripe/create-portal-session.ts`, `api/og.tsx`, `api/feed.ts`,
`api/emails/templates.ts`, `api/lib/resend.ts`.

**Edge функции (не могат да се заредят):** `send-kp-alerts/index.ts`,
`verify-iap/index.ts` (таблицата на решенията Apple/Google — изнасянето ѝ е задължително
преди IAP да тръгне), `delete-account/index.ts`, `submit-mood/index.ts`,
`send-weekly-digest/index.ts` (`kpWindow.ts` е изнесен и е на 100%).

---

## 5. `send-kp-alerts/index.ts`: какво не може да се тества днес

Файлът импортира от `esm.sh` и `npm:`, затова vitest не може да го зареди. Чистата
логика вътре:

| Логика | Редове | Защо е важна |
|---|---|---|
| `inQuietHours` | 148–155 | Гейтва **всяко** известие. Вика `Date.now()` вътре; прозорецът минава през полунощ (23 → 7); `qs === qe` значи „изключено“. Знакът на offset-а е проверен и съвпада: клиентите пращат `-getTimezoneOffset()` (`useWebPush.ts:55`, `usePushNotifications.ts:12`). |
| GFZ skip-back + NOAA fallback | 58–87 | Четвъртото копие на каскадата; `?? 0` на ред 86 (1.5). |
| `gLevelOf` | 325–332 | Четвърто копие на G-скалата. |
| Решението за Live Activity | 566–577 | `update` или `end`, плюс триене на токени. |
| Статус → `{ok, gone}` | 230, 317, 365 | 400 → изтрит токен (1.5). |
| Кой е допустим | 498–502, 655–659 | Включена платформа + тихи часове. |

**Струва ли си изнасянето? Да** — евтино е и рискът е почти нулев. Моделът вече
съществува: `bz.ts` и `send-weekly-digest/kpWindow.ts` са точно това и и двата са
добре тествани. Предложение: `send-kp-alerts/logic.ts`, без импорти, с
`inQuietHours(p, tzOffsetMin, nowMs)`, `pickGfzKp(data)`, `pickNoaaKp(rows)`,
`pushResult(status, kind)`, `liveActivityEvent(kp)`. web-push, базата и JWT
подписването остават интеграционна територия.

---

## 6. Десетте най-ценни теста за добавяне

Подредени по това колко щета предпазват на час работа. ✔ = написан временно и
доказан със Stryker срещу мутантите.

1. **`getKpHistory3Day` изхвърля непубликуваните бинове** (`noaaApi.test.ts`).
   GFZ `Kp: [1.667, 5.333, null]` → два реда, последният 5.333; отделно NOAA
   fallback-ът при паднал GFZ. **Днес пада** — първо поправката от 1.1. Добави и
   Dashboard-ското `item.Kp ?? 0`.
2. **`useKpAlert` следва прага, не видимостта, и не казва G1 под 5**
   (`src/hooks/useKpAlert.test.ts`). `renderHook`; mock на `useSettings` и
   `getKpIndex`; фалшив `Notification` с `permission = 'granted'`, който записва
   заглавията. София / праг 5 / Kp 6.0 → 1 известие; праг 3 / Kp 4.0 → заглавие без
   „G“; Kp 5.0 → „G1“. **Днес пада** (1.2, 1.3). Пази cooldown-а:
   `localStorage.clear()` в `beforeEach`.
3. **Stripe webhook: пътищата на провал и истинска дедупликация**
   (`webhook.test.ts`): (а) update връща `{error}` → 500 и `delete` по
   `stripe_processed_events.eq('event_id', id)` — по едно за всеки тип събитие;
   (б) тестът за дубликат с **пълно** събитие (`metadata.supabase_user_id` +
   `subscription`) → `subscriptions.retrieve` и `update` не са извикани; (в) `active` +
   Pro цена → `pro`; (г) `subscription_period_end` = `'2027-01-15T08:00:00.000Z'`;
   (д) `from('profiles')` + `eq('id', 'user-123')`; (е) `config.api.bodyParser ===
   false`; (ж) аргументите на `constructEvent`; (з) таблица на четирите ценови ID-та,
   сверена с `ALLOWED_PRICES`/`PRO_PRICES` от checkout.
4. **webhook-health наистина алармира** ✔ (`webhook-health.test.ts`): 3 събития от два
   типа → тема, броене по тип, тялото на отговора; 1 събитие → „delivery“; `?test=true`;
   Stripe хвърля → 500 + писмо „ERRORED“; `events.list` е извикан с
   `{delivery_success: false, created: {gte: now/1000 − 90000}, limit: 100}`.
5. **Bz: Deno копието на поправката и feed-ът, подреден както NOAA го праща** ✔
   (`bz.test.ts`): една таблица `repairNonStandardJson` през `bz.ts` и
   `fetchJson.ts` → еднакъв изход; „prefers active“ върху newest-first feed; активен,
   свеж, но с 8 проби + ACE с 15 → стойността на ACE; ред `'garbage'` не заглушава;
   закъснение точно 10 мин → активният още води.
6. **Текстовите продукти на NOAA с реалистични fixtures** ✔ (`noaaOutlook.test.ts`):
   3-day-forecast.txt с колони на много интервали и двуцифрени проценти → точните
   `s1Pct`, `r1r2Pct`, `r3Pct`, `issuedAt`, `days` и трите rationale; 27-day с
   истинските колони → `{radioFlux, apIndex, largestKp}` на два реда и правилните
   месец/ден при прехода октомври → ноември. Най-добре: замразени истински отговори,
   както прави `worldMeteo.fixture.ts`.
7. **Присъдата на /sky** ✔ (`skyApi.timezone.test.ts` или нов файл): 48 почасови реда,
   нощ 17:00–07:00Z; 30/16 км/0 → `score 77` „excellent“; 90/4/60 → 17 „poor“; плюс
   „good“ и „fair“; дневните часове не влизат в средното; Kp 7/6.9/5/4/3/2.9 → шестте
   етикета; `searchParams` (`timezone=auto`, `forecast_days`); `sunrise: null` →
   `nightStart: null`.
8. **Договорът на GFZ заявката и правилата за полетата** ✔ (`kpContract.test.ts`):
   `start`/`end` минават през `ISO_DATE_RE` от `api/gfz.ts`, `start = now − 7d`; Kp
   `[0, -1, null]` → само 0; при двата паднали upstream-а → офлайн копието и fallback
   по пълния URL от `kpSource.contract.json`; `latestMagSample` прескача празно
   `bz_gsm`; 0 km/s не е замер. Плюс един, който пробата нямаше: GFZ пада, NOAA
   успява, две четения → един NOAA fetch (само той убива `nonEmpty`, ред 47).
9. **Middleware таблица** ✔ (`middleware.test.ts`, `@vitest-environment node`):
   `middleware(new Request('https://www.thestormwatcher.com' + path))` →
   `x-middleware-next: 1` или `301` + `Location`. 24 случая: `/ru/` → `/ru`;
   `//` → `/`; `/sky?lang=no&utm=a` → `/no/sky?utm=a`; `/no/sky?lang=no` →
   `/no/sky`; `/de/aurora-map?lang=fr` → `/de/aurora`; `/viewing-window-old` → next;
   плюс `config.matcher` срещу `/api/gfz`, `/assets/x.js`, `/robots.txt`. 0 → 87%.
10. **`inQuietHours` и Kp парсването на cron-а, след изнасяне** (виж раздел 5):
    `[22, 7]` при `+120`: 20:30Z → тихо, 05:00Z → не (краят е изключен), 04:59Z →
    тихо; `[9, 17]`: 8:59 / 9:00 / 16:59 / 17:00; `qs === qe` → никога; `null` tz →
    UTC; Chatham `+765`; Хаваи `−600`. За Kp: `pickGfzKp` прескача назад през
    null-ове, `pickNoaaKp` без поле → хвърля (не 0) — и двете срещу
    `kpSource.contract.json`, както `kpContract.test.ts` за TypeScript.

Следващи по стойност: парсването на `fetchNigggData` и `toDeltaSeries` с разбъркан
вход (3.4); `uvApi` `max` и `getSunData` (3.3); `hasPlanAccess` premium + реферал
(3.9); годишният слънчев оракул ✔ (3.11); `metadata` в checkout (3.7);
`switchLangUrl` (3.10).

---

## 7. Какво не стигнах и какво не е проверено

- Работата спря по искане на собственика (свършващ Cloud кредит). Пълният Stryker прогон
  върху 19-те файла **мина изцяло**. Повторният прогон с пробните тестове обхвана
  само 5 файла плюс `solarPosition`; checkout, webhook, uvApi, nigggApi, langUrl и
  planAccess не са пускани повторно с добавени тестове.
- Мутационно тестване на pages/contexts/hooks не е правено (извън списъка). Там
  покритието е почти нула, тоест резултатът е предвидим.
- Нищо не е проверено срещу живите NOAA, GFZ, Open-Meteo, Stripe или Supabase.
  Всички „латентни“ в 1.5 са от код и мутанти, не от наблюдение.
- Edge функциите, освен `bz.ts` и `_shared/*`, не са мутирани.
- Пробните тестове (`src/__audit__/`, `api/__audit__/`,
  `supabase/functions/send-kp-alerts/__audit__/`) **не са комитнати** — описани са в
  раздел 6.

### Как да се повтори локално

```bash
npm ci
npm install -D --legacy-peer-deps @stryker-mutator/core@10.1.1 @stryker-mutator/vitest-runner@10.1.1 @vitest/coverage-v8@4.1.5
npm install -D --legacy-peer-deps @testing-library/dom@<версията от package-lock>
VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_ANON_KEY=placeholder-anon-key npx stryker run
```

Два капана: (1) `npm install` без `--legacy-peer-deps` гърми с `Cannot read
properties of null (reading 'edgesOut')` (npm 10.9.9 + вложените `overrides`);
(2) с `--legacy-peer-deps` npm **маха** `@testing-library/dom` (peer на
`@testing-library/react`) и 15 тестови файла падат, докато не се добави обратно.
Конфигурация: `testRunner: 'vitest'`, `coverageAnalysis: 'perTest'`,
`concurrency: 4`, `mutate:` 19-те файла. 89 статични мутанта отиват на ~75% от
времето; `ignoreStatic: true` ги пропуска, но тогава константите на модела (66°, 2°,
9°, ценовите ID-та, `bodyParser`) остават непроверени.
