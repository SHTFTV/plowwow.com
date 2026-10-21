export const serviceExamples = [
 {title:"Sidewalks & steps",price:75,image:"/quote-media/sidewalk.jpg",alt:"Wow shovelling a sidewalk and front steps",caption:"Walkway and step clearing.",description:"Walkway, front steps and entrance."},
 {title:"House & driveway",price:125,image:"/quote-media/residential.jpg",alt:"Wow operating a snow blower on a residential driveway",caption:"Residential driveway clearing.",description:"Single driveway and walkway."},
 {title:"Strata & larger sites",price:null,image:"/quote-media/strata.jpg",alt:"Wow applying grit along a shared townhouse path",caption:"Shared paths and ice management.",description:"Shared paths, parkade ramps and larger lots, scoped for your property."},
 {title:"Storefronts & businesses",price:150,image:"/quote-media/commercial.jpg",alt:"Wow beside a yellow snowplow at a commercial property",caption:"Commercial access and snowplowing.",description:"Storefront entrance and frontage. Parking lots and delivery lanes quoted separately."}
] as const;
const municipalities = ["West Vancouver","North Vancouver","New Westminster","Port Coquitlam","Port Moody","Pitt Meadows","Maple Ridge","Tsawwassen","Vancouver","Richmond","Burnaby","Coquitlam","Surrey","Langley","Delta","Abbotsford","Chilliwack","Mission","White Rock"];
export function matchQuoteCity(address:string,postal:string):string|null {
 if(!/^V[0-9][ABCEGHJ-NPRSTV-Z] ?[0-9][ABCEGHJ-NPRSTV-Z][0-9]$/i.test(postal.trim()))return null;
 return municipalities.find(city=>new RegExp(`(?:^|[,\\s])${city}(?:$|,|\\s+(?:BC|British Columbia|Canada|V[0-9]))`,"i").test(address.trim()))??null;
}
