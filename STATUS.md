# The Storm Watcher — Project Status (2026-05-14)

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

### 🔴 Сложни функции

**Community Photo Gallery**
- Supabase Storage + thumbnails
- Upload flow с client-side compression
- AI верификация (Claude Vision) — дали снимката е aurora
- Нова страница `/gallery`

**Aurora Hunt (Gamification)**
- Supabase таблици: `user_sightings`, `badges`, `leaderboard`
- Badges: "First Sighting", "G3 Storm Chaser" и т.н.
- Нова страница `/hunt`

**Livestream**
- Real stream sources от камери в Норвегия/Исландия/Финландия
- Cloudflare Stream или HLS embed
- Нова страница `/livestream`

---

### 📦 npm Vulnerabilities
- 12 уязвимости останали (всички в devDependencies)
- Production = 0 уязвимости
- `fast-uri` няма patch (latest 3.1.2 все още vulnerable)
- GitHub Dependabot ги маркира, но не са production риск

---

## Commit история (последни)
```
3bf830d  Aurora Calendar (3-night outlook)
142908c  TypeScript fixes (0 errors)
e042320  Offline fallback + DB migrations
258f7bd  X auto-posting restore + twitter-api-v2
14e5caf  RLS InitPlan performance fix
fdcc4b3  Supabase Security Advisor fixes
1c1af4b  npm audit Sprint 4
7ab3eca  MEDIUM audit findings Sprint 3
c4f9411  HIGH audit findings Sprint 2
fbff2b2  CRITICAL audit findings Sprint 1
```
