CREATE TABLE public.monitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('asset_check','deploy_check','alert','redeploy_triggered')),
  ok BOOLEAN NOT NULL,
  path TEXT,
  http_status INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX monitor_events_kind_created_at_idx ON public.monitor_events (kind, created_at DESC);
CREATE INDEX monitor_events_path_created_at_idx ON public.monitor_events (path, created_at DESC);

GRANT SELECT ON public.monitor_events TO authenticated;
GRANT ALL ON public.monitor_events TO service_role;

ALTER TABLE public.monitor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read monitor events"
  ON public.monitor_events FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));