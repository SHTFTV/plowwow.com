
-- Private log used by the submit-quote edge function to throttle abuse
CREATE TABLE IF NOT EXISTS private.quote_request_submission_log (
  id BIGSERIAL PRIMARY KEY,
  email TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quote_request_submission_log_email_idx
  ON private.quote_request_submission_log (email, created_at DESC);
CREATE INDEX IF NOT EXISTS quote_request_submission_log_ip_idx
  ON private.quote_request_submission_log (ip, created_at DESC);

REVOKE ALL ON TABLE private.quote_request_submission_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.quote_request_submission_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE private.quote_request_submission_log_id_seq TO service_role;

-- Helper the edge function calls to check recent submission counts
CREATE OR REPLACE FUNCTION private.count_recent_quote_submissions(
  _email TEXT,
  _ip TEXT,
  _since TIMESTAMPTZ
) RETURNS TABLE(email_count BIGINT, ip_count BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = private
AS $$
  SELECT
    COALESCE((SELECT count(*) FROM private.quote_request_submission_log
              WHERE email = _email AND created_at >= _since), 0) AS email_count,
    COALESCE((SELECT count(*) FROM private.quote_request_submission_log
              WHERE ip = _ip AND created_at >= _since), 0) AS ip_count;
$$;
REVOKE ALL ON FUNCTION private.count_recent_quote_submissions(TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

-- Force all quote submissions through the edge function (service_role).
-- Public/anonymous inserts are no longer allowed directly against the table.
DROP POLICY IF EXISTS "Anyone can submit a quote request" ON public.quote_requests;
REVOKE INSERT ON public.quote_requests FROM anon, authenticated;
