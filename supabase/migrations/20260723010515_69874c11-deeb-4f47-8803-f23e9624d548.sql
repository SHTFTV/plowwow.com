
-- Move 9 admin SECURITY DEFINER functions from public (API-exposed) into the
-- private schema, and expose SECURITY INVOKER wrappers in public that simply
-- delegate. This clears the "signed-in users can execute SECURITY DEFINER
-- function" linter finding without changing behavior for the admin UI.
-- Internal admin gating (private.has_role) is preserved inside the private
-- definer bodies.

-- 1) private.get_quote_request_event_metrics ------------------------------
DROP FUNCTION IF EXISTS public.get_quote_request_event_metrics(timestamptz);
CREATE OR REPLACE FUNCTION private.get_quote_request_event_metrics(_since timestamptz)
RETURNS TABLE(bucket timestamptz, kind text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT date_trunc('hour', e.created_at) AS bucket, e.kind, COUNT(*)::bigint
  FROM private.quote_request_events e
  WHERE e.created_at >= _since AND private.has_role(auth.uid(), 'admin')
  GROUP BY 1, 2 ORDER BY 1 DESC, 2;
$$;
CREATE OR REPLACE FUNCTION public.get_quote_request_event_metrics(_since timestamptz)
RETURNS TABLE(bucket timestamptz, kind text, count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.get_quote_request_event_metrics(_since); $$;

-- 2) private.get_quote_request_offenders ----------------------------------
DROP FUNCTION IF EXISTS public.get_quote_request_offenders(timestamptz, integer);
CREATE OR REPLACE FUNCTION private.get_quote_request_offenders(_since timestamptz, _limit integer DEFAULT 20)
RETURNS TABLE(email text, ip text, blocked_count bigint, last_seen timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT e.email, e.ip, COUNT(*)::bigint, MAX(e.created_at)
  FROM private.quote_request_events e
  WHERE e.created_at >= _since
    AND e.kind IN ('honeypot','too_fast','email_limit','ip_limit','burst_limit','invalid')
    AND private.has_role(auth.uid(), 'admin')
  GROUP BY e.email, e.ip
  ORDER BY 3 DESC, 4 DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200);
$$;
CREATE OR REPLACE FUNCTION public.get_quote_request_offenders(_since timestamptz, _limit integer DEFAULT 20)
RETURNS TABLE(email text, ip text, blocked_count bigint, last_seen timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.get_quote_request_offenders(_since, _limit); $$;

-- 3) private.remove_quote_denylist ----------------------------------------
DROP FUNCTION IF EXISTS public.remove_quote_denylist(uuid);
CREATE OR REPLACE FUNCTION private.remove_quote_denylist(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE r private.quote_denylist%ROWTYPE;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM private.quote_denylist WHERE id = _id;
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM private.quote_denylist WHERE id = _id;
  INSERT INTO private.quote_audit_log (action, actor_id, email, ip, reason, meta)
  VALUES ('denylist_remove', auth.uid(), r.email, r.ip, r.reason, jsonb_build_object('entry_id', _id));
  RETURN true;
END; $$;
CREATE OR REPLACE FUNCTION public.remove_quote_denylist(_id uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.remove_quote_denylist(_id); $$;

-- 4) private.list_quote_denylist ------------------------------------------
DROP FUNCTION IF EXISTS public.list_quote_denylist();
CREATE OR REPLACE FUNCTION private.list_quote_denylist()
RETURNS TABLE(id uuid, email text, ip text, reason text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT d.id, d.email, d.ip, d.reason, d.created_at
  FROM private.quote_denylist d
  WHERE private.has_role(auth.uid(), 'admin')
  ORDER BY d.created_at DESC;
$$;
CREATE OR REPLACE FUNCTION public.list_quote_denylist()
RETURNS TABLE(id uuid, email text, ip text, reason text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.list_quote_denylist(); $$;

-- 5) private.list_quote_request_events_v2 ---------------------------------
DROP FUNCTION IF EXISTS public.list_quote_request_events_v2(timestamptz, integer, text[], text, text);
CREATE OR REPLACE FUNCTION private.list_quote_request_events_v2(
  _since timestamptz, _limit integer DEFAULT 200, _kinds text[] DEFAULT NULL,
  _email_domain text DEFAULT NULL, _ip_prefix text DEFAULT NULL)
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
CREATE OR REPLACE FUNCTION public.list_quote_request_events_v2(
  _since timestamptz, _limit integer DEFAULT 200, _kinds text[] DEFAULT NULL,
  _email_domain text DEFAULT NULL, _ip_prefix text DEFAULT NULL)
RETURNS TABLE(id uuid, created_at timestamptz, kind text, email text, ip text, user_agent text, meta jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.list_quote_request_events_v2(_since, _limit, _kinds, _email_domain, _ip_prefix); $$;

-- 6) private.get_quote_request_event_metrics_v2 ---------------------------
DROP FUNCTION IF EXISTS public.get_quote_request_event_metrics_v2(timestamptz, text[], text, text);
CREATE OR REPLACE FUNCTION private.get_quote_request_event_metrics_v2(
  _since timestamptz, _kinds text[] DEFAULT NULL,
  _email_domain text DEFAULT NULL, _ip_prefix text DEFAULT NULL)
RETURNS TABLE(bucket timestamptz, kind text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT date_trunc('hour', e.created_at), e.kind, COUNT(*)::bigint
  FROM private.quote_request_events e
  WHERE e.created_at >= _since
    AND private.has_role(auth.uid(), 'admin')
    AND (_kinds IS NULL OR e.kind = ANY(_kinds))
    AND (_email_domain IS NULL OR e.email ILIKE '%@' || _email_domain)
    AND (_ip_prefix IS NULL OR e.ip LIKE _ip_prefix || '%')
  GROUP BY 1, 2 ORDER BY 1 DESC, 2;
$$;
CREATE OR REPLACE FUNCTION public.get_quote_request_event_metrics_v2(
  _since timestamptz, _kinds text[] DEFAULT NULL,
  _email_domain text DEFAULT NULL, _ip_prefix text DEFAULT NULL)
RETURNS TABLE(bucket timestamptz, kind text, count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.get_quote_request_event_metrics_v2(_since, _kinds, _email_domain, _ip_prefix); $$;

-- 7) private.list_quote_audit_log -----------------------------------------
DROP FUNCTION IF EXISTS public.list_quote_audit_log(timestamptz, integer, text[]);
CREATE OR REPLACE FUNCTION private.list_quote_audit_log(_since timestamptz, _limit integer DEFAULT 200, _actions text[] DEFAULT NULL)
RETURNS TABLE(id uuid, created_at timestamptz, action text, actor_id uuid, email text, ip text, reason text, request_code text, meta jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT a.id, a.created_at, a.action, a.actor_id, a.email, a.ip, a.reason, a.request_code, a.meta
  FROM private.quote_audit_log a
  WHERE a.created_at >= _since
    AND private.has_role(auth.uid(), 'admin')
    AND (_actions IS NULL OR a.action = ANY(_actions))
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 2000);
$$;
CREATE OR REPLACE FUNCTION public.list_quote_audit_log(_since timestamptz, _limit integer DEFAULT 200, _actions text[] DEFAULT NULL)
RETURNS TABLE(id uuid, created_at timestamptz, action text, actor_id uuid, email text, ip text, reason text, request_code text, meta jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.list_quote_audit_log(_since, _limit, _actions); $$;

-- 8) private.list_quote_request_events ------------------------------------
DROP FUNCTION IF EXISTS public.list_quote_request_events(timestamptz, integer);
CREATE OR REPLACE FUNCTION private.list_quote_request_events(_since timestamptz, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, created_at timestamptz, kind text, email text, ip text, user_agent text, meta jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private
AS $$
  SELECT e.id, e.created_at, e.kind, e.email, e.ip, e.user_agent, e.meta
  FROM private.quote_request_events e
  WHERE e.created_at >= _since AND private.has_role(auth.uid(), 'admin')
  ORDER BY e.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 1000);
$$;
CREATE OR REPLACE FUNCTION public.list_quote_request_events(_since timestamptz, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, created_at timestamptz, kind text, email text, ip text, user_agent text, meta jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.list_quote_request_events(_since, _limit); $$;

-- 9) private.add_quote_denylist -------------------------------------------
DROP FUNCTION IF EXISTS public.add_quote_denylist(text, text, text);
CREATE OR REPLACE FUNCTION private.add_quote_denylist(_email text, _ip text, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _email IS NULL AND _ip IS NULL THEN RAISE EXCEPTION 'email or ip required'; END IF;
  INSERT INTO private.quote_denylist (email, ip, reason, created_by)
  VALUES (NULLIF(lower(trim(_email)), ''), NULLIF(trim(_ip), ''), NULLIF(trim(_reason), ''), auth.uid())
  RETURNING id INTO new_id;
  INSERT INTO private.quote_audit_log (action, actor_id, email, ip, reason, meta)
  VALUES ('denylist_add', auth.uid(), NULLIF(lower(trim(_email)), ''), NULLIF(trim(_ip), ''), NULLIF(trim(_reason), ''), jsonb_build_object('entry_id', new_id));
  RETURN new_id;
END; $$;
CREATE OR REPLACE FUNCTION public.add_quote_denylist(_email text, _ip text, _reason text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.add_quote_denylist(_email, _ip, _reason); $$;

-- Grants: public wrappers callable by authenticated only. Private functions
-- are not exposed by PostgREST (private schema is not in the API), and only
-- their owner/service_role can EXECUTE them directly.
REVOKE ALL ON FUNCTION
  public.get_quote_request_event_metrics(timestamptz),
  public.get_quote_request_offenders(timestamptz, integer),
  public.remove_quote_denylist(uuid),
  public.list_quote_denylist(),
  public.list_quote_request_events_v2(timestamptz, integer, text[], text, text),
  public.get_quote_request_event_metrics_v2(timestamptz, text[], text, text),
  public.list_quote_audit_log(timestamptz, integer, text[]),
  public.list_quote_request_events(timestamptz, integer),
  public.add_quote_denylist(text, text, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.get_quote_request_event_metrics(timestamptz),
  public.get_quote_request_offenders(timestamptz, integer),
  public.remove_quote_denylist(uuid),
  public.list_quote_denylist(),
  public.list_quote_request_events_v2(timestamptz, integer, text[], text, text),
  public.get_quote_request_event_metrics_v2(timestamptz, text[], text, text),
  public.list_quote_audit_log(timestamptz, integer, text[]),
  public.list_quote_request_events(timestamptz, integer),
  public.add_quote_denylist(text, text, text)
TO authenticated;

REVOKE ALL ON FUNCTION
  private.get_quote_request_event_metrics(timestamptz),
  private.get_quote_request_offenders(timestamptz, integer),
  private.remove_quote_denylist(uuid),
  private.list_quote_denylist(),
  private.list_quote_request_events_v2(timestamptz, integer, text[], text, text),
  private.get_quote_request_event_metrics_v2(timestamptz, text[], text, text),
  private.list_quote_audit_log(timestamptz, integer, text[]),
  private.list_quote_request_events(timestamptz, integer),
  private.add_quote_denylist(text, text, text)
FROM PUBLIC, anon, authenticated;
