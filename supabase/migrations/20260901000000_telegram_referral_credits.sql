-- Telegram referral wallet credits and secure store-account linking.
-- Safe to re-apply after the initial marketplace migration.

ALTER TABLE public.telegram_chat_members
  ADD COLUMN IF NOT EXISTS pending_referrer_chat_id text;

CREATE TABLE IF NOT EXISTS public.telegram_store_links (
  chat_id text PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES public.users(id),
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_referral_credits (
  id bigserial PRIMARY KEY,
  referral_id bigint NOT NULL UNIQUE REFERENCES public.telegram_chat_referrals(id),
  referrer_chat_id text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'credited')),
  user_id integer REFERENCES public.users(id),
  transaction_id integer REFERENCES public.transactions(id),
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_referral_credits_pending_idx
  ON public.telegram_referral_credits (referrer_chat_id, status);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'telegram_store_links', 'telegram_link_tokens',
    'telegram_referral_credits'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;