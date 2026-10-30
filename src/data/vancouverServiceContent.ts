import type { CityCopy, CitySection } from "./cityContent";

// Evidence-led Vancouver planning copy. Original generic template retained in git history.
export const vancouverSections: CitySection[] = [
  {
    "id": "vancouver-property-scope",
    "heading": "Start with the property and the people using it",
    "paragraphs": [
      "A useful Vancouver snow-removal plan starts with the areas people actually need to reach. For a strata building, that may mean the main entrance, pedestrian gate, stairs, visitor parking and the route between the sidewalk and lobby. A commercial property may need customer access, a loading area and a clear route for staff arriving before opening. A residential request can include a driveway, front steps and the walking connection to the street. List those surfaces separately rather than treating the whole address as one uniform area.",
      "PlowWow offers snow clearing, salting and de-icing enquiries for strata, commercial and residential properties. The appropriate equipment, accepted work and available route depend on the site. Tell us what the building is used for, which areas matter first and who can answer questions about access. An enquiry begins that discussion; it does not confirm that a crew has been dispatched or that a preferred service window has been accepted."
    ]
  },
  {
    "id": "vancouver-sidewalk-plan",
    "heading": "Keep public-sidewalk responsibilities separate from the private scope",
    "paragraphs": [
      "The City of Vancouver says owners and occupants must remove snow and ice from the full width of the sidewalk in front of their property, and along the side of a corner lot, by 10 a.m. each day during the conditions described in its winter guidance. Check the City's current page when preparing your plan. That source describes municipal responsibilities; it is not a promise about PlowWow's response time or an assessment of your particular property.",
      "Mark the sidewalk frontage on the same sketch as the entrance and private walkway so the contractor can distinguish them. Discuss who is responsible for each area, the requested clearing window and what happens when conditions change. If another party maintains an adjacent area, record the boundary instead of assuming the two services join automatically. A clear scope also helps a replacement building contact understand the arrangement without reconstructing the original conversation."
    ]
  },
  {
    "id": "vancouver-access-review",
    "heading": "Describe entrances, ramps and equipment access",
    "paragraphs": [
      "Send a wider view of the property as well as any close detail you want reviewed. Useful context includes gates, stairs, slope changes, a parkade ramp, a narrow pedestrian entrance and the route equipment would take to reach the work. Say whether parked vehicles, deliveries or building operations can limit access. Approximate dimensions can help an early conversation, but label them as approximate and distinguish them from measured quantities in an accepted scope.",
      "For a downtown or mixed-use site, discuss opening hours and the person who can arrange entry. Identify a proposed snow-storage location for review rather than assuming there is spare space beside the driveway. Keep entrances, drainage and other site restrictions visible in the conversation. Do not move or disturb equipment or uncertain hazards to improve a photograph. The site review and agreed service plan determine which methods and access arrangements are appropriate."
    ]
  },
  {
    "id": "vancouver-treatment-plan",
    "heading": "Agree what clearing and ice treatment mean for your site",
    "paragraphs": [
      "Plowing, hand clearing and ice treatment are different tasks. A quote should make clear which surfaces are included, what starts a visit and whether treatment or a further check is part of the arrangement. Ask how the plan deals with a forecast change, continued accumulation or water that may refreeze. These are questions to resolve with the contractor for the actual property, rather than a universal timetable inferred from a city landing page.",
      "Keep product and application decisions with the people responsible for the work and the relevant site requirements. This page does not prescribe a chemical concentration, salt quantity or temperature cutoff. Explain any known surface restrictions or building requirements before a scope is accepted. Where a treatment, follow-up visit or relocation task is outside the proposed work, ask how it would be reviewed and authorised. Clear exclusions are more useful than an undefined promise to handle every condition."
    ]
  },
  {
    "id": "vancouver-quote-review",
    "heading": "Use the estimate as a starting point for a reviewed quote",
    "paragraphs": [
      "The PlowWow online estimate gives you a way to begin describing the property. Follow the estimator's current instructions and review the areas and service option before relying on its result. Beta estimates describe a starting scenario; unusual access, heavy or prolonged snowfall, accumulated snow, relocation and additional work can require a different scope. Keep an estimate, a submitted request and an accepted booking as separate steps.",
      "For a strata or commercial enquiry, include the site address, intended areas, building contact and preferred timing. Ask which assumptions support the quote and what needs checking before it can be accepted. If you are comparing proposals, give each contractor the same description and review the work, exclusions and service triggers alongside the total. A lower or higher figure alone does not show whether two offers cover the same task."
    ]
  },
  {
    "id": "vancouver-contract-handover",
    "heading": "Give the accepted plan an owner and a change process",
    "paragraphs": [
      "Decide who can confirm the scope and who will coordinate access during a winter event. In a managed building, those may be different people. Tell the contractor which person should receive operational messages and which person can review a proposed change. Keep the latest accepted version where the people responsible can find it, with private resident and customer information restricted to the appropriate direct conversation.",
      "Ask what records will be supplied for the service you are considering. Arrival information, notes about completed work and photographs can be discussed as part of the required reporting level. They should describe what actually happened, including an access problem or an excluded area. A record is not a guarantee that an incident cannot occur, that an insurance claim will be accepted or that a premium will fall. Those decisions involve other parties and the applicable terms."
    ]
  },
  {
    "id": "vancouver-local-areas",
    "heading": "Bring the neighbourhood into the access conversation",
    "paragraphs": [
      "Vancouver enquiries can involve Downtown and the West End, Kitsilano and the West Side, Mount Pleasant, East Vancouver and the south side. The neighbourhood name helps locate a request; it does not establish an automatic priority or an available route. Include the actual address and explain the property layout. A storefront entrance, townhouse driveway and apartment parkade can need different arrangements even when they share a nearby street.",
      "Use the linked neighbourhood and planning guides for additional context, then confirm the details that apply to your own site. The map on this page uses City Hall as a geographic reference, not as a PlowWow office or equipment yard. For a property outside Vancouver, use the appropriate service-area page and identify its city in the enquiry. Availability, travel, access and the accepted service window remain subject to direct review."
    ]
  },
  {
    "id": "vancouver-next-step",
    "heading": "Take the next step without assuming a booking",
    "paragraphs": [
      "Start with the Vancouver quote route or call 604-761-1518 to discuss the property. Tell us whether you need a planned seasonal arrangement, booked visits or an on-call enquiry, and ask what can currently be offered. Include any fixed building milestone and the decision you need next. We keep the estimate and request routes available on this page so you can move from general information to a property-specific discussion.",
      "Before treating the work as confirmed, check the accepted scope, price, timing and contact arrangements with PlowWow. If a council, owner or facilities manager needs to approve the proposal, keep that decision visible. Save the current written agreement and any later revision. The goal is a usable winter-service plan for the actual site, supported by clear responsibilities and a direct contact route, rather than a promise based only on a postcode, a promotional image or a general forecast."
    ]
  }
];
export function vancouverServiceCopy(): CityCopy {
 const narrative=vancouverSections.map(s=>[s.heading,...s.paragraphs].join("\n\n")).join("\n\n");
 return {sections:vancouverSections,narrative,wordCount:narrative.trim().split(/\s+/).length};
}
