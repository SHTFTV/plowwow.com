
CREATE TABLE public.link_audit_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posts_total INT NOT NULL,
  cities_total INT NOT NULL,
  orphan_posts_count INT NOT NULL,
  cities_without_posts_count INT NOT NULL,
  report JSONB NOT NULL,
  email_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.link_audit_runs TO authenticated;
GRANT ALL ON public.link_audit_runs TO service_role;
ALTER TABLE public.link_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read link audit runs" ON public.link_audit_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.gsc_coverage_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  site_url TEXT NOT NULL,
  sitemaps_submitted INT NOT NULL DEFAULT 0,
  urls_submitted INT NOT NULL DEFAULT 0,
  urls_indexed INT NOT NULL DEFAULT 0,
  urls_discovered_not_indexed INT NOT NULL DEFAULT 0,
  urls_crawled_not_indexed INT NOT NULL DEFAULT 0,
  urls_excluded INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gsc_coverage_snapshots TO authenticated;
GRANT ALL ON public.gsc_coverage_snapshots TO service_role;
ALTER TABLE public.gsc_coverage_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read gsc snapshots" ON public.gsc_coverage_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_link_audit_runs_ran_at ON public.link_audit_runs (ran_at DESC);
CREATE INDEX idx_gsc_snapshots_captured_at ON public.gsc_coverage_snapshots (captured_at DESC);
