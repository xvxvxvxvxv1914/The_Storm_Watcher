-- Defensive length bounds on public.contact_messages.
--
-- The INSERT policy is intentionally public (anon must be able to submit the
-- contact form), so the table is directly reachable via the REST API and the
-- Supabase linter flags it (rls_policy_always_true). Without column bounds a bot
-- could bulk-insert arbitrarily large payloads straight past the form. These
-- CHECK constraints cap every field server-side — they apply to direct REST
-- inserts too, not just the form. The client (src/pages/Contact.tsx) mirrors the
-- same limits (MAX_NAME/MAX_EMAIL/MAX_MESSAGE) and adds a honeypot; keep them in
-- sync. Table is empty at migration time, so the constraints validate instantly.
--
-- category is deliberately NOT constrained here: an equivalent constraint
-- (contact_messages_category_check) already exists on the table.

alter table public.contact_messages
  add constraint contact_messages_name_len
    check (char_length(name) between 1 and 100),
  add constraint contact_messages_email_len
    check (char_length(email) between 3 and 254),
  add constraint contact_messages_message_len
    check (char_length(message) between 1 and 5000);
