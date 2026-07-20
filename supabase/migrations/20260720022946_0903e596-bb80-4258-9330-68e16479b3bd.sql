ALTER TABLE public.newsletter_signups
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_signups_confirmation_token_key
  ON public.newsletter_signups (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS newsletter_signups_confirmed_at_idx
  ON public.newsletter_signups (confirmed_at DESC NULLS LAST);