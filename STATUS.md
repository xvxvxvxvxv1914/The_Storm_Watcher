# The Storm Watcher — Project Status (2026-05-14, updated)

## ✅ НАПРАВЕНО

### Одит 2026-05-12 (Opus full audit)

#### Sprint 1 — CRITICAL (commit fbff2b2)
- **C1** — XSS в Profile аватар upload: валидация на MIME type + разширение
- **C2** — Open redirect в OAuth callback: whitelist на allowed routes
- **C3** — Stripe webhook без signature verification: добавена `stripe.webhooks.constructEvent()`
- **C4** — Service Role Key exposed в клиента: преместен само в server-side функции
- **C5** — SQL injection вектор в Supabase query: parameterized queries

#### Sprint 2 — HIGH (commit c4f9411)
- **H1** — Deep-link whitelist (само known routes в CapApp.addListener)
- **H4** — priceId server-side whitelist в create-checkout-session
- **H5** — CORS wildcard `*` → origin whitelist в 3 Edge Functions (delete-account, donki-proxy, submit-mood)
- **H6** — Rate limit в delete-account (1 req/user/hour)
- **H7** — Rate limit в create-portal-session (5 req/user/min)
- **H8** — Stripe URL validation (checkout.stripe.com / billing.stripe.com) в Pricing + Profile
- **H9** — HSTS header добавен в vercel.json
- **H10** — Email verification gate в App.tsx
- **H11** — Sentry beforeSend: изтрива email/username/ip преди изпращане
- **H12** — Android file_paths.xml: `path="."` → `path="Pictures/StormWatcher"`
- **H13** — iOS Info.plist: добавени NSCamera/NSPhotoLibrary usage descriptions
- **M11** — OAuth redirectTo hardcoded към production URL

#### Sprint 3 — MEDIUM (commit 7ab3eca)
- **M1** — favorite_locations UPDATE policy добавена
- **M2** — AuthContext select: премахнати stripe_customer_id/subscription_id от клиента
- **M3** — NIGGG API: строга date валидация с граници ±100 years / +2 days
- **M4** — AuroraGlobe: dispose на GPU ресурси при unmount (auroraLayersRef)
- **M8** — Android minSdkVersion: 24 → 26
- **M14** — console.error sanitized в AuthContext

#### Sprint 4 — npm audit (commit 1c1af4b)
- npm overrides добавени: `serialize-javascript`, `smol-toml`, `undici`
- `@vercel/node` ъпгреднат до ^5.8.1
- Резултат: 18 → 12 уязвимости, **0 в production** (`npm audit --omit=dev`)

---

### Supabase Security Advisor (commit fdcc4b3)
- RLS включен на `storm_posts` таблица
- `update_push_subscriptions_updated_at` trigger: `SET search_path = ''`
- `REVOKE EXECUTE ON FUNCTION handle_new_user()` от PUBLIC/anon/authenticated
- Премахната always-true INSERT policy на `mood_entries`
- Премахната broad SELECT policy на `avatars` bucket
- Резултат: 7 → 2 advisory (1 INFO expected, 1 WARN за leaked password — изисква Pro план)

### Supabase Performance Advisor (commit 14e5caf)
- `auth.uid()` → `(select auth.uid())` в 10 RLS политики (profiles, push_subscriptions, favorite_locations)
- Премахнат unused index `idx_mood_entries_mood_type`
- Резултат: 10 WARN → 0

---

### Допълнителни подобрения (2026-05-14)

#### DB Migrations (commit e042320)
- `stripe_processed_events` таблица приложена в DB (Stripe webhook dedup)
- `favorite_locations` UPDATE policy приложена с `(select auth.uid())`

#### PWA Offline Fallback (commit e042320)
- `public/offline.html` — красива offline страница
- `src/sw.ts` — `setCatchHandler` сервира `/offline.html` при offline navigation

#### X Auto-posting Restore (commit 258f7bd)
- `api/cron/storm-alert.ts` възстановен от git history
- `twitter-api-v2 ^1.29.0` инсталиран
- **⚠️ PENDING**: credentials грешка "Invalid consumer tokens" — изисква регенериране

#### TypeScript (commit 142908c)
- `HreflangTags.tsx`: `hreflang` → `hrefLang`
- `Home.tsx`: премахнат несъществуващ `setKpValue` call
- `AuthContext.tsx`: добавени `created_at, updated_at` в SELECT
- `src/solar-calculator.d.ts`: type declaration за untyped package
- Резултат: **0 TypeScript грешки**

#### Aurora Calendar (commit 3bf830d)
- Нова секция в Forecast страницата
- 3 карти: Tonight / Tomorrow night / Night after
- Показва: макс Kp (оцветен по G-level) + средна облачност за нощните часове
- Best night badge на оптималната нощ (Kp 60% + cloud clarity 40%)
- Graceful degradation без локация (само Kp)
- Преведено на 8 езика

#### Profile — Avatar upload + subscription info (commit 3e4b2c5)
- Аватар upload: click → file input → canvas compression (256px JPEG) → Supabase Storage `avatars/`
- Member since дата от `profile.created_at`
- Subscription end date от `profile.subscription_period_end`
- Всички hardcoded strings → `t()` ключове в 8 езика

#### Community Photo Gallery (commit d63ce5e)
- `/gallery` — нова страница
- Upload: паралелна компресия full (1920px) + thumb (400px) → `aurora-gallery` Supabase Storage
- Grid 2/3/4 колони с hover overlay (caption, location, Kp, username)
- Denormalized `display_name` + `avatar_url` при upload
- Supabase: `aurora_photos` таблица + `aurora-gallery` bucket + RLS

#### Aurora Hunt — Gamification (commit b239fda)
- `/hunt` — нова страница
- 6 значки (First Light, Storm Chaser, Night Owl, G3 Witness, Dedicated, Veteran)
- Точки: 10 base + 2× Kp при всяко наблюдение
- Leaderboard view в Supabase: `hunter_leaderboard`
- 1-часов cooldown в localStorage срещу spam
- Supabase: `aurora_sightings` таблица + RLS

#### Aurora Livestream (commit cbb7a58)
- `/livestream` — нова страница
- 8 куриращи камери: Explore.org, Tromsø, Iceland Vedur, Sodankylä SGO, AuroraMAX, Kevo, Alta, NOAA SWPC
- Featured player: iframe ако има `embedUrl`, иначе "Open in new tab"
- Grid 3-4 колони с Preview + Open бутони
- CSP: добавен `explore.org` в `frame-src`

#### Security fixes (commits 33420db)
- **M11** — OAuth password reset: `window.location.origin` → hardcoded `thestormwatcher.com`

---

## 🔲 ОСТАВА

### ⚠️ Неотложно

**X Auto-posting — "Invalid consumer tokens"**
- Файлът е възстановен, пакетът е инсталиран
- Трябва: X Developer Portal → App Settings → User authentication → "Read and Write"
- Regenerate API Key + Secret + Access Token + Secret
- Обнови 4-те env var-а в Vercel → Redeploy
- Тест: `GET /api/cron/storm-alert?secret=Storm2024Nikolai&test=true`

**Supabase — Leaked Password Protection**
- 1 WARN остава в Security Advisor
- Изисква Supabase Pro план (~$25/мес) за активиране

---

### 🟢 Лесни / Средни функции

**Push Notifications (Kp + NIGGG логика)**
- `@capacitor/push-notifications` плъгин
- Firebase Cloud Messaging (FCM) за Android
- Apple Push Notification Service (APNs) за iOS — изисква Apple Developer акаунт ($99/год)
- Supabase Edge Function проверява Kp/NIGGG на всеки час
- Per-user notification preferences в Supabase

**AI Assistant**
- Claude API (claude-sonnet-4-6) с prompt caching
- Системен prompt инжектира текущите данни (Kp, Bz, solar wind) като контекст
- Rate limiting: 10 въпроса/ден за free, неограничено за Pro
- Нова страница `/assistant` или floating chat bubble

---

### 📦 npm Vulnerabilities
- 12 уязвимости останали (всички в devDependencies)
- Production = 0 уязвимости
- `fast-uri` няма patch (latest 3.1.2 все още vulnerable)
- GitHub Dependabot ги маркира, но не са production риск

---

## Commit история (последни)
```
33420db  M11 fix + explore.org CSP frame-src
cbb7a58  Aurora Livestream page (8 cameras)
b239fda  Aurora Hunt (gamification, leaderboard, badges)
d63ce5e  Community Photo Gallery
3e4b2c5  Profile: avatar upload + subscription info
7df48f4  Space Weather Outlook (NOAA 3-day text)
0fe8a31  NIGGG API fix (new endpoint)
3bf830d  Aurora Calendar (3-night outlook)
142908c  TypeScript fixes (0 errors)
e042320  Offline fallback + DB migrations
258f7bd  X auto-posting restore + twitter-api-v2
14e5caf  RLS InitPlan performance fix
fdcc4b3  Supabase Security Advisor fixes
1c1af4b  npm audit Sprint 4
```
