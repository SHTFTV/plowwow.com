// Older recovered posts do not always include their parent city in the slug.
// These explicit relationships keep those useful local pages connected to the
// correct city hub instead of leaving them isolated from the crawl graph.
export const BLOG_CITY_OVERRIDES: Record<string, string> = {
  "steveston-snow-removal": "richmond",
  "tsawwassen-snow-removal": "delta",
  "lynn-valley-snow-removal": "north-vancouver",
  "cloverdale-snow-removal": "surrey",
  "kensington-cedar-cottage-snow-removal": "vancouver",
  "snow-removal-renfrew-heights": "vancouver",
  "shaughnessy-snow-removal": "vancouver",
  "snow-removal-in-burquitlam": "coquitlam",
  "heritage-mountain": "port-moody",
  "burke-mountain-snow": "coquitlam",
};
