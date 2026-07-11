// Runtime helper to set per-route head tags (title, description, canonical, og:*, JSON-LD).
// Sufficient for JS-executing crawlers (Googlebot, Bingbot). Social preview crawlers
// (LinkedIn/Slack/Facebook) fall back to the static index.html og:* tags.

const BASE_URL = "https://plowwow.com";
const JSONLD_ATTR = "data-pagemeta-jsonld";

const setMetaName = (name: string, content: string) => {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.content = content;
};

const setMetaProp = (property: string, content: string) => {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
};

const setCanonical = (href: string) => {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
};

const setRobots = (content: string) => setMetaName("robots", content);

const setJsonLd = (blocks: Record<string, unknown>[]) => {
  document.head.querySelectorAll(`script[${JSONLD_ATTR}]`).forEach((n) => n.remove());
  for (const block of blocks) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute(JSONLD_ATTR, "1");
    s.text = JSON.stringify(block);
    document.head.appendChild(s);
  }
};

export type PageMeta = {
  title: string;
  description: string;
  path: string; // starts with "/"
  noindex?: boolean;
  ogImage?: string; // absolute URL preferred
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export function applyPageMeta({ title, description, path, noindex, ogImage, jsonLd }: PageMeta) {
  const url = `${BASE_URL}${path}`;
  document.title = title;
  setMetaName("description", description);
  setCanonical(url);
  setMetaProp("og:title", title);
  setMetaProp("og:description", description);
  setMetaProp("og:url", url);
  setMetaProp("og:type", "website");
  setMetaName("twitter:card", "summary_large_image");
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  if (ogImage) {
    setMetaProp("og:image", ogImage);
    setMetaName("twitter:image", ogImage);
  }
  setRobots(noindex ? "noindex, nofollow" : "index, follow");
  if (jsonLd) setJsonLd(Array.isArray(jsonLd) ? jsonLd : [jsonLd]);
  else setJsonLd([]);
}

export const PAGEMETA_BASE_URL = BASE_URL;
