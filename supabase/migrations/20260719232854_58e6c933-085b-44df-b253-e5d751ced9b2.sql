
-- 1) Alert channel columns
ALTER TABLE public.quote_alert_configs
  ADD COLUMN IF NOT EXISTS notify_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_slack_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slack_webhook_url text;

-- 2) Audit log table (private schema; access via SECURITY DEFINER functions)
CREATE TABLE IF NOT EXISTS private.quote_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL CHECK (action IN ('denylist_add','denylist_remove','denylist_match')),
  actor_id uuid,
  email text,
  ip text,
  reason text,
  request_code text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS quote_audit_log_created_idx ON private.quote_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS quote_audit_log_action_idx ON private.quote_audit_log (action, created_at DESC);

-- 3) List audit entries (admin-only)
CREATE OR REPLACE FUNCTION public.list_quote_audit_log(
  _since timestamptz,
  _limit integer DEFAULT 200,
  _actions text[] DEFAULT NULL
)
RETURNS TABLE(id uuid, created_at timestamptz, action text, actor_id uuid, email text, ip text, reason text, request_code text, meta jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT a.id, a.created_at, a.action, a.actor_id, a.email, a.ip, a.reason, a.request_code, a.meta
  FROM private.quote_audit_log a
  WHERE a.created_at >= _since
    AND private.has_role(auth.uid(), 'admin')
    AND (_actions IS NULL OR a.action = ANY(_actions))
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 2000);
$$;

-- 4) Record a denylist match (called from submit-quote edge function via service role)
CREATE OR REPLACE FUNCTION public.log_quote_denylist_match(
  _email text,
  _ip text,
  _reason text,
  _request_code text,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO private.quote_audit_log (action, email, ip, reason, request_code, meta)
  VALUES ('denylist_match', NULLIF(lower(trim(_email)), ''), NULLIF(trim(_ip), ''), NULLIF(trim(_reason), ''), NULLIF(trim(_request_code), ''), COALESCE(_meta, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.log_quote_denylist_match(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_quote_denylist_match(text, text, text, text, jsonb) TO service_role;

-- 5) Update add/remove denylist to also log audit rows
CREATE OR REPLACE FUNCTION public.add_quote_denylist(_email text, _ip text, _reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private
AS $function$
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
  INSERT INTO private.quote_audit_log (action, actor_id, email, ip, reason, meta)
  VALUES ('denylist_add', auth.uid(), NULLIF(lower(trim(_email)), ''), NULLIF(trim(_ip), ''), NULLIF(trim(_reason), ''), jsonb_build_object('entry_id', new_id));
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_quote_denylist(_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE r private.quote_denylist%ROWTYPE;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO r FROM private.quote_denylist WHERE id = _id;
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM private.quote_denylist WHERE id = _id;
  INSERT INTO private.quote_audit_log (action, actor_id, email, ip, reason, meta)
  VALUES ('denylist_remove', auth.uid(), r.email, r.ip, r.reason, jsonb_build_object('entry_id', _id));
  RETURN true;
END;
$function$;
