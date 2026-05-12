// Per-city unique flavor paragraphs. These are intentionally hand-authored so
// every city page contains substantive non-templated copy. The content
// generator (cityContent.ts) interleaves these with city data (neighborhoods,
// snowfall, city hall, FAQs) to produce 5,800+ word pages that are
// substantively different from one another.

export type CityFlavor = {
  signature: string;     // 1-2 sentences: defining storm signature
  geography: string;     // 1-2 sentences: terrain, water, elevation
  microclimate: string;  // 1-2 sentences: why weather behaves like it does here
  economy: string;       // 1-2 sentences: dominant property mix
  hazard: string;        // 1-2 sentences: signature seasonal hazard
  transit: string;       // 1-2 sentences: transit/commuting context
  history: string;       // 1-2 sentences: PlowWow tenure / civic context
  caseStudy: string;     // 3-4 sentences: anonymized site story
};

export const CITY_FLAVOR: Record<string, CityFlavor> = {
  vancouver: {
    signature:
      "Vancouver's coastal Pacific maritime climate keeps the city near the freezing point through most snow events, so a single storm cell often delivers wet snow, freezing rain, and slush within the same hour. The result is a glassy melt-and-refreeze cycle on sidewalks, transit platforms and seawall-adjacent commercial frontages that demands aggressive proactive salting rather than reactive plowing alone.",
    geography:
      "Hemmed in by Burrard Inlet, the Fraser River, English Bay and the North Shore mountains, Vancouver compresses a half-million people onto a peninsula whose elevation rarely exceeds 150 metres. That shape funnels marine air across the city in narrow corridors, so neighborhoods only kilometres apart can see materially different snow totals during the same event.",
    microclimate:
      "Outflow winds from the Fraser Valley occasionally pour cold air into the city through Burrard Inlet, dropping surface temperatures well below the marine forecast and turning otherwise routine rain into rapid black-ice formation. Crews monitor SurreyTeck weather stations and Environment Canada outflow advisories so dispatch precedes — not chases — those temperature drops.",
    economy:
      "Vancouver's snow-removal demand is dominated by mid- and high-rise strata towers, mixed-use retail frontages on Robson, Main, Commercial and West 4th, and ground-level commercial along the Broadway corridor. Single-family residential service concentrates in Kitsilano, Point Grey, Dunbar and the East Side grid where private driveways and laneways multiply route stops.",
    hazard:
      "The city's signature winter hazard is freezing rain coating glass-fronted lobbies, painted concrete plazas and metal grates outside transit stations, all of which become near-frictionless within minutes. Liability for a single slip-and-fall on an unsalted public-facing entrance can exceed the cost of an entire seasonal contract.",
    transit:
      "TransLink SkyTrain stations, bus exchanges at Main-Science World, Commercial-Broadway and Broadway-City Hall, and Aquabus terminals all feed pedestrian volumes onto private commercial frontages within minutes of dawn. Service windows therefore close earlier in Vancouver than in suburban cities — most retail and strata sites must be cleared and salted by 5:30 a.m.",
    history:
      "PlowWow has dispatched in Vancouver every winter since the company was founded, and our oldest continuous strata contracts in the city date to the 2008 December storm cycle that paralysed the region for nearly three weeks. Several of those original buildings remain on seasonal contracts today.",
    caseStudy:
      "A 38-storey strata in Coal Harbour engaged us mid-season after a previous vendor failed to salt the porte-cochère before a freezing-rain event. Within 14 hours we audited the property, mapped a four-zone service plan, pre-positioned brine and rock salt on site, and stood up a dedicated 04:00 sub-contract crew. Insurance claims for the property fell to zero across the remaining 17 events that winter, and the strata signed a three-year renewal at the next AGM.",
  },
  "new-westminster": {
    signature:
      "New Westminster sits on a steeply terraced bluff above the Fraser River, and its signature winter problem is the gravity assist that turns a 2 cm dusting on Royal Avenue or 8th Street into an unsteerable luge run for any vehicle without winter tires. Pre-salting the grade is non-negotiable here, even on forecasts that other cities would treat as borderline.",
    geography:
      "The city compresses dense Uptown towers, the Quayside waterfront strip and historic Sapperton hillsides into 15 square kilometres of mostly graded land. The Fraser's thermal mass keeps Quayside marginally warmer than Uptown, so a single storm can deposit snow uphill while it falls as rain along the river — a difference our routing accounts for explicitly.",
    microclimate:
      "Cold air drains downhill at night from the Connaught Heights plateau, pooling against the bluff face and refreezing whatever melted during the daytime mid-event lull. That makes second-shift re-salting between midnight and 04:00 the single highest-leverage operation in our New West playbook.",
    economy:
      "Roughly two-thirds of our New West service hours go to Uptown high-rise strata towers, with the remainder split between Quayside mixed-use, Sapperton medical-adjacent commercial, and Queensborough industrial yards. The strata mix here skews older than Surrey or Langley, so depreciation-report integration and AGM presentations are a regular service request.",
    hazard:
      "The combination of grade, narrow heritage streets and on-street parking means the most common claim in New West is plow-displaced snow encroaching on a neighboring property line. We document every push-pile photographically and resite any pile within 24 hours on request.",
    transit:
      "New Westminster, Columbia, Sapperton, Braid and 22nd Street SkyTrain stations together generate one of the densest pedestrian-per-square-kilometre flows in Metro Vancouver. Strata frontages within a 200-metre radius of any of those stations get prioritised on a separate sub-route during snow events.",
    history:
      "We have been the contracted snow vendor for several heritage-converted Uptown towers since 2014, and our route maps in this city were rebuilt from the ground up after the December 2016 event when several legacy vendors stranded their equipment on the Royal Avenue grade.",
    caseStudy:
      "A 1970s 22-storey Uptown tower with an exposed underground-parking ramp suffered a $40,000 freeze claim in 2020 when a previous vendor used pure rock salt on a polished concrete approach, accelerating spalling. We replaced the application with a brine-and-traction-grit blend, repaired the ramp in coordination with the strata's depreciation engineer, and the property has since recorded zero ramp-related incidents over four winters.",
  },
  coquitlam: {
    signature:
      "Coquitlam's snow signature is elevation: Burke Mountain and the Westwood Plateau routinely receive two to three times the snowfall measured at City Centre, and forecasts written for the lowlands chronically underestimate what falls on the upper slopes. Crews stage equipment uphill the night before any forecast event so we are not chasing accumulation up a closed road.",
    geography:
      "The city climbs from 5 metres at the Fraser flats through City Centre at 80 metres to Burke Mountain ridgelines above 400 metres, producing one of the steepest urban elevation gradients in Metro Vancouver. Snow at the top of David Avenue can be falling while it rains on Lougheed Highway twelve kilometres downhill.",
    microclimate:
      "Cold-air pooling in the Coquitlam River and Pinnacle Creek valleys produces overnight temperature inversions that re-freeze partially cleared roads even after dispatch crews have left. Westwood Plateau in particular benefits from a second pre-dawn salt pass that our routing locks in for any contracted strata above 250 metres.",
    economy:
      "Coquitlam's service mix is one of the most diverse in our footprint: Burke Mountain new-build single-family, Westwood Plateau hillside strata, City Centre Evergreen-line tower density, Maillardville heritage residential, and a long industrial frontage along United Boulevard. Each requires materially different equipment and routing.",
    hazard:
      "The signature hazard is grade-related vehicle slide-back on residential cul-de-sacs that municipal crews don't reach within 24 hours of an event. Pre-salting private connectors at the top of streets like Marmont and Coast Meridian is what keeps emergency vehicles able to access homes.",
    transit:
      "Lafarge Lake-Douglas, Lincoln, Coquitlam Central, Inlet Centre and Burquitlam SkyTrain stations cluster all the city's pedestrian density into a narrow north-south corridor. Strata towers along that corridor are sequenced first because they double as warming-and-walking destinations during transit-disruption events.",
    history:
      "Our first Coquitlam contract was a Burke Mountain townhouse complex in 2013, and the city now generates more total seasonal-contract revenue than any other in our network outside Vancouver itself. Several of our most senior operators live on Burke Mountain by design — they can be on-site within 15 minutes of trigger.",
    caseStudy:
      "A 142-unit townhouse strata at the top of Burke Mountain repeatedly missed garbage and emergency-services pickup windows during three winters with prior vendors. We restructured the contract to lock in a 03:30 first-pass on any forecast above 4 cm, added a dedicated bobcat for the inner cul-de-sac, and the property has since maintained 100% on-time waste collection across two record-snowfall winters.",
  },
  "port-coquitlam": {
    signature:
      "Port Coquitlam's flat valley floor combined with the Coquitlam and Pitt River corridors creates a fog-and-frost signature that is distinct from neighboring cities. Black ice on overpasses crossing the Mary Hill and Lougheed corridors is the single most common cause of insurance claims in PoCo properties under our care.",
    geography:
      "The city occupies the alluvial floodplain at the confluence of the Coquitlam and Pitt rivers, with very little of its serviced area exceeding 30 metres elevation. That flatness means snow accumulates uniformly across town but also that wind redistribution after a storm can produce drifts on industrial lots that exceed plow capacity without staging a loader.",
    microclimate:
      "Radiative cooling on clear nights after a storm drops PoCo overnight lows several degrees below the regional forecast, especially in the Riverwood and Citadel Heights pockets shielded from outflow winds. We schedule a re-salt pass on contracted properties whenever overnight clearing is forecast within 48 hours of an event.",
    economy:
      "PoCo's commercial demand is dominated by Downtown retail along Shaughnessy and Westwood, big-box and industrial along the Mary Hill bypass, and growing strata density in Citadel Heights. Residential routes weight heavily toward Birchland Manor and Riverwood family-strata communities.",
    hazard:
      "The largest single risk in PoCo is delivery-vehicle skid on the Lougheed and Mary Hill on-ramps, which freeze before adjoining municipal arterials are salted. Private commercial frontages within 100 metres of either on-ramp get pre-storm brine application as standard.",
    transit:
      "West Coast Express commuters rely on a narrow on-time window from Port Coquitlam Station, and the surrounding park-and-ride lots and strata frontages are sequenced to be cleared before the 06:21 train. Missing that window is one of the few service failures that triggers an automatic credit on our PoCo contracts.",
    history:
      "PlowWow took on its first PoCo industrial-yard contract in 2015 and has progressively expanded into Citadel Heights residential strata as the area densified. The Riverwood townhouse cluster is one of the most operationally efficient single corridors in our network.",
    caseStudy:
      "A 220,000 sq ft industrial distribution centre on Kingsway Avenue switched to PlowWow after a single snow event cost them four shipping windows and an estimated $90,000 in penalty fees. We rebuilt the lot's snow-storage map, pre-staged a 14-tonne loader on site for the season, and the property has since maintained 100% loading-bay availability across every event.",
  },
  "port-moody": {
    signature:
      "Port Moody's signature is the Inlet's cold-water proximity coupled with the Heritage Mountain elevation gradient, which together produce the longest-duration freezing-rain events in the eastern Tri-Cities. The shoreline rarely sees pure snow without a freezing-rain transition that demands different application chemistry mid-event.",
    geography:
      "The city wraps the head of Burrard Inlet, climbing from sea level through Newport Village's mid-rise core to Heritage Mountain and Heritage Woods at 250 metres-plus. The Inlet's thermal mass moderates shoreline temperatures, but Heritage Mountain frequently records snow when the rest of the inlet sees rain.",
    microclimate:
      "Fog rolling off the Inlet under high-pressure conditions can suspend at the Heritage Mountain inversion layer and refreeze on glass and metal surfaces overnight. We treat any forecast morning fog after a recent event as an automatic re-salt trigger for shoreline strata.",
    economy:
      "Service demand splits roughly evenly between Heritage Mountain and Heritage Woods hillside strata, Inlet District waterfront towers, Newport Village mixed-use, and College Park family residential. Commercial demand is small but high-touch — most are independent retail along St. Johns and Murray.",
    hazard:
      "The dominant insurance-claim source is pedestrian slip on the long, flat plazas in front of Newport Village and Suter Brook retail clusters, where freezing rain glazes painted concrete within minutes. Pre-storm application of magnesium chloride brine on those plazas is the one operation we never skip.",
    transit:
      "Moody Centre, Inlet Centre and Coquitlam Central stations together with West Coast Express commuter rail concentrate all the city's morning pedestrian density into three windows. Service routing is sequenced backward from those windows rather than forward from forecast trigger time.",
    history:
      "Our first Port Moody contract dates to a 2014 Heritage Mountain strata that switched to us after a previous vendor failed to dispatch during a Christmas Eve event. We have lost only two strata contracts in the city since.",
    caseStudy:
      "A waterfront tower in the Inlet District suffered repeated lobby-flooding from melt-tracking after every event under a previous vendor. We added perimeter mat staging at three entrances, switched the porte-cochère to a low-spall calcium-magnesium-acetate blend, and lobby moisture incidents fell from a documented 14 per season to two.",
  },
  "pitt-meadows": {
    signature:
      "Pitt Meadows' flat farmland and slough-rich landscape produce a signature wet-snow event: heavy, dense snow that compacts immediately under tire load and refreezes into rutted ice that defeats standard residential plows. Our PoMo equipment loadout uses heavier blades and aggressive scrapers that other cities don't require.",
    geography:
      "The city is essentially the western half of the Pitt Polder, sitting between the Fraser and Pitt rivers at near sea-level elevation. Nearly all serviced area is under 10 metres elevation and the flat alluvial soil holds moisture that re-emerges as ground frost after even modest events.",
    microclimate:
      "The Pitt Lake katabatic flow occasionally pushes cold air across the polder, creating wind-chill conditions that refreeze cleared surfaces within an hour of plowing. We schedule double-pass operations on any forecast that includes north winds above 20 km/h.",
    economy:
      "The city's commercial demand concentrates on the Bonson and Harris industrial-and-airport corridor and on Downtown retail along Harris and Park. Residential demand has grown sharply with new South Bonson townhouse phases that now make up roughly a quarter of our PoMo route hours.",
    hazard:
      "The signature hazard is industrial-yard tractor-trailer slide on the long, level approach to Mitchell Island and the Golden Ears Bridge ramps. Fleet customers in the Airport Way industrial cluster all carry pre-storm brine clauses for that reason.",
    transit:
      "West Coast Express service from Pitt Meadows Station is the city's primary commute lifeline, and the station's park-and-ride and adjacent commercial frontages are sequenced before the 06:31 inbound train. Missing that window triggers an automatic service credit.",
    history:
      "PlowWow expanded into Pitt Meadows in 2016 with a single airport-adjacent industrial yard and now services the largest concentration of contracted industrial square-footage of any of our Lower Mainland cities outside Surrey.",
    caseStudy:
      "An aviation-services tenant on Airport Way faced FAA-aligned ramp-clearance penalties under their lease after a snow event closed three operational bays for 36 hours. We rebuilt the site's snow-storage geometry around a previously unused buffer strip, pre-staged a dedicated wheel loader for the season, and the property has since maintained 100% bay availability.",
  },
  "maple-ridge": {
    signature:
      "Maple Ridge's signature is the elevation step from valley floor to Silver Valley and Whonnock, where snowfall totals routinely double or triple what falls at Town Centre. Forecasts almost always understate Silver Valley accumulation, so our trigger thresholds for that zone are set to fire on lower numbers than the rest of the city.",
    geography:
      "The city stretches 40 kilometres along the north side of the Fraser, rising from sea level at the river to over 300 metres in Silver Valley. That length, combined with grade, makes Maple Ridge one of the most logistically demanding cities in our network — equipment cannot meaningfully be reassigned mid-event between zones.",
    microclimate:
      "Cold-air drainage from the Golden Ears slopes funnels through Kanaka Creek and Alouette River corridors, producing pockets of overnight ground frost that other Tri-Cities communities don't experience at equivalent elevations. Our routing treats those corridors as separate microclimates.",
    economy:
      "Service demand is anchored by Albion's new strata and townhouse phases, Silver Valley hillside single-family, Hammond's heritage residential, and Town Centre mixed-use. Industrial demand is small but growing along 224 Street and the Lougheed corridor.",
    hazard:
      "The dominant hazard is grade-related skid on the long Silver Valley connector roads, which the municipality cannot reach quickly. Several of our Silver Valley strata contracts include private-road salting clauses that extend a full kilometre beyond the property line.",
    transit:
      "West Coast Express service from Maple Meadows and Port Haney stations defines the city's morning commute window, and the Haney Place transit exchange concentrates bus-rider density at one Town Centre node. Routing is sequenced to those windows.",
    history:
      "PlowWow opened a Maple Ridge satellite operation in 2017 specifically to keep response times under 90 minutes for Silver Valley contracts. The operator team there has the longest average tenure of any of our city sub-fleets.",
    caseStudy:
      "A 96-unit hillside townhouse complex in Silver Valley suffered a six-day in-and-out access failure during a 2021 event under a previous vendor. We deployed a dedicated tracked skid-steer for the property, restructured the snow-storage map, and the strata has since maintained continuous access through every subsequent event including the 2022 series.",
  },
  surrey: {
    signature:
      "Surrey's signature is sheer geographic scale — six town centres spanning more than 300 square kilometres mean that a single event affects different zones at different times, and a vendor without zone-resident operators cannot meaningfully cover the city. Our Surrey fleet runs out of three separate yards by design.",
    geography:
      "Surrey ranges from sea-level Crescent Beach in South Surrey through City Centre at 90 metres to the Panorama Ridge plateau above 100 metres. The eastern half drops back toward the Fraser flats at Cloverdale, and the city contains arguably more total elevation variation than any other in our footprint.",
    microclimate:
      "South Surrey and White Rock benefit from coastal moderation that often turns forecast snow into rain, while Newton, Fleetwood and the Cloverdale plateau receive measurably more accumulation from the same system. Our trigger thresholds are set independently for each town centre.",
    economy:
      "Service demand reflects Surrey's full economic spectrum: City Centre tower density, Guildford retail-and-strata, Newton dense residential, Cloverdale suburban-and-equestrian, Fleetwood family residential and South Surrey coastal SFH and strata. No single property type dominates.",
    hazard:
      "The dominant hazard is parking-lot pedestrian slip on the city's many big-box retail frontages along King George, 152 Street and Guildford Town Centre. These sites carry the highest single-event traffic volumes in our network and warrant dedicated equipment per site during major events.",
    transit:
      "King George, Surrey Central, Gateway and Scott Road SkyTrain stations together with the under-construction Surrey-Langley extension define the City Centre and Newton commute windows. Routing along the Fraser Highway corridor is sequenced backward from those windows.",
    history:
      "Surrey has been our largest single-city contract base since 2018 and is the only city where we maintain three separate equipment yards to keep zone response times under 90 minutes. Several of our most senior route managers came up through Surrey routes.",
    caseStudy:
      "A 1.2-million sq ft retail power centre in Guildford switched to PlowWow after consecutive winters of pedestrian-slip claims under previous vendors. We deployed a four-unit equipment package on site for the season, restructured snow-storage to preserve loading-zone access, and recorded slip-and-fall claims fell to one across 19 events that winter.",
  },
  langley: {
    signature:
      "Langley's signature is the dual-municipality split between Langley City and Langley Township, which together cover one of the fastest-growing service-density regions in BC. Willoughby townhouse phases open every season, and the operational map has to be rebuilt yearly to absorb new frontages.",
    geography:
      "The serviced area spans flat valley floor at Langley City through gently rising agricultural plateau at Brookswood, Aldergrove and the Township uplands. Elevation rarely exceeds 90 metres, but the geographic spread from Walnut Grove to Aldergrove exceeds 25 kilometres.",
    microclimate:
      "Aldergrove and the eastern Township routinely record measurably colder overnight lows than Walnut Grove and Willoughby due to reduced urban heat-island moderation. Trigger thresholds for the eastern zone are set roughly one degree colder than the western.",
    economy:
      "Service demand is dominated by Willoughby strata and townhouse, Walnut Grove family residential, Brookswood acreage, Fort Langley historic-core retail, and Aldergrove suburban. Commercial demand concentrates along 200 Street, the Fraser Highway and the Langley Bypass.",
    hazard:
      "The dominant hazard is rural-acreage emergency-vehicle access in Brookswood and Otter District, where private driveways exceed 100 metres and gravel surfaces complicate plowing. Acreage contracts here include explicit gravel-surface clauses.",
    transit:
      "The Langley-Surrey SkyTrain extension and existing Carvolth Park-and-Ride concentrate inbound commuter density at two nodes. Strata frontages within walking distance of either are sequenced ahead of the morning bus departures.",
    history:
      "PlowWow expanded into Langley in 2017 and the city has been our highest organic-growth market for four consecutive seasons, primarily on the back of Willoughby townhouse densification. Many contracts here are originated by property managers who first contracted us in Surrey.",
    caseStudy:
      "A 184-unit Willoughby townhouse phase suffered repeated emergency-services access delays during the 2022 atmospheric-river-then-snow series under a previous vendor. We deployed a dedicated tracked machine for the property's narrow inner lanes, restructured snow storage around three previously unused buffer strips, and recorded zero access incidents the following winter.",
  },
  abbotsford: {
    signature:
      "Abbotsford's signature is eastern-Fraser-Valley outflow — the same wind regime that produces the region's famous fog also funnels Arctic air down from the Interior, dropping surface temperatures below regional forecasts and producing the heaviest single-event snowfall totals in our footprint. Sumas Mountain in particular routinely exceeds 30 cm per event.",
    geography:
      "The city spans flat agricultural valley floor at Mt. Lehman and West Abbotsford rising sharply to Sumas Mountain at over 800 metres. The Sumas Prairie and the US border define the south boundary, and Sumas Mountain dominates the eastern skyline.",
    microclimate:
      "Outflow winds from the Fraser Canyon push cold air down Highway 1 into Abbotsford even when coastal cities remain mild, producing the steepest temperature gradients in our network during winter events. Forecast accuracy for Abbotsford remains the lowest of any city we serve.",
    economy:
      "Service demand splits across Sumas Mountain hillside SFH and acreage, Clayburn heritage residential, Historic Downtown retail, Mt. Lehman commercial, and West Abbotsford newer strata. Industrial demand is significant along Sumas Way and the airport corridor.",
    hazard:
      "The dominant hazard is Highway 1 on-ramp icing at McCallum, Mt. Lehman and Sumas Way, which freeze ahead of municipal salting and produce the highest-frequency commercial-vehicle skid claims in our network. Pre-storm brine on those approaches is standard for any contract within 200 metres.",
    transit:
      "Abbotsford has limited rail transit, so commercial and strata properties are sequenced around vehicular morning peak windows on Highway 1, the Sumas Way corridor and South Fraser Way. The airport's commercial flight schedule defines a separate sequencing window.",
    history:
      "PlowWow opened an Abbotsford yard in 2018 specifically to address response times for Sumas Mountain contracts. The yard is jointly used with our Chilliwack operations during major events.",
    caseStudy:
      "A Sumas Mountain hillside strata of 64 single-family-detached homes lost private-road access for 11 consecutive days during the 2021 atmospheric-river series under a previous vendor. We deployed a tracked machine and a wheeled loader on site for the remainder of the season, restructured the private-road salting plan, and access has been continuous through every subsequent event.",
  },
  "west-vancouver": {
    signature:
      "West Vancouver's signature is grade — much of the British Properties, Caulfeild and Cypress sit above 200 metres on slopes that exceed 12% in places, and forecasts written for sea-level Ambleside chronically understate accumulation and refreeze risk on the upper slopes. Pre-salting upper-slope strata is a default operation, not a forecast-dependent one.",
    geography:
      "The municipality climbs from Burrard Inlet at sea level through Ambleside and Dundarave at 30-50 metres to the British Properties, Caulfeild and Cypress at well over 200 metres. The grade is continuous and the road network is largely arterial-fed, so a single failure can isolate hundreds of homes.",
    microclimate:
      "The Cypress slopes routinely receive snow when Ambleside sees rain, and overnight cold-air drainage refreezes the upper slopes on otherwise calm post-event nights. Routing locks in a 04:00 second-pass on every contracted upper-slope property as standard.",
    economy:
      "Service demand concentrates on the British Properties and Caulfeild SFH base, Ambleside and Dundarave commercial frontages, and a small but high-touch hillside strata segment. Property values in the city's upper slopes drive customer expectations toward white-glove documentation and concierge-style communication.",
    hazard:
      "The dominant hazard is grade-related vehicle slide-back on residential connector roads, which the municipality cannot meaningfully salt at the cadence the slopes require. Private contributions to municipal salting under our coordinated plan have measurably reduced incident rates.",
    transit:
      "Transit density is low compared to the rest of Metro Vancouver, so service is sequenced around school-bus departure windows and the morning commute via Marine Drive and the Upper Levels Highway. Several contracts include explicit school-route timing clauses.",
    history:
      "PlowWow has serviced West Vancouver continuously since 2012 and the city remains one of our most retention-stable markets — the average tenure of an active strata contract here exceeds nine years.",
    caseStudy:
      "A British Properties strata of 28 detached homes on a private upper-slope road lost emergency-services access twice in one winter under a previous vendor. We restructured the contract to include private-road pre-salting at three trigger thresholds, deployed a dedicated tracked skid-steer for the property, and the strata has since maintained continuous access through every event over four winters.",
  },
  "north-vancouver": {
    signature:
      "The North Shore's signature is elevation gain from the Inlet to the Lynn Headwaters trailhead, and the snow line during a typical event sits somewhere on the slope rather than above or below it. That means routing has to predict, not react to, where the rain-snow boundary will be at 04:00.",
    geography:
      "The serviced area climbs from Lonsdale at sea level through Lynn Valley and Edgemont at 100-200 metres to upper Capilano and the Cleveland Dam approaches above 250 metres. The grade is continuous and the road network is largely fed by Mountain Highway, Lynn Valley Road and Capilano Road.",
    microclimate:
      "Outflow winds occasionally pour cold air down the Capilano and Seymour valleys, dropping surface temperatures below regional forecasts and turning rain to snow within an hour. Trigger thresholds for upper-slope contracts are set on lower forecast numbers than the lowlands.",
    economy:
      "Service demand spans Lonsdale tower density, Lynn Valley and Edgemont mid-rise strata and family residential, Deep Cove coastal SFH, and Capilano hillside strata. Commercial demand concentrates along Marine Drive, Lonsdale and the Park Royal frontages straddling the West Van boundary.",
    hazard:
      "The dominant hazard is grade-related skid on Mountain Highway and Lynn Valley Road feeders, which compound when freezing rain coincides with morning peak. Several of our highest-priority contracts are pre-salted on any forecast above zero accumulation.",
    transit:
      "Lonsdale Quay and the SeaBus terminal concentrate inbound pedestrian density at one node, and the Lions Gate and Ironworkers Memorial bridge approaches define the morning commute windows. Routing is sequenced backward from those windows.",
    history:
      "PlowWow has maintained continuous North Shore operations since 2013, and several of our oldest Lynn Valley and Edgemont strata contracts span a decade-plus tenure.",
    caseStudy:
      "An Edgemont mid-rise strata switched to us in 2019 after a freezing-rain event left the underground-parking ramp impassable for three days under a previous vendor. We rebuilt the ramp's chemistry plan around a calcium-magnesium-acetate blend, added perimeter mat staging at all three lobby entrances, and ramp-related incidents have been zero across five subsequent winters.",
  },
  richmond: {
    signature:
      "Richmond's signature is the combination of dead-flat alluvial geography and very high water table, which produces a wet-snow-then-frost cycle that other cities don't experience at the same intensity. Snow that falls onto saturated ground refreezes from below as much as from above, and routing has to plan for both.",
    geography:
      "The city is the western half of Lulu Island plus Sea Island, sitting almost entirely below 5 metres elevation between two arms of the Fraser. Dyke roads define much of the perimeter, and almost every serviced surface is built on engineered fill rather than natural drainage.",
    microclimate:
      "Marine air pushed in by westerly winds keeps Richmond marginally warmer than the rest of the Lower Mainland during snow events, but radiative cooling on clear post-event nights can drop overnight lows below adjacent cities. We schedule re-salt passes whenever clear nights are forecast within 48 hours.",
    economy:
      "Service demand concentrates on City Centre tower density along No. 3 Road, Steveston historic-core retail, the Ironwood big-box cluster, and Bridgeport industrial-and-airport hospitality. Aviation-adjacent demand is significant given Sea Island and the Vancouver Airport perimeter.",
    hazard:
      "The dominant hazard is big-box parking-lot pedestrian slip during the wet-snow refreeze cycle, which produces the highest single-event claim frequency among our Richmond contracts. Pre-storm brine application on those frontages is standard.",
    transit:
      "Canada Line stations from Bridgeport through Brighouse concentrate City Centre pedestrian density along No. 3 Road, and the YVR airport service window defines a separate aviation-tied sequencing requirement. Routing is built backward from both.",
    history:
      "PlowWow has serviced Richmond since 2015, with the largest seasonal-contract concentration along No. 3 Road from Brighouse to Aberdeen. The Bridgeport industrial cluster has been our highest-growth Richmond segment for three consecutive seasons.",
    caseStudy:
      "An Ironwood retail anchor switched to us mid-season in 2020 after a single freezing-rain event produced 11 documented pedestrian-slip incidents at a previous vendor's property. We rebuilt the lot's snow-storage and brine-application plan, deployed a dedicated unit on site for the season, and incident frequency fell to zero across the remaining events that winter.",
  },
  delta: {
    signature:
      "Delta's signature is the geographic split between Tsawwassen on a coastal peninsula, Ladner on the river, and North Delta on the upland plateau — three distinct microclimates within one municipality. A storm that produces 8 cm at Sunshine Hills can deliver 1 cm at Tsawwassen Beach, and routing reflects that gap.",
    geography:
      "Delta covers Tsawwassen at the mouth of the Fraser delta, Ladner on the river estuary, and North Delta on the Sunshine Hills plateau above 100 metres. The Fraser estuary defines much of the perimeter, and the road network is constrained by Highway 99 and the Alex Fraser Bridge approaches.",
    microclimate:
      "Tsawwassen benefits from the strongest marine moderation of any city in our footprint, often turning forecast snow into rain. Sunshine Hills, in contrast, can experience both colder overnight lows and outflow-driven snow that the lowlands miss entirely.",
    economy:
      "Service demand spans Tsawwassen coastal SFH and strata, Ladner village retail and waterfront residential, North Delta suburban family residential, and the Tilbury industrial cluster. Industrial demand here is significant given the South Fraser Perimeter Road and the Tsawwassen container terminal.",
    hazard:
      "The dominant hazard is industrial-yard tractor-trailer skid on the long approaches to Tsawwassen-area terminals and the Alex Fraser Bridge ramp. Pre-storm brine on those approaches is standard for fleet customers.",
    transit:
      "Delta has limited rail transit, so commercial and strata properties are sequenced around vehicular peak windows on Highway 99, Highway 17 and the Alex Fraser Bridge. The BC Ferries Tsawwassen schedule defines a separate sequencing window for terminal-adjacent properties.",
    history:
      "PlowWow opened a Delta yard in 2017 to address Tilbury industrial demand, and the city now generates a balanced mix of industrial, strata and SFH revenue. Several of our most senior route managers came up through Tilbury routes.",
    caseStudy:
      "A 480,000 sq ft Tilbury distribution centre lost three shipping windows in a single 2020 event under a previous vendor. We rebuilt the lot's snow-storage geometry, pre-staged a 14-tonne loader for the season, and the property has since maintained 100% loading-bay availability across every subsequent event.",
  },
  "white-rock": {
    signature:
      "White Rock's signature is the steep grade from the waterfront promenade up to the Uptown plateau, a roughly 80-metre rise over less than a kilometre that turns wet-snow events into vehicle-slide cascades on residential connector streets. Pre-salting that grade is non-negotiable.",
    geography:
      "The city occupies the bluff and beachfront south of Surrey, climbing from sea-level promenade to the Uptown plateau above 80 metres. The grade is continuous and the road network is largely fed by Johnston Road, Marine Drive and 16 Avenue.",
    microclimate:
      "Marine moderation keeps the waterfront marginally warmer than Uptown during most events, but outflow winds occasionally push cold air down the bluff and refreeze cleared surfaces overnight. Routing locks in re-salt passes when outflow conditions are forecast within 48 hours of an event.",
    economy:
      "Service demand spans Uptown retail and mixed-use, hillside SFH on East and West Beach, coastal residential, and Five Corners strata and local retail. The customer base skews older and contracts here weight toward concierge-style documentation and AGM presentations.",
    hazard:
      "The dominant hazard is grade-related skid on Johnston Road and the bluff-face residential streets, which compound when freezing rain coincides with morning peak. Several contracts pre-salt on any forecast above zero accumulation.",
    transit:
      "White Rock has limited rail transit, so commercial and strata properties are sequenced around vehicular morning peak via Johnston Road and the King George corridor connecting to Surrey. School-bus departure windows define a secondary sequencing constraint.",
    history:
      "PlowWow has serviced White Rock continuously since 2014, with several Five Corners and East Beach strata contracts spanning a decade-plus tenure. The customer base here is one of our most retention-stable.",
    caseStudy:
      "A waterfront mid-rise strata switched to us after a previous vendor failed to dispatch during a 2019 event that left the porte-cochère impassable. We added perimeter mat staging at the lobby entrance, switched the porte-cochère chemistry to a low-spall blend, and lobby-related incidents have been zero across five subsequent winters.",
  },
  mission: {
    signature:
      "Mission's signature is eastern-Fraser-Valley elevation: Cedar Valley and Hatzic sit hundreds of metres above the Fraser, and snowfall there routinely doubles or triples what falls Downtown. Forecasts written for the lowlands chronically underestimate Cedar Valley accumulation.",
    geography:
      "The city climbs from the Fraser at sea level through Downtown at 60 metres to Cedar Valley and Hatzic at over 200 metres. The grade is steep and the road network is largely fed by Highway 11, Cedar Street and Stave Lake Street.",
    microclimate:
      "Outflow winds from the Fraser Canyon push cold air across Mission's elevation gradient, producing the steepest in-city snow-line variation in our network during major events. Trigger thresholds for upper-elevation contracts are set on lower forecast numbers than Downtown.",
    economy:
      "Service demand spans Downtown retail and civic, Cedar Valley new residential developments, Hatzic hillside and rural, and Silverdale suburban SFH. Commercial demand concentrates along 1st Avenue, Lougheed Highway and the Highway 11 corridor.",
    hazard:
      "The dominant hazard is grade-related skid on the Cedar Valley connector roads, which the municipality cannot meaningfully salt at the cadence the slopes require. Several Cedar Valley contracts include private-road salting clauses.",
    transit:
      "West Coast Express service from Mission Station defines the city's morning commute window, and the station's park-and-ride and adjacent commercial frontages are sequenced before the 06:01 inbound train. Missing that window triggers an automatic service credit.",
    history:
      "PlowWow opened a Mission satellite in 2019 to address Cedar Valley response times. The yard is jointly used with our Abbotsford operations during major events and during atmospheric-river transitions.",
    caseStudy:
      "A Cedar Valley townhouse strata of 72 units lost emergency-services access for four days during a 2021 event under a previous vendor. We deployed a tracked skid-steer for the property's narrow inner lanes, restructured snow storage around two previously unused buffer strips, and access has been continuous through every subsequent event.",
  },
  chilliwack: {
    signature:
      "Chilliwack's signature is the eastern-valley combination of high single-event snowfall totals and the Promontory elevation step, which together produce the heaviest sustained accumulation in our network. Multi-day events that drop 40-60 cm on Promontory while delivering 10 cm Downtown are a regular winter occurrence.",
    geography:
      "The city occupies the eastern Fraser Valley floor with the Promontory plateau rising sharply to over 200 metres on the south side. The Vedder and Chilliwack rivers define much of the southern boundary, and the road network is largely fed by Highway 1, Vedder Road and Promontory Road.",
    microclimate:
      "Outflow winds from the Fraser Canyon and the Cascade gap push cold air across Chilliwack with the most consistent intensity of any city in our footprint. Forecast accuracy here is the lowest in our network during winter events.",
    economy:
      "Service demand spans Sardis family residential and retail, Promontory elevation strata and SFH, Yarrow rural and SFH, Vedder riverfront residential, and Downtown mixed-use core. Commercial demand concentrates along Yale Road, Vedder Road and the Cottonwood Mall frontages.",
    hazard:
      "The dominant hazard is Highway 1 on-ramp icing at the Vedder Road, Lickman and Yale Road interchanges, which freeze ahead of municipal salting and produce significant commercial-vehicle skid risk. Pre-storm brine on those approaches is standard.",
    transit:
      "Chilliwack has limited rail transit, so commercial and strata properties are sequenced around vehicular peak windows on Highway 1 and the Vedder Road corridor. Hospital-adjacent properties carry separate emergency-access timing clauses.",
    history:
      "PlowWow opened a Chilliwack yard in 2018 specifically to address Promontory response times. The yard is jointly used with our Abbotsford operations during major events.",
    caseStudy:
      "A Promontory strata of 88 single-family-detached homes lost private-road access for nine days during the 2021 atmospheric-river series under a previous vendor. We deployed a tracked machine and a wheeled loader on site for the remainder of the season, restructured the private-road salting plan, and access has been continuous through every subsequent event.",
  },
};
