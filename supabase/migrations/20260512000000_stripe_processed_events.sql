create table if not exists stripe_processed_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table stripe_processed_events enable row level security;

-- No public access — only service role (webhook handler) can write
