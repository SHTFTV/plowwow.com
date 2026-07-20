
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_guest_post_submissions_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_quote_denylist_match(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_quote_request_event_metrics(timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_quote_request_offenders(timestamptz, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_quote_denylist(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_quote_denylist() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_quote_request_events_v2(timestamptz, integer, text[], text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_quote_request_event_metrics_v2(timestamptz, text[], text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_quote_audit_log(timestamptz, integer, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_quote_request_events(timestamptz, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_quote_denylist(text, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_quote_request_event_metrics(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_request_offenders(timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_quote_denylist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_quote_denylist() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_quote_request_events_v2(timestamptz, integer, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_request_event_metrics_v2(timestamptz, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_quote_audit_log(timestamptz, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_quote_request_events(timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_quote_denylist(text, text, text) TO authenticated;

DROP POLICY IF EXISTS "No client updates to newsletter signups" ON public.newsletter_signups;
CREATE POLICY "No client updates to newsletter signups"
  ON public.newsletter_signups FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes of newsletter signups" ON public.newsletter_signups;
CREATE POLICY "No client deletes of newsletter signups"
  ON public.newsletter_signups FOR DELETE TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Admins can list quote-exports" ON storage.objects;
CREATE POLICY "Admins can list quote-exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'quote-exports'
    AND private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "No client writes to quote-exports" ON storage.objects;
CREATE POLICY "No client writes to quote-exports"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id <> 'quote-exports');

DROP POLICY IF EXISTS "No client updates to quote-exports" ON storage.objects;
CREATE POLICY "No client updates to quote-exports"
  ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id <> 'quote-exports') WITH CHECK (bucket_id <> 'quote-exports');

DROP POLICY IF EXISTS "No client deletes of quote-exports" ON storage.objects;
CREATE POLICY "No client deletes of quote-exports"
  ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id <> 'quote-exports');
