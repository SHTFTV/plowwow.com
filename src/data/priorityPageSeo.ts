// One source for initial HTML and runtime head state on priority service routes.
export const priorityPageSeo = {
 home: {path:"/", title:"Snow Removal & Salting in the Lower Mainland | PlowWow", description:"Snow clearing, salting and de-icing for strata, commercial and residential properties across Vancouver and the Lower Mainland. Request a reviewed quote.", ogImage:"https://www.plowwow.com/og-default.jpg"},
 vancouver: {path:"/vancouver", title:"Vancouver Snow Removal & Ice Control | PlowWow", description:"Vancouver snow removal and ice control for strata, commercial and residential properties. Plan sidewalks, entrances and parking with a reviewed PlowWow quote.", ogImage:"https://www.plowwow.com/og-vancouver.jpg"}
} as const;
export function vancouverServiceSchema() {return {
 "@context":"https://schema.org", "@type":"Service", "@id":"https://www.plowwow.com/vancouver#service",
 name:"Vancouver snow removal and ice control", url:"https://www.plowwow.com/vancouver", serviceType:"Snow removal, sidewalk clearing, salting and de-icing",
 areaServed:{"@type":"City",name:"Vancouver, British Columbia"}, provider:{"@type":"Organization","@id":"https://www.plowwow.com/#organization",name:"PlowWow",url:"https://www.plowwow.com/",telephone:"+1-604-761-1518"}
};}
