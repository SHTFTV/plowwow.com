
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS city_slug text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS service_level text,
  ADD COLUMN IF NOT EXISTS property_size text,
  ADD COLUMN IF NOT EXISTS frequency text,
  ADD COLUMN IF NOT EXISTS driveway_meters numeric,
  ADD COLUMN IF NOT EXISTS estimate_low numeric,
  ADD COLUMN IF NOT EXISTS estimate_high numeric,
  ADD COLUMN IF NOT EXISTS estimate_unit text,
  ADD COLUMN IF NOT EXISTS geocode_lat numeric,
  ADD COLUMN IF NOT EXISTS geocode_lon numeric,
  ADD COLUMN IF NOT EXISTS geocode_formatted text,
  ADD COLUMN IF NOT EXISTS distance_km numeric,
  ADD COLUMN IF NOT EXISTS distance_from_address text,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS quote_requests_city_slug_idx ON public.quote_requests(city_slug, created_at DESC);
