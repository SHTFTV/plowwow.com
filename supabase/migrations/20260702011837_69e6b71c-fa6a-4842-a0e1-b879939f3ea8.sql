
CREATE TABLE public.rate_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plow_per_sqft NUMERIC(10,4) NOT NULL DEFAULT 0.02,
  salt_per_bag NUMERIC(10,2) NOT NULL DEFAULT 22.00,
  per_visit NUMERIC(10,2) NOT NULL DEFAULT 145.00,
  currency TEXT NOT NULL DEFAULT 'CAD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_cards TO authenticated;
GRANT ALL ON public.rate_cards TO service_role;
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own rate card" ON public.rate_cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  lot_sqft NUMERIC(12,2) NOT NULL DEFAULT 0,
  curb_linear_ft NUMERIC(12,2) NOT NULL DEFAULT 0,
  walkways_count INTEGER NOT NULL DEFAULT 0,
  salt_bags_season NUMERIC(10,2) NOT NULL DEFAULT 0,
  visits_per_season INTEGER NOT NULL DEFAULT 12,
  plow_per_sqft NUMERIC(10,4) NOT NULL,
  salt_per_bag NUMERIC(10,2) NOT NULL,
  per_visit NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimates TO authenticated;
GRANT ALL ON public.estimates TO service_role;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own estimates" ON public.estimates FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX estimates_user_id_created_at_idx ON public.estimates(user_id, created_at DESC);

CREATE TRIGGER trg_rate_cards_updated_at BEFORE UPDATE ON public.rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_estimates_updated_at BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
