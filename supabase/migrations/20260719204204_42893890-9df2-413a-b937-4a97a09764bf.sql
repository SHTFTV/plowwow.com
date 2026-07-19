
-- 1) Move has_role into a private schema not exposed by the Data API
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Re-create policies to use private.has_role, then drop the public function
-- quote_requests
DROP POLICY IF EXISTS "Admins can delete quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Admins can update quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Admins can view quote requests" ON public.quote_requests;

-- guest_post_submissions
DROP POLICY IF EXISTS "Only admins can delete guest post submissions" ON public.guest_post_submissions;
DROP POLICY IF EXISTS "Only admins can update guest post submissions" ON public.guest_post_submissions;
DROP POLICY IF EXISTS "Only admins can view guest post submissions" ON public.guest_post_submissions;
DROP POLICY IF EXISTS "Anyone can submit a guest post" ON public.guest_post_submissions;

-- gsc_coverage_snapshots
DROP POLICY IF EXISTS "Admins read gsc snapshots" ON public.gsc_coverage_snapshots;

-- link_audit_runs
DROP POLICY IF EXISTS "Admins read link audit runs" ON public.link_audit_runs;

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Now drop public.has_role since nothing references it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Recreate policies referencing private.has_role
CREATE POLICY "Admins can delete quote requests" ON public.quote_requests
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update quote requests" ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view quote requests" ON public.quote_requests
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete guest post submissions" ON public.guest_post_submissions
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can update guest post submissions" ON public.guest_post_submissions
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Only admins can view guest post submissions" ON public.guest_post_submissions
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins read gsc snapshots" ON public.gsc_coverage_snapshots
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins read link audit runs" ON public.link_audit_runs
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Revoke EXECUTE on trigger functions from anon/authenticated/public
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_guest_post_submissions_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) Add validated INSERT policy for quote_requests (public quote submissions)
CREATE POLICY "Anyone can submit a quote request" ON public.quote_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND char_length(name) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(phone) BETWEEN 1 AND 40
    AND char_length(address) BETWEEN 1 AND 500
    AND char_length(postal_code) BETWEEN 1 AND 20
    AND char_length(service_type) BETWEEN 1 AND 100
    AND char_length(contact_method) BETWEEN 1 AND 50
    AND (notes IS NULL OR char_length(notes) <= 5000)
  );
GRANT INSERT ON public.quote_requests TO anon, authenticated;

-- 4) Replace guest_post_submissions INSERT policy with validated version
CREATE POLICY "Anyone can submit a guest post" ON public.guest_post_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(name) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(topic) BETWEEN 1 AND 300
    AND char_length(message) BETWEEN 1 AND 20000
  );
