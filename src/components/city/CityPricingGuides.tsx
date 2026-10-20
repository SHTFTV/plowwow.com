import { Link } from "react-router-dom";
const guides = {
  "vancouver": [
    {
      "slug": "vancouver-seasonal-snow-removal-costs",
      "title": "Vancouver Seasonal Snow Removal Costs: What Your Quote Should Cover",
      "description": "Compare Vancouver snow removal pricing by common routes, ice treatment, access and seasonal scope. Request a reviewed quote from PlowWow."
    },
    {
      "slug": "vancouver-strata-snow-contractor-scope-checklist",
      "title": "Choosing a Vancouver Strata Snow Contractor: Scope Before Price",
      "description": "A Vancouver council checklist for sidewalk frontage, entrances, parkade access, salt-only treatment and a clear seasonal snow agreement."
    }
  ],
  "burnaby": [
    {
      "slug": "burnaby-snow-removal-pricing-mountain-lowland",
      "title": "Burnaby Snow Removal Pricing: SFU, Hills and Lower Routes",
      "description": "Why Burnaby snow-service quotes differ between mountain sites and lower routes: equipment, ramps, treatment and seasonal readiness explained."
    },
    {
      "slug": "burnaby-strata-snow-contract-entrances-ramps",
      "title": "Burnaby Strata Snow Contracts: Entrances, Ramps and Repeat Visits",
      "description": "Build a Burnaby winter-service brief for Metrotown, Brentwood, Lougheed or mountain sites, with common routes, extra treatment and contract limits clear."
    }
  ]
};
export default function CityPricingGuides({citySlug}:{citySlug:"vancouver"|"burnaby"}){const city=citySlug==="vancouver"?"Vancouver":"Burnaby";return <section className="py-14 bg-slate-50 border-y border-slate-200" aria-labelledby={`${citySlug}-pricing-guides`}><div className="container"><p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Wow’s local winter guides</p><h2 id={`${citySlug}-pricing-guides`} className="text-3xl font-black mb-4">{city} snow removal pricing and contract planning</h2><p className="text-muted-foreground max-w-3xl mb-8">Compare the scope before the total. These local guides explain service areas, additional ice treatment, suitable equipment and the details needed for a reviewed seasonal quote.</p><div className="grid md:grid-cols-2 gap-6">{guides[citySlug].map(g=><article key={g.slug} className="rounded-2xl bg-white border border-slate-200 p-6"><p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">{city} · Pricing and property scope</p><h3 className="text-xl font-black mb-3"><Link to={`/${g.slug}`} className="hover:underline">{g.title}</Link></h3><p className="text-muted-foreground mb-5">{g.description}</p><Link to={`/${g.slug}`} className="font-bold text-primary hover:underline">Read the local guide →</Link></article>)}</div><div className="mt-8 flex flex-wrap gap-6"><Link to={`/${citySlug}/quote`} className="font-bold text-primary hover:underline">Request a {city} property review →</Link><Link to="/snow-removal-pricing-lower-mainland" className="font-bold text-primary hover:underline">How seasonal pricing works →</Link></div></div></section>}
