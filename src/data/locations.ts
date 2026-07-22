// OnlyStrata-formula deep location data for BC snow-removal city pages.
// Keyed by the existing City slug (see src/data/cities.ts). When a
// LocationDeepData entry exists for a slug, CityPage renders the extended
// 5,800-word OnlyStrata sections (weather, map, transit, landmarks, bylaw,
// pricing, comparison, prep, authority links) in addition to the existing
// buildCityCopy narrative.

export type Landmark = {
  name: string;
  lat: number;
  lng: number;
  type: "commercial" | "venue" | "landmark" | "government" | "institution" | "park" | "transit";
};

export type TransitRoute = {
  route: string;
  corridor: string;
  operator: string;
};

export type NeighbourhoodNote = {
  name: string;
  note: string;
};

export type LocationFAQ = { q: string; a: string };

export type LocationDeepData = {
  slug: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  avg_annual_snowfall_cm: number;
  snow_season_start: string;
  snow_season_end: string;
  freeze_thaw_cycles: number;
  terrain_note: string;
  snowfall_note: string;
  strata_note: string;
  commercial_note: string;
  residential_note: string;
  bylaw: {
    rule: string;
    authority: string;
    fine: string;
    link: string;
  };
  weather_api: {
    lat: number;
    lng: number;
    environment_canada_url: string;
    open_meteo_url: string;
  };
  landmarks: Landmark[];
  transit_routes: TransitRoute[];
  google_business_pin: {
    name: string;
    maps_url: string;
    embed_query: string;
  };
  neighbourhoods: NeighbourhoodNote[];
  faq: LocationFAQ[];
  pricing: {
    residential_seasonal: string;
    strata_seasonal: string;
    commercial_seasonal: string;
    per_visit: string;
    de_ice_treatment: string;
  };
  comparison_table: {
    competitors: string[];
    factors: string[];
  };
  internal_links: string[];
  external_authority_links: { label: string; url: string }[];
  // Long-form prose that drives word count and local specificity.
  intro_long: string; // ~500 words — "Why [City] is different"
  conditions_long: string; // ~500 words — snow & weather deep dive
  prep_long: string; // ~400 words — seasonal prep
  mistakes_long: string; // ~400 words — common mistakes
  testimonials: { name: string; role: string; neighbourhood: string; rating: 5; quote: string }[];
};

const p = (paragraphs: string[]) => paragraphs.join("\n\n");

export const LOCATIONS: Record<string, LocationDeepData> = {
  langley: {
    slug: "langley",
    city: "Langley",
    region: "Fraser Valley",
    lat: 49.1042,
    lng: -122.6604,
    phone: "604-761-1518",
    email: "info@plowwow.com",
    avg_annual_snowfall_cm: 45,
    snow_season_start: "November",
    snow_season_end: "March",
    freeze_thaw_cycles: 20,
    terrain_note:
      "Langley spans flat agricultural bottomland along the Nicomekl and Salmon rivers in the south, rising to forested uplands and glacial terraces around Langley City, Willoughby, and Fort Langley. That elevation range — from roughly 5 metres near the Fraser at Barnston Island to over 100 metres in Murrayville — is why one Langley address can be dry pavement while another 4 kilometres away is under 8 centimetres of frozen slush.",
    snowfall_note:
      "Langley receives an average of 45 cm of snowfall annually, well above the 38 cm Metro Vancouver coastal average. More importantly, Langley sits in the Fraser Valley outflow corridor: when Arctic air spills down the Fraser Canyon and collides with Pacific moisture, Langley sees freezing rain and rain-on-snow ice events that make Fraser Highway, Glover Road, and the 200th Street overpasses lethal within 30 minutes.",
    strata_note:
      "Langley City and the Township of Langley together host over 400 strata complexes governed by the BC Strata Property Act. Section 72 makes the strata corporation responsible for common-property snow and ice clearing; failure to maintain safe walkways transfers slip-and-fall liability from the individual owner to the entire strata corporation and, in practice, to the council members personally when insurance excludes gross neglect.",
    commercial_note:
      "The 200th Street corridor from the Langley Bypass north to 88th Avenue is the region's densest commercial strip, anchored by Willowbrook Shopping Centre, big-box retail, auto dealerships, and light-industrial parks in Gloucester and Port Kells. Add the Campbell Heights industrial expansion and the medical/office cluster around Langley Memorial Hospital and PlowWow dispatches more commercial equipment into Langley on a typical storm night than any other Fraser Valley municipality.",
    residential_note:
      "Langley's residential fabric is unusually varied — Brookswood's tree-lined half-acre lots, Murrayville's mid-century bungalows, Fort Langley's heritage cottages with narrow century-old lanes, and Willoughby's dense new townhome and single-family subdivisions. Each demands a different equipment mix: skid-steer plus walk-behind for Fort Langley, half-ton truck plus V-box for Brookswood, and coordinated townhome-row sweeps for Willoughby.",
    bylaw: {
      rule: "Property owners must clear snow and ice from adjacent sidewalks by 10:00 AM the day following any snowfall.",
      authority: "Township of Langley Traffic Bylaw & City of Langley Streets & Traffic Bylaw",
      fine: "Up to $1,000 per offence plus municipal clearing costs charged to the property",
      link: "https://www.tol.ca",
    },
    weather_api: {
      lat: 49.1042,
      lng: -122.6604,
      environment_canada_url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html",
      open_meteo_url:
        "https://api.open-meteo.com/v1/forecast?latitude=49.1042&longitude=-122.6604&current=temperature_2m,weather_code,snowfall&temperature_unit=celsius",
    },
    landmarks: [
      { name: "Willowbrook Shopping Centre", lat: 49.1069, lng: -122.6551, type: "commercial" },
      { name: "Langley Events Centre", lat: 49.1127, lng: -122.6582, type: "venue" },
      { name: "Fort Langley National Historic Site", lat: 49.1697, lng: -122.5723, type: "landmark" },
      { name: "Langley City Hall", lat: 49.1042, lng: -122.6604, type: "government" },
      { name: "Kwantlen Polytechnic University Langley", lat: 49.0997, lng: -122.6537, type: "institution" },
      { name: "Campbell Valley Regional Park", lat: 49.0233, lng: -122.6561, type: "park" },
    ],
    transit_routes: [
      { route: "R6 Rapid Bus", corridor: "Fraser Highway — Surrey Central to Langley Centre", operator: "TransLink" },
      { route: "502", corridor: "Langley Centre — Surrey Central via Fraser Highway", operator: "TransLink" },
      { route: "503", corridor: "Aldergrove — Surrey Central", operator: "TransLink" },
      { route: "531", corridor: "Willowbrook — Newton Exchange", operator: "TransLink" },
      { route: "555", corridor: "Carvolth Exchange — Lougheed Station (Hwy 1 express)", operator: "TransLink" },
    ],
    google_business_pin: {
      name: "PlowWow Snow Removal Langley",
      maps_url: "https://maps.google.com/?q=PlowWow+Snow+Removal+Langley+BC",
      embed_query: "PlowWow+Snow+Removal+Langley+BC",
    },
    neighbourhoods: [
      { name: "Willoughby", note: "The highest-density strata growth area in the Township — over 80 townhome complexes built since 2015 along 208th and 80th. Tight internal drive aisles mean skid-steer work, and visitor parking policies force overnight relocation." },
      { name: "Brookswood", note: "Established residential with half-acre and one-acre lots, mature cedars, and long private driveways. Half-ton plow trucks plus liquid brine pre-treatment on the day before a forecast event." },
      { name: "Murrayville", note: "Seniors-heavy demographic clustered around Langley Memorial Hospital and Murrayville Village. Priority walkway de-icing before 6:00 AM to protect medical access and independent-living residents." },
      { name: "Fort Langley", note: "Heritage district with narrow lanes off Glover, historic wooden sidewalks near Mavis and King, and strict Township of Langley heritage-guideline restrictions on rock-salt use near the Fort site." },
      { name: "Aldergrove", note: "Agricultural and residential mix east of 264th. Rural gravel access, farm equipment coordination, and longer transit times mean seasonal contracts are strongly preferred over per-visit." },
      { name: "Walnut Grove", note: "Dense strata townhome corridor along 200th Street between 88th and Hwy 1. Overnight coordination with strata councils is standard so 6:00 AM commuters find cleared visitor parking and driveways." },
    ],
    faq: [
      {
        q: "What is the snow clearing bylaw in Langley?",
        a: "Both the Township of Langley and the City of Langley require property owners — including strata corporations and commercial landlords — to clear snow and ice from adjacent sidewalks by 10:00 AM the day after a snowfall event. Enforcement is complaint-driven but active: bylaw officers respond to slip-and-fall reports, and repeated non-compliance can result in fines up to $1,000 per offence plus municipal clearing costs billed back to the property tax roll. For strata properties, Section 72 of the BC Strata Property Act imposes an additional statutory duty on the strata corporation to maintain common property in a safe condition, which is why most Langley strata councils formalise a professional contract each October.",
      },
      {
        q: "How quickly does PlowWow respond in Langley?",
        a: "Active PlowWow seasonal-contract clients in Langley receive priority dispatch with typical response times under 60 minutes from the moment a storm trigger is confirmed. Our Langley staging equipment lives on the 200th Street corridor and at Campbell Heights, so trucks are on-site at Willoughby, Walnut Grove, and downtown Langley City sites within 20–40 minutes. Per-visit callers are served on a best-effort basis and can expect 3–6 hour response times during a major event, which is why we recommend seasonal contracts for any strata or commercial property that cannot afford a 6:00 AM insurance exposure.",
      },
      {
        q: "Does PlowWow serve strata complexes in Willoughby?",
        a: "Yes — Willoughby is one of our highest-density service areas in Langley. We hold seasonal contracts with strata councils across the Willoughby corridor from Yorkson Creek to Routley, covering townhome complexes, low-rise apartment buildings, and the mixed-use blocks around Willoughby Town Centre. Contracts include drive-aisle plowing, visitor-parking clearing, walkway shovelling, granular and liquid de-icing on stairs and mail-kiosk approaches, and a documented incident log delivered to the strata manager after each event so councils have Strata Property Act compliance evidence on file.",
      },
      {
        q: "What bus routes does PlowWow prioritize clearing near?",
        a: "Our Langley service prioritises property frontages along the R6 Rapid Bus corridor on Fraser Highway, the Route 502 stops through Langley City, the Route 555 highway express feeding Carvolth Exchange, and the transit exchange at Langley Centre. TransLink expects bus-stop frontages to be cleared before the first morning trip; properties adjacent to R6 stops in particular face heightened liability because Rapid Bus ridership exceeds 25,000 boardings per day and a slip-and-fall at a Rapid Bus stop is almost guaranteed to attract a claim.",
      },
      {
        q: "What is the average snowfall in Langley BC?",
        a: "Langley receives an average of 40–50 cm of snowfall annually, with the higher end concentrated in Brookswood, Murrayville, and Aldergrove where elevation ranges from 60 to 110 metres above sea level. Unlike Metro Vancouver's coastal areas — which see roughly 38 cm — Langley's inland position and Fraser Valley outflow exposure produce colder overnight temperatures, more frequent freeze-thaw cycles (roughly 20 per winter), and disproportionately more rain-on-snow ice events. It is the freeze-thaw pattern, not the total accumulation, that drives most Langley slip-and-fall claims.",
      },
      {
        q: "Do I need a seasonal contract or can I call on-demand?",
        a: "PlowWow offers both. Seasonal contracts (typically November 1 through March 31) guarantee priority dispatch, fixed pricing regardless of event count, unlimited de-icing visits, and Strata Property Act compliance documentation. Per-visit service is available for detached single-family homes and small commercial sites but is subject to availability during major events — a single Fraser Valley outflow storm can put every Langley contractor at capacity for 36 hours. For any strata, medical, retail, or industrial property, a seasonal contract is the only responsible risk-management choice.",
      },
      {
        q: "Does PlowWow serve commercial properties on 200th Street?",
        a: "Yes — the 200th Street commercial corridor from the Langley Bypass north to 88th Avenue is one of our priority commercial routes. We serve retail centres including Willowbrook Shopping Centre approaches, auto dealerships along the auto mall strip, big-box parking lots at Willowbrook and Walnut Grove Town Centre, medical office plazas near Langley Memorial Hospital, and light-industrial properties in Gloucester Industrial Estates and Port Kells. Contracts scale from single-tenant retail pads at $3,500 seasonal up to multi-tenant power centres exceeding $15,000 seasonal.",
      },
      {
        q: "What de-icing products does PlowWow use in Langley?",
        a: "We use environmentally responsible liquid and granular de-icers matched to the surface, temperature, and environmental sensitivity of each Langley site. Standard product mix includes salt brine pre-treatment (23% NaCl solution) applied 12–24 hours before a forecast event, calcium chloride for temperatures below -10°C, and magnesium chloride blends near Campbell Valley Regional Park, the Nicomekl greenway, and Fort Langley heritage sidewalks where rock salt is either restricted or damaging to old-growth cedar and heritage masonry. All application rates are logged for compliance reporting.",
      },
    ],
    pricing: {
      residential_seasonal: "$450 – $900",
      strata_seasonal: "$2,400 – $8,500",
      commercial_seasonal: "$3,500 – $15,000",
      per_visit: "$85 – $250",
      de_ice_treatment: "$45 – $120",
    },
    comparison_table: {
      competitors: ["DIY", "Handyman", "National Company"],
      factors: [
        "Response Time",
        "24/7 Availability",
        "Liability Insurance",
        "Local Knowledge",
        "Fixed Seasonal Pricing",
        "Strata Property Act Experience",
        "Fleet Redundancy",
        "Documented Incident Log",
      ],
    },
    internal_links: [
      "burnaby",
      "surrey",
      "abbotsford",
      "maple-ridge",
      "coquitlam",
    ],
    external_authority_links: [
      { label: "Township of Langley Bylaws", url: "https://www.tol.ca" },
      { label: "City of Langley", url: "https://www.langleycity.ca" },
      { label: "Environment Canada — Langley Weather", url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html" },
      { label: "BC Strata Property Act", url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/98043_00" },
      { label: "TransLink Route Planner", url: "https://www.translink.ca" },
      { label: "Occupiers Liability Act BC", url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96337_01" },
    ],
    intro_long: p([
      "Snow removal in Langley is not the same job as snow removal in Vancouver, and treating it as though it were is how strata councils, property managers, and business owners end up with fines, insurance exposures, and the kind of slip-and-fall claims that fund plaintiff lawyers for a decade. Langley sits at the mouth of the Fraser Valley outflow corridor, and that single geographic fact reshapes every operational decision — from which de-icer to spread on a Willoughby townhome walkway to what time crews need to be pre-staged at Willowbrook Shopping Centre when a Sunday-night warning is issued for Monday morning.",
      "The first thing most property owners get wrong is timing. Vancouver receives most of its snow as a wet, warm coastal event that melts within 24 hours. Langley, by contrast, sees Arctic air descend from the interior and sit on the valley floor for 48 to 96 hours at a time. That means snow that falls on a Saturday night can still be present, refrozen, and dangerously slick on Tuesday morning. Any contractor still working on a Vancouver-style dispatch schedule — clear once, walk away — will leave your property exposed for the duration of the cold snap. PlowWow's Langley seasonal contracts include unlimited de-icing revisits for exactly this reason.",
      "The second thing property owners get wrong is de-icer selection. Rock salt is cheap and effective above -8°C, but every winter in Langley includes multi-day stretches below -10°C when sodium chloride simply stops working. Calcium chloride, magnesium chloride, and pre-applied brine are the correct tools for those events, and they are not interchangeable — calcium chloride is aggressive on concrete cure, magnesium chloride is gentler on landscaping but 40% more expensive, and brine has to be laid down before the storm arrives, not after. A Langley contractor who owns only one product owns the wrong product.",
      "The third and most expensive mistake is underestimating rain-on-snow ice. When Pacific moisture rolls back over the valley on the third day of an outflow event, it lands on frozen ground, freezes on contact, and turns every parking-lot slope, every stair riser, and every accessibility ramp into a liability lawsuit waiting to be filed. This is where Langley's real slip-and-fall exposure lives — not in the 15 cm of visible snowfall on day one, but in the invisible 3 mm of glaze ice on day three. PlowWow's crews stay on rotation for the full storm arc, not just the plowable portion.",
      "The final overlooked factor is documentation. Under the BC Strata Property Act and the Occupiers Liability Act, courts do not care what you did — they care what you can prove you did. Every PlowWow Langley visit generates a timestamped incident log with GPS-verified equipment tracks, product application rates, and site-condition photos delivered to your property manager or strata council within 24 hours. When a claim lands 18 months later, that log is the difference between a defensible file and a settlement.",
    ]),
    conditions_long: p([
      "Langley's winter weather is best understood as three overlapping systems. The first is Pacific frontal moisture — the same warm, wet air that gives Vancouver its rain. In Langley, at 30 to 80 metres of elevation and 60 kilometres inland from open Pacific water, that moisture arrives 1 to 3°C colder and frequently transitions from rain to snow to freezing rain over the course of a single event. The second system is Fraser Valley outflow: dense Arctic air draining west out of the interior through the Fraser Canyon, riding down the valley floor, and stalling against the Coast Mountains near Abbotsford. Outflow events are what generate Langley's cold snaps, its wind chills below -20°C, and its multi-day sub-zero stretches. The third is the collision of the two, which produces the ice-storm events that define the region's slip-and-fall record.",
      "The 20 freeze-thaw cycles Langley averages each winter matter more than the 45 cm of total snowfall. Each freeze-thaw cycle produces black ice at dawn on paved surfaces that were wet at midnight. Black ice does not respond to plowing; it responds only to pre-applied brine or reactive granular de-icer, which means it is a scheduling problem, not an equipment problem. Contractors who show up when the snow is visible and leave when the snow is gone miss every one of these cycles.",
      "The typical Langley snow season begins in early November with cold-air advisories, sees its first accumulating event between mid-November and early December, and produces its heaviest sustained events between late December and mid-February. March is the wildcard month — Langley has recorded both 20 cm accumulations and full-week 15°C thaws in the same March week. This is why our seasonal contracts run November 1 through March 31 rather than the December-through-February window that some low-cost providers offer.",
      "Local micro-climates matter. Fort Langley, sitting in the Fraser River valley bottom at just 5 metres elevation, is often the coldest part of the Township because cold air drains into the river channel overnight. Brookswood and Murrayville, at 80 to 110 metres, see the most sustained accumulations because they are just high enough to catch the freezing level on marginal events. Willowbrook and 200th Street sit in between and behave more like coastal Metro Vancouver — but only during pure Pacific events, not during outflow. A single Langley property portfolio can span all three regimes, which is why standardised route sheets fail here and dynamic dispatch matters.",
      "Environment Canada issues both Winter Storm Warnings and Arctic Outflow Warnings for the Fraser Valley, and PlowWow's operations desk monitors both feeds continuously from November 1 forward. When a warning is issued, seasonal-contract clients are notified by 6:00 PM the evening before, brine pre-treatment is dispatched by 10:00 PM, and full crews are staged on-site by 3:00 AM the morning of. That timeline is not optional for medical, retail, or strata properties — it is the minimum standard the courts and the insurers now expect.",
    ]),
    prep_long: p([
      "The Langley winter preparation calendar starts in October, not December. By October 15, PlowWow's operations team has walked every seasonal-contract site, flagged tripping hazards under fallen leaves, marked drainage grates, tagged low-hanging tree branches that will need to be cleared before plow trucks arrive, and confirmed the location of shut-off valves, gas meters, and irrigation heads that plow blades will otherwise destroy. Site walks are documented with dated photos so any pre-existing damage claims can be resolved without dispute.",
      "By November 1, seasonal contracts are activated: brine tanks are filled, granular de-icer is pre-positioned in on-site bins for owner top-up between visits, incident-log software is provisioned for the property manager, and 24/7 dispatch numbers are distributed to strata councils and site managers. Any property that has not signed a seasonal contract by November 1 is at real risk of being unable to secure priority service during the season's first significant event; by mid-November most Langley contractors are at full capacity.",
      "When Environment Canada issues a snowfall warning, seasonal-contract clients receive a same-day written notice by email or SMS with the forecast event window, the expected dispatch timeline for their site, and specific instructions on tenant communication (for strata properties) or overnight parking relocation (for townhome complexes). Willoughby strata councils in particular have learned that a 5:00 PM email to residents asking cars to be moved off drive aisles by 10:00 PM is the single most effective operational lever available to them.",
      "During a major storm event, crews rotate through Langley sites on documented routes with GPS tracking. Seasonal-contract sites are visited on trigger — typically 2 cm accumulation for commercial and 5 cm for residential — and then again at 6 to 8 hour intervals for the duration of the event. De-icing is applied after plowing, not before, and again at first light on any day where overnight refreeze is forecast. Every visit is logged.",
      "In the 48 hours after heavy snowfall, the priority shifts from plowing to ice management. Shaded stair risers, north-facing walkways, and low-lying accessibility ramps refreeze first and are the top slip-and-fall risk. PlowWow crews revisit every seasonal site during this window whether or not additional accumulation is forecast. Spring cleanup — brine tank flushing, salt-residue washdown, planting-bed cleanup where salt spray reached ornamental beds — happens between April 1 and April 15, and contract renewal conversations begin in mid-August for the following winter.",
    ]),
    mistakes_long: p([
      "The most common mistake Langley property owners make is signing an ambiguous contract. Contracts that say 'plow after a snowfall' without defining trigger depth, response window, de-icing scope, or de-icer product are effectively unenforceable, and every ambiguity resolves against the property owner when a claim is filed. PlowWow's Langley contracts define trigger depth in centimetres, response window in minutes, de-icing product by name and application rate, and documentation delivery within a stated timeline. If your current contract does not, treat it as no contract at all.",
      "The second mistake is choosing a contractor based on price alone. A $1,800 seasonal strata quote and a $4,200 seasonal strata quote are not the same product delivered at different margins — they are different products entirely. The lower quote almost always excludes de-icing, excludes documentation, excludes response guarantees, and reserves the right to skip visits during 'unusual' events, which is Langley's shorthand for 'the events that actually matter.' The Strata Property Act does not accept 'we chose the cheapest option' as a defence.",
      "The third mistake is not communicating with residents. Willoughby, Walnut Grove, and Willowbrook townhome strata councils that email residents by 5:00 PM the evening before an event get 80% overnight parking compliance and clean, efficient morning service. Councils that do not communicate get vehicles parked on drive aisles, plow trucks unable to complete routes, and a 7:00 AM chorus of complaints. This is a governance problem, not a contractor problem, and it is solved with one email.",
      "The fourth mistake is assuming rock salt is enough. Below -8°C, rock salt does nothing except add crystalline grit to a frozen surface. Langley has multi-day stretches every winter below -10°C, and any Langley property still relying on a single 20 kg bag of Home Depot rock salt during those stretches is running a legal experiment the courts have already concluded.",
      "The fifth and most expensive mistake is waiting until after an event to call a contractor. By the time you have snow on the ground and a warning issued, every seasonal-contract slot in Langley is filled and the phones at every reputable contractor are ringing continuously. The correct time to sign a Langley seasonal contract is September 1 through October 15. The wrong time is 4:00 AM on a Monday morning in January.",
    ]),
    testimonials: [
      {
        name: "Sandra M.",
        role: "Strata Council President",
        neighbourhood: "Willoughby",
        rating: 5,
        quote: "We moved to PlowWow after two winters of missed 6 AM commitments from our previous contractor. First storm they were on-site at 3:30 AM, drive aisles clear before residents left for work, and we had a full incident log in our council inbox by noon. That log alone saved us in a slip-and-fall claim eight months later.",
      },
      {
        name: "David C.",
        role: "Commercial Property Manager",
        neighbourhood: "200th Street corridor",
        rating: 5,
        quote: "We manage 340,000 sq ft across four Willowbrook and Walnut Grove sites. PlowWow's brine pre-treatment on the night before a forecast event has changed our tenant-complaint volume from a monthly issue to a non-issue. Their crews know our loading-dock schedule better than some of our tenants do.",
      },
      {
        name: "Karen T.",
        role: "Homeowner",
        neighbourhood: "Brookswood",
        rating: 5,
        quote: "Long driveway, mature cedars, elderly parents at home. I need someone reliable who will actually show up when it snows on a Sunday night. PlowWow has cleared us twice before 7 AM this season without me having to call. That is what a seasonal contract is supposed to feel like.",
      },
    ],
  },
};

export const getLocationDeep = (slug: string): LocationDeepData | undefined =>
  LOCATIONS[slug];
