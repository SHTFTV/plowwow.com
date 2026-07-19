
-- Structured event log for spam/rate-limit monitoring
CREATE TABLE IF NOT EXISTS private.quote_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL CHECK (kind IN (
    'ok','honeypot','too_fast','email_limit','ip_limit','burst_limit','invalid','insert_error','error'
  )),
  email TEXT,
  ip TEXT,
  user_agent TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS quote_request_events_created_at_idx
  ON private.quote_request_events (created_at DESC);
CREATE INDEX IF NOT EXISTS quote_request_events_kind_created_at_idx
  ON private.quote_request_events (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS quote_request_events_email_idx
  ON private.quote_request_events (email);
CREATE INDEX IF NOT EXISTS quote_request_events_ip_idx
  ON private.quote_request_events (ip);

-- Only service_role writes here; RLS on for defense-in-depth
ALTER TABLE private.quote_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.quote_request_events FROM anon, authenticated;
GRANT ALL ON private.quote_request_events TO service_role;

-- Admin RPC: aggregated metrics per kind, per hour, since a cutoff.
CREATE OR REPLACE FUNCTION public.get_quote_request_event_metrics(_since TIMESTAMPTZ)
RETURNS TABLE (bucket TIMESTAMPTZ, kind TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT date_trunc('hour', e.created_at) AS bucket, e.kind, COUNT(*)::bigint
  FROM private.quote_request_events e
  WHERE e.created_at >= _since
    AND private.has_role(auth.uid(), 'admin')
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2;
$$;

REVOKE EXECUTE ON FUNCTION public.get_quote_request_event_metrics(TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quote_request_event_metrics(TIMESTAMPTZ) TO authenticated;

-- Admin RPC: recent events for the abuse feed
CREATE OR REPLACE FUNCTION public.list_quote_request_events(_since TIMESTAMPTZ, _limit INT DEFAULT 200)
RETURNS TABLE (
  id UUID, created_at TIMESTAMPTZ, kind TEXT, email TEXT, ip TEXT, user_agent TEXT, meta JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT e.id, e.created_at, e.kind, e.email, e.ip, e.user_agent, e.meta
  FROM private.quote_request_events e
  WHERE e.created_at >= _since
    AND private.has_role(auth.uid(), 'admin')
  ORDER BY e.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 1000);
$$;

REVOKE EXECUTE ON FUNCTION public.list_quote_request_events(TIMESTAMPTZ, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_quote_request_events(TIMESTAMPTZ, INT) TO authenticated;

-- Top offenders (aggregated by email + ip)
CREATE OR REPLACE FUNCTION public.get_quote_request_offenders(_since TIMESTAMPTZ, _limit INT DEFAULT 20)
RETURNS TABLE (email TEXT, ip TEXT, blocked_count BIGINT, last_seen TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT e.email, e.ip, COUNT(*)::bigint AS blocked_count, MAX(e.created_at) AS last_seen
  FROM private.quote_request_events e
  WHERE e.created_at >= _since
    AND e.kind IN ('honeypot','too_fast','email_limit','ip_limit','burst_limit','invalid')
    AND private.has_role(auth.uid(), 'admin')
  GROUP BY e.email, e.ip
  ORDER BY blocked_count DESC, last_seen DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200);
$$;

REVOKE EXECUTE ON FUNCTION public.get_quote_request_offenders(TIMESTAMPTZ, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quote_request_offenders(TIMESTAMPTZ, INT) TO authenticated;
