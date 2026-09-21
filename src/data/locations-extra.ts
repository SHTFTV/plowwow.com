Warning: truncated output (original token count: 42588)
Total output lines: 1245

// OnlyStrata deep data — Burnaby, Surrey, Richmond, Coquitlam, North Vancouver.
// Each entry provides ~2,500 words of unique local prose that, combined with
// the CityDeepDive component (weather, map, transit, landmarks, bylaw,
// pricing, FAQ, testimonials) and the existing buildCityCopy narrative,
// pushes rendered word counts on every city page past the 5,800-word bar.

import type { LocationDeepData } from "./locations";

const p = (paragraphs: string[]) => paragraphs.join("\n\n");

export const LOCATIONS_EXTRA: Record<string, LocationDeepData> = {
  burnaby: {
    slug: "burnaby",
    city: "Burnaby",
    region: "Metro Vancouver",
    lat: 49.2488,
    lng: -122.9805,
    phone: "604-761-1518",
    email: "info@plowwow.com",
    avg_annual_snowfall_cm: 52,
    snow_season_start: "November",
    snow_season_end: "March",
    freeze_thaw_cycles: 24,
    terrain_note:
      "Burnaby is defined by two ridges — Burnaby Mountain in the north (rising to 370 m at SFU) and Central Park / Metrotown's plateau in the south — separated by the Still Creek and Brunette River lowlands. That 350-metre vertical range across a 90 km² city means the freezing level frequently splits Burnaby in half: SFU and Forest Grove hold snow while Edmonds and Big Bend see plain rain from the same storm system.",
    snowfall_note:
      "Burnaby's official average of 52 cm annual snowfall understates the reality on Burnaby Mountain, where SFU records routinely exceed 90 cm and closures are declared 3–5 times per winter. The elevation gradient produces the region's most extreme intra-city variability — a single portfolio manager with sites in Metrotown, Brentwood, and University Highlands is effectively managing three different climates on the same storm night.",
    strata_note:
      "Burnaby has the highest strata density in Metro Vancouver outside downtown Vancouver — more than 950 registered strata corporations covering everything from 1970s Metrotown low-rises to the Amazing Brentwood towers and the massive Lougheed Town Centre master-planned communities. Section 72 of the BC Strata Property Act places common-property snow and ice clearing squarely on the strata corporation, and Burnaby's council culture is unusually litigious about slip-and-fall claims because insurer pressure has intensified since 2021.",
    commercial_note:
      "Burnaby hosts three distinct commercial engines: the Metrotown / Kingsway retail corridor (Metropolis at Metrotown, Crystal Mall, Station Square), the Brentwood / Willingdon business belt (The Amazing Brentwood, Solo District, Willingdon office towers), and the Big Bend / Marine Way industrial and logistics zone. Each has a different overnight rhythm — retail needs 5:00 AM readiness, office needs 7:00 AM, and Big Bend logistics operates 24 hours and cannot afford dock closures.",
    residential_note:
      "Residential Burnaby ranges from Buckingham Heights and Deer Lake's estate lots, to Capitol Hill's mid-century bungalows on 10–12% grades, to Forest Grove and University Highlands with their SFU-adjacent driveways that see the worst grade-plus-elevation snow retention in the city. Equipment choices vary block by block — a plow truck that clears Metrotown flat lots efficiently is the wrong tool for a 14% Capitol Hill driveway with a hairpin approach.",
    bylaw: {
      rule: "Property owners must clear snow and ice from sidewalks adjacent to their property by 10:00 AM the day following a snowfall.",
      authority: "City of Burnaby Street and Traffic Bylaw 1961, No. 5106",
      fine: "Up to $2,000 per offence plus municipal clearing costs charged to the property tax roll",
      link: "https://www.burnaby.ca",
    },
    weather_api: {
      lat: 49.2488,
      lng: -122.9805,
      environment_canada_url: "https://weather.gc.ca/city/pages/bc-9_metric_e.html",
      open_meteo_url:
        "https://api.open-meteo.com/v1/forecast?latitude=49.2488&longitude=-122.9805&current=temperature_2m,weather_code,snowfall&temperature_unit=celsius",
    },
    landmarks: [
      { name: "Metropolis at Metrotown", lat: 49.2266, lng: -123.0038, type: "commercial" },
      { name: "Simon Fraser University", lat: 49.2781, lng: -122.9199, type: "institution" },
      { name: "The Amazing Brentwood", lat: 49.2666, lng: -123.0018, type: "commercial" },
      { name: "Burnaby City Hall", lat: 49.2494, lng: -122.9805, type: "government" },
      { name: "Deer Lake Park", lat: 49.2367, lng: -122.9542, type: "park" },
      { name: "Lougheed Town Centre", lat: 49.2481, lng: -122.8973, type: "commercial" },
      { name: "BCIT Burnaby Campus", lat: 49.2497, lng: -123.0021, type: "institution" },
    ],
    transit_routes: [
      { route: "Millennium Line", corridor: "VCC-Clark — Lougheed via Brentwood, Gilmore, Holdom", operator: "TransLink" },
      { route: "Expo Line", corridor: "Metrotown — Edmonds — 22nd Street", operator: "TransLink" },
      { route: "R5 Rapid Bus", corridor: "Hastings — SFU", operator: "TransLink" },
      { route: "144", corridor: "Metrotown — SFU (winter chain-up dependent)", operator: "TransLink" },
      { route: "130", corridor: "Metrotown — Kootenay Loop via Willingdon", operator: "TransLink" },
    ],
    google_business_pin: {
      name: "PlowWow Snow Removal Burnaby",
      maps_url: "https://maps.google.com/?q=PlowWow+Snow+Removal+Burnaby+BC",
      embed_query: "PlowWow+Snow+Removal+Burnaby+BC",
    },
    neighbourhoods: [
      { name: "Metrotown", note: "Metro Vancouver's densest strata cluster outside downtown. Underground parkade entrances, ramp de-icing, and 5:00 AM retail readiness at Metropolis and Station Square are non-negotiable." },
      { name: "Brentwood", note: "The Amazing Brentwood and Solo District generate the highest overnight foot-traffic in north Burnaby. Plaza-level walkways, transit-plaza approaches, and mid-rise podium entries all sit on one integrated route." },
      { name: "Lougheed", note: "Master-planned Lougheed Town Centre towers plus the older City in the Park strata blocks. Coordination with property managers begins 24 hours before every warning." },
      { name: "SFU / University Highlands", note: "Burnaby's alpine problem child. Snow events at 370 m are 2–3× the accumulation of Metrotown, and Gaglardi Way switchbacks require chained equipment and pre-brine treatment on the shoulder days." },
      { name: "Capitol Hill", note: "Steep 10–14% residential grades north of Hastings. Half-ton plow trucks with chain kits and calcium-chloride pre-treatment; standard skid-steer routes are not workable here." },
      { name: "Big Bend / Marine Way", note: "24-hour industrial and logistics. Loading dock approaches, trailer aprons, and heavy-truck lanes require larger fleet iron (loaders with pushers) and continuous coverage during events." },
      { name: "Deer Lake", note: "Heritage estates with long private driveways, mature ornamentals, and City-owned parkland edges. Rock salt is restricted along parkland frontages — magnesium chloride only." },
      { name: "Edmonds", note: "Older strata low-rise inventory plus new tower development around Highgate. Mixed-age infrastructure, aging drainage, and tight visitor-parking constraints." },
    ],
    faq: [
      {
        q: "What is the snow clearing bylaw in Burnaby?",
        a: "City of Burnaby Street and Traffic Bylaw 1961, No. 5106 requires every property owner — including strata corporations, commercial landlords, and detached homeowners — to clear snow and ice from the sidewalks adjacent to their property by 10:00 AM the day following a snowfall event. Enforcement is complaint-driven but has become more aggressive since 2020, with bylaw officers issuing tickets up to $2,000 per offence and adding municipal clearing costs to the property tax roll where compliance is repeatedly missed. For strata corporations, this bylaw duty runs in parallel with Section 72 of the BC Strata Property Act, which imposes an independent statutory obligation to keep common property safe.",
      },
      {
        q: "How does PlowWow handle Burnaby Mountain and SFU-area properties?",
        a: "Burnaby Mountain is treated as a separate operational zone. Our SFU-adjacent seasonal contracts include chain-fitted equipment staged at the base of Gaglardi Way, pre-event brine treatment on driveway approaches at Forest Grove and University Highlands, and coordinated dispatch with SFU Facilities when campus closures are declared. Response windows on the mountain are longer than at sea level — typically 60–90 minutes rather than 30–45 — because chain fitting and grade management are mandatory. Any strata or commercial property above 200 m elevation should assume alpine-grade service standards, not coastal ones.",
      },
      {
        q: "Do you service Metrotown high-rise strata parkades?",
        a: "Yes. Metrotown parkade ramp de-icing is one of our highest-volume Burnaby services. We use pre-applied liquid calcium chloride on ramp aprons the night before a forecast event, follow with granular treatment at first light, and provide dedicated walk-behind salter passes on the pedestrian entries at Beresford, Kingsborough, and the Kingsway plazas. Underground parkade compliance under the BC Building Code requires that ramp aprons remain traction-safe during business hours, and our documentation is designed to satisfy strata insurer audits.",
      },
      {
        q: "What is the average snowfall in Burnaby BC?",
        a: "Burnaby averages 52 cm of annual snowfall citywide, but that number is essentially meaningless without elevation context. Metrotown at 60 m and Edmonds at 30 m see closer to 35–40 cm. Brentwood and Willingdon corridor at 120–150 m see the citywide average. Capitol Hill and Deer Lake at 180–240 m see 60–70 cm. Forest Grove and University Highlands at 300–370 m see 90+ cm and can accumulate more than 30 cm in a single event. Portfolio managers with sites at multiple elevations need contract terms that recognize this variability.",
      },
      {
        q: "How quickly can PlowWow respond in Burnaby?",
        a: "Seasonal-contract clients in low-elevation Burnaby (Metrotown, Brentwood, Edmonds, Big Bend) receive priority dispatch with typical response times under 45 minutes from trigger confirmation. Mid-elevation zones (Deer Lake, Capitol Hill, Lougheed) run 45–75 minutes. Burnaby Mountain (Forest Grove, University Highlands, SFU-adjacent) runs 60–90 minutes because of chain-up requirements. Per-visit callers during major events are served on a best-effort basis and can expect 4–8 hour response windows — an unacceptable exposure for any strata or commercial property.",
      },
      {
        q: "Does PlowWow service commercial properties along Kingsway and Willingdon?",
        a: "Yes — the Kingsway corridor from Boundary east to Edmonds and the Willingdon corridor from Marine Way to SFU are two of our densest commercial routes. We serve retail centres, auto dealerships along the Boundary Road strip, medical office plazas near Burnaby Hospital, mixed-use towers at Brentwood and Metrotown, and light-industrial properties along Douglas Road and Beta Avenue. Contracts scale from single-tenant retail pads at $3,500 seasonal to full mixed-use podium contracts exceeding $22,000 seasonal.",
      },
      {
        q: "What de-icers does PlowWow use in Burnaby parkland-adjacent properties?",
        a: "Burnaby's parkland network (Deer Lake, Central Park, Burnaby Lake, Robert Burnaby Park, and the Brunette River corridor) is protected under municipal water-quality bylaws, and the City monitors chloride runoff at multiple points. Along parkland frontages we use magnesium chloride and acetate-based de-icers rather than sodium chloride, and application rates are calibrated to the current pavement temperature rather than a blanket dose. Documented product tracking is a standard part of every seasonal contract that includes parkland-frontage exposure.",
      },
      {
        q: "Do you offer strata-council reporting for Burnaby buildings?",
        a: "Every Burnaby seasonal contract includes GPS-verified equipment tracks, per-visit timestamped photos, product application rates by area, and an incident summary email delivered to the property manager within 24 hours of each event. Councils that later face slip-and-fall or WorkSafeBC claims can reproduce the full event record from these logs. The BC Strata Property Act and the Occupiers Liability Act both weigh 'reasonable care' by what a party can prove, not what a party remembers.",
      },
    ],
    pricing: {
      residential_seasonal: "$500 – $1,100",
      strata_seasonal: "$3,000 – $8,000 typical; complex sites quoted separately",
      commercial_seasonal: "$3,800 – $22,000",
      per_visit: "$125+ with 5-visit booking; on-call $150+; salting-only 50% of snow rate + product",
      de_ice_treatment: "$55 – $145",
    },
    comparison_table: {
      competitors: ["DIY / Building Staff", "General Landscaper", "National Facilities Vendor"],
      factors: [
        "Response Time (by elevation)",
        "24/7 Dispatch",
        "Liability Insurance ≥ $5M",
        "Strata Property Act Documentation",
        "Fixed Seasonal Pricing",
        "Elevation-Adjusted Fleet",
        "Parkade Ramp Protocols",
        "Parkland-Safe De-Icers",
        "Fleet Redundancy",
      ],
    },
    internal_links: ["surrey", "coquitlam", "richmond", "north-vancouver", "new-westminster", "vancouver"],
    external_authority_links: [
      { label: "City of Burnaby Bylaws", url: "https://www.burnaby.ca" },
      { label: "Environment Canada — Burnaby / Vancouver", url: "https://weather.gc.ca/city/pages/bc-9_metric_e.html" },
      { label: "BC Strata Property Act", url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/98043_00" },
      { label: "Occupiers Liability Act BC", url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96337_01" },
      { label: "TransLink", url: "https://www.translink.ca" },
      { label: "SFU Snow Closure Policy", url: "https://www.sfu.ca/security/sfuroadconditions.html" },
    ],
    intro_long: p([
      "Snow removal in Burnaby is fundamentally an elevation problem disguised as a weather problem. The city spans from tidewater at Big Bend to 370 metres at the Simon Fraser University campus on Burnaby Mountain, and the freezing level on a typical Metro Vancouver winter storm slices through Burnaby somewhere between 100 and 250 metres. That single geographic fact means a property manager with sites in Metrotown, Brentwood, and University Highlands is not managing one city — they are managing three climates that require different equipment, different products, different response windows, and different insurance postures.",
      "The second thing Burnaby does differently than the rest of Metro Vancouver is density. With more than 950 registered strata corporations packed into 90 km², Burnaby has the highest strata concentration in the region outside downtown Vancouver, and its council culture has grown notably more risk-conscious since 2021 as insurers have tightened deductibles and refused renewals for corporations without documented snow-and-ice programs. Metrotown alone contains dozens of high-rise strata podiums where a single missed 6:00 AM ramp de-ice can trigger a five-figure insurance claim, and the phrase 'reasonable care' under the Occupiers Liability Act has come to mean, in practice, a professional contract with a documented log.",
      "The third defining factor is transit density. Burnaby is served by both the Millennium Line and the Expo Line, plus the R5 Rapid Bus to SFU, the 144 mountain shuttle, and the 130 Willingdon workhorse. TransLink station approaches, bus stops, and Rapid Bus platforms all have de facto pedestrian-load standards that far exceed what a strata sidewalk sees on a normal weekday morning. A property abutting a Millennium Line station entrance is not being asked to clear a sidewalk for its residents — it is being asked to clear it for 30,000 commuter boardings a day, and the courts have begun to reflect that in duty-of-care rulings.",
      "The fourth factor is commercial complexity. The Metrotown and Brentwood retail engines run on 5:00 AM readiness windows; the Willingdon and Boundary office towers on 7:00 AM occupancy; Big Bend on 24-hour logistics with no dock closure tolerance. Fitting all three into a single overnight route rotation requires dispatch discipline that a general landscaping contractor simply does not have. Burnaby is where equipment redundancy — spare skid steers, backup salter routes, second-truck coverage — either shows up or gets exposed on the first big storm.",
      "Finally, Burnaby has become a documentation-first city. Under a 2018 amendment cycle to Bylaw No. 5106 and follow-on enforcement guidance, the City has moved to fine assessments up to $2,000 per offence with clearing costs added to the property tax roll for repeat non-compliance. Strata insurers, in turn, now request event-level documentation as part of renewal underwriting. PlowWow's Burnaby contracts are built around that reality: every visit is GPS-logged, every product application is recorded, and every incident summary is delivered to the property manager within 24 hours.",
    ]),
    conditions_long: p([
      "Burnaby's winter weather is a three-way collision between coastal Pacific moisture, Fraser Valley outflow, and Burnaby Mountain's orographic lift. Coastal storms deliver most of Burnaby's precipitation volume, but at the elevations of Forest Grove, University Highlands, and the SFU campus, that precipitation frequently arrives as heavy wet snow while Metrotown is receiving plain rain from the identical system. Orographic lift on the west and south flanks of Burnaby Mountain can double the snowfall totals recorded at the mountain top compared to the lowland stations that Environment Canada uses for citywide reporting.",
      "The 24 freeze-thaw cycles Burnaby averages each winter are the real operational driver, not the 52 cm headline snowfall number. Each cycle produces black ice at dawn on parking-lot slopes, stair risers, and ramp aprons that were wet at midnight. Black ice cannot be plowed away; it can only be pre-empted with liquid brine or reactive granular de-icer, and the timing of that treatment is the single largest predictor of whether a Burnaby property will finish a winter with zero slip-and-fall claims or with three.",
      "Arctic outflow events add a second overlay. When cold air spills west out of the Fraser Canyon and settles on the valley floor, Burnaby's lowlands cool faster than the coastline while the mountain top holds a persistent inversion. During outflow, Metrotown can be -8°C at 6:00 AM while SFU registers -4°C at the summit and Deer Lake sits somewhere between. These are the events during which sodium chloride stops working and any Burnaby contractor still operating on a rock-salt-only product mix begins to fail visibly.",
      "Rain-on-snow events are Burnaby's insurance-claim generator. When a Pacific system arrives on day three of an outflow — a pattern that repeats roughly six to ten times per winter — rain lands on frozen ground and freezes on contact, producing glaze ice across parking lots, ramps, plazas, and transit platforms. This is the exposure that most under-invested contractors fail to price and that most Burnaby strata councils do not fully understand until they have their first six-figure claim. PlowWow's crews stay on rotation for the entire storm arc, including the tail-end refreeze window, because the visible snow is not the risk — the invisible 3 mm of glaze ice on day three is.",
      "The Burnaby snow season practically begins November 1 and runs through March 31. Cold-air advisories start in the first week of November. The first accumulating event most years lands between November 15 and December 10. Peak accumulation runs from late December through mid-February, and March is the wildcard — Burnaby has recorded 25 cm March events and 18°C March thaws in the same week. Any seasonal contract that begins on December 1 or ends on February 28 is leaving weeks of documented exposure uncovered.",
      "Environment Canada issues Winter Storm Warnings, Snowfall Warnings, and Arctic Outflow Warnings for Metro Vancouver on independent triggers, and PlowWow's operations desk monitors all three continuously from November 1. When a warning affects Burnaby, seasonal-contract clients are notified by 6:00 PM the evening before, brine pre-treatment begins by 10:00 PM at Metrotown parkades and SFU-adjacent driveways, and full crew staging is complete by 3:00 AM on event morning. That timeline is the minimum operational standard for any Burnaby strata, medical, or retail property that wants to be defensible in a slip-and-fall file.",
    ]),
    prep_long: p([
      "Burnaby preparation begins October 1, not December 1. By mid-October, our operations team has walked every seasonal-contract site, catalogued grade changes, marked drainage inlets, tagged hazard obstacles hidden under fall leaves, mapped parkade ramp aprons for pre-brine coverage, and photographed every stair riser and accessibility ramp with dated exposure so that any subsequent damage claim can be evidenced from a defensible baseline. On Metrotown and Brentwood high-rises we also confirm parkade gate schedules and after-hours access protocols with building operations.",
      "By November 1, brine tanks are filled at our Burnaby staging locations, granular product is pre-positioned in on-site bins for owner top-up between visits, incident-log software is provisioned per property manager, and 24/7 dispatch numbers are distributed to strata councils. Any Burnaby property that has not signed a seasonal contract by November 1 is at real risk of losing priority access during the season's first storm — by the second week of November, most reputable contractors are at capacity, and by the third week they are refusing new sign-ups.",
      "When Environment Canada issues a snowfall or outflow warning, seasonal-contract clients receive a same-day written notice by email or SMS with the forecast window, expected dispatch timeline, elevation-specific expectations, and tenant-communication guidance. For Metrotown and Brentwood towers we provide a resident-notice template that strata managers can send at 5:00 PM the evening before. For Big Bend logistics tenants we coordinate with dock schedulers to minimize truck-lane closures during peak plowing.",
      "During a major event, Burnaby routes are structured by elevation. Low-elevation Metrotown, Brentwood, Edmonds, and Big Bend are cleared first with 5:00 AM readiness. Mid-elevation Deer Lake, Capitol Hill, and Lougheed follow on 6:30–7:00 AM windows. High-elevation Forest Grove and University Highlands run on a mountain-dedicated rotation with chained equipment. All routes revisit every 6–8 hours through the event, and every visit is GPS-logged and photographed.",
      "In the 48 hours after a heavy storm, priority shifts from plowing to ice management. North-facing walkways, shaded parkade aprons, and low-lying accessibility ramps refreeze first and are the top slip-and-fall risk on days two and three. PlowWow crews revisit every Burnaby seasonal site during this window regardless of forecast. Spring cleanup — brine tank flushing, salt-residue washdown along heritage frontages, parkland-adjacent ornamental bed rinsing — happens April 1 to April 15, and contract renewals begin in mid-August.",
    ]),
    mistakes_long: p([
      "The most common Burnaby mistake is treating the city as one climate. A single seasonal contract that treats Metrotown, Deer Lake, and SFU-adjacent properties as interchangeable will underserve at least one of them, usually the mountain site, because the equipment and response window for a 60 m parkade approach is not the equipment and response window for a 340 m driveway on a 12% grade. Elevation-adjusted contracts are the professional standard here, and any quote that does not break out mountain properties separately is a warning sign.",
      "The second mistake is signing rock-salt-only agreements. Burnaby has multi-day stretches every winter below -8°C during outflow events when sodium chloride simply stops working, and above 150 m of elevation those stretches occur more often and last longer. A Burnaby contract that specifies 'salt as required' without listing calcium chloride, magnesium chloride, and brine is a contract that fails during exactly the events that matter most.",
      "The third mistake is ignoring transit exposure. Burnaby properties adjacent to Millennium Line and Expo Line station approaches, R5 Rapid Bus platforms, and 144 mountain-shuttle stops face materially higher slip-and-fall exposure than interior residential properties because pedestrian volumes are 10–50× higher. Transit-adjacent frontages need first-priority dispatch and documented product application; they should never share a service window with an interior visitor-parking lot.",
      "The fourth mistake is under-communicating with residents. Metrotown, Brentwood, and Lougheed strata councils that email residents by 5:00 PM the evening before an event get 80%+ overnight parking compliance, clean plow routes, and efficient morning service. Councils that do not communicate get vehicles parked on drive aisles, plow trucks unable to complete their routes, and a 7:00 AM chorus of complaints that then get re-routed to the contractor as though the failure were operational rather than governance-driven.",
      "The fifth mistake is waiting until after the first event to call a contractor. Burnaby seasonal capacity is filled between September 1 and October 15. By the first snowfall warning of the season, every reputable contractor is at book, and the properties that reach out on the morning of an event end up on a per-visit list with 6-hour response windows and no documentation — which is to say, with none of the protection that a seasonal contract exists to provide.",
      "The sixth and most quietly expensive mistake is under-documenting. Burnaby's insurer market has hardened. Corporations without event-level documentation are seeing premium increases of 25–60% at renewal, and a small but growing number have been non-renewed outright. Every PlowWow Burnaby visit generates a GPS-verified track, timestamped photos, and a per-product application record; that data package has become as important as the plowing itself.",
    ]),
    testimonials: [],
  },

  surrey: {
    slug: "surrey",
    city: "Surrey",
    region: "Metro Vancouver / Fraser Valley",
    lat: 49.1913,
    lng: -122.849,
    phone: "604-761-1518",
    email: "info@plowwow.com",
    avg_annual_snowfall_cm: 48,
    snow_season_start: "November",
    snow_season_end: "March",
    freeze_thaw_cycles: 22,
    terrain_note:
      "Surrey is the largest municipality in Metro Vancouver by area (317 km²) and spans dramatic terrain — from Boundary Bay tidelands at sea level in South Surrey, up the Panorama Ridge and Newton plateau at 90–110 m, across the Serpentine and Nicomekl river bottoms, and into North Surrey and Guildford's ridges. That geographic spread means Surrey routinely experiences three distinct snow regimes on the same night.",
    snowfall_note:
      "Surrey averages 48 cm of snowfall annually citywide, with Cloverdale, Panorama Ridge, and North Surrey seeing above-average totals while South Surrey and White Rock frontages often stay in the 30 cm range. Surrey's exposure to Fraser Valley outflow — funnelled west through Langley and pooling on the Cloverdale flats — makes it one of Metro Vancouver's most reliable freezing-rain zones.",
    strata_note:
      "Surrey hosts more than 850 strata corporations and adds roughly 40 new registrations every year — the fastest strata growth rate in BC. Council governance ranges from experienced Guildford high-rise boards to first-year Clayton Heights townhome councils navigating their first winter contract. The BC Strata Property Act Section 72 duty applies identically to all of them, and slip-and-fall exposure at newer Clayton and Grandview Heights complexes has become a top-three insurer concern.",
    commercial_note:
      "Surrey's commercial density is anchored by four town centres — Guildford, Newton, Fleetwood, and Cloverdale — plus the emerging Surrey City Centre downtown at King George Boulevard and 104 Avenue. Add the Campbell Heights industrial expansion, the Port Kells / Highway 17 logistics belt, and the medical corridor around Surrey Memorial Hospital and PlowWow dispatches more commercial equipment across Surrey than across any other Metro city.",
    residential_note:
      "Surrey's residential fabric ranges from Ocean Park's estate lots on Boundary Bay to Newton's 1980s rancher blocks, Fleetwood's mid-century split-levels, Cloverdale's heritage cottages, Clayton Heights' new townhome corridors, and Fraser Heights' hillside estates. Each demands a different equipment mix, and the notion of a 'standard Surrey route' has been obsolete since 2015.",
    bylaw: {
      rule: "Property owners must clear snow and ice from adjacent public sidewalks by 10:00 AM the day following a snowfall.",
      authority: "City of Surrey Traffic Bylaw, 1997, No. 13007",
      fine: "Up to $500 per offence; municipal clearing costs recoverable against the property",
      link: "https://www.surrey.ca",
    },
    weather_api: {
      lat: 49.1913,
      lng: -122.849,
      environment_canada_url: "https://weather.gc.ca/city/pages/bc-50_metric_e.html",
      open_meteo_url:
        "https://api.open-meteo.com/v1/forecast?latitude=49.1913&longitude=-122.849&current=temperature_2m,weather_code,snowfall&temperature_unit=celsius",
    },
    landmarks: [
      { name: "Guildford Town Centre", lat: 49.1897, lng: -122.8038, type: "commercial" },
      { name: "Central City / SFU Surrey", lat: 49.1878, lng: -122.8496, type: "institution" },
      { name: "Surrey City Hall", lat: 49.1913, lng: -122.849, type: "government" },
      { name: "Surrey Memorial Hospital", lat: 49.176, lng: -122.842, type: "institution" },
      { name: "Cloverdale Fairgrounds", lat: 49.1044, lng: -122.7266, type: "venue" },
      { name: "Grandview Corners", lat: 49.048, lng: -122.803, type: "commercial" },
      { name: "Bear Creek Park", lat: 49.1743, lng: -122.836, type: "park" },
    ],
    transit_routes: [
      { route: "Expo Line", corridor: "King George — Gateway — Surrey Central — Scott Road", operator: "TransLink" },
      { route: "R1 Rapid Bus", corridor: "King George — Guildford — Newton", operator: "TransLink" },
      { route: "R6 Rapid Bus", corridor: "Surrey Central — Fraser Highway — Langley", operator: "TransLink" },
      { route: "96 B-Line", corridor: "King George Blvd — Newton — Guildford", operator: "TransLink" },
      { route: "319", corridor: "Scott Road Station — Newton Exchange", operator: "TransLink" },
    ],
    google_business_pin: {
      name: "PlowWow Snow Removal Surrey",
      maps_url: "https://maps.google.com/?q=PlowWow+Snow+Removal+Surrey+BC",
      embed_query: "PlowWow+Snow+Removal+Surrey+BC",
    },
    neighbourhoods: [
      { name: "Guildford", note: "Guildford Town Centre plus the surrounding office and medical strip. High retail-frontage exposure and Expo Line station approach coverage." },
      { name: "Newton", note: "Dense mixed-use with Newton Exchange as the transit anchor. 96 B-Line and R1 stop frontages need first-priority dispatch." },
      { name: "Cloverdale", note: "Heritage downtown plus expanding Clayton Heights townhome corridors east of 184 Street. Fraser Valley outflow lands here first." },
      { name: "Fleetwood", note: "Mature residential plus the Fleetwood Town Centre station area under Surrey-Langley SkyTrain construction — traffic patterns shift weekly." },
      { name: "South Surrey", note: "Ocean Park, Morgan Heights, Grandview Heights. Lower snowfall totals but heavy freezing-rain exposure on ocean-facing frontages." },
      { name: "Fraser Heights", note: "Hillside estates north of 96 Avenue with grade-adjusted driveways. Half-ton plow trucks and calcium-chloride pre-treatment mandatory." },
      { name: "Clayton Heights", note: "New townhome corridors along 188 Street and 72 Avenue. First-year strata councils; contract education is part of every onboarding." },
      { name: "Panorama Ridge", note: "Elevation 90–110 m; consistently 15–20% above the Surrey citywide snowfall average." },
    ],
    faq: [
      { q: "What is the Surrey snow-clearing bylaw?", a: "City of Surrey Traffic Bylaw No. 13007 requires property owners — including strata corporations and commercial landlords — to clear snow and ice from adjacent public sidewalks by 10:00 AM the day following a snowfall event. Fines are up to $500 per offence, and the City reserves the right to clear non-compliant frontages and add costs to the property tax roll. Strata corporations also carry a parallel Section 72 duty under the BC Strata Property Act to keep common property safe, regardless of the bylaw threshold." },
      { q: "How does PlowWow handle Cloverdale and Clayton Heights?", a: "Cloverdale and Clayton Heights are our densest East Surrey routes. Contracts include drive-aisle plowing across townhome complexes, visitor-parking clearing coordinated with strata parking policies, walkway shovelling on stairs and mail-kiosk approaches, and granular plus liquid de-icing calibrated to elevation. Clayton Heights sits high enough on the Panorama Ridge plateau to accumulate 15–20% more snow than downtown Surrey on the same event." },
      { q: "Do you serve Surrey Memorial Hospital properties?", a: "Yes — the Surrey Memorial Hospital medical corridor along King George and 96 Avenue is a high-priority zone. Contracts here run to hospital-grade standards: 24/7 dispatch, documented walkway de-icing on ambulance-bay approaches, accessibility-ramp clearing at first light, and event-level photo documentation. Medical properties in Surrey have a duty of care that exceeds the standard commercial threshold, and our documentation is designed to reflect that." },
      { q: "How quickly do you respond in Surrey?", a: "Seasonal-contract clients across Surrey receive priority dispatch with typical response times of 45–75 minutes from trigger confirmation, depending on the town centre. Guildford, Newton, and Central City are fastest at under 45 minutes; Cloverdale, Clayton, and Fraser Heights run 60–90 minutes because of geography. Per-visit callers during major events can expect 4–8 hour response times. Any strata or medical property should assume seasonal contracts are the only defensible option." },
      { q: "Does PlowWow service the Campbell Heights industrial park?", a: "Yes — Campbell Heights and the broader Highway 17 / Port Kells logistics belt are one of our priority commercial zones. We handle loading-dock apron plowing, trailer-yard lane clearing, and heavy-truck route de-icing across the Campbell Heights business park east of 192 Street. Contracts include continuous coverage during 24-hour logistics operations." },
      { q: "What is the average snowfall in Surrey BC?", a: "Surrey averages 48 cm of annual snowfall citywide, with meaningful variation by neighbourhood. South Surrey coastal areas run 30–35 cm; Newton and Fleetwood run 45–55 cm; Cloverdale, Clayton Heights, and Panorama Ridge run 55–70 cm; Fraser Heights runs 50–60 cm. The freeze-thaw cycle count (22 per winter) is a better predictor of slip-and-fall exposure than raw accumulation." },
      { q: "Do you offer strata-council documentation?", a: "Every Surrey seasonal contract includes GPS-verified equipment tracks, timestamped photos per visit, product application rates by area, and an incident summary email delivered to the strata manager within 24 hours. This documentation is designed to satisfy BC Strata Property Act reasonable-care thresholds and insurer renewal audits." },
      { q: "Can PlowWow handle Surrey Central and King George Boulevard commercial?", a: "Yes — the Central City / King George Boulevard corridor from Scott Road Station south to Newton Exchange is one of our densest commercial routes. We serve retail, office podiums, SFU Surrey approaches, transit-station frontages, and mixed-use towers at Gateway and Surrey Central. Expo Line station-approach clearing follows TransLink pedestrian-load standards." },
    ],
    pricing: {
      residential_seasonal: "$475 – $950",
      strata_seasonal: "$3,000 – $8,000 typical; complex sites quoted separately",
      commercial_seasonal: "$3,600 – $18,000",
      per_visit: "$125+ with 5-visit booking; on-call $150+; salting-only 50% of snow rate + product",
      de_ice_treatment: "$50 – $130",
    },
    comparison_table: {
      competitors: ["DIY / Handyman", "Landscaping Contractor", "National Facilities Vendor"],
      factors: [
        "Response Time by Town Centre",
        "24/7 Dispatch",
        "Liability Insurance ≥ $5M",
        "Strata Property Act Documentation",
        "Fixed Seasonal Pricing",
        "Fleet Redundancy",
        "Transit-Frontage Protocols",
        "Medical-Corridor Standards",
        "Documented Incident Log",
      ],
    },
    internal_links: ["langley", "burnaby", "delta", "white-rock", "coquitlam", "vancouver"],
    external_authority_links: [
      { label: "City of Surrey Bylaws", url: "https://www.surrey.ca" },
      { label: "Environment Canada — Surrey", url: "https://weather.gc.ca/city/pages/bc-50_metric_e.html" },
      { label: "BC Strata Property Act", url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/98043_00" },
      { label: "Occupiers Liability Act BC", url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96337_01" },
      { label: "TransLink", url: "https://www.translink.ca" },
      { label: "Surrey-Langley SkyTrain Project", url: "https://www.translink.ca/plans-and-projects/rapid-transit-projects/surrey-langley-skytrain" },
    ],
    intro_long: p([
      "Snow removal in Surrey is a geography problem before it is a weather problem. At 317 km² Surrey is by far the largest municipality in Metro Vancouver, and a single storm system can leave Ocean Park with 2 cm of wet accumulation while Cloverdale is buried under 18 cm of drifted powder and Clayton Heights is dealing with rain-on-snow glaze ice. Any contractor pricing a Surrey portfolio as though it were a single climate is either inexperienced or bidding on hope, and property managers who accept that pricing inherit the operational risk directly.",
      "The second defining feature of Surrey is strata growth. With more than 850 registered strata corporations and roughly 40 new registrations every year — the fastest strata growth rate in BC — Surrey has a large and growing cohort of first-year councils navigating their first winter without institutional memory. Clayton Heights, Grandview Heights, and Morgan Heights in particular are dominated by newer townhome complexes where the strata council may include no member with prior snow-contract experience. The BC Strata Property Act's Section 72 common-property duty applies to those councils on day one, and the learning curve during a January outflow event is expensive.",
      "The third factor is commercial density. Surrey's four traditional town centres — Guildford, Newton, Fleetwood, Cloverdale — combined with the emerging Surrey City Centre downtown at King George and 104 Avenue create a commercial footprint that rivals downtown Vancouver's on a floor-area basis. Add Campbell Heights, …22588 tokens truncated…r snow and ice from adjacent public sidewalks by 10:00 AM the day following a snowfall.",
      authority: "City of Surrey Traffic Bylaw, 1997, No. 13007",
      fine: "Up to $500 per offence; municipal clearing costs recoverable against the property",
      link: "https://www.surrey.ca",
    },
    weather_api: {
      lat: 49.0492,
      lng: -122.7486,
      environment_canada_url: "https://weather.gc.ca/city/pages/bc-50_metric_e.html",
      open_meteo_url:
        "https://api.open-meteo.com/v1/forecast?latitude=49.0492&longitude=-122.7486&current=temperature_2m,weather_code,snowfall&temperature_unit=celsius",
    },
    landmarks: [
      { name: "Campbell Heights Business Park", lat: 49.0492, lng: -122.7486, type: "commercial" },
      { name: "South Surrey Athletic Park", lat: 49.0533, lng: -122.7808, type: "venue" },
      { name: "Redwood Park", lat: 49.0386, lng: -122.7469, type: "park" },
      { name: "Highway 99 / 8 Avenue", lat: 49.0206, lng: -122.7997, type: "transit" },
      { name: "Grandview Corners", lat: 49.0478, lng: -122.8034, type: "commercial" },
    ],
    transit_routes: [
      { route: "531 Willowbrook", corridor: "24 Avenue / 32 Avenue", operator: "TransLink" },
      { route: "354 White Rock Centre", corridor: "Highway 99 / South Surrey", operator: "TransLink" },
      { route: "375 Guildford", corridor: "King George Boulevard", operator: "TransLink" },
    ],
    google_business_pin: {
      name: "PlowWow Snow Removal — Campbell Heights",
      maps_url: "https://www.google.com/maps/search/snow+removal+campbell+heights+surrey",
      embed_query: "Campbell Heights, Surrey, BC",
    },
    neighbourhoods: [
      { name: "Campbell Heights North", note: "Logistics and distribution facilities on large parcels." },
      { name: "Campbell Heights South", note: "Manufacturing, production and flex-industrial units." },
      { name: "192 Street Corridor", note: "Primary access and truck route into the park." },
      { name: "32 Avenue", note: "Business-park frontage and fleet access." },
      { name: "Grandview Heights (adjacent)", note: "Mixed commercial and strata development." },
    ],
    faq: [
      { q: "Do you provide snow removal in Campbell Heights?", a: "Yes. PlowWow provides 24/7 business-park and industrial snow removal, plowing, salting and de-icing across Campbell Heights, covering logistics facilities, manufacturing plants, warehouses and business-park stratas on fixed-price seasonal contracts." },
      { q: "Can you handle a park the size of Campbell Heights?", a: "Absolutely. Campbell Heights has expansive lots, long internal roads and heavy truck traffic. We stage large equipment locally and clear big sites fast to keep fleet, employee and loading access open through shift changes." },
      { q: "Does elevation make Campbell Heights worse for snow?", a: "It can. The park sits on higher South Surrey ground, so it catches and holds snow and ice while lower coastal areas stay wet. We plan earlier trigger depths and extra de-icing for that reason." },
      { q: "Do you document service for managers and insurers?", a: "Yes. Every visit is time-stamped with scope logged — the record property managers, business-park strata councils and insurers need to demonstrate reasonable care under Section 72." },
    ],
    pricing: {
      residential_seasonal: "N/A — Campbell Heights is a business park",
      strata_seasonal: "$5,000–$20,000 / season (business-park strata, by area)",
      commercial_seasonal: "$7,000–$45,000+ / season (large logistics & manufacturing)",
      per_visit: "$500–$3,000 / visit by site size",
      de_ice_treatment: "$350–$1,400 / application",
    },
    comparison_table: {
      competitors: ["PlowWow", "Generic landscaper", "Owner-operator with pickup"],
      factors: ["Large-lot loaders", "24/7 auto-dispatch", "Shift-change timing", "Documented service logs", "WorkSafeBC insured"],
    },
    internal_links: ["surrey", "white-rock", "port-kells", "vancouver", "burnaby"],
    external_authority_links: [
      { label: "City of Surrey — Snow & Ice", url: "https://www.surrey.ca" },
      { label: "Environment Canada — Surrey Forecast", url: "https://weather.gc.ca/city/pages/bc-50_metric_e.html" },
    ],
    intro_long: p([
      "Campbell Heights is South Surrey's industrial engine — one of the largest business parks in Metro Vancouver, laid out across the elevated plateau around 192 Street between 24th and 40th Avenue. Fulfilment centres, manufacturing plants, warehouses and fleet depots occupy very large parcels connected by long private roads, and many run multiple shifts. In winter, that scale is the whole story: a single snowfall blankets an enormous footprint that has to be cleared before the next crew arrives and the next truck rolls in.",
      "The park's elevation compounds the challenge. Campbell Heights sits high enough above the Semiahmoo lowlands that it catches and holds snow and ice while coastal South Surrey, only minutes downhill, stays merely wet. What reads as a light dusting on the news can be a genuine ice problem across the park's shaded internal roads and expansive lots.",
      "PlowWow runs Campbell Heights as a large-format industrial account: loaders and heavy plows staged locally, bulk de-icing pre-positioned, and clearing sequenced to the park's shift changes so fleet gates, employee lots and loading areas open on time.",
    ]),
    conditions_long: p([
      "Elevation and surface area define winter in Campbell Heights. Because the park sits on higher ground, snow arrives a little earlier, lingers a little longer, and refreezes more readily on shaded stretches of its long internal roads than in the coastal neighbourhoods below. The parcels are vast and largely treeless, so wind moves snow around and daytime melt refreezes overnight into ice across lots where trucks manoeuvre and staff walk between buildings.",
      "The operational reality is that even a modest accumulation covers acres. Clearing has to be both fast and large-format — you cannot service a Campbell Heights parcel with a pickup blade and finish before the shift change. Our routing accounts for the park's geography, treating the higher and shaded blocks as priority zones for early passes and repeat de-icing.",
      "We dispatch automatically at trigger depth and return for the refreeze, keeping contracted sites' critical access — gates, employee parking, loading — open around the operating clock rather than after it.",
    ]),
    prep_long: p([
      "Campbell Heights seasonal readiness is activated by early November. Bulk product is pre-positioned in on-site bins, brine is staged for pre-treatment ahead of forecast events, incident-log software is provisioned per property manager, and 24/7 dispatch numbers go out to site managers and business-park strata councils.",
      "Because the park's operations run on shifts, we map each site's timing and critical paths in advance — when the fleet leaves, when staff arrive, which loading areas run overnight — so crews clear in the order that keeps operations moving. Given the park's elevation and scale, sites that have not secured a seasonal contract by early November risk being unable to lock priority large-equipment coverage before the first event.",
    ]),
    mistakes_long: p([
      "The classic Campbell Heights mistake is underestimating scale — hiring for the footprint of a strip mall and discovering, mid-storm, that a single crew with light equipment cannot clear acres of business-park lot before the shift change. The result is blocked gates, un-plowed employee parking and freight backed up at the door.",
      "The second mistake is ignoring elevation and refreeze. Contractors used to coastal South Surrey treat Campbell Heights like the lowlands, clear once, and leave — missing the overnight ice that forms on the park's higher, shaded roads. The third is thin documentation: business-park strata councils and commercial managers carry the Section 72 duty of care, and when thousands of employees and visitors move through the park daily, a slip-and-fall claim without a service log is a serious exposure. Large-format equipment, elevation-aware timing, and documented visits are what a real Campbell Heights snow program requires.",
    ]),
    testimonials: [],
  },

  "walnut-grove": {
    slug: "walnut-grove",
    city: "Walnut Grove",
    region: "Metro Vancouver / Langley",
    lat: 49.1626,
    lng: -122.6412,
    phone: "604-761-1518",
    email: "info@plowwow.com",
    avg_annual_snowfall_cm: 50,
    snow_season_start: "November",
    snow_season_end: "March",
    freeze_thaw_cycles: 22,
    terrain_note:
      "Walnut Grove sits on the flat valley floor of northwest Langley, between the Fraser River and the Highway 1 corridor around 200 Street and 88 Avenue. It is one of Langley's most established family-residential communities — a dense fabric of townhouse strata complexes, single-family streets and the Walnut Grove Town Centre, all within a short drive of the Golden Ears and Port Mann crossings.",
    snowfall_note:
      "Walnut Grove averages roughly 50 cm of snow a year, typical for the Langley valley floor. Its exposure comes from Fraser Valley outflow, which funnels west along the Highway 1 corridor and reaches Walnut Grove's open residential streets and townhouse lots early in a cold snap, with freeze-thaw glazing shaded drive aisles overnight.",
    strata_note:
      "Walnut Grove is townhouse-strata country. Dozens of multi-unit complexes line 88 Avenue and the streets around Walnut Grove Town Centre, each governed by a council responsible under the BC Strata Property Act for keeping shared drive aisles, visitor parking and walkways reasonably clear. An icy visitor lot or un-cleared entry walk is a documented slip-and-fall liability the council owns.",
    commercial_note:
      "Walnut Grove Town Centre and the 88 Avenue retail strip give the neighbourhood a commercial core — grocery, medical and service plazas whose parking and entries need early clearing so residents keep safe access through winter.",
    residential_note:
      "This is a family neighbourhood first: single-family driveways, cul-de-sacs and townhouse complexes where residents walk kids to Walnut Grove Secondary and the community centre. Residential seasonal contracts keep driveways and walks clear before the morning school run.",
    bylaw: {
      rule: "Owners and occupiers must keep sidewalks adjacent to their property clear of snow and ice in a timely way after a snowfall.",
      authority: "Township of Langley Highway & Traffic Regulation Bylaw",
      fine: "Municipal clearing costs and penalties recoverable against the property",
      link: "https://www.tol.ca",
    },
    weather_api: {
      lat: 49.1626,
      lng: -122.6412,
      environment_canada_url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html",
      open_meteo_url:
        "https://api.open-meteo.com/v1/forecast?latitude=49.1626&longitude=-122.6412&current=temperature_2m,weather_code,snowfall&temperature_unit=celsius",
    },
    landmarks: [
      { name: "Walnut Grove Town Centre", lat: 49.1636, lng: -122.6432, type: "commercial" },
      { name: "Walnut Grove Community Centre", lat: 49.1601, lng: -122.6469, type: "venue" },
      { name: "Derek Doubleday Arboretum", lat: 49.1489, lng: -122.6386, type: "park" },
      { name: "Walnut Grove Secondary", lat: 49.1567, lng: -122.6448, type: "venue" },
      { name: "Highway 1 / 200 Street Interchange", lat: 49.1447, lng: -122.6636, type: "transit" },
    ],
    transit_routes: [
      { route: "555 Carvolth", corridor: "Highway 1 / Carvolth Exchange", operator: "TransLink" },
      { route: "562 Willoughby", corridor: "200 Street / 88 Avenue", operator: "TransLink" },
      { route: "501 Langley Centre", corridor: "Fraser Highway", operator: "TransLink" },
    ],
    google_business_pin: {
      name: "PlowWow Snow Removal — Walnut Grove",
      maps_url: "https://www.google.com/maps/search/snow+removal+walnut-grove+langley",
      embed_query: "Walnut Grove, Langley, BC",
    },
    neighbourhoods: [
      { name: "Walnut Grove Town Centre", note: "Retail & mixed-use core" },
      { name: "Forest Green", note: "Established townhouse stratas" },
      { name: "88 Avenue Corridor", note: "Family residential & strata" },
      { name: "Alex Hope", note: "School-area residential" },
      { name: "Yorkson (adjacent)", note: "New townhouse growth" },
    ],
    faq: [
      { q: "Do you provide snow removal in Walnut Grove?", a: "Yes. PlowWow provides snow removal, plowing, salting and de-icing throughout Walnut Grove in Langley, covering townhouse-strata drive aisles, visitor parking, walkways, driveways and common areas on fixed-price seasonal contracts, documented for strata councils." },
      { q: "Do you service townhouse and condo stratas in Walnut Grove?", a: "Absolutely. Walnut Grove is a residential-strata area, and strata councils here carry a duty under the BC Strata Property Act to keep common property reasonably clear of snow and ice. We handle shared drive aisles, visitor lots, walkways and parkade ramps, with a documented service record for each visit." },
      { q: "How fast do you respond after snowfall?", a: "We monitor local conditions and dispatch automatically once snow reaches trigger depth — no call needed. Seasonal strata and residential clients get priority response with a guaranteed clearing window on every storm, day or night." },
      { q: "What does a Walnut Grove seasonal contract cost?", a: "Pricing is fixed for the season and based on your property — driveway and drive-aisle length, visitor lot and walkway area, ramps and entries. One predictable price with no per-storm surprises, which makes it easy for strata councils to budget and approve." },
    ],
    pricing: {
      residential_seasonal: "$600–$1,400 / season",
      strata_seasonal: "$3,500–$14,000 / season (townhouse strata, by size)",
      commercial_seasonal: "$3,500–$12,000 / season (retail & office plazas)",
      per_visit: "$150–$600 / visit",
      de_ice_treatment: "$200–$500 / application",
    },
    comparison_table: {
      competitors: ["PlowWow", "Generic landscaper", "Owner-operator with pickup"],
      factors: ["Townhouse drive-aisle equipment", "24/7 auto-dispatch", "Walkway & ramp de-icing", "Documented service logs", "WorkSafeBC insured"],
    },
    internal_links: ["langley", "willoughby", "fort-langley", "vancouver", "burnaby"],
    external_authority_links: [
      { label: "Township of Langley — Snow & Ice", url: "https://www.tol.ca" },
      { label: "Environment Canada — Langley Forecast", url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html" },
    ],
    intro_long: p([
      "Walnut Grove is where northwest Langley raises its families. Established in the growth waves of the 1980s and 90s, it is a community of townhouse strata complexes, quiet residential streets and the compact Walnut Grove Town Centre — the kind of neighbourhood where the same council members manage the same complex for a decade and know every drive aisle by heart. In summer that continuity is invisible; in a snow event it becomes a liability map of shared surfaces that have to be kept safe.",
      "What defines winter here is the townhouse strata form. These are not single driveways but long shared drive aisles, visitor lots and walkway networks serving dozens of units — and the residents using them are families, seniors and kids walking to Walnut Grove Secondary. An un-cleared aisle does not just inconvenience; it strands residents and exposes the council to a slip-and-fall claim the morning after a storm.",
      "PlowWow runs Walnut Grove as a dedicated residential-strata route. We match equipment to townhouse geometry — compact plows and skid steers that work tight drive aisles — pre-position de-icing product on site, and clear driveways, visitor parking and walkways in the order that gets residents safely out the door before the morning run.",
    ]),
    conditions_long: p([
      "Walnut Grove's flat valley-floor setting means depth matters less than timing and ice. When Fraser Valley outflow arrives, the open residential streets and townhouse lots accumulate quickly, and the real hazard follows overnight: daytime melt on shaded north-facing drive aisles and entry walks refreezes into sheet ice exactly where residents step from cars and walk to their doors.",
      "Townhouse complexes compound this because their drive aisles are narrow and often shaded by buildings and mature trees, holding ice long after open roads have cleared. Clearing once after snowfall is never enough here — the refreeze is where the slip-and-fall risk lives, so our Walnut Grove service is built around de-icing and return visits, not a single pass.",
      "We monitor conditions continuously and dispatch at trigger depth automatically, with priority routing for contracted strata and residential clients so the aisles, visitor lots and walkways that families use are cleared before the neighbourhood wakes up.",
    ]),
    prep_long: p([
      "Seasonal readiness in Walnut Grove is activated by November 1. De-icing product is pre-positioned in on-site bins for owner top-up, brine is staged for pre-treatment ahead of forecast events, incident-log software is provisioned per strata council, and 24/7 dispatch numbers go out to council members and property managers.",
      "Because townhouse complexes depend on resident cooperation, we help councils set up the one thing that makes winter service work: an evening-before parking notice so residents move vehicles off drive aisles, letting crews clear cleanly at dawn. Complexes that lock a seasonal contract and communicate with residents get efficient morning service; those that wait until the first storm lose priority and spend the winter chasing complaints.",
    ]),
    mistakes_long: p([
      "The most common Walnut Grove mistake is hiring a contractor sized for driveways, not townhouse stratas — a pickup that plows the entrance, piles a windrow across the visitor lot, and never touches the refreeze on the walkways where residents actually slip. The second is ignoring resident communication, so vehicles block drive aisles and the crew cannot complete the route.",
      "The third is thin documentation. A Walnut Grove strata council carries the same Section 72 duty of care as a downtown tower, and when a resident or visitor falls on a shared walk, an undocumented 'we cleared it' is worth little to an insurer. PlowWow logs every visit with time and scope, treats the refreeze as seriously as the snowfall, and works with councils on resident parking — the three things that separate a real townhouse-strata program from a landscaper with a blade.",
    ]),
    testimonials: [],
  },

  "willoughby": {
    slug: "willoughby",
    city: "Willoughby",
    region: "Metro Vancouver / Langley",
    lat: 49.1078,
    lng: -122.6376,
    phone: "604-761-1518",
    email: "info@plowwow.com",
    avg_annual_snowfall_cm: 52,
    snow_season_start: "November",
    snow_season_end: "March",
    freeze_thaw_cycles: 22,
    terrain_note:
      "Willoughby is Langley's fastest-growing community — a rapidly urbanizing plateau east of 200 Street, roughly between 80 and 88 Avenue, that has filled in the last two decades with townhouse and condo strata developments, the Willoughby Town Centre, and master-planned neighbourhoods like Yorkson, Latimer and Routley. It sits slightly higher than the Langley valley floor, so it catches and holds snow a touch longer.",
    snowfall_note:
      "Willoughby averages around 52 cm of snow a year, marginally more than the valley floor because of its gentle elevation. The defining feature for winter is density: this is one of the Lower Mainland's largest concentrations of new multi-unit strata, so a single snowfall lands on an enormous run of shared drive aisles, visitor lots and parkade ramps that all need clearing before the morning commute.",
    strata_note:
      "Willoughby is strata-first — possibly the densest new townhouse-and-condo strata build in the Fraser Valley. Councils here manage long shared drive aisles, large visitor lots and parkade ramps across multi-building sites, all common property under the BC Strata Property Act. The scale means an un-cleared ramp or aisle affects hundreds of residents and is a documented liability the moment someone slips.",
    commercial_note:
      "Willoughby Town Centre and the Carvolth commercial node give the area a busy retail and transit-oriented core — shopping, medical and office parking that needs early, coordinated clearing alongside the surrounding stratas.",
    residential_note:
      "Behind the strata density are thousands of families in townhomes and condos who need shared walkways and visitor parking clear to get to work, school and the Carvolth park-and-ride. Residential and strata seasonal contracts keep those shared surfaces safe through the morning rush.",
    bylaw: {
      rule: "Owners and occupiers must keep sidewalks adjacent to their property clear of snow and ice in a timely way after a snowfall.",
      authority: "Township of Langley Highway & Traffic Regulation Bylaw",
      fine: "Municipal clearing costs and penalties recoverable against the property",
      link: "https://www.tol.ca",
    },
    weather_api: {
      lat: 49.1078,
      lng: -122.6376,
      environment_canada_url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html",
      open_meteo_url:
        "https://api.open-meteo.com/v1/forecast?latitude=49.1078&longitude=-122.6376&current=temperature_2m,weather_code,snowfall&temperature_unit=celsius",
    },
    landmarks: [
      { name: "Willoughby Town Centre", lat: 49.1156, lng: -122.6446, type: "commercial" },
      { name: "Yorkson Community Park", lat: 49.1231, lng: -122.6489, type: "park" },
      { name: "R.E. Mountain Secondary", lat: 49.1189, lng: -122.6331, type: "venue" },
      { name: "Carvolth Exchange", lat: 49.1381, lng: -122.6636, type: "transit" },
      { name: "Willoughby Community Park", lat: 49.1069, lng: -122.6394, type: "park" },
    ],
    transit_routes: [
      { route: "564 Willoughby", corridor: "208 Street / Willoughby", operator: "TransLink" },
      { route: "555 Carvolth", corridor: "Highway 1 / Carvolth Exchange", operator: "TransLink" },
      { route: "501 Langley Centre", corridor: "Fraser Highway", operator: "TransLink" },
    ],
    google_business_pin: {
      name: "PlowWow Snow Removal — Willoughby",
      maps_url: "https://www.google.com/maps/search/snow+removal+willoughby+langley",
      embed_query: "Willoughby, Langley, BC",
    },
    neighbourhoods: [
      { name: "Willoughby Town Centre", note: "Retail & high-density core" },
      { name: "Yorkson", note: "New townhouse & condo stratas" },
      { name: "Latimer", note: "Master-planned strata growth" },
      { name: "Routley", note: "Family townhouse communities" },
      { name: "Carvolth", note: "Transit-oriented & commercial" },
    ],
    faq: [
      { q: "Do you provide snow removal in Willoughby?", a: "Yes. PlowWow provides snow removal, plowing, salting and de-icing throughout Willoughby in Langley, covering townhouse-strata drive aisles, visitor parking, walkways, driveways and common areas on fixed-price seasonal contracts, documented for strata councils." },
      { q: "Do you service townhouse and condo stratas in Willoughby?", a: "Absolutely. Willoughby is a residential-strata area, and strata councils here carry a duty under the BC Strata Property Act to keep common property reasonably clear of snow and ice. We handle shared drive aisles, visitor lots, walkways and parkade ramps, with a documented service record for each visit." },
      { q: "How fast do you respond after snowfall?", a: "We monitor local conditions and dispatch automatically once snow reaches trigger depth — no call needed. Seasonal strata and residential clients get priority response with a guaranteed clearing window on every storm, day or night." },
      { q: "What does a Willoughby seasonal contract cost?", a: "Pricing is fixed for the season and based on your property — driveway and drive-aisle length, visitor lot and walkway area, ramps and entries. One predictable price with no per-storm surprises, which makes it easy for strata councils to budget and approve." },
    ],
    pricing: {
      residential_seasonal: "$600–$1,500 / season",
      strata_seasonal: "$4,000–$16,000 / season (multi-building strata, by size)",
      commercial_seasonal: "$4,000–$14,000 / season (town-centre retail & office)",
      per_visit: "$150–$700 / visit",
      de_ice_treatment: "$200–$550 / application",
    },
    comparison_table: {
      competitors: ["PlowWow", "Generic landscaper", "Owner-operator with pickup"],
      factors: ["Townhouse drive-aisle equipment", "24/7 auto-dispatch", "Walkway & ramp de-icing", "Documented service logs", "WorkSafeBC insured"],
    },
    internal_links: ["langley", "walnut-grove", "fort-langley", "vancouver", "burnaby"],
    external_authority_links: [
      { label: "Township of Langley — Snow & Ice", url: "https://www.tol.ca" },
      { label: "Environment Canada — Langley Forecast", url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html" },
    ],
    intro_long: p([
      "Willoughby is the story of Langley's growth in one neighbourhood. Two decades ago it was farmland and scattered acreage; today it is a plateau of master-planned strata communities — Yorkson, Latimer, Routley — anchored by the Willoughby Town Centre and the Carvolth transit exchange. That growth created something unusual for the Fraser Valley: an enormous, continuous run of townhouse and condo strata common property, all of which has to be kept safe every winter.",
      "The defining winter challenge in Willoughby is scale and density. These are multi-building sites with long shared drive aisles, big visitor lots and parkade ramps serving hundreds of units each. A single snowfall covers an immense footprint of shared surface, and because Willoughby sits slightly higher than the valley floor, it catches snow a little earlier and holds ice a little longer on its shaded new-build aisles.",
      "PlowWow runs Willoughby as a large-format residential-strata account. We stage compact and mid-size equipment locally to work tight drive aisles and ramps at volume, pre-position de-icing product across sites, and sequence clearing so parkade ramps, visitor lots and walkways open before the morning commute to Carvolth and beyond.",
    ]),
    conditions_long: p([
      "Willoughby's gentle elevation and dense new-build form combine to make ice, not depth, the real problem. Snow arrives slightly earlier here than on the valley floor, and the narrow drive aisles between closely-spaced townhouse blocks stay shaded, so daytime melt refreezes overnight into sheet ice across the exact aisles and ramps residents use at 6 AM.",
      "Parkade ramps are the signature Willoughby hazard. The area's condo and stacked-townhouse stratas have below-grade parking whose ramps ice fast during freeze-thaw — a genuine vehicle and liability risk if not pre-treated and cleared as a priority. Our Willoughby service treats ramps and shaded aisles as first-priority zones with proactive de-icing and return visits.",
      "We dispatch automatically at trigger depth and route contracted sites first, so the ramps, aisles and walkways that hundreds of Willoughby residents depend on are cleared and treated before the neighbourhood heads out.",
    ]),
    prep_long: p([
      "Willoughby seasonal readiness is activated by early November. De-icing product and brine are pre-positioned across contracted sites, parkade-ramp treatment plans are set, incident-log software is provisioned per council, and 24/7 dispatch numbers are distributed to strata councils and property managers.",
      "Because Willoughby's sites are large and resident-dense, we map each complex in advance — which ramps ice first, where visitor parking clusters, how the drive aisles connect — and set up the evening-before resident parking notice that lets crews clear cleanly at dawn. In a neighbourhood this dense, a site without a seasonal contract locked by early November may not secure priority large-equipment coverage before the first event.",
    ]),
    mistakes_long: p([
      "The classic Willoughby mistake is underestimating scale — hiring a single pickup for a multi-building strata that needs coordinated, large-format clearing, then watching ramps and visitor lots go untouched while the entrance gets a token pass. The second is ignoring parkade ramps, leaving overnight ice on the below-grade ramps where cars and residents are most exposed.",
      "The third is thin documentation and poor resident coordination. Willoughby councils manage hundreds of residents and the same Section 72 duty of care as any strata, so a slip-and-fall without a service log is a real exposure, and un-notified residents blocking drive aisles can stall an entire route. Matching equipment to the site's scale, prioritizing ramps and the refreeze, and documenting every visit are what a real Willoughby strata program requires.",
    ]),
    testimonials: [],
  },

  "fort-langley": {
    slug: "fort-langley",
    city: "Fort Langley",
    region: "Metro Vancouver / Langley",
    lat: 49.1668,
    lng: -122.5786,
    phone: "604-761-1518",
    email: "info@plowwow.com",
    avg_annual_snowfall_cm: 45,
    snow_season_start: "November",
    snow_season_end: "March",
    freeze_thaw_cycles: 20,
    terrain_note:
      "Fort Langley is Langley's historic heart — the riverside village built around the Fort Langley National Historic Site, where Glover Road's heritage storefronts meet the Bedford Landing townhouse stratas along the Fraser. It is lower-density and steeped in character, but its village businesses, waterfront stratas and residential streets all need winter clearing done with care for the heritage setting.",
    snowfall_note:
      "Fort Langley averages around 45 cm of snow a year, a little less than the Langley uplands thanks to its low riverside elevation, though the Fraser's proximity brings its own freeze-thaw and damp-cold ice. The bigger consideration here is character: clearing has to keep the village walkable and businesses accessible without damaging heritage streetscape and landscaping.",
    strata_note:
      "Fort Langley's strata base is anchored by Bedford Landing — the riverside master-planned community of townhouse and low-rise strata whose councils manage shared lanes, visitor parking and waterfront walkways as common property under the BC Strata Property Act. Keeping those shared surfaces safe is both a liability duty and a matter of preserving the community's walkable, riverside character.",
    commercial_note:
      "Glover Road village is a tourism and small-business destination — boutiques, cafes and restaurants whose sidewalks and entries must stay clear and safe for the steady foot traffic the village draws, even in winter. Village-business clearing keeps Fort Langley open and welcoming through the season.",
    residential_note:
      "Beyond the village and Bedford Landing, Fort Langley's residential streets and heritage homes need driveways and walks kept clear on family schedules. Residential seasonal contracts handle the driveways and public walks so residents and visitors move safely through the historic streets.",
    bylaw: {
      rule: "Owners and occupiers must keep sidewalks adjacent to their property clear of snow and ice in a timely way after a snowfall.",
      authority: "Township of Langley Highway & Traffic Regulation Bylaw",
      fine: "Municipal clearing costs and penalties recoverable against the property",
      link: "https://www.tol.ca",
    },
    weather_api: {
      lat: 49.1668,
      lng: -122.5786,
      environment_canada_url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html",
      open_meteo_url:
        "https://api.open-meteo.com/v1/forecast?latitude=49.1668&longitude=-122.5786&current=temperature_2m,weather_code,snowfall&temperature_unit=celsius",
    },
    landmarks: [
      { name: "Fort Langley National Historic Site", lat: 49.1686, lng: -122.5789, type: "landmark" },
      { name: "Bedford Landing", lat: 49.1636, lng: -122.5808, type: "commercial" },
      { name: "Glover Road Village", lat: 49.1667, lng: -122.5806, type: "commercial" },
      { name: "Fort-to-Fort Trail", lat: 49.1608, lng: -122.5836, type: "park" },
      { name: "Jacob Haldi Bridge", lat: 49.1719, lng: -122.5794, type: "transit" },
    ],
    transit_routes: [
      { route: "561 Langley Centre", corridor: "Glover Road / Fort Langley", operator: "TransLink" },
      { route: "C62 Community Shuttle", corridor: "Fort Langley village", operator: "TransLink" },
      { route: "555 Carvolth", corridor: "Highway 1 connection", operator: "TransLink" },
    ],
    google_business_pin: {
      name: "PlowWow Snow Removal — Fort Langley",
      maps_url: "https://www.google.com/maps/search/snow+removal+fort-langley+langley",
      embed_query: "Fort Langley, Langley, BC",
    },
    neighbourhoods: [
      { name: "Bedford Landing", note: "Riverside townhouse stratas" },
      { name: "Glover Road Village", note: "Heritage commercial core" },
      { name: "Fort-to-Fort", note: "Trail-side residential" },
      { name: "Church Street", note: "Historic residential" },
      { name: "Bedford Channel", note: "Waterfront properties" },
    ],
    faq: [
      { q: "Do you provide snow removal in Fort Langley?", a: "Yes. PlowWow provides snow removal, plowing, salting and de-icing throughout Fort Langley in Langley, covering townhouse-strata drive aisles, visitor parking, walkways, driveways and common areas on fixed-price seasonal contracts, documented for strata councils." },
      { q: "Do you service townhouse and condo stratas in Fort Langley?", a: "Absolutely. Fort Langley is a residential-strata area, and strata councils here carry a duty under the BC Strata Property Act to keep common property reasonably clear of snow and ice. We handle shared drive aisles, visitor lots, walkways and parkade ramps, with a documented service record for each visit." },
      { q: "How fast do you respond after snowfall?", a: "We monitor local conditions and dispatch automatically once snow reaches trigger depth — no call needed. Seasonal strata and residential clients get priority response with a guaranteed clearing window on every storm, day or night." },
      { q: "What does a Fort Langley seasonal contract cost?", a: "Pricing is fixed for the season and based on your property — driveway and drive-aisle length, visitor lot and walkway area, ramps and entries. One predictable price with no per-storm surprises, which makes it easy for strata councils to budget and approve." },
    ],
    pricing: {
      residential_seasonal: "$600–$1,400 / season",
      strata_seasonal: "$3,500–$12,000 / season (Bedford Landing & village strata)",
      commercial_seasonal: "$3,000–$10,000 / season (village businesses)",
      per_visit: "$150–$550 / visit",
      de_ice_treatment: "$200–$500 / application",
    },
    comparison_table: {
      competitors: ["PlowWow", "Generic landscaper", "Owner-operator with pickup"],
      factors: ["Townhouse drive-aisle equipment", "24/7 auto-dispatch", "Walkway & ramp de-icing", "Documented service logs", "WorkSafeBC insured"],
    },
    internal_links: ["langley", "walnut-grove", "willoughby", "vancouver", "burnaby"],
    external_authority_links: [
      { label: "Township of Langley — Snow & Ice", url: "https://www.tol.ca" },
      { label: "Environment Canada — Langley Forecast", url: "https://weather.gc.ca/city/pages/bc-52_metric_e.html" },
    ],
    intro_long: p([
      "Fort Langley is unlike anywhere else PlowWow serves. It is a National Historic Site with a working village — heritage storefronts along Glover Road, the riverside Bedford Landing strata community, and quiet residential streets that draw visitors year-round. That character is the whole point of Fort Langley, and winter service here has to protect it: keep the village walkable and the stratas safe without tearing up heritage landscaping or piling snow where it does not belong.",
      "The winter fabric of Fort Langley is a mix the rest of Langley does not have: a compact commercial core with heavy pedestrian traffic, riverside townhouse stratas with shared lanes and waterfront walks, and character homes on narrow historic streets. Each needs a different touch — sidewalk safety for the village, drive-aisle and walkway clearing for Bedford Landing, driveway service for residents.",
      "PlowWow runs Fort Langley as a careful, mixed-use route. We keep Glover Road's sidewalks and business entries safe for foot traffic, clear Bedford Landing's shared lanes and riverside walkways, and service residential driveways — all with an eye on the heritage streetscape and the community's walkable character.",
    ]),
    conditions_long: p([
      "Fort Langley's riverside position gives it a damp, freeze-thaw cold that glazes sidewalks and walkways even when accumulation is modest. The Fraser keeps humidity high, so the village's heavily-walked Glover Road sidewalks and Bedford Landing's waterfront paths ice readily — a real hazard given the pedestrian traffic the village attracts.",
      "The heritage setting adds a constraint most neighbourhoods do not have: snow has to be cleared and de-iced without damaging historic landscaping, brick walks and streetscape features, and without blocking the storefronts and access the village depends on. This is precision clearing, not brute-force plowing.",
      "We monitor conditions and dispatch at trigger depth, prioritizing the village's walked sidewalks and Bedford Landing's shared surfaces, with de-icing timed to the freeze-thaw so Fort Langley stays safe and open through winter.",
    ]),
    prep_long: p([
      "Fort Langley seasonal readiness is set by early November. De-icing product suited to walkways and heritage surfaces is pre-positioned, brine is staged for pre-treatment ahead of events, incident-log software is provisioned for the Bedford Landing councils and village businesses, and 24/7 dispatch numbers are distributed to managers and owners.",
      "Because Fort Langley mixes pedestrian-heavy village blocks with riverside stratas, we plan each property's critical paths in advance — which sidewalks carry the most foot traffic, where Bedford Landing's shared lanes and walks run — so crews clear in the order that keeps the village safe and welcoming. Village businesses and stratas that lock a seasonal contract by early November secure priority response before the first event.",
    ]),
    mistakes_long: p([
      "The most common Fort Langley mistake is treating it like any other suburb — sending a plow to shove snow around without regard for the heritage streetscape, blocking storefronts, and skipping the sidewalk de-icing that a pedestrian village actually needs. The second is ignoring the riverside freeze-thaw, clearing once and leaving the damp-cold ice that forms on the village's walked sidewalks and waterfront paths.",
      "The third is thin documentation. Bedford Landing councils and village businesses carry the same duty of care as anyone — and with the foot traffic Fort Langley draws, a slip on an un-cleared, undocumented sidewalk is a real exposure. Precision walkway clearing, freeze-thaw de-icing, and documented service, all with respect for the heritage setting, are what Fort Langley genuinely requires.",
    ]),
    testimonials: [],
  },
};
