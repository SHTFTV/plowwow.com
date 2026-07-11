// Small runtime helper to set per-route head tags (title, description, canonical, og:*).
// Used by pages without full SSR/Helmet — sufficient for JS-executing crawlers.

const BASE_URL = "https://plowwow.com";

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

export type PageMeta = {
  title: string;
  description: string;
  path: string; // starts with "/"
  noindex?: boolean;
};

export function applyPageMeta({ title, description, path, noindex }: PageMeta) {
  const url = `${BASE_URL}${path}`;
  document.title = title;
  setMetaName("description", description);
  setCanonical(url);
  setMetaProp("og:title", title);
  setMetaProp("og:description", description);
  setMetaProp("og:url", url);
  setMetaProp("og:type", "website");
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  setRobots(noindex ? "noindex, nofollow" : "index, follow");
}
