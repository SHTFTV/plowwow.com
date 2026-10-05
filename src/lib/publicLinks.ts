const aliases: Record<string,string> = {
  "/app-features": "/advanced-technology",
  "/feed": "/rss.xml",
  "/author/colinindustryarmymarketing-com": "/author/plowwow-team",
  "/vancouver-strata-commercial-snow-plowing": "/vancouver",
  "/mertrotown-snow-removal": "/burnaby",
  "/burnaby/snow/removal": "/burnaby",
  "/blog/metrotown-burnaby-strata-commercial-snow-removal": "/burnaby"
};
export function publicLink(href: string | undefined) {
 if (!href || href.startsWith("#")) return href;
 try {
  const url = new URL(href, "https://www.plowwow.com");
  if (!["www.plowwow.com", "plowwow.com"].includes(url.hostname)) return href;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path.includes("%20https")) return path.split("%20https")[0].replace(/\/+$/, "");
  return (aliases[path] || path) + url.search + url.hash;
 } catch { return href; }
}
