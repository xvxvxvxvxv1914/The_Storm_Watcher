-- Prevent duplicate Stripe customers being created for the same user.
-- The check is partial so it ignores the many NULL values (free users have no customer).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_unique
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
