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
  // City hall coordinates — used for the on-page service map.
  cityHall: { lat: number; lon: number; address?: string };
  // Quick stats shown in hero badges
  badges?: string[];
  // City-specific Open Graph / Twitter card image
  ogImage: string;
  // Optional OG image dimensions (defaults to 1200×630)
  ogImageWidth?: number;
  ogImageHeight?: number;
};

// Cities along the Vancouver → Abbotsford corridor (Lower Mainland, BC).
// Burnaby has its own bespoke page at /burnaby and is intentionally omitted.
export const cities: City[] = [
  {
    slug: "vancouver",
    cityHall: { lat: 49.2606, lon: -123.1139, address: "453 W 12th Ave" },
    name: "Vancouver",
    province: "BC",
    tagline: "Vancouver Snow Removal for Strata & Commercial Properties",
    intro:
      "24/7 Vancouver snow removal, commercial snow plowing, salting and ice control for strata, retail, industrial and residential properties — from Downtown and the West End to Kitsilano, Mount Pleasant and East Van.",
    ogImage: "https://plowwow.com/og-vancouver.jpg",
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
    cityHall: { lat: 49.2092, lon: -122.9112, address: "511 Royal Ave" },
    name: "New Westminster",
    province: "BC",
    tagline: "New West Snow Removal & Salting",
    intro:
      "Reliable plowing and de-icing for New Westminster's steep streets, Uptown towers and Quayside properties. WorkSafeBC insured crews on standby through every storm.",
    ogImage: "https://plowwow.com/og-new-westminster.jpg",
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
    cityHall: { lat: 49.2838, lon: -122.7932, address: "3000 Guildford Way" },
    name: "Coquitlam",
    province: "BC",
    tagline: "Coquitlam Snow Removal & Ice Control",
    intro:
      "Plowing, salting and sidewalk clearing for Coquitlam — Westwood Plateau, Burke Mountain, City Centre and Maillardville. Elevation-tuned routing for higher-snowfall zones.",
    ogImage: "https://plowwow.com/og-coquitlam.jpg",
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
    cityHall: { lat: 49.2629, lon: -122.7768, address: "2580 Shaughnessy St" },
    name: "Port Coquitlam",
    province: "BC",
    tagline: "Port Coquitlam Snow & De-icing",
    intro:
      "PoCo plowing for Downtown, Birchland, Citadel Heights and Riverwood. Commercial lot clearing and residential driveways with same-storm response.",
    ogImage: "https://plowwow.com/og-port-coquitlam.jpg",
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
    cityHall: { lat: 49.2849, lon: -122.8409, address: "100 Newport Dr" },
    name: "Port Moody",
    province: "BC",
    tagline: "Port Moody Snow Removal",
    intro:
      "Plowing and salting for Port Moody — Heritage Mountain, Newport Village, Inlet District and College Park. Strata-priority dispatch with photo proof of service.",
    ogImage: "https://plowwow.com/og-port-moody.jpg",
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
    cityHall: { lat: 49.2235, lon: -122.689, address: "12007 Harris Rd" },
    name: "Pitt Meadows",
    province: "BC",
    tagline: "Pitt Meadows Plowing & Salting",
    intro:
      "Pitt Meadows snow service for downtown, Bonson, Mitchell Island industrial and residential streets. Flat-grade routing keeps response fast across the city.",
    ogImage: "https://plowwow.com/og-pitt-meadows.jpg",
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
    cityHall: { lat: 49.2193, lon: -122.6019, address: "11995 Haney Pl" },
    name: "Maple Ridge",
    province: "BC",
    tagline: "Maple Ridge Snow Removal",
    intro:
      "Plowing, sanding and salting for Maple Ridge — Albion, Silver Valley, Hammond and Town Centre. Higher-elevation routes pre-salted ahead of forecast events.",
    ogImage: "https://plowwow.com/og-maple-ridge.jpg",
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
    slug: "port-kells-snow-removal",
    cityHall: { lat: 49.179, lon: -122.714, address: "176 Street & 96 Avenue, Surrey" },
    name: "Port Kells",
    province: "BC",
    tagline: "Port Kells Commercial Snow Removal",
    intro:
      "24/7 commercial and industrial snow removal in Port Kells, Surrey. Plowing, salting and de-icing for warehouses, loading docks, truck yards, parking lots and internal roads.",
    ogImage: "https://plowwow.com/og-surrey.jpg",
    badges: ["Commercial & industrial", "24/7 dispatch", "Seasonal contracts"],
    snowfall: [
      { month: "Nov", cm: 5 },
      { month: "Dec", cm: 17 },
      { month: "Jan", cm: 15 },
      { month: "Feb", cm: 9 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "176 Street corridor", note: "Warehouses, distribution centres and truck yards" },
      { name: "96 Avenue", note: "Industrial sites and commercial access routes" },
      { name: "Highway 1 corridor", note: "Freight-sensitive properties requiring continuous access" },
      { name: "Anniedale", note: "Industrial and mixed commercial properties" },
    ],
    faqs: [
      {
        q: "Do you provide commercial snow removal in Port Kells?",
        a: "Yes. PlowWow provides seasonal and event-based service for warehouses, loading docks, truck yards, parking lots and internal industrial roads throughout Port Kells.",
      },
      {
        q: "Can you keep loading docks and truck lanes open overnight?",
        a: "Yes. Contracted industrial properties receive trigger-based dispatch, priority dock and apron clearing, de-icing and documented return visits during prolonged storms.",
      },
    ],
  },
  {
    slug: "campbell-heights-snow-removal",
    cityHall: { lat: 49.047, lon: -122.69, address: "192 Street & 24 Avenue, Surrey" },
    name: "Campbell Heights",
    province: "BC",
    tagline: "Campbell Heights Commercial Snow Removal",
    intro:
      "Commercial snow clearing and ice management for Campbell Heights business parks and industrial properties in South Surrey. Priority plowing for parking lots, loading areas, sidewalks and access roads.",
    ogImage: "https://plowwow.com/og-surrey.jpg",
    badges: ["Business parks", "Industrial sites", "Documented service"],
    snowfall: [
      { month: "Nov", cm: 4 },
      { month: "Dec", cm: 15 },
      { month: "Jan", cm: 13 },
      { month: "Feb", cm: 8 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "192 Street corridor", note: "Warehouses, logistics facilities and business parks" },
      { name: "24 Avenue", note: "Industrial campuses and employee parking areas" },
      { name: "Grandview Heights", note: "Commercial properties and mixed-use access routes" },
      { name: "South Surrey industrial area", note: "Large lots, loading zones and internal roads" },
    ],
    faqs: [
      {
        q: "Do you service Campbell Heights industrial properties?",
        a: "Yes. PlowWow clears business parks, warehouses, distribution facilities, loading areas, employee parking lots and private access roads across Campbell Heights.",
      },
      {
        q: "How are Campbell Heights properties dispatched?",
        a: "Seasonal contracts use agreed accumulation and surface-temperature triggers, with documented plowing, salting, walkway treatment and return visits as conditions require.",
      },
    ],
  },
  {
    slug: "surrey",
    cityHall: { lat: 49.19, lon: -122.849, address: "13450 104 Ave" },
    name: "Surrey",
    province: "BC",
    tagline: "Surrey Commercial Snow Removal & Ice Management",
    intro:
      "24/7 Surrey commercial snow removal, snow plowing, salting and ice management across all six town centres — City Centre, Guildford, Newton, Cloverdale, Fleetwood and South Surrey. Priority service for strata, retail and industrial sites.",
    ogImage: "https://plowwow.com/og-surrey.jpg",
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
    cityHall: { lat: 49.1042, lon: -122.6603, address: "20399 Douglas Cres" },
    name: "Langley",
    province: "BC",
    tagline: "Langley Snow Removal & Commercial Snow Plowing",
    intro:
      "24/7 snow removal, commercial snow plowing, salting and ice control across Langley City and Langley Township — including Willoughby, Walnut Grove, Brookswood, Fort Langley and Aldergrove. Seasonal service for strata, retail, industrial and residential properties.",
    ogImage: "https://plowwow.com/og-langley.jpg",
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
    cityHall: { lat: 49.0504, lon: -122.2853, address: "32315 South Fraser Way" },
    name: "Abbotsford",
    province: "BC",
    tagline: "Abbotsford Commercial Snow Removal & Snow Clearing",
    intro:
      "24/7 Abbotsford commercial snow removal, snow clearing, plowing, salting and ice control for strata, retail, industrial and residential sites — including Sumas Mountain, Clayburn, Historic Downtown and Mt. Lehman. Extra equipment and salt are staged for heavier Fraser Valley storms.",
    ogImage: "https://plowwow.com/og-abbotsford.jpg",
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
  {
    slug: "west-vancouver",
    cityHall: { lat: 49.3287, lon: -123.1606, address: "750 17th St" },
    name: "West Vancouver",
    province: "BC",
    tagline: "West Vancouver Snow Removal",
    intro:
      "Plowing, salting and ice control across West Vancouver — British Properties, Ambleside, Dundarave, Caulfeild and Cypress. Steep-grade routing and pre-salting for higher elevations.",
    ogImage: "https://plowwow.com/og-west-vancouver.jpg",
    snowfall: [
      { month: "Nov", cm: 6 },
      { month: "Dec", cm: 22 },
      { month: "Jan", cm: 19 },
      { month: "Feb", cm: 11 },
      { month: "Mar", cm: 4 },
    ],
    neighborhoods: [
      { name: "British Properties", note: "Elevation: heavier snowfall zone" },
      { name: "Ambleside", note: "Waterfront retail & residential" },
      { name: "Dundarave", note: "Village core & SFH" },
      { name: "Caulfeild", note: "Hillside SFH on grade" },
      { name: "Cypress", note: "High-elevation residential" },
    ],
    faqs: [
      {
        q: "Do you handle steep West Van driveways?",
        a: "Yes — our trucks are equipped for grade and we pre-salt British Properties and Caulfeild ahead of forecast snow events.",
      },
    ],
  },
  {
    slug: "north-vancouver",
    cityHall: { lat: 49.3211, lon: -123.0724, address: "141 W 14th St" },
    name: "North Vancouver",
    province: "BC",
    tagline: "North Vancouver Snow Removal & Salting",
    intro:
      "24/7 plowing and de-icing across the North Shore — Lonsdale, Lynn Valley, Deep Cove, Edgemont and Capilano. Elevation-tuned dispatch for higher-snowfall zones.",
    ogImage: "https://plowwow.com/og-north-vancouver.jpg",
    snowfall: [
      { month: "Nov", cm: 7 },
      { month: "Dec", cm: 24 },
      { month: "Jan", cm: 20 },
      { month: "Feb", cm: 12 },
      { month: "Mar", cm: 5 },
    ],
    neighborhoods: [
      { name: "Lonsdale", note: "Towers & retail corridor" },
      { name: "Lynn Valley", note: "Elevation residential" },
      { name: "Deep Cove", note: "Coastal SFH" },
      { name: "Edgemont", note: "Village & family residential" },
      { name: "Capilano", note: "Hillside strata & SFH" },
    ],
    faqs: [
      {
        q: "How quickly do you dispatch to the North Shore?",
        a: "Lynn Valley and Edgemont contracted strata sites are typically reached within 60–90 minutes of trigger during snow events.",
      },
    ],
  },
  {
    slug: "richmond",
    cityHall: { lat: 49.1666, lon: -123.1336, address: "6911 No. 3 Rd" },
    name: "Richmond",
    province: "BC",
    tagline: "Richmond Snow Removal & De-icing",
    intro:
      "Flat-grade plowing and ice control across Richmond — City Centre, Steveston, Ironwood and Bridgeport. Commercial lots and strata corridors with same-storm response.",
    ogImage: "https://plowwow.com/og-richmond.jpg",
    snowfall: [
      { month: "Nov", cm: 3 },
      { month: "Dec", cm: 12 },
      { month: "Jan", cm: 10 },
      { month: "Feb", cm: 6 },
      { month: "Mar", cm: 2 },
    ],
    neighborhoods: [
      { name: "City Centre", note: "Towers & SkyTrain corridor" },
      { name: "Steveston", note: "Historic core & SFH" },
      { name: "Ironwood", note: "Retail & big-box lots" },
      { name: "Bridgeport", note: "Industrial & commercial" },
    ],
    faqs: [
      {
        q: "Do you service Richmond commercial lots overnight?",
        a: "Yes — most retail and industrial lots are cleared pre-open between 2–6am during snow events.",
      },
    ],
  },
  {
    slug: "delta",
    cityHall: { lat: 49.0846, lon: -123.0586, address: "4500 Clarence Taylor Cres" },
    name: "Delta",
    province: "BC",
    tagline: "Delta Snow Removal & Salting",
    intro:
      "Plowing, sanding and salting for Delta — Tsawwassen, Ladner and North Delta. Coastal and industrial routes with priority strata and commercial dispatch.",
    ogImage: "https://plowwow.com/og-delta.jpg",
    snowfall: [
      { month: "Nov", cm: 3 },
      { month: "Dec", cm: 11 },
      { month: "Jan", cm: 9 },
      { month: "Feb", cm: 5 },
      { month: "Mar", cm: 2 },
    ],
    neighborhoods: [
      { name: "Tsawwassen", note: "Coastal SFH & strata" },
      { name: "Ladner", note: "Village & waterfront" },
      { name: "North Delta", note: "Suburban residential" },
      { name: "Tilbury", note: "Industrial lots & yards" },
    ],
    faqs: [
      {
        q: "Do you cover Tilbury industrial sites?",
        a: "Yes — large yards and warehouse lots are quoted by area and run on dedicated equipment per event.",
      },
    ],
  },
  {
    slug: "white-rock",
    cityHall: { lat: 49.025, lon: -122.8025, address: "15322 Buena Vista Ave" },
    name: "White Rock",
    province: "BC",
    tagline: "White Rock Snow Removal",
    intro:
      "Coastal plowing and ice control across White Rock — uptown, the waterfront promenade corridor and hillside SFH. Strata-priority dispatch with photo proof of service.",
    ogImage: "https://plowwow.com/og-white-rock.jpg",
    snowfall: [
      { month: "Nov", cm: 3 },
      { month: "Dec", cm: 10 },
      { month: "Jan", cm: 9 },
      { month: "Feb", cm: 5 },
      { month: "Mar", cm: 2 },
    ],
    neighborhoods: [
      { name: "Uptown", note: "Retail & mixed-use core" },
      { name: "East Beach", note: "Hillside SFH" },
      { name: "West Beach", note: "Coastal residential" },
      { name: "Five Corners", note: "Strata & local retail" },
    ],
    faqs: [
      {
        q: "Do hillside White Rock streets get pre-salted?",
        a: "Yes — grade approaches are pre-salted ahead of forecast events to keep traction safe for residents and delivery vehicles.",
      },
    ],
  },
  {
    slug: "mission",
    cityHall: { lat: 49.133, lon: -122.3098, address: "8645 Stave Lake St" },
    name: "Mission",
    province: "BC",
    tagline: "Mission Snow Removal & Ice Control",
    intro:
      "Plowing and salting across Mission — Downtown, Cedar Valley, Hatzic and Silverdale. Eastern Fraser Valley sites see heavier storms; we stage extra salt here.",
    ogImage: "https://plowwow.com/og-mission.jpg",
    snowfall: [
      { month: "Nov", cm: 7 },
      { month: "Dec", cm: 24 },
      { month: "Jan", cm: 21 },
      { month: "Feb", cm: 13 },
      { month: "Mar", cm: 5 },
    ],
    neighborhoods: [
      { name: "Downtown Mission", note: "Retail & civic core" },
      { name: "Cedar Valley", note: "New residential developments" },
      { name: "Hatzic", note: "Hillside & rural" },
      { name: "Silverdale", note: "Suburban SFH" },
    ],
    faqs: [
      {
        q: "Does Mission get hit harder than Vancouver?",
        a: "Yes — eastern Fraser Valley outflow winds and elevation push Mission's storm totals well above the coast.",
      },
    ],
  },
  {
    slug: "chilliwack",
    cityHall: { lat: 49.1579, lon: -121.9508, address: "8550 Young Rd" },
    name: "Chilliwack",
    province: "BC",
    tagline: "Chilliwack Snow Removal & De-icing",
    intro:
      "Chilliwack plowing and ice control — Sardis, Promontory, Yarrow, Vedder and Downtown. Heavy-snowfall corridor with extra salt staging and pre-storm routing.",
    ogImage: "https://plowwow.com/og-chilliwack.jpg",
    snowfall: [
      { month: "Nov", cm: 8 },
      { month: "Dec", cm: 26 },
      { month: "Jan", cm: 23 },
      { month: "Feb", cm: 14 },
      { month: "Mar", cm: 5 },
    ],
    neighborhoods: [
      { name: "Sardis", note: "Family residential & retail" },
      { name: "Promontory", note: "Elevation: heaviest snow zone" },
      { name: "Yarrow", note: "Rural & SFH" },
      { name: "Vedder", note: "Riverfront residential" },
      { name: "Downtown Chilliwack", note: "Mixed-use core" },
    ],
    faqs: [
      {
        q: "Why does Chilliwack need more salt than the coast?",
        a: "Promontory and the eastern valley routinely see 2–3× the snowfall of Vancouver. We stage extra salt and equipment locally.",
      },
    ],
  },
  {
    slug: "port-kells",
    cityHall: { lat: 49.1471, lon: -122.7106, address: "Port Kells, Surrey" },
    name: "Port Kells",
    province: "BC",
    tagline: "Port Kells Commercial & Industrial Snow Removal",
    intro:
      "24/7 snow plowing, salting and de-icing for Port Kells' warehouse, distribution and trucking properties — the 176 Street and Highway 1 logistics belt in northeast Surrey. Large-lot equipment and priority dispatch for industrial and strata sites.",
    ogImage: "https://plowwow.com/og-surrey.jpg",
    snowfall: [
      { month: "Nov", cm: 5 },
      { month: "Dec", cm: 16 },
      { month: "Jan", cm: 14 },
      { month: "Feb", cm: 8 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "176 Street Corridor", note: "Warehouse & distribution frontage" },
      { name: "88 Avenue Business Park", note: "Truck yards & flex units" },
      { name: "Anniedale", note: "Emerging logistics blocks" },
      { name: "Tynehead", note: "Highway 1 industrial edge" },
      { name: "Highway 15 / 17 belt", note: "Cross-border freight & logistics" },
    ],
    faqs: [
      {
        q: "Do you clear large industrial lots and truck yards in Port Kells?",
        a: "Yes — Port Kells is a core industrial zone for us. We run loaders and large plows for distribution lots, loading docks and trailer lanes, keeping 24/7 freight access open.",
      },
    ],
  },
  {
    slug: "campbell-heights",
    cityHall: { lat: 49.0492, lon: -122.7486, address: "Campbell Heights, South Surrey" },
    name: "Campbell Heights",
    province: "BC",
    tagline: "Campbell Heights Business Park Snow Removal",
    intro:
      "24/7 snow and ice management for Campbell Heights — one of Metro Vancouver's largest business parks, spanning South Surrey around 192 Street between 24th and 40th Avenue. Large-lot plowing, loading-dock clearing and de-icing for logistics, manufacturing and strata sites.",
    ogImage: "https://plowwow.com/og-surrey.jpg",
    snowfall: [
      { month: "Nov", cm: 4 },
      { month: "Dec", cm: 14 },
      { month: "Jan", cm: 13 },
      { month: "Feb", cm: 7 },
      { month: "Mar", cm: 2 },
    ],
    neighborhoods: [
      { name: "Campbell Heights North", note: "Logistics & distribution" },
      { name: "Campbell Heights South", note: "Manufacturing & flex" },
      { name: "192 Street Corridor", note: "Primary access & truck route" },
      { name: "32 Avenue", note: "Business-park frontage" },
      { name: "Grandview Heights (adjacent)", note: "Mixed commercial & strata" },
    ],
    faqs: [
      {
        q: "Can you handle a business park the size of Campbell Heights?",
        a: "Yes. Campbell Heights has expansive lots, long internal roads and heavy truck traffic. We stage large equipment locally and clear big sites fast to keep fleet and shift-change access open.",
      },
    ],
  },
  {
    slug: "walnut-grove",
    cityHall: { lat: 49.1626, lon: -122.6412, address: "Walnut Grove, Langley" },
    name: "Walnut Grove",
    province: "BC",
    tagline: "Walnut Grove Snow Removal — Townhouse Strata, Driveways & Walkways",
    intro:
      "Snow plowing, salting and de-icing for Walnut Grove strata complexes, townhouse communities and homes in northwest Langley — driveways, visitor parking, walkways and common areas, documented for your council.",
    ogImage: "https://plowwow.com/og-langley.jpg",
    snowfall: [
      { month: "Nov", cm: 5 },
      { month: "Dec", cm: 15 },
      { month: "Jan", cm: 13 },
      { month: "Feb", cm: 8 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "Walnut Grove Town Centre", note: "Retail & mixed-use core" },
      { name: "Forest Green", note: "Established townhouse stratas" },
      { name: "88 Avenue Corridor", note: "Family residential" },
      { name: "Alex Hope", note: "School-area residential" },
      { name: "Yorkson (adjacent)", note: "New townhouse growth" },
    ],
    faqs: [
      {
        q: "Do you service Walnut Grove townhouse stratas?",
        a: "Yes — Walnut Grove is a core residential route. We clear townhouse-strata drive aisles, visitor parking, walkways and entries on fixed-price seasonal contracts, with documented service for strata councils.",
      },
    ],
  },
  {
    slug: "willoughby",
    cityHall: { lat: 49.1078, lon: -122.6376, address: "Willoughby, Langley" },
    name: "Willoughby",
    province: "BC",
    tagline: "Willoughby Snow Removal — Townhouse & Condo Strata Specialists",
    intro:
      "Snow and ice management for Willoughby's fast-growing townhouse and condo strata communities in Langley — shared drive aisles, visitor lots, walkways and parkade ramps, cleared and documented for your council.",
    ogImage: "https://plowwow.com/og-langley.jpg",
    snowfall: [
      { month: "Nov", cm: 5 },
      { month: "Dec", cm: 16 },
      { month: "Jan", cm: 14 },
      { month: "Feb", cm: 8 },
      { month: "Mar", cm: 3 },
    ],
    neighborhoods: [
      { name: "Willoughby Town Centre", note: "Retail & high-density core" },
      { name: "Yorkson", note: "New townhouse & condo stratas" },
      { name: "Latimer", note: "Master-planned strata growth" },
      { name: "Routley", note: "Family townhouse communities" },
      { name: "Carvolth", note: "Transit-oriented & commercial" },
    ],
    faqs: [
      {
        q: "Do you handle large multi-building Willoughby stratas?",
        a: "Absolutely. Willoughby has some of the Lower Mainland's densest new townhouse and condo strata development. We coordinate long shared drive aisles, visitor lots and parkade ramps across multi-building sites, with preferred multi-unit rates.",
      },
    ],
  },
  {
    slug: "fort-langley",
    cityHall: { lat: 49.1668, lon: -122.5786, address: "Fort Langley, Langley" },
    name: "Fort Langley",
    province: "BC",
    tagline: "Fort Langley Snow Removal — Village, Strata & Heritage Properties",
    intro:
      "Snow plowing, salting and de-icing for Fort Langley's village businesses, Bedford Landing stratas and residential streets — driveways, walkways, parking and common areas cleared and documented, with care for the heritage setting.",
    ogImage: "https://plowwow.com/og-langley.jpg",
    snowfall: [
      { month: "Nov", cm: 4 },
      { month: "Dec", cm: 14 },
      { month: "Jan", cm: 12 },
      { month: "Feb", cm: 7 },
      { month: "Mar", cm: 2 },
    ],
    neighborhoods: [
      { name: "Bedford Landing", note: "Riverside townhouse stratas" },
      { name: "Glover Road Village", note: "Heritage commercial core" },
      { name: "Fort-to-Fort", note: "Trail-side residential" },
      { name: "Church Street", note: "Historic residential" },
      { name: "Bedford Channel", note: "Waterfront properties" },
    ],
    faqs: [
      {
        q: "Do you service Fort Langley stratas and village businesses?",
        a: "Yes — we clear Bedford Landing and other Fort Langley strata communities plus Glover Road village businesses, with de-icing on walkways and entries and documented service, working carefully around the heritage streetscape.",
      },
    ],
  },
];

export const getCityBySlug = (slug: string): City | undefined =>
  cities.find((c) => c.slug === slug);
