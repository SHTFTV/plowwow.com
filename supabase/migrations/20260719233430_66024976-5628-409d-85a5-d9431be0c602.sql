
ALTER TABLE public.quote_alert_configs
  ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_slack_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_error text,
  ADD COLUMN IF NOT EXISTS last_slack_error text;

ALTER TABLE public.quote_export_jobs
  ADD COLUMN IF NOT EXISTS processed_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
