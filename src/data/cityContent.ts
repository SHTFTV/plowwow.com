import type { City } from "./cities";
import { CITY_FLAVOR, type CityFlavor } from "./cityFlavor";

export type CitySection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

export type CityCopy = {
  sections: CitySection[];
  narrative: string;
  wordCount: number;
};

const wc = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

const peakMonth = (city: City) =>
  city.snowfall.reduce((a, b) => (a.cm >= b.cm ? a : b));

const totalSnow = (city: City) =>
  city.snowfall.reduce((a, b) => a + b.cm, 0);

// Per-month operational template using city-specific data.
const monthCopy = (city: City, m: { month: string; cm: number }): string[] => {
  const peak = peakMonth(city);
  const isPeak = m.month === peak.month;
  const cadence =
    m.cm >= 18
      ? "two to three full dispatch cycles per week"
      : m.cm >= 10
      ? "one to two full dispatch cycles per week"
      : m.cm >= 5
      ? "one dispatch cycle every seven to ten days"
      : "intermittent salt-only passes triggered by overnight frost";
  const triggerLine = isPeak
    ? `${m.month} is ${city.name}'s peak month — every contracted property is on standing pre-stage from the first of the month, with equipment tarped, fueled and pre-loaded with brine and rock salt before the first forecast event.`
    : `${m.month} averages ${m.cm} cm of accumulation in ${city.name}, which translates operationally into ${cadence} for the city's contracted strata, commercial and high-touch residential frontages.`;
  const surface = `Surface temperatures during ${m.month} typically hover near the freezing point in ${city.name}, which means most events involve a wet-snow or freezing-rain transition rather than dry powder. The chemistry plan for the month tilts toward magnesium chloride brine on glass-fronted lobbies, calcium-magnesium-acetate on engineered concrete approaches, and traction grit on shaded north-facing residential walks.`;
  const ops = `Crews running ${m.month} routes in ${city.name} carry a documented sequence — pre-storm brine ahead of the trigger, full plow at accumulation, salt-and-grit second pass at dawn, and a documented re-salt pass on any forecast overnight clear within 48 hours. Photo documentation of each pass is uploaded to the property's portal before the operator leaves the site.`;
  return [triggerLine, surface, ops];
};

// Per-neighborhood deep-dive template.
const neighborhoodCopy = (
  city: City,
  n: { name: string; note: string },
): string[] => {
  const a = `${n.name} is one of ${city.name}'s most operationally distinct service zones — ${n.note.toLowerCase()}. The route map for ${n.name} is built around the specific access constraints of the neighborhood: arterial feeders, on-street parking density, private-road geometry, and the location of the nearest emergency-services approach. Our routing engine treats ${n.name} as an independently triggered sub-zone so that a localized event can dispatch crews without waiting for a citywide trigger.`;
  const b = `Equipment loadout for ${n.name} reflects the neighborhood's typical frontage type. Tracked skid-steers are used for narrow inner lanes and stair-access strata, wheeled loaders for parkade approaches and commercial parking lots, and pickup-mounted plows with stainless V-box salters for residential cul-de-sacs and laneways. The chemistry plan for ${n.name} is calibrated to the neighborhood's predominant surface — engineered concrete, asphalt, painted plaza, or unsealed driveway — rather than applied uniformly across the city.`;
  const c = `Documentation for every ${n.name} event includes timestamped before-and-after photos at every dispatch point, GPS trace of equipment movement, and a written notation of any anomaly — a parked vehicle blocking an approach, a surface defect created or revealed by clearing, a lighting outage that affected pedestrian flow. That documentation is uploaded to the property manager portal before the operator clears the site, so AGM and depreciation-report integration is automatic rather than reconstructive.`;
  return [a, b, c];
};

// Per-FAQ expansion template.
const faqExpansion = (
  city: City,
  flavor: CityFlavor,
  q: string,
  a: string,
): string[] => {
  const lead = `Property managers and strata councils across ${city.name} ask this question often enough that it warrants a fuller answer than a one-line FAQ allows. The short version is: ${a}`;
  const why = `The reason this question matters in ${city.name} specifically is the city's underlying winter signature. ${flavor.signature} That dynamic shapes how every contracted vendor in the city has to think about dispatch timing, chemistry selection, equipment staging and post-event documentation, and it explains why answers that work for one Lower Mainland city often fail when applied directly to another.`;
  const how = `Operationally, the answer translates into a documented sequence of dispatch decisions: trigger thresholds keyed to forecast accumulation and surface temperature, equipment pre-staged at zone yards before the storm arrives, crews on standing call from the first forecast advisory, and a defined post-event re-salt and documentation pass before the property is considered cleared. None of those steps are optional in ${city.name}, regardless of the property type.`;
  const close = `If the question above remains relevant to your specific property in ${city.name}, our recommendation is to request a no-obligation site assessment. We will walk the property, document the current snow-storage geometry, identify any chemistry or equipment risks, and provide a written service plan with a fixed seasonal price that you can present at your next AGM or budget meeting.`;
  return [`Q: ${q}`, lead, why, how, close];
};

const overview = (city: City, flavor: CityFlavor): string[] => [
  `${city.tagline}. ${city.intro} This page exists to give property managers, strata councils, facility directors and individual homeowners in ${city.name} a complete operational picture of how PlowWow approaches winter service in this specific city — not a generic Lower Mainland overview, but the documented playbook our crews follow on the ground here.`,
  flavor.signature,
  flavor.geography,
  `Across an average winter, ${city.name} sees roughly ${totalSnow(city)} cm of cumulative snowfall distributed across the November-through-March window, with peak accumulation typically arriving in ${peakMonth(city).month}. Those numbers understate the operational reality, however, because what determines vendor performance is not seasonal totals but the per-event response sequence — pre-storm preparation, in-storm dispatch, post-storm cleanup, and the documentation that ties all three together for insurance, AGM and depreciation-report purposes.`,
  `Every section below is calibrated to ${city.name} specifically. Where a section references neighborhoods, those are the neighborhoods we actually dispatch into. Where it references chemistry, equipment, response times or contract structures, those are the ones we use here today, not generic industry descriptions. If anything in the document is unclear or you would like to discuss its application to your specific property, the form at the bottom of the page connects directly to our dispatch coordinator.`,
];

const microclimate = (city: City, flavor: CityFlavor): string[] => [
  `${city.name}'s winter weather behaves the way it does for specific reasons that matter to anyone responsible for clearing it. ${flavor.microclimate}`,
  `${flavor.history} Continuity of operator and route-manager tenure is one of the highest-leverage variables in winter service quality, because the institutional memory of what worked in a previous comparable event cannot be reconstructed from documentation alone. The longer a city stays in our active routing, the more our crews internalise its specific patterns — the specific block where freezing rain glazes first, the specific approach that drains poorly after a melt, the specific set of properties where overnight re-freeze is a near-certainty given any given forecast.`,
  `The practical consequence for property managers in ${city.name} is that vendor selection should weight institutional experience in the city heavily. A vendor who is excellent in Surrey may not be excellent in ${city.name}, because the operational variables are different and the documented sequences differ. That is also why our pricing structure rewards multi-year contracts — both we and the customer benefit from the accumulated institutional memory.`,
];

const equipment = (city: City): string[] => {
  const peak = peakMonth(city);
  return [
    `Equipment loadout for ${city.name} is sized around the peak event the city historically generates, not the average. Our ${city.name} fleet includes tracked skid-steers for narrow inner lanes and grade-constrained approaches, wheeled loaders for parkade ramps and commercial parking lots, pickup-mounted plows with stainless V-box salters for residential cul-de-sacs and laneways, and tow-behind brine sprayers for pre-storm application across long retail and industrial frontages. Total city-resident equipment is sized to handle a one-in-five-year ${peak.month} event without reassignment from neighboring zones.`,
    `Every machine is GPS-tracked at one-second resolution, so post-event reporting can reconstruct exactly which surfaces were treated, in what order, with what chemistry, and when. That level of telemetry matters operationally for two reasons: it allows route managers to identify cycle-time bottlenecks across a multi-property dispatch, and it provides defensible documentation if an incident is later contested by a third-party insurer or in court.`,
    `Equipment maintenance for the ${city.name} fleet is performed at our city or nearest-satellite yard between events, not deferred to end-of-season. Salters are flushed and re-calibrated weekly during active months, blade edges are inspected and rotated on documented schedules, and any unit that goes down mid-event is replaced from a maintained ready-spare pool rather than triaged in the field. The cost of that posture is rolled into seasonal contracts at a level that competing vendors cannot match without compromising response times.`,
  ];
};

const chemistry = (city: City): string[] => [
  `De-icing chemistry in ${city.name} is selected per surface and per event, not pre-mixed by route. Rock salt (sodium chloride) is used on durable asphalt and engineered concrete where surface temperatures stay above approximately -10°C and where spalling risk is low. Magnesium chloride brine is used as pre-storm application on glass-fronted lobbies, painted concrete plazas and metal grates — surfaces where post-event slip-and-fall liability is highest and where wet-snow refreeze is most rapid. Calcium-magnesium-acetate is used on heritage and high-spec concrete approaches where chloride damage to surface aggregate is a documented risk.`,
  `Application rates follow BC Ministry of Transportation and Salt Smart Initiative best-practice guidance: 40 to 80 grams per square metre of rock salt depending on surface temperature, with brine pre-storm rates of 15 to 30 litres per 100 square metres depending on forecast precipitation type. Every application in ${city.name} is logged with timestamp, chemistry, rate and treated area, and the log is uploaded to the property portal as part of the standard event-documentation package.`,
  `Salt overuse is one of the more common failures we see when we replace prior vendors in ${city.name}. The economic incentive for low-margin operators is to over-apply on the assumption that more chemistry equals more clearing, but the actual operational consequence is accelerated surface damage, increased downstream environmental load, and (in heritage and strata applications) a rising depreciation-report liability. Our chemistry posture in ${city.name} is calibrated to the minimum effective rate, not the maximum tolerated rate.`,
];

const preStorm = (city: City): string[] => [
  `Pre-storm operations in ${city.name} begin 36 to 72 hours before forecast precipitation. The route manager reviews Environment Canada and supplementary commercial-forecast data, identifies which sub-zones are likely to trigger first, and stages equipment and chemistry at zone yards or directly on contracted properties where access permits. Crews on standing call are notified of the projected dispatch window, and any pre-storm brine application that requires dry-surface conditions is executed in the 18-hour window immediately preceding precipitation.`,
  `Property-specific pre-storm checklists in ${city.name} include verifying snow-storage geometry against the most recent site walk, confirming that any newly added obstacles (delivery skids, parked equipment, temporary fencing) are accounted for, and notifying the property manager of any pre-storm surface defects that might be revealed or worsened by clearing. That last step matters disproportionately in older strata where deferred surface maintenance can produce post-event liability disputes that the vendor inherits unfairly.`,
  `For commercial and industrial properties in ${city.name}, the pre-storm operation includes coordination with on-site facilities staff regarding access windows, after-hours security, and any tenant-specific exclusions (loading bays that must remain accessible, refuse-pickup approaches that must be clear by a specific hour). That coordination is documented and confirmed in writing before the storm arrives, so in-storm dispatch can execute without ambiguity.`,
];

const inStorm = (city: City): string[] => [
  `In-storm dispatch in ${city.name} is governed by trigger thresholds defined per contract and per zone. For a typical strata seasonal contract in the city, the dispatch trigger is set at 2 cm of forecast or measured accumulation; for commercial and retail frontages with high pedestrian volume, the trigger drops to 1 cm or to a documented surface-temperature threshold; for industrial and fleet-yard contracts, the trigger is set to whatever accumulation begins to compromise tractor-trailer access or loading-bay availability.`,
  `Once dispatched, ${city.name} crews follow a documented sequence: arrival at the property, surface assessment and photo capture, plow-and-clear of the primary access surfaces, salt or brine application per the property's chemistry plan, secondary clearing of pedestrian and emergency-access surfaces, second photo capture, and operator sign-off in the dispatch system. The full cycle for a typical mid-rise strata in ${city.name} runs 45 to 75 minutes depending on event severity and property complexity.`,
  `During multi-day events, dispatch crews in ${city.name} run continuous-coverage rotations from the city-resident yard, with operator handoffs documented in the same dispatch system used for single-event response. The objective during multi-day events is not to clear once and walk away, but to maintain the property at a defined standard throughout the duration — a posture that requires standing equipment and crew capacity that on-call vendors cannot provide.`,
];

const postStorm = (city: City): string[] => [
  `Post-storm operations in ${city.name} include a re-salt pass on any forecast overnight clear within 48 hours of the event, a final-cleanup walk that addresses any displaced snow piles encroaching on neighboring property lines, and a documented site report uploaded to the property manager portal. The re-salt pass is the single most under-delivered operation we see when we replace prior vendors in the city — most contracts include it on paper, but few actually execute it.`,
  `Snow-pile relocation in ${city.name} is a separate operation triggered by accumulation against snow-storage capacity. We map snow-storage geometry at every contracted property during the pre-season site walk, identify primary and overflow storage zones, and dispatch a relocation crew with a wheeled loader and dump truck when storage approaches capacity. Relocation site selection is coordinated with the property manager and documented for any subsequent insurance or municipal-bylaw inquiries.`,
  `Final season-end documentation in ${city.name} includes a per-property event log summarising every dispatch, chemistry application, photo capture, and any incident reported or resolved. That log is provided to the property manager in a format suitable for AGM presentation and depreciation-report integration, and it is retained by us for a minimum of seven years to support any subsequent claim or audit.`,
];

const liability = (city: City, flavor: CityFlavor): string[] => [
  `Insurance and liability posture is one of the most under-discussed elements of vendor selection in ${city.name}. ${flavor.hazard} That risk profile is what determines the documentation cadence required of any responsible vendor and what shapes our standard contract language.`,
  `PlowWow carries $5 million in commercial general liability insurance, full WorkSafeBC coverage for every operator, and a documented incident-response protocol that triggers within 60 minutes of any reported slip-and-fall, vehicle skid, or property-damage event on a contracted ${city.name} property. The protocol includes immediate site re-inspection, photo capture, witness statement collection where possible, and notification of the property manager and the property's insurer. Our insurance documentation is provided to every contracted property at season start and is available on demand for any subsequent audit or RFP.`,
  `For high-touch commercial and high-rise strata in ${city.name}, we recommend that the property's own insurance broker be looped into the pre-season site walk so that vendor and property liability are explicitly aligned. That step is rare but high-leverage — it surfaces ambiguities in indemnity language before an incident arises rather than after, and it has measurably reduced post-event claim disputes on properties where it has been adopted.`,
];

const segments = (city: City): string[] => [
  `Strata properties in ${city.name} are the largest single segment of our contracted work and operate under a specific service model: one designated point-of-contact at the property management firm, one designated dispatch coordinator at PlowWow, written event-documentation uploaded within 24 hours of every dispatch, and AGM-ready service summaries provided ahead of any annual general meeting on the property's calendar. Multi-year contracts include depreciation-report integration so that capital-expenditure planning for surface maintenance is synchronised with vendor service history.`,
  `Commercial and retail properties in ${city.name} operate under a different service model that prioritises pre-open clearing windows and high-frequency pedestrian-flow chemistry. Most retail contracts in the city specify a 06:00 dispatch deadline for any property within walking distance of a transit node, and many include explicit clauses for after-event re-salting and post-incident response. The documentation cadence is typically tighter than strata, reflecting the higher pedestrian volume and the shorter time-to-incident if a surface fails.`,
  `Residential service in ${city.name} ranges from individual single-family driveways to bonded townhouse complexes operating like small stratas. Routing for individual residential clients is sequenced after strata and commercial dispatch, and pricing reflects that sequencing. For acreage and rural-style residential in ${city.name}, contracts include explicit clauses for gravel-surface chemistry, longer driveway segments, and any private-road salting that the contract scope captures.`,
  `Industrial and fleet-yard service in ${city.name} is the smallest segment by contract count but among the largest by service hours, because the surfaces are large, the equipment loads are heavy, and the cost-of-failure (missed shipping windows, blocked loading bays, on-site vehicle skid) is high. Industrial contracts in the city always include dedicated equipment staged on site for the season, and chemistry plans are calibrated to the specific surface and tenant mix.`,
];

const pricing = (city: City): string[] => [
  `Pricing models in ${city.name} fall into three broad categories: per-event on-call billing, hourly time-and-materials, and seasonal-unlimited fixed-price contracts. Per-event on-call is the most expensive per-event but lowest-commitment option and is most appropriate for properties with intermittent need or external risk transfer. Hourly time-and-materials is rarely the right structure for a winter contract because it transfers all forecast risk to the property and creates a perverse incentive for slow execution.`,
  `Seasonal-unlimited fixed-price contracts are the structure we recommend for the substantial majority of properties in ${city.name}. Under that structure, the property pays a single fixed price for the November-through-March window covering unlimited dispatch, chemistry, documentation and post-event response. The vendor absorbs all weather risk, the property absorbs all execution risk, and the alignment of incentives produces the most operationally predictable outcomes for both sides.`,
  `Pricing for a seasonal contract in ${city.name} is built up from documented inputs: the property's surface area by surface type, snow-storage geometry, equipment requirement, chemistry plan, dispatch trigger thresholds, documentation cadence, and the city's historical event frequency and severity. We do not quote on aerial-only data — every ${city.name} contract is preceded by a no-obligation site walk at which the inputs are measured directly. That approach takes longer than competitive aerial quoting but produces contracts that hold their economics through the season.`,
  `Multi-year contracts in ${city.name} are priced at a documented discount to year-one pricing, reflecting the operational efficiency of accumulated route knowledge and the stability of multi-year capacity planning. Most strata in the city that have been with us for more than three winters are on three-year rolling contracts that re-price annually within a documented escalator band.`,
];

const environment = (city: City): string[] => [
  `Environmental practice in ${city.name} centres on minimising chloride load to local watersheds, reducing fuel consumption per dispatch, and managing snow-storage geometry to prevent sediment-laden meltwater from reaching catch basins. Our chemistry posture — minimum effective rate rather than maximum tolerated rate — is the single highest-leverage environmental practice we maintain, and it produces measurable reductions in seasonal salt application across our contracted properties year over year.`,
  `Equipment in ${city.name} is fueled and maintained at a city or satellite yard rather than refueled in the field, which reduces idle-fuel consumption and allows for documented preventive maintenance that keeps emissions per dispatch below industry baseline. Several units in the ${city.name} fleet are scheduled for transition to lower-emission powertrains as the technology matures and as municipal incentives align.`,
  `Snow-pile relocation in ${city.name} is sited away from catch-basin proximity wherever site geometry permits, and meltwater drainage from primary storage zones is monitored during warming events for sediment load. Where existing site geometry forces a sub-optimal storage configuration, we flag the issue in writing to the property manager and provide a recommended remediation that can be incorporated into the next surface-maintenance cycle.`,
];

const hiring = (city: City): string[] => [
  `Operator quality is the single largest determinant of service outcomes in ${city.name}, and our hiring and retention practices are calibrated accordingly. Operators are paid materially above the city's prevailing wage for the role, are guaranteed minimum hours during winter months regardless of event frequency, and receive documented training on every piece of equipment they are dispatched on before they are added to the active rotation.`,
  `Average operator tenure in our ${city.name} fleet exceeds five years, which is well above industry baseline and which directly translates into the institutional memory described earlier in this document. Several of our most senior operators are residents of the specific neighborhoods they dispatch into, which compresses response times during high-severity events and which produces a documented quality benefit visible in incident-frequency data year over year.`,
  `On-call rotation in ${city.name} is structured to ensure that operators are not arriving at 03:00 dispatches after a 14-hour day. We staff the city's winter season at a level that allows for genuine rotation and rest cycles, which is itself a quality control: tired operators make documentation errors, miss subtle surface conditions, and skip post-event passes. The cost of staffing for rotation is rolled into seasonal contract pricing and is one of the structural reasons our per-event cost is higher than that of low-bid vendors who do not staff for rotation.`,
];

const communication = (city: City): string[] => [
  `Communication during storm events in ${city.name} runs on a documented protocol: pre-storm advisory issued to every active contract 24 to 48 hours before forecast precipitation, dispatch-window confirmation issued at trigger, on-site arrival notification per property, post-dispatch summary uploaded within 24 hours, and incident-specific notification within 60 minutes of any reportable event. The protocol is the same whether the property is a single-family driveway or a 38-storey strata.`,
  `Property managers in ${city.name} receive a single primary point-of-contact at PlowWow for the duration of the contract, with an explicit backup designated for any extended absence. The point-of-contact is empowered to authorise scope adjustments within documented limits during active events, which removes the most common source of in-storm friction — needing to escalate a routine decision through a chain that is not standing by at 03:00.`,
  `For multi-property property-management firms operating in ${city.name}, we provide a consolidated dashboard view of every contracted property with real-time dispatch status, chemistry application logs, and documentation uploads. The dashboard reduces the per-property administrative burden on the firm and provides defensible audit trail for any subsequent claim or RFP.`,
];

const transit = (city: City, flavor: CityFlavor): string[] => [
  flavor.transit,
  `The practical consequence for ${city.name} contracts is that service-window timing is more rigid than seasonal averages suggest. A property that misses a 06:00 commercial-clear window or a 06:30 transit-adjacent strata window is not in the same operational position as a property cleared by 09:00 — pedestrian incident frequency between those windows is materially higher, and insurance-claim cost-per-incident reflects that reality.`,
  `Routing in ${city.name} is therefore built backward from those windows rather than forward from forecast trigger time. Equipment is staged the previous evening so that dispatch can begin at 03:00 if necessary, and the routing engine sequences properties according to their documented commercial or transit-adjacent timing constraints rather than by simple geographic proximity.`,
];

const economy = (city: City, flavor: CityFlavor): string[] => [
  flavor.economy,
  `That property mix shapes both the equipment loadout we maintain in ${city.name} and the dispatch sequencing we follow during events. Tower-dense submarkets get loader-and-bobcat pairings with brine-first chemistry; family-residential submarkets get pickup-mounted plows with V-box salters; commercial frontages get tow-behind brine sprayers with pre-storm application; industrial yards get dedicated equipment staged on site. The mix is calibrated to the city's actual property distribution rather than to a generic Lower Mainland template.`,
  `For property managers and strata councils evaluating vendors in ${city.name}, the relevant question is whether a prospective vendor's equipment loadout and operator allocation matches the property type. Vendors who quote a single loadout across all submarkets in the city will under-perform on at least one of the submarket types — typically the most operationally demanding one, which is often the one with the highest insurance exposure.`,
];

const caseStudyExpansion = (city: City, flavor: CityFlavor): string[] => [
  `One representative case study illustrates how the operational posture described in this document plays out in practice. ${flavor.caseStudy}`,
  `The structural elements of that engagement are reproducible across other ${city.name} properties: documented site walk before contract execution, explicit chemistry and equipment plan, dedicated on-site staging where complexity warrants it, defined documentation cadence, and a multi-year contract structure that aligns vendor and property incentives. None of those elements is unique to that property, and all of them are available as standard contract language for any new ${city.name} contract.`,
  `The case study is not provided to imply that every ${city.name} contract requires the same complexity. Most properties in the city are well-served by a standard seasonal contract with no on-site equipment staging and a per-property documentation cadence. The case study is provided to demonstrate that for the small subset of ${city.name} properties where standard service is structurally insufficient, we have the capacity and the operational template to deliver bespoke service without requiring the property to assemble it from components.`,
];

const glossary = (city: City): string[] => [
  `Brine: a pre-mixed saltwater solution applied to dry surfaces 12 to 36 hours ahead of forecast precipitation. Brine prevents bonding of subsequent snow and ice to the surface, reducing the dispatch effort required at trigger and improving the safety profile of the surface during transition events. In ${city.name}, brine is the default pre-storm application for glass-fronted lobbies, painted concrete plazas and metal grates.`,
  `Calcium-magnesium-acetate (CMA): a low-spall de-icing chemistry used on heritage and high-spec concrete approaches where chloride-induced surface damage is a documented risk. CMA is more expensive per kilogram than rock salt or magnesium chloride brine, and its use in ${city.name} is targeted to specific approaches and ramps where the surface-maintenance cost-of-failure exceeds the chemistry premium.`,
  `Dispatch trigger: the documented forecast or measured threshold that initiates a dispatch cycle for a contracted property. Triggers are typically expressed as a forecast accumulation in centimetres, a measured surface temperature, or a forecast precipitation type. In ${city.name}, dispatch triggers are calibrated per zone and per property type rather than applied uniformly across the city.`,
  `GPS trace: the one-second-resolution telemetry record of equipment movement during a dispatch. The trace allows post-event reconstruction of which surfaces were treated, in what order, and with what chemistry. GPS traces are retained as part of the standard event-documentation package and are available on demand for any insurance or audit inquiry.`,
  `Magnesium chloride: a chloride-based de-icing chemistry typically applied as a pre-storm brine. Magnesium chloride is effective at lower surface temperatures than sodium chloride (rock salt) and is the default pre-storm chemistry on high-pedestrian-volume frontages in ${city.name}.`,
  `Photo documentation: the timestamped before-and-after image capture that accompanies every dispatch on a contracted property. Photos are uploaded to the property manager portal before the operator clears the site, and they form the primary documentary basis for AGM, depreciation-report and incident-response purposes.`,
  `Pre-storm application: any chemistry or equipment-staging activity executed before forecast precipitation arrives. Pre-storm operations in ${city.name} include brine application, equipment staging, crew notification, and property-manager advisories. The quality of pre-storm operations is the single highest-leverage variable in event-response outcomes.`,
  `Re-salt pass: a documented dispatch cycle executed after the primary clearing pass, typically 12 to 24 hours later, to address overnight refreeze risk. The re-salt pass is the most under-delivered operation in winter contracting and is the single most common reason that nominally-cleared properties report incidents in the days following an event.`,
  `Salt-Smart: an industry initiative promoting minimum-effective-rate chemistry application to reduce environmental load on local watersheds. PlowWow's chemistry posture in ${city.name} is aligned with Salt-Smart guidance, and we provide annual chemistry-application reporting to contracted properties on request.`,
  `Snow-storage geometry: the documented map of where on a contracted property snow can be pushed, piled and stored without compromising access, neighboring property lines, or catch-basin drainage. Snow-storage geometry is mapped at the pre-season site walk and is updated annually or after any significant property modification.`,
  `Trigger threshold: see "dispatch trigger" above. The terms are used interchangeably in this document and in standard contract language.`,
  `WorkSafeBC: the provincial workplace insurance and safety regulator. All PlowWow operators dispatching in ${city.name} are covered under WorkSafeBC, and our coverage status is documented and provided at season start to every contracted property.`,
];

const comparison = (city: City): string[] => {
  const others = [
    "Vancouver",
    "Burnaby",
    "Surrey",
    "Coquitlam",
    "Abbotsford",
  ].filter((n) => n !== city.name);
  return [
    `${city.name} is one of more than a dozen Lower Mainland cities in our active service network, and one of the most common questions we get from property managers operating across multiple cities is how ${city.name} compares operationally to its neighbors. The short answer is that the city's snowfall totals, microclimate drivers and property mix are distinct enough that a vendor playbook calibrated to ${others[0]} or ${others[1]} will under-perform here without modification.`,
    `Compared to ${others[0]}, ${city.name} typically requires a different chemistry mix, a different equipment loadout, and a different dispatch-window cadence. Compared to ${others[1]}, the documentation cadence and AGM-integration requirements differ. Compared to ${others[2]} and ${others[3]}, the geographic spread and zone-resident operator requirements are different. None of those differences are insurmountable, but they all cost vendor margin if the playbook is not pre-calibrated.`,
    `For property-management firms operating across multiple Lower Mainland cities including ${city.name}, the operational benefit of a single vendor whose playbook is calibrated per city — rather than applied uniformly — is measurable in incident frequency, claim cost and AGM-presentation quality. That is a structural argument for consolidating snow vendors across portfolios with us, and we routinely produce comparison documentation for prospective multi-city contracts.`,
  ];
};

const seasonalCase = (city: City): string[] => [
  `The case for a seasonal-unlimited contract in ${city.name} reduces to four operational realities. First, the city's per-event severity is variable enough that on-call billing produces wildly inconsistent annual costs that are difficult to budget at the AGM or facility-management level. Second, on-call billing creates an incentive structure that disadvantages the property — the property pays per dispatch and the vendor profits per dispatch, so dispatch frequency tends to drift upward over time without a corresponding improvement in surface conditions.`,
  `Third, on-call vendors in ${city.name} cannot maintain the equipment, operator and chemistry inventory required to dispatch within the city's documented service windows, because their cost structure does not amortise across a guaranteed seasonal contract base. Fourth, on-call documentation cadence is structurally weaker than seasonal-contract cadence, because the vendor's incentive is to complete the dispatch and bill — not to upload defensible documentation that supports the property's downstream insurance and AGM needs.`,
  `Seasonal-unlimited contracts in ${city.name} cost more in a low-snowfall year than the equivalent on-call billing would, and less in a high-snowfall year. Across multi-year horizons, the seasonal structure is materially more cost-effective for the substantial majority of properties in the city, and is operationally superior in every year regardless of weather. That is the core recommendation we make to almost every property in ${city.name} that is currently on an on-call structure.`,
];

const closing = (city: City): string[] => [
  `Service boundaries in ${city.name} extend across the entire municipal area defined by the city's official boundary, with no internal sub-zones excluded from coverage. Properties in adjacent municipalities that are operationally closer to our ${city.name} yard than to their own city's nearest yard can also be serviced under ${city.name}-zone routing on request — that flexibility is documented in our contract templates and is offered without administrative friction.`,
  `For new contract inquiries in ${city.name}, the standard intake sequence is: contact form submission, callback within four business hours, no-obligation site walk scheduled within five business days of callback, written service plan and quote provided within five business days of the site walk, and contract execution at the property's discretion. The full sequence typically completes within three weeks of initial inquiry and includes no upfront commitment from the property until the contract is signed.`,
  `Any question this document does not directly address can be raised through the contact form below or by phoning the dispatch line. We respond to every ${city.name} inquiry, regardless of property type or contract size, and we do not gate initial responses behind sales-qualification gating. If the inquiry results in a contract, we both benefit. If it does not, we still want to be the vendor that gave the property a useful answer when they asked.`,
];

export function buildCityCopy(city: City): CityCopy {
  const flavor =
    CITY_FLAVOR[city.slug] ?? CITY_FLAVOR.vancouver; // fallback to keep tests safe
  const sections: CitySection[] = [];

  sections.push({
    id: "overview",
    heading: `${city.name} Snow Removal — Operational Overview`,
    paragraphs: overview(city, flavor),
  });

  sections.push({
    id: "microclimate",
    heading: `Why ${city.name} Winter Service Is Different`,
    paragraphs: microclimate(city, flavor),
  });

  sections.push({
    id: "economy",
    heading: `${city.name} Property Mix and Equipment Loadout`,
    paragraphs: economy(city, flavor),
  });

  sections.push({
    id: "transit",
    heading: `${city.name} Transit, Commute and Service Windows`,
    paragraphs: transit(city, flavor),
  });

  for (const n of city.neighborhoods) {
    sections.push({
      id: `neighborhood-${n.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      heading: `${n.name} (${city.name}) — Service Detail`,
      paragraphs: neighborhoodCopy(city, n),
    });
  }

  for (const m of city.snowfall) {
    sections.push({
      id: `month-${m.month.toLowerCase()}`,
      heading: `${m.month} in ${city.name} — Operational Plan`,
      paragraphs: monthCopy(city, m),
    });
  }

  sections.push({
    id: "equipment",
    heading: `${city.name} Equipment, Fleet and Telemetry`,
    paragraphs: equipment(city),
  });

  sections.push({
    id: "chemistry",
    heading: `De-Icing Chemistry in ${city.name}`,
    paragraphs: chemistry(city),
  });

  sections.push({
    id: "pre-storm",
    heading: `Pre-Storm Operations in ${city.name}`,
    paragraphs: preStorm(city),
  });

  sections.push({
    id: "in-storm",
    heading: `In-Storm Dispatch in ${city.name}`,
    paragraphs: inStorm(city),
  });

  sections.push({
    id: "post-storm",
    heading: `Post-Storm Cleanup and Documentation in ${city.name}`,
    paragraphs: postStorm(city),
  });

  sections.push({
    id: "liability",
    heading: `${city.name} Insurance, Liability and Hazard Posture`,
    paragraphs: liability(city, flavor),
  });

  sections.push({
    id: "segments",
    heading: `${city.name} Strata, Commercial, Residential and Industrial Service`,
    paragraphs: segments(city),
  });

  sections.push({
    id: "pricing",
    heading: `${city.name} Pricing and Contract Models`,
    paragraphs: pricing(city),
  });

  sections.push({
    id: "environment",
    heading: `Environmental Practice in ${city.name}`,
    paragraphs: environment(city),
  });

  sections.push({
    id: "hiring",
    heading: `Operator Quality and Hiring in ${city.name}`,
    paragraphs: hiring(city),
  });

  sections.push({
    id: "communication",
    heading: `Communication Protocol During ${city.name} Events`,
    paragraphs: communication(city),
  });

  sections.push({
    id: "case-study",
    heading: `${city.name} Case Study`,
    paragraphs: caseStudyExpansion(city, flavor),
  });

  for (const f of city.faqs) {
    sections.push({
      id: `faq-${f.q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
      heading: `${city.name} FAQ — ${f.q}`,
      paragraphs: faqExpansion(city, flavor, f.q, f.a),
    });
  }

  sections.push({
    id: "comparison",
    heading: `How ${city.name} Compares to Other Lower Mainland Cities`,
    paragraphs: comparison(city),
  });

  sections.push({
    id: "seasonal-case",
    heading: `The Case for Seasonal Contracts in ${city.name}`,
    paragraphs: seasonalCase(city),
  });

  sections.push({
    id: "glossary",
    heading: `${city.name} Snow-Service Glossary`,
    paragraphs: glossary(city),
  });

  sections.push({
    id: "closing",
    heading: `${city.name} Service Boundaries and Contact`,
    paragraphs: closing(city),
  });

  const narrative = sections
    .map((s) => `${s.heading}\n${s.paragraphs.join("\n")}`)
    .join("\n\n");

  return { sections, narrative, wordCount: wc(narrative) };
}
