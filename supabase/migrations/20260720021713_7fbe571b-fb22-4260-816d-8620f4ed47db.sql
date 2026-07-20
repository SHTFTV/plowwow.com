CREATE TABLE public.newsletter_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_signups_email_key UNIQUE (email),
  CONSTRAINT newsletter_signups_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND char_length(email) <= 254)
);

GRANT INSERT ON public.newsletter_signups TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.newsletter_signups TO authenticated;
GRANT ALL ON public.newsletter_signups TO service_role;

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up (insert only). No SELECT for anon.
CREATE POLICY "Anyone can subscribe" ON public.newsletter_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(email) BETWEEN 3 AND 254);

-- Admins can read / manage.
CREATE POLICY "Admins can read newsletter signups" ON public.newsletter_signups
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete newsletter signups" ON public.newsletter_signups
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER newsletter_signups_set_updated_at
  BEFORE UPDATE ON public.newsletter_signups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX newsletter_signups_created_at_idx ON public.newsletter_signups (created_at DESC);