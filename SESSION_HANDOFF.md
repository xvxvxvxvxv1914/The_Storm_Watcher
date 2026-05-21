# Session Handoff — 2026-05-21

**Цел на този файл:** Briefing за следващия Claude agent (на друг компютър) — какво беше направено в сесията 2026-05-21, какво е статуса, и какво остава.

---

## 🌳 Branch state

| Branch | HEAD | Какво съдържа |
|--------|------|---------------|
| `main` | `~kp5untax4` (производствено) | Старо production състояние, не е merge-нато с новите промени |
| `staging` | `d4c72d2` | **Всички 5 спринта** + предишен staging history (www. redirect, X cron) |
| `feat/locale-sync` | `d4c72d2` | Идентично със staging — алтернативен preview |

**Vercel preview URLs:**
- `https://the-storm-watcher-git-staging-xvxvxvxvxv1914s-projects.vercel.app`
- `https://the-storm-watcher-git-feat-locale-sync-xvxvxvxvxv1914s-projects.vercel.app`

---

## ✅ Какво беше направено в сесия 2026-05-21

### Sprint 1 (commit `a055251`) — i18n + SEO + security
- **C1: 35 нови ключа × 8 езика** (no, fi, sv, is, da, pl, uk, ko) — те бяха непълни 632/667
- **C2: Уеднаквяване на hreflang** — index.html + sitemap.xml + LanguageContext sync към 16 езика
- **C3: npm audit fix** — non-breaking patches приложени; 14 dev-only vulns остават (изискват breaking @vercel/node v4)
- **C4: Премахване на `explore.org` от CSP frame-src** — dead config след Livestream cleanup

### Sprint 2 (commit `18b12fd`) — Mood redesign + Pricing i18n + Forecast
- **Mood v3 "Cosmic Mood Pulse":**
  - Анимиран cosmic orb hero (3 pulsing rings + radial gradient core, Kp-colored)
  - Personal streak card с 7-day SVG line chart (от session_id история)
  - Rotating "Did you know?" с 5 факта (8s auto-rotation + manual dots)
  - Sticky mobile CTA bar (safe-area aware) при избран mood
  - Linear-app style цветове, no Material палитра
  - +12 нови keys × 16 locales
- **Pricing — пълен i18n** (29 нови ключа × 16 locales)
- **Forecast — Ap & F10.7 видими на мобилен** (бяха `hidden sm:block`); +3 summary cards (Avg Ap, Avg F10.7, Peak Kp 27d)

### Sprint 3 (commit `d613bad`) — Schema.org + Sentry
- WebSite + Organization JSON-LD в `index.html` @graph (всичките 16 езика)
- `BreadcrumbSchema.tsx` компонент — приложен в Dashboard, Forecast, Aurora, Mood, Pricing, FAQ
- `logError()` сега actually calls Sentry.captureException в production (преди беше само TODO)
- Sentry no-op когато `VITE_SENTRY_DSN` не е сетнат → безопасно за deploy
- PII filter (beforeSend) вече беше там — не променян

### Sprint 4 (commit `eac594f`) — PWA + iCal + CSV
- `InstallPrompt.tsx` — beforeinstallprompt capture, 20s delay, 14-day cooldown
- Skip-ва се вътре в Capacitor (`'Capacitor' in window`) и standalone mode
- `utils/icalExport.ts` — RFC 5545 ICS generator с G-level + 2h alarm
- Aurora Calendar бутон "Add to Calendar" (responsive layout)
- Mood Personal CSV export от Streak card (бутон видим при ≥2 entries)
- +5 нови keys × 16 locales

### Sprint 5 (commit `d4c72d2`) — Hunt badges + Storm Watch + Gallery filters
- **Hunt badge tier система:** common/rare/epic/legendary с distinct glow цветове
  - Shimmer animation (CSS-only) на earned badges
  - Progress bar + counter за in-progress ("3/5")
  - Checkmark indicator в горния десен ъгъл
  - Mobile 3-column grid вместо flex-wrap
- **Storm Watch widget на Dashboard** — аггрегира kpHistoryRaw в storm events (Kp ≥ 5)
  - Показва до 4 последни с G-level, peak Kp, продължителност
  - Само се рендерира когато има реално storms
- **Gallery date filters:** All time / Past week / Past month / Past year
  - Live count badge (filtered/total) при активен филтър
  - Friendly empty state
- +8 нови keys × 16 locales

---

## 📊 Метрики

- **Тестове:** 66/66 ✅
- **Lint:** 0 warnings ✅
- **Typecheck:** ✅
- **i18n ключове:** 16 езика × ~707 ключа = 100% complete
- **Нови файлове:** `BreadcrumbSchema.tsx`, `InstallPrompt.tsx`, `icalExport.ts`, 4 sync scripts, `generate_sitemap.py`
- **Модифицирани pages:** Mood, Pricing, Forecast, Aurora, Dashboard, FAQ, Calendar, Gallery, Hunt

---

## 📱 iOS Build статус

- ✅ `npm run build` изпълнен (87 модула + 10 prerendered routes)
- ✅ `npx cap sync ios` изпълнен — web assets копирани в `ios/App/App/public/`
- ✅ Xcode workspace отворен (юзърът се прибира, ще тества утре)
- **Никакви native iOS промени** — нито в `ios/`, нито в `capacitor.config.ts`
- PWA install prompt **правилно skip-ва се** в Capacitor

---

## 🔴 Pending за юзъра (не мога да направя сам)

| Item | Какво трябва |
|------|--------------|
| `VITE_SENTRY_DSN` | Set в Vercel env vars → активира error tracking в prod |
| X auto-posting tokens | Regenerate в X Dev Portal → update Vercel env |
| iOS DEVELOPMENT_TEAM | Apple Developer Account ID за signing |
| iOS Push notifications | $99/год Apple Developer subscription |
| App Store screenshots | Дизайнер или manual production |
| In-App Purchases (iOS/Android) | Apple StoreKit + Google Play Billing — нужно ПРЕДИ App Store/Play submission |

---

## 🎯 Утрешен план

1. **Юзърът тества Vercel previews** (staging URL)
2. **Юзърът тества iOS build** в Xcode симулатор
3. Ако всичко работи → **merge `staging` → `main`** за production
4. Ако има bugs → fix → re-test

---

## 🔮 Възможни следващи спринтове (Sprint 6+)

От оригиналния `PLAN_2026-05-21.md` — все още незавършени:
- **SEO1:** Multi-language full prerender (Playwright + 320 HTML файла) — 4ч
- **SEO3:** Per-page dynamic OG images (Vercel @vercel/og) — 3ч
- **Aurora visibility heatmap** (Leaflet) — 4ч
- **Free trial UI** (14-day Pro trial) — 1-2ч
- **Aurora forecasting AI model** — long-term
- **Blog system** за educational content — 15ч+

Маркетинг pending:
- Twitter/X marketing campaign assets
- App Store screenshots production
- Referral program
- Aurora season campaign (Sep-Mar) — 50% off Pro

---

## 🛠 Useful commands

```bash
# Build & test
npm run build && npm run test:run && npm run lint

# iOS deploy
npm run ios:open       # Build + sync + open Xcode
npm run ios:deploy     # Build + sync + auto-deploy to connected device

# Sitemap regenerate
python3 scripts/generate_sitemap.py

# Sync new i18n keys (copy a script as template)
python3 scripts/sync_mood_v3_keys.py

# Vercel preview
vercel ls --scope=team_RHWxsbGrH3CwUhpWFvDyZWlQ
```

---

## 📌 Stable version tags

- `v1.6-stable` — pre-redesign era
- `v2.2-stable` — pre-Sprint-1 (commit `76160b4`)
- (No new stable tag yet — wait for user approval after testing)

---

## 🤝 Кооператив notes за следващия agent

- **Юзърът работи на български** — отговаряй на български
- **Авторномно се очаква** — питай само при необратим риск (виж `[[feedback_autonomous_work]]`)
- **Никакви liquid/animated nav effects** без потвърждение (виж `[[feedback_no_liquid_animations]]`)
- **Не питай за одобрение** — действай и докладвай
- При въпрос "върни последната работеща версия" → `git checkout v2.2-stable`
- Всички scripts/sync_*.py файлове са reusable templates за нови i18n batch operations
