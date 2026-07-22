
## Plan: OnlyStrata-formula city pages (5,800 words each)

This is a very large build. I'll execute it in phased batches so you can verify quality before I scale to all 20 cities.

### Phase 1 — Foundation + Langley (proof)
1. **`src/data/locations.ts`** — full typed data model with every field from your spec (bylaw, weather_api, landmarks, transit_routes, google_business_pin, neighbourhoods, faq, pricing, comparison_table, internal_links, external_authority_links). Populate Langley completely with genuinely local data — no filler.
2. **`src/pages/CityPage.tsx`** — rewrite to render all 18 sections in order, hitting 5,800+ words. Sections built as sub-components (`CityHero`, `CityWeather`, `CityMap`, `CityIntro`, `CityServices`, `CityConditions`, `CityTransit`, `CityLandmarks`, `CityBylaw`, `CityNeighbourhoods`, `CityPricing`, `CityCompare`, `CityFAQ`, `CityTestimonials`, `CityPrep`, `CityNearby`, `CityAuthority`, `CityCTA`).
3. **Live weather widget** — Open-Meteo fetch (no key needed), current temp / snowfall / conditions, EC link.
4. **Google Maps embed** — keyless `https://www.google.com/maps?q=...&output=embed` iframe (avoids requiring a Maps API key). If you want pinned landmarks with a real key, I'll swap to the Maps Embed API in Phase 2.
5. **Schema** — LocalBusiness+HomeAndConstructionBusiness, FAQPage, BreadcrumbList, Service (×4), SiteNavigationElement, geo meta tags, full OG/Twitter head via `react-helmet-async`.
6. **Word count verification** — run a Node script (`scripts/count-city-words.ts`) that renders Langley to text and prints the count. Iterate until ≥ 5,800.
7. **Routing** — confirm `/:citySlug` router already resolves via existing `CityPage`; wire new component in.

**Deliverable of Phase 1:** Langley page live at `/langley-snow-removal`, verified word count, screenshot of weather widget + map, JSON-LD pasted back to you.

### Phase 2 — Remaining 19 cities
Once you approve Langley, I populate the other 19 city objects with unique local terrain notes, landmarks, transit routes, neighbourhoods, FAQ, bylaws, and pricing. Each city gets its own genuine local content — no copy-paste. Then re-run word-count on 3 random cities to confirm the template holds ≥ 5,800 words with each city's data.

### Phase 3 — SEO plumbing
- Update `public/sitemap.xml` with 20 city URLs
- Update internal links from home/blog to the 20 city hubs
- Prerender all 20 into `dist/`
- Re-zip for Netlify

### Technical notes
- **Google Maps**: keyless `output=embed` iframe works without an API key but shows a single centred pin, not multiple landmark pins. Multi-pin requires either the Maps JavaScript API (needs the connector browser key) or the Maps Embed API (needs a key). Say the word and I'll wire the Google Maps connector for real pinned landmarks.
- **Weather**: Open-Meteo is public, no key.
- **Word count**: I'll strip HTML/JSX and count visible text tokens; 5,800 is the floor, expansion sections triggered automatically if short.
- **Existing content**: `src/pages/CityPage.tsx` currently renders lighter city pages — the new component replaces it via the same route so nothing breaks.

### Time / scope reality check
Populating 20 cities with *genuinely unique* landmark lists, neighbourhood notes, transit routes, and bylaws is the bulk of the work — not the component code. Phase 1 (Langley + full framework) is ~1 turn. Phase 2 (19 cities of unique data) is realistically 2–3 turns because each city needs its own research pass to avoid the generic filler you specifically banned.

**Approve to start Phase 1 (Langley + full framework + schema + weather + map), or tell me to change anything first.**
