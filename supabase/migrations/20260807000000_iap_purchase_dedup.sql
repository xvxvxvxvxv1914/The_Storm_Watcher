-- Replay protection for in-app purchases.
--
-- Stripe has stripe_processed_events; IAP had nothing. verify-iap validated a
-- receipt with Apple or Google and upgraded whoever presented it, so one real
-- purchase could be replayed from any number of accounts — each of them getting
-- a genuine "valid receipt" answer from the store, because the receipt *is*
-- valid. It just is not theirs.
--
-- The unique key is the store's own stable subscription identifier:
-- original_transaction_id for Apple, the purchase token for Google.

create table if not exists public.iap_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  -- Apple: original_transaction_id. Google: purchaseToken.
  purchase_id text not null,
  product_id text not null,
  plan text not null check (plan in ('pro', 'premium')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, purchase_id)
);

-- Only the edge function (service role) touches this. No user-facing policy:
-- with RLS on and no permissive policy, anon and authenticated get nothing,
-- while the service role bypasses RLS entirely.
alter table public.iap_purchases enable row level security;

comment on table public.iap_purchases is
  'One row per store subscription, keyed on the store''s own identifier so a receipt cannot upgrade a second account. Written only by the verify-iap edge function.';

create index if not exists iap_purchases_user_id_idx on public.iap_purchases (user_id);
