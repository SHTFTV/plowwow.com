export type CityFAQ = { q: string; a: string };

export type City = {
  slug: string;
  name: string;
  province: string;
  tagline: string;
  intro: string;
  // Average winter snowfall (cm/month) for chart — Nov–Mar
  snowfall: { month: string; cm: number }[];
  neighborhoods: { name: string; note: string }[];
  faqs: CityFAQ[];
  // Quick stats shown in hero badges
  badges?: string[];
};

// Cities along the Vancouver → Abbotsford corridor (Lower Mainland, BC).
// Burnaby has its own bespoke page at /burnaby and is intentionally omitted.
export const cities: City[] = [
  {
    slug: "vancouver",
    name: "Vancouver",
    province: "BC",
    tagline: "Vancouver Snow Removal & De-icing",
    intro:
      "24/7 plowing, salting and ice-control across Vancouver — from Downtown and the West End to Kitsilano, Mount Pleasant and East Van. Priority dispatch for strata, retail and residential.",
    snowfall: [
      { month: "Nov", cm: 4 },
      { month: "Dec", cm: 14 },
      { month: "Jan", cm: 12 },
      { month: "Feb", cm: 7 },
      { month: "Mar", cm: 2 },
    ],
    neighborhoods: [
      { name: "Downtown / West End", note: "High-rise strata & retail frontages" },
      { name: "Kitsilano", note: "Townhomes & boutique commercial" },
      { name: "Mount Pleasant", note: "Mixed-use & creative studios" },
      { name: "East Vancouver", note: "Residential streets & laneways" },
      { name: "UBC / Point Grey", note: "Campus-adjacent strata & SFH" },
    ],
    faqs: [
      {
        q: "Do you service Vancouver during heavy snow events?",
        a: "Yes — our Vancouver fleet runs 24/7 during snowfall warnings with priority routes for strata and commercial contracts.",
      },
      {
        q: "How fast can you dispatch in downtown Vancouver?",
        a: "Most downtown sites are reached within 60–90 minutes of trigger. Contracted strata properties get same-storm priority.",
      },
    ],
  },
  {
    slug: "new-westminster",
    name: "New Westminster",
    province: "BC",
    tagline: "New West Snow Removal & Salting",
    intro:
      "Reliable plowing and de-icing for New Westminster's steep streets, Uptown towers and Quayside properties. WorkSafeBC insured crews on standby through every storm.",
    snowfall: [
      { month: "Nov", cm: 5 },
      { month: "Dec", cm: 16 },
      { month: "Jan", cm: 14 },
      { month: "Feb", cm: 8 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "Uptown", note: "High-density towers & retail" },
      { name: "Quayside", note: "Waterfront strata corridor" },
      { name: "Sapperton", note: "Hillside residential" },
      { name: "Queensborough", note: "Industrial & townhome mix" },
    ],
    faqs: [
      {
        q: "Do you handle New West's hillside driveways?",
        a: "Yes. Our trucks are equipped for grade and we pre-salt steep approaches before storms when forecast triggers fire.",
      },
    ],
  },
  {
    slug: "coquitlam",
    name: "Coquitlam",
    province: "BC",
    tagline: "Coquitlam Snow Removal & Ice Control",
    intro:
      "Plowing, salting and sidewalk clearing for Coquitlam — Westwood Plateau, Burke Mountain, City Centre and Maillardville. Elevation-tuned routing for higher-snowfall zones.",
    snowfall: [
      { month: "Nov", cm: 7 },
      { month: "Dec", cm: 22 },
      { month: "Jan", cm: 19 },
      { month: "Feb", cm: 11 },
      { month: "Mar", cm: 4 },
    ],
    neighborhoods: [
      { name: "Burke Mountain", note: "Elevation: heavier snowfall zone" },
      { name: "Westwood Plateau", note: "Strata & SFH on grade" },
      { name: "City Centre", note: "Towers & SkyTrain corridor" },
      { name: "Maillardville", note: "Established residential" },
    ],
    faqs: [
      {
        q: "Why does Coquitlam need more salt than Vancouver?",
        a: "Burke Mountain and Westwood Plateau routinely see 2–3× the snowfall of low-elevation Coquitlam. We stage extra salt for these routes.",
      },
    ],
  },
  {
    slug: "port-coquitlam",
    name: "Port Coquitlam",
    province: "BC",
    tagline: "Port Coquitlam Snow & De-icing",
    intro:
      "PoCo plowing for Downtown, Birchland, Citadel Heights and Riverwood. Commercial lot clearing and residential driveways with same-storm response.",
    snowfall: [
      { month: "Nov", cm: 5 },
      { month: "Dec", cm: 18 },
      { month: "Jan", cm: 15 },
      { month: "Feb", cm: 9 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "Downtown PoCo", note: "Retail & mixed-use" },
      { name: "Citadel Heights", note: "Hillside SFH" },
      { name: "Birchland Manor", note: "Established residential" },
      { name: "Riverwood", note: "Family strata communities" },
    ],
    faqs: [
      {
        q: "Do you do PoCo commercial lots overnight?",
        a: "Yes — most retail and industrial lots are cleared pre-open between 2–6am during snow events.",
      },
    ],
  },
  {
    slug: "port-moody",
    name: "Port Moody",
    province: "BC",
    tagline: "Port Moody Snow Removal",
    intro:
      "Plowing and salting for Port Moody — Heritage Mountain, Newport Village, Inlet District and College Park. Strata-priority dispatch with photo proof of service.",
    snowfall: [
      { month: "Nov", cm: 6 },
      { month: "Dec", cm: 20 },
      { month: "Jan", cm: 17 },
      { month: "Feb", cm: 10 },
      { month: "Mar", cm: 4 },
    ],
    neighborhoods: [
      { name: "Heritage Mountain", note: "Elevation strata & SFH" },
      { name: "Newport Village", note: "Mixed-use core" },
      { name: "Inlet District", note: "Waterfront towers" },
      { name: "College Park", note: "Family residential" },
    ],
    faqs: [
      {
        q: "Do you photo-document service in Port Moody?",
        a: "Every site gets timestamped before/after photos uploaded to your strata portal after each event.",
      },
    ],
  },
  {
    slug: "pitt-meadows",
    name: "Pitt Meadows",
    province: "BC",
    tagline: "Pitt Meadows Plowing & Salting",
    intro:
      "Pitt Meadows snow service for downtown, Bonson, Mitchell Island industrial and residential streets. Flat-grade routing keeps response fast across the city.",
    snowfall: [
      { month: "Nov", cm: 4 },
      { month: "Dec", cm: 15 },
      { month: "Jan", cm: 13 },
      { month: "Feb", cm: 8 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "Downtown Pitt Meadows", note: "Retail & civic core" },
      { name: "Bonson", note: "New residential developments" },
      { name: "South Bonson", note: "Townhome corridors" },
      { name: "Industrial / Airport", note: "Commercial lots & yards" },
    ],
    faqs: [
      {
        q: "Do you service Pitt Meadows industrial lots?",
        a: "Yes — including yards near the airport and Lougheed corridor. Larger sites get dedicated equipment per event.",
      },
    ],
  },
  {
    slug: "maple-ridge",
    name: "Maple Ridge",
    province: "BC",
    tagline: "Maple Ridge Snow Removal",
    intro:
      "Plowing, sanding and salting for Maple Ridge — Albion, Silver Valley, Hammond and Town Centre. Higher-elevation routes pre-salted ahead of forecast events.",
    snowfall: [
      { month: "Nov", cm: 6 },
      { month: "Dec", cm: 21 },
      { month: "Jan", cm: 18 },
      { month: "Feb", cm: 11 },
      { month: "Mar", cm: 4 },
    ],
    neighborhoods: [
      { name: "Silver Valley", note: "Elevation: heavy snow zone" },
      { name: "Albion", note: "New strata & SFH developments" },
      { name: "Hammond", note: "Heritage residential" },
      { name: "Town Centre", note: "Mixed-use commercial" },
    ],
    faqs: [
      {
        q: "Does Maple Ridge get more snow than the rest of the Lower Mainland?",
        a: "Yes — north-side neighborhoods like Silver Valley sit higher and accumulate notably more than valley-floor Vancouver.",
      },
    ],
  },
  {
    slug: "surrey",
    name: "Surrey",
    province: "BC",
    tagline: "Surrey Snow Removal & Ice Control",
    intro:
      "Surrey snow service across all six town centres — City Centre, Guildford, Newton, Cloverdale, Fleetwood and South Surrey. Largest dispatch fleet in the corridor.",
    snowfall: [
      { month: "Nov", cm: 4 },
      { month: "Dec", cm: 15 },
      { month: "Jan", cm: 13 },
      { month: "Feb", cm: 8 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "City Centre", note: "Towers & SkyTrain corridor" },
      { name: "Guildford", note: "Mixed-use & retail" },
      { name: "Newton", note: "Dense residential" },
      { name: "Cloverdale", note: "Suburban & equestrian" },
      { name: "Fleetwood", note: "Family residential" },
      { name: "South Surrey / White Rock", note: "Coastal SFH & strata" },
    ],
    faqs: [
      {
        q: "Can you cover all of Surrey in a single storm?",
        a: "Yes — Surrey is our largest geographic zone and gets the most trucks. Contracted sites are always prioritized first.",
      },
    ],
  },
  {
    slug: "langley",
    name: "Langley",
    province: "BC",
    tagline: "Langley Snow Removal",
    intro:
      "Plowing and salting across Langley City and Langley Township — Willoughby, Walnut Grove, Brookswood, Fort Langley and Aldergrove. Strata, commercial and residential.",
    snowfall: [
      { month: "Nov", cm: 5 },
      { month: "Dec", cm: 17 },
      { month: "Jan", cm: 15 },
      { month: "Feb", cm: 9 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "Willoughby", note: "Fast-growing strata corridor" },
      { name: "Walnut Grove", note: "Family residential" },
      { name: "Brookswood", note: "Acreage & SFH" },
      { name: "Fort Langley", note: "Historic core & retail" },
      { name: "Aldergrove", note: "Suburban & rural" },
    ],
    faqs: [
      {
        q: "Do you service Langley acreages?",
        a: "Yes — longer driveways and farm approaches are quoted by length and surface; we run trucks suited to gravel and packed lanes.",
      },
    ],
  },
  {
    slug: "abbotsford",
    name: "Abbotsford",
    province: "BC",
    tagline: "Abbotsford Snow Removal & De-icing",
    intro:
      "Abbotsford plowing and ice control — Sumas Mountain, Clayburn, Historic Downtown and Mt. Lehman. Eastern Fraser Valley sites see heavier storms; we stage extra salt here.",
    snowfall: [
      { month: "Nov", cm: 6 },
      { month: "Dec", cm: 22 },
      { month: "Jan", cm: 20 },
      { month: "Feb", cm: 12 },
      { month: "Mar", cm: 4 },
    ],
    neighborhoods: [
      { name: "Sumas Mountain", note: "Elevation: heaviest snowfall zone" },
      { name: "Clayburn", note: "Heritage village & SFH" },
      { name: "Historic Downtown", note: "Retail & mixed-use" },
      { name: "Mt. Lehman", note: "Rural & commercial mix" },
      { name: "West Abbotsford", note: "Newer strata communities" },
    ],
    faqs: [
      {
        q: "Why does Abbotsford get hit harder than Vancouver?",
        a: "Abbotsford sits in the eastern Fraser Valley where outflow winds and elevation push storm totals well above the coast. Sumas Mountain in particular sees the most accumulation in our service area.",
      },
    ],
  },
];

export const getCityBySlug = (slug: string): City | undefined =>
  cities.find((c) => c.slug === slug);
