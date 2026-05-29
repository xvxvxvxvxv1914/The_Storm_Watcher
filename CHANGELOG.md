# Changelog

Notable changes to The Storm Watcher. Newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com).
Full detail lives in `git log` — this is the human-readable highlight reel.

## 2026-05-29

### Fixed
- **Stripe payments never activated the plan.** Two stacked bugs: (1) the webhook
  crashed with `ERR_MODULE_NOT_FOUND` because ESM relative imports lacked `.js`
  extensions; (2) the Stripe webhook endpoint pointed at the apex domain
  `thestormwatcher.com`, which 301-redirects to `www` — Stripe doesn't follow
  redirects, so every delivery failed. After fixing both, checkout → webhook →
  plan activation works (Pro 14-day trial included).
- **`invoice.payment_failed` handler** read the removed `Invoice.subscription`
  field (Stripe API 2026-04-22); now reads `invoice.parent.subscription_details.subscription`.
- **Aurora Map dropdown** — the nav "More" menu was hidden behind the Leaflet map;
  added `isolate` to the map container so its z-index panes stay contained.
- **Sentry JAVASCRIPT-REACT-G** — `/aurora-map` chunk-load failures after a deploy
  now trigger a one-time reload (`lazyWithRetry`) instead of a broken page.
- **Sentry JAVASCRIPT-REACT-J** — transient NOAA fetch failures downgraded from
  error to warning so they don't trip alerting.

### Added
- **Email confirmation on signup** — Supabase "Confirm email" enabled with Resend
  SMTP; `emailRedirectTo` set in signup.
- **Stripe webhook health-check** — daily cron (`api/cron/webhook-health.ts`)
  emails an alert if Stripe reports failed webhook deliveries. Scheduled via
  MANUAL migration `20260529000001`.

### Changed
- **CI/pre-commit now typechecks `api/`** too (previously only `src/`) — both
  webhook bugs above slipped to production because serverless code wasn't checked.

### Earlier same day (separate session)
- Stripe live mode go-live (live keys + price IDs, `VITE_PAYMENTS_ENABLED`).
- **CRITICAL** RLS fix: column-level GRANTs on `profiles` so authenticated users
  can't self-grant a paid plan (migration `20260529000000`).
- Webhook dedup retry-safety fix; `automatic_tax` disabled until VAT registration.
