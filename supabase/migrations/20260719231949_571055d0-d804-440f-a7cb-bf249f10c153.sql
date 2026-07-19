
-- ============ Denylist (private, admin managed via RPC) ============
CREATE TABLE IF NOT EXISTS private.quote_denylist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  ip text,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR ip IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS quote_denylist_email_idx ON private.quote_denylist (lower(email));
CREATE INDEX IF NOT EXISTS quote_denylist_ip_idx ON private.quote_denylist (ip);

-- Admin RPCs for denylist management
CREATE OR REPLACE FUNCTION public.add_quote_denylist(_email text, _ip text, _reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _email IS NULL AND _ip IS NULL THEN
    RAISE EXCEPTION 'email or ip required';
  END IF;
  INSERT INTO private.quote_denylist (email, ip, reason, created_by)
  VALUES (NULLIF(lower(trim(_email)), ''), NULLIF(trim(_ip), ''), NULLIF(trim(_reason), ''), auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_quote_denylist(_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM private.quote_denylist WHERE id = _id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_quote_denylist()
RETURNS TABLE(id uuid, email text, ip text, reason text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT d.id, d.email, d.ip, d.reason, d.created_at
  FROM private.quote_denylist d
  WHERE private.has_role(auth.uid(), 'admin')
  ORDER BY d.created_at DESC;
$$;

-- Called by edge function (service role bypasses grants; still safe)
CREATE OR REPLACE FUNCTION private.is_quote_denylisted(_email text, _ip text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.quote_denylist
    WHERE (email IS NOT NULL AND email = lower(coalesce(_email, '')))
       OR (ip IS NOT NULL AND ip = coalesce(_ip, ''))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.add_quote_denylist(text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_quote_denylist(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_quote_denylist() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_quote_denylist(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_quote_denylist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_quote_denylist() TO authenticated;

-- ============ Alert configuration ============
CREATE TABLE IF NOT EXISTS public.quote_alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kinds text[] NOT NULL DEFAULT ARRAY['honeypot','too_fast','email_limit','ip_limit','burst_limit','invalid'],
  threshold integer NOT NULL CHECK (threshold > 0),
  window_minutes integer NOT NULL CHECK (window_minutes > 0),
  notify_email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  last_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_alert_configs TO authenticated;
GRANT ALL ON public.quote_alert_configs TO service_role;
ALTER TABLE public.quote_alert_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage alert configs"
ON public.quote_alert_configs FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER quote_alert_configs_updated
BEFORE UPDATE ON public.quote_alert_configs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Export jobs ============
CREATE TABLE IF NOT EXISTS public.quote_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  row_count integer,
  file_path text,
  signed_url text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_export_jobs TO authenticated;
GRANT ALL ON public.quote_export_jobs TO service_role;
ALTER TABLE public.quote_export_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage export jobs"
ON public.quote_export_jobs FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER quote_export_jobs_updated
BEFORE UPDATE ON public.quote_export_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Filtered event RPCs (v2) ============
CREATE OR REPLACE FUNCTION public.list_quote_request_events_v2(
  _since timestamptz,
  _limit integer DEFAULT 200,
  _kinds text[] DEFAULT NULL,
  _email_domain text DEFAULT NULL,
  _ip_prefix text DEFAULT NULL
)
RETURNS TABLE(id uuid, created_at timestamptz, kind text, email text, ip text, user_agent text, meta jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT e.id, e.created_at, e.kind, e.email, e.ip, e.user_agent, e.meta
  FROM private.quote_request_events e
  WHERE e.created_at >= _since
    AND private.has_role(auth.uid(), 'admin')
    AND (_kinds IS NULL OR e.kind = ANY(_kinds))
    AND (_email_domain IS NULL OR e.email ILIKE '%@' || _email_domain)
    AND (_ip_prefix IS NULL OR e.ip LIKE _ip_prefix || '%')
  ORDER BY e.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 5000);
$$;

CREATE OR REPLACE FUNCTION public.get_quote_request_event_metrics_v2(
  _since timestamptz,
  _kinds text[] DEFAULT NULL,
  _email_domain text DEFAULT NULL,
  _ip_prefix text DEFAULT NULL
)
RETURNS TABLE(bucket timestamptz, kind text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT date_trunc('hour', e.created_at) AS bucket, e.kind, COUNT(*)::bigint
  FROM private.quote_request_events e
  WHERE e.created_at >= _since
    AND private.has_role(auth.uid(), 'admin')
    AND (_kinds IS NULL OR e.kind = ANY(_kinds))
    AND (_email_domain IS NULL OR e.email ILIKE '%@' || _email_domain)
    AND (_ip_prefix IS NULL OR e.ip LIKE _ip_prefix || '%')
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2;
$$;
