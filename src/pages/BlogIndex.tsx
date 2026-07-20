import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { legacyBlogSlugs } from "./LegacyPage";
import { blogPosts } from "@/generated/blog-posts";

const blogPostBySlug = new Map(blogPosts.map((p) => [p.slug, p]));
const publishedAtBySlug: Record<string, string> = Object.fromEntries(
  blogPosts.map((p) => [p.slug, p.publishedAt]),
);
const updatedAtBySlug: Record<string, string> = Object.fromEntries(
  blogPosts.map((p) => [p.slug, p.updatedAt]),
);
const formatDate = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

const blogFiles = import.meta.glob("/src/content/legacy/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const titleFor = (slug: string) => {
  const path = Object.keys(blogFiles).find((p) => p.endsWith(`/${slug}.md`));
  if (!path) return slug;
  const raw = blogFiles[path];
  const m = raw.match(/^Title:\s*(.+)$/m);
  return (m?.[1] ?? slug).replace(/\s*\|\s*PlowWow.*$/i, "").trim();
};

// Strip Jina header + markdown noise to get a short plain-text summary.
const summaryFor = (slug: string) => {
  const path = Object.keys(blogFiles).find((p) => p.endsWith(`/${slug}.md`));
  if (!path) return "";
  const raw = blogFiles[path];
  const bodyMatch = raw.match(/Markdown Content:\s*\n([\s\S]*)$/);
  const body = (bodyMatch?.[1] ?? raw)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/[#>*_`>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return body.slice(0, 200) + (body.length > 200 ? "…" : "");
};

const imageFor = (slug: string) => blogPostBySlug.get(slug)?.image ?? null;

// Category taxonomy. Derived from slug + title keywords. Order matters —
// first match wins (so "strata" beats "neighborhood" when both apply).
type Category = "All" | "Strata" | "Commercial" | "Neighborhoods" | "Tips & News";
export const BLOG_CATEGORIES: Category[] = [
  "All",
  "Neighborhoods",
  "Strata",
  "Commercial",
  "Tips & News",
];

const NEIGHBORHOOD_HINTS = [
  "burnaby", "vancouver", "richmond", "surrey", "delta", "langley", "coquitlam",
  "port-coquitlam", "port-moody", "maple-ridge", "pitt-meadows", "new-westminster",
  "north-vancouver", "west-vancouver", "squamish", "tsawwassen", "abbotsford",
  "chilliwack", "mission", "white-rock", "anmore", "belcarra", "lynn-valley",
  "steveston", "fort-langley", "cloverdale", "metrotown", "kerrisdale",
  "shaughnessy", "killarney", "edmonds", "burquitlam", "champlain", "renfrew",
  "kensington", "arbutus", "sapperton", "burke-mountain", "heritage-mountain",
  "silver-valley", "buckingham", "middlegate", "middle-gate", "sfu", "edgemont",
  "deep-cove", "lonsdale",
];

const categoryFor = (slug: string, title: string): Category => {
  const hay = (slug + " " + title).toLowerCase();
  if (hay.includes("strata") || hay.includes("apartment") || hay.includes("condo")) {
    return "Strata";
  }
  if (
    hay.includes("commercial") ||
    hay.includes("strip-mall") ||
    hay.includes("parking") ||
    hay.includes("business")
  ) {
    return "Commercial";
  }
  if (NEIGHBORHOOD_HINTS.some((h) => hay.includes(h))) return "Neighborhoods";
  return "Tips & News";
};

// Wrap query matches in <mark> for visible highlighting. Case-insensitive,
// safe against regex injection by escaping the needle.
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Split a query into distinct terms. Supports "quoted phrases" as single
// terms (matched verbatim including internal whitespace), with remaining
// whitespace-separated bare words. Deduped and lowercased.
const tokenize = (query: string) => {
  const terms: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query)) !== null) {
    const raw = (m[1] ?? m[2] ?? "").trim().toLowerCase();
    if (raw) terms.push(raw);
  }
  return Array.from(new Set(terms));
};

// --- Fuzzy matching --------------------------------------------------------
// Small Levenshtein helper: a term matches if the haystack contains it OR any
// tokenized word is within a small edit distance (1 for 4–5 char terms, 2 for
// 6+). Cheap, dependency-free, gives basic typo tolerance for the blog search.
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
};
const fuzzyThreshold = (term: string) => (term.length >= 6 ? 2 : term.length >= 4 ? 1 : 0);
const splitTokens = (h: string) => h.split(/[^a-z0-9]+/).filter(Boolean);
const matchesTerm = (term: string, haystack: string, tokens: string[]): boolean => {
  if (haystack.includes(term)) return true;
  const thr = fuzzyThreshold(term);
  if (thr === 0) return false;
  for (const tok of tokens) {
    if (Math.abs(tok.length - term.length) > thr) continue;
    if (levenshtein(tok, term) <= thr) return true;
  }
  // Also allow fuzzy against sliding windows of the joined haystack for
  // multi-word queries entered with quotes: "vancouvr strata".
  if (term.includes(" ")) {
    for (const tok of tokens) {
      if (levenshtein(tok, term.replace(/\s+/g, "")) <= thr) return true;
    }
  }
  return false;
};

const highlight = (text: string, query: string) => {
  const terms = tokenize(query);
  if (terms.length === 0) return text;
  // Extend the exact-term set with any near-matching tokens from the text so
  // fuzzy-matched cards still visibly highlight the responsible word.
  const lower = text.toLowerCase();
  const textTokens = Array.from(new Set(splitTokens(lower)));
  const expanded = new Set<string>(terms);
  for (const t of terms) {
    if (lower.includes(t)) continue;
    const thr = fuzzyThreshold(t);
    if (thr === 0) continue;
    for (const tok of textTokens) {
      if (Math.abs(tok.length - t.length) <= thr && levenshtein(tok, t) <= thr) {
        expanded.add(tok);
      }
    }
  }
  const pattern = Array.from(expanded)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  if (!pattern) return text;
  const re = new RegExp(`(${pattern})`, "ig");
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="bg-secondary/40 text-foreground rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
};

const PAGE_SIZE = 8;
// Default pixels of viewport padding considered "out of view" for the
// active-card scroll trigger. User-adjustable via the settings control below
// and persisted to localStorage.
const SCROLL_PADDING_DEFAULT = 96;
const SCROLL_PADDING_MIN = 0;
const SCROLL_PADDING_MAX = 400;
const SCROLL_PADDING_STORAGE_KEY = "blog:scrollViewportPadding";
const SMOOTH_SCROLL_STORAGE_KEY = "blog:smoothAutoScroll";
const ACTIVE_SLUG_STORAGE_KEY = "blog:activeSlug";
const PAGE_JUMP_SIZE_STORAGE_KEY = "blog:pageJumpSize";
const PAGE_JUMP_SIZE_DEFAULT = 5;
const PAGE_JUMP_SIZE_MIN = 2;
const PAGE_JUMP_SIZE_MAX = 20;

const BlogIndex = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Sort key & date filter come from the URL so they're shareable.
  const rawSort = searchParams.get("sort") ?? "published";
  const sortBy: "published" | "updated" =
    rawSort === "updated" ? "updated" : "published";
  const rawWindow = searchParams.get("window") ?? "all";
  const dateWindow: "all" | "7d" | "30d" | "90d" | "365d" =
    rawWindow === "7d" || rawWindow === "30d" || rawWindow === "90d" || rawWindow === "365d"
      ? rawWindow
      : "all";
  const windowMs: Record<typeof dateWindow, number | null> = {
    all: null,
    "7d": 7 * 864e5,
    "30d": 30 * 864e5,
    "90d": 90 * 864e5,
    "365d": 365 * 864e5,
  };

  // Newest first (left→right, top→bottom). Falls back to alpha for posts
  // without a date entry so they still appear deterministically.
  const allPosts = useMemo(
    () => {
      const slugs = Array.from(
        new Set([...blogPosts.map((post) => post.slug), ...legacyBlogSlugs]),
      );
      const keyOf = (slug: string) =>
        sortBy === "updated"
          ? updatedAtBySlug[slug] ?? publishedAtBySlug[slug] ?? ""
          : publishedAtBySlug[slug] ?? "";
      return slugs.sort((a, b) => {
        const da = keyOf(a);
        const db = keyOf(b);
        if (da && db && da !== db) return db.localeCompare(da);
        if (da && !db) return -1;
        if (!da && db) return 1;
        return a.localeCompare(b);
      });
    },
    [sortBy],
  );

  const query = (searchParams.get("q") ?? "").trim();
  const terms = useMemo(() => tokenize(query), [query]);

  const rawCat = searchParams.get("cat") ?? "All";
  const activeCat: Category = (BLOG_CATEGORIES as string[]).includes(rawCat)
    ? (rawCat as Category)
    : "All";

  // Per-post category, memoized so chip filtering and badge rendering share
  // the same derivation without re-parsing markdown on every render.
  const postCategories = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const slug of allPosts) map[slug] = categoryFor(slug, titleFor(slug));
    return map;
  }, [allPosts]);

  // Counts per category (computed against ALL posts, ignoring the active
  // category filter so chip counts don't change as the user filters).
  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      All: allPosts.length,
      Neighborhoods: 0,
      Strata: 0,
      Commercial: 0,
      "Tips & News": 0,
    };
    for (const slug of allPosts) counts[postCategories[slug]] += 1;
    return counts;
  }, [allPosts, postCategories]);

  const posts = useMemo(() => {
    const cutoff = windowMs[dateWindow];
    const now = Date.now();
    return allPosts.filter((slug) => {
      if (activeCat !== "All" && postCategories[slug] !== activeCat) return false;
      if (cutoff != null) {
        const iso =
          sortBy === "updated"
            ? updatedAtBySlug[slug] ?? publishedAtBySlug[slug]
            : publishedAtBySlug[slug];
        if (!iso) return false;
        const t = Date.parse(iso);
        if (!Number.isFinite(t) || now - t > cutoff) return false;
      }
      if (terms.length === 0) return true;
      const haystack = (
        titleFor(slug) +
        " " +
        slug +
        " " +
        summaryFor(slug)
      ).toLowerCase();
      const tokens = splitTokens(haystack);
      return terms.every((t) => matchesTerm(t, haystack, tokens));
    });
  }, [allPosts, terms, activeCat, postCategories, dateWindow, sortBy]);

  const setCategory = (next: Category) => {
    const params = new URLSearchParams(searchParams);
    if (next === "All") params.delete("cat");
    else params.set("cat", next);
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const setSort = (next: "published" | "updated") => {
    const params = new URLSearchParams(searchParams);
    if (next === "published") params.delete("sort");
    else params.set("sort", next);
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const setDateWindow = (next: typeof dateWindow) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("window");
    else params.set("window", next);
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));

  const requested = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(requested)
    ? Math.min(Math.max(1, requested), totalPages)
    : 1;

  const start = (page - 1) * PAGE_SIZE;
  const visible = posts.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    const catLabel = activeCat === "All" ? "" : ` — ${activeCat}`;
    const title =
      page === 1
        ? `PlowWow Blog${catLabel} — Snow Removal Insights & Strata Tips`
        : `PlowWow Blog${catLabel} — Page ${page} of ${totalPages}`;
    document.title = title;

    const description =
      activeCat === "All"
        ? "PlowWow blog: snow removal insights, neighborhood guides, and strata tips for Greater Vancouver, BC."
        : `${activeCat} posts on the PlowWow blog — snow removal, strata, and commercial insights for Greater Vancouver, BC.`;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const setProp = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const setCanonical = (href: string) => {
      let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!el) { el = document.createElement("link"); el.rel = "canonical"; document.head.appendChild(el); }
      el.href = href;
    };
    const URL_BASE = "https://plowwow.com/blog";
    // Self-referencing canonical for tag-listing + paginated variants so
    // /blog?cat=Strata doesn't consolidate into /blog. Order: cat, then page.
    const qs: string[] = [];
    if (activeCat !== "All") qs.push(`cat=${encodeURIComponent(activeCat)}`);
    if (page > 1) qs.push(`page=${page}`);
    const URL_ABS = qs.length ? `${URL_BASE}?${qs.join("&")}` : URL_BASE;
    const OG_IMAGE = "https://plowwow.com/og-default.jpg";
    setMeta("description", description);
    setProp("og:title", title);
    setProp("og:description", description);
    setProp("og:type", "website");
    setProp("og:site_name", "PlowWow");
    setProp("og:locale", "en_CA");
    setProp("og:url", URL_ABS);
    setProp("og:image", OG_IMAGE);
    setProp("og:image:secure_url", OG_IMAGE);
    setProp("og:image:width", "1200");
    setProp("og:image:height", "630");
    setProp("og:image:alt", "PlowWow Blog — Snow Removal Insights");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:site", "@plowwow");
    setMeta("twitter:creator", "@plowwow");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", OG_IMAGE);
    setMeta("twitter:image:alt", "PlowWow Blog — Snow Removal Insights");
    setCanonical(URL_ABS);

    // rel="prev" / rel="next" for paginated blog index — preserves active
    // category filter across pages so crawlers stay within the same listing.
    const pagedUrl = (n: number) => {
      const p: string[] = [];
      if (activeCat !== "All") p.push(`cat=${encodeURIComponent(activeCat)}`);
      if (n > 1) p.push(`page=${n}`);
      return p.length ? `${URL_BASE}?${p.join("&")}` : URL_BASE;
    };
    const setRel = (rel: "prev" | "next", href: string | null) => {
      const existing = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!href) { existing?.remove(); return; }
      const el = existing ?? document.createElement("link");
      el.rel = rel;
      el.href = href;
      if (!existing) document.head.appendChild(el);
    };
    setRel("prev", page > 1 ? pagedUrl(page - 1) : null);
    setRel("next", page < totalPages ? pagedUrl(page + 1) : null);

    const ldId = "blog-index-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: URL_ABS,
    });
    document.head.appendChild(ld);

    // WebPage JSON-LD — url MUST equal canonical for parity tests.
    const wpId = "blog-index-webpage-jsonld";
    document.getElementById(wpId)?.remove();
    const wp = document.createElement("script");
    wp.type = "application/ld+json";
    wp.id = wpId;
    wp.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: URL_ABS,
    });
    document.head.appendChild(wp);

    // ItemList JSON-LD — communicates ordering + pagination to search engines
    // for the current page of the (filtered) blog index.
    const ilId = "blog-index-itemlist-jsonld";
    document.getElementById(ilId)?.remove();
    const il = document.createElement("script");
    il.type = "application/ld+json";
    il.id = ilId;
    il.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      url: URL_ABS,
      numberOfItems: posts.length,
      itemListOrder:
        sortBy === "updated"
          ? "https://schema.org/ItemListOrderDescending"
          : "https://schema.org/ItemListOrderDescending",
      itemListElement: visible.map((slug, i) => ({
        "@type": "ListItem",
        position: start + i + 1,
        url: `https://plowwow.com/${slug}/`,
        name: titleFor(slug),
      })),
    });
    document.head.appendChild(il);

    const bcId = "blog-index-breadcrumb-jsonld";
    document.getElementById(bcId)?.remove();
    const bc = document.createElement("script");
    bc.type = "application/ld+json";
    bc.id = bcId;
    const crumbs: any[] = [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://plowwow.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: URL_BASE },
    ];
    if (activeCat !== "All") {
      crumbs.push({
        "@type": "ListItem",
        position: 3,
        name: activeCat,
        item: `${URL_BASE}?cat=${encodeURIComponent(activeCat)}`,
      });
    }
    bc.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs,
    });
    document.head.appendChild(bc);
    return () => {
      document.getElementById(ldId)?.remove();
      document.getElementById(wpId)?.remove();
      document.getElementById(ilId)?.remove();
      document.getElementById(bcId)?.remove();
      document.querySelector('link[rel="prev"]')?.remove();
      document.querySelector('link[rel="next"]')?.remove();
    };
  }, [page, totalPages, activeCat, posts.length, visible, sortBy, start]);


  const goTo = (next: number) => {
    const params = new URLSearchParams(searchParams);
    if (next === 1) params.delete("page");
    else params.set("page", String(next));
    setSearchParams(params);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Local input state lets typing feel instant; the URL/filter only updates
  // after the user pauses (debounce), so we don't refilter or push history on
  // every keystroke.
  const [draft, setDraft] = useState(query);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation across the visible (current-page) results.
  // -1 = nothing highlighted; 0..visible.length-1 = active card.
  const [activeIndex, setActiveIndex] = useState(-1);
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  // Helper: clamp + parse a stored padding value into a safe number.
  const parseStoredPadding = (raw: string | null): number | null => {
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return null;
    return Math.min(SCROLL_PADDING_MAX, Math.max(SCROLL_PADDING_MIN, n));
  };

  // User-configurable viewport padding for the auto-scroll trigger. Hydrated
  // from localStorage on mount and persisted on change. Setter wraps the
  // raw setter so writes also update storage in one place — which keeps the
  // cross-tab sync below from echoing back.
  const [scrollPadding, _setScrollPadding] = useState<number>(SCROLL_PADDING_DEFAULT);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = parseStoredPadding(window.localStorage.getItem(SCROLL_PADDING_STORAGE_KEY));
    if (initial != null) _setScrollPadding(initial);
  }, []);
  const setScrollPadding = useCallback((next: number) => {
    const clamped = Math.min(SCROLL_PADDING_MAX, Math.max(SCROLL_PADDING_MIN, next));
    _setScrollPadding(clamped);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SCROLL_PADDING_STORAGE_KEY, String(clamped));
    }
  }, []);

  // Toggle for smooth auto-scrolling of the active card. When off, the page
  // does not auto-scroll the selection into view at all.
  const [smoothScroll, _setSmoothScroll] = useState<boolean>(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(SMOOTH_SCROLL_STORAGE_KEY);
    if (raw === "false") _setSmoothScroll(false);
  }, []);
  const setSmoothScroll = useCallback((next: boolean) => {
    _setSmoothScroll(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SMOOTH_SCROLL_STORAGE_KEY, String(next));
    }
  }, []);

  // Configurable PageUp/PageDown jump size. Clamped to a sensible range and
  // persisted (with cross-tab sync) like the other selection settings.
  const parseStoredJumpSize = (raw: string | null): number | null => {
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return null;
    return Math.min(PAGE_JUMP_SIZE_MAX, Math.max(PAGE_JUMP_SIZE_MIN, n));
  };
  const [pageJumpSize, _setPageJumpSize] = useState<number>(PAGE_JUMP_SIZE_DEFAULT);
  const [pageJumpTipOpen, setPageJumpTipOpen] = useState(false);
  const pageJumpTipRef = useRef<HTMLSpanElement | null>(null);
  const pageJumpTipBtnRef = useRef<HTMLButtonElement | null>(null);
  const pageJumpTipContentRef = useRef<HTMLSpanElement | null>(null);
  const closePageJumpTip = useCallback((restoreFocus: boolean) => {
    setPageJumpTipOpen(false);
    if (restoreFocus) {
      // Defer so the button isn't blocked by the same event that closed it.
      requestAnimationFrame(() => pageJumpTipBtnRef.current?.focus());
    }
  }, []);
  useEffect(() => {
    if (!pageJumpTipOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePageJumpTip(true);
        return;
      }
      if (e.key === "Tab") {
        // Focus trap: cycle Tab/Shift+Tab between the trigger button and the
        // tooltip body so keyboard users stay inside the tooltip until it
        // closes (Escape, outside click, or hover-out).
        const btn = pageJumpTipBtnRef.current;
        const tip = pageJumpTipContentRef.current;
        if (!btn || !tip) return;
        e.preventDefault();
        const active = document.activeElement;
        const next = active === btn ? tip : btn;
        next.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const root = pageJumpTipRef.current;
      if (root && !root.contains(e.target as Node)) closePageJumpTip(true);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pageJumpTipOpen, closePageJumpTip]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = parseStoredJumpSize(window.localStorage.getItem(PAGE_JUMP_SIZE_STORAGE_KEY));
    if (initial != null) _setPageJumpSize(initial);
  }, []);
  const setPageJumpSize = useCallback((next: number) => {
    const clamped = Math.min(PAGE_JUMP_SIZE_MAX, Math.max(PAGE_JUMP_SIZE_MIN, next));
    _setPageJumpSize(clamped);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PAGE_JUMP_SIZE_STORAGE_KEY, String(clamped));
    }
  }, []);

  // Cross-tab sync. The browser fires `storage` events on OTHER tabs/windows
  // sharing this origin when localStorage changes — perfect for live syncing
  // settings without a backend round-trip. The originating tab does not
  // receive the event, so we never echo our own writes.
  // Ref mirrors so the storage listener can resolve slug→index and gate
  // restores by the current filter scope without re-binding on every change.
  const visibleRef = useRef<string[]>([]);
  const queryRef = useRef<string>(query);
  const pageRef = useRef<number>(1);

  // Persisted shape for the active selection. Scoped by query + page so we
  // only restore when the *same* result set is on screen in another tab.
  type PersistedActive = { q: string; page: number; slug: string };
  const parsePersistedActive = (raw: string | null): PersistedActive | null => {
    if (!raw) return null;
    try {
      const v = JSON.parse(raw) as Partial<PersistedActive>;
      if (
        typeof v?.q === "string" &&
        typeof v?.page === "number" &&
        typeof v?.slug === "string"
      ) {
        return { q: v.q, page: v.page, slug: v.slug };
      }
    } catch {
      /* ignored — bad/legacy value */
    }
    return null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return;
      if (e.key === SCROLL_PADDING_STORAGE_KEY) {
        const next = parseStoredPadding(e.newValue);
        if (next != null) _setScrollPadding(next);
      } else if (e.key === SMOOTH_SCROLL_STORAGE_KEY) {
        if (e.newValue === "true" || e.newValue === "false") {
          _setSmoothScroll(e.newValue === "true");
        }
      } else if (e.key === PAGE_JUMP_SIZE_STORAGE_KEY) {
        const next = parseStoredJumpSize(e.newValue);
        if (next != null) _setPageJumpSize(next);
      } else if (e.key === ACTIVE_SLUG_STORAGE_KEY) {
        const parsed = parsePersistedActive(e.newValue);
        if (!parsed) {
          setActiveIndex(-1);
          return;
        }
        // Only apply if the other tab's filter scope matches ours.
        if (parsed.q !== queryRef.current || parsed.page !== pageRef.current) return;
        const idx = visibleRef.current.indexOf(parsed.slug);
        if (idx >= 0) setActiveIndex(idx);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);


  // Keep the input in sync if the URL changes externally (back/forward, link).
  useEffect(() => {
    setDraft(query);
  }, [query]);

  const commitQuery = (next: string) => {
    const params = new URLSearchParams(searchParams);
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    // Searching always resets pagination back to page 1.
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const onDraftChange = (next: string) => {
    setDraft(next);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      commitQuery(next);
      debounceRef.current = null;
    }, 250);
  };

  const clearQuery = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setDraft("");
    commitQuery("");
  };

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  // Keep refs in sync for the cross-tab storage listener.
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    queryRef.current = query;
    pageRef.current = page;
  }, [query, page]);

  // Reset the active selection whenever the result set or page changes so we
  // don't keep highlighting an index that no longer exists. Restore from
  // storage only when the persisted entry was scoped to this exact query +
  // page (so a selection on "snow" doesn't leak into a search for "burnaby").
  // Otherwise auto-select the top match when a query is active.
  useEffect(() => {
    const fallback = () =>
      setActiveIndex(query && visible.length > 0 ? 0 : -1);
    if (typeof window === "undefined") {
      fallback();
      return;
    }
    const persisted = parsePersistedActive(
      window.localStorage.getItem(ACTIVE_SLUG_STORAGE_KEY),
    );
    if (persisted && persisted.q === query && persisted.page === page) {
      const idx = visible.indexOf(persisted.slug);
      if (idx >= 0) {
        setActiveIndex(idx);
        return;
      }
    }
    fallback();
  }, [page, query, visible]);

  // Persist the active slug (scoped to current query + page) across tabs.
  // Skip the write when the serialized value already matches what's stored
  // to avoid echo loops via the storage event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = activeIndex >= 0 ? visible[activeIndex] ?? null : null;
    const current = window.localStorage.getItem(ACTIVE_SLUG_STORAGE_KEY);
    if (slug == null) {
      if (current !== null) window.localStorage.removeItem(ACTIVE_SLUG_STORAGE_KEY);
      return;
    }
    const next = JSON.stringify({ q: query, page, slug } satisfies PersistedActive);
    if (current !== next) window.localStorage.setItem(ACTIVE_SLUG_STORAGE_KEY, next);
  }, [activeIndex, visible, query, page]);



  // Scroll the active card into view, but only when (a) the selected slug
  // actually changes and (b) the card is not already fully visible in the
  // viewport. This avoids jittery smooth-scrolls while typing or when the
  // top match is already on screen.
  const lastScrolledSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeIndex < 0) {
      lastScrolledSlugRef.current = null;
      return;
    }
    const slug = visible[activeIndex];
    if (!slug || slug === lastScrolledSlugRef.current) return;
    const el = cardRefs.current[activeIndex];
    if (!el) return;
    lastScrolledSlugRef.current = slug;

    const rect = el.getBoundingClientRect();
    const viewH = window.innerHeight || document.documentElement.clientHeight;
    const fullyVisible =
      rect.top >= scrollPadding &&
      rect.bottom <= viewH - scrollPadding;
    if (fullyVisible) return;
    if (!smoothScroll) return;

    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex, visible, scrollPadding, smoothScroll]);

  const openActive = useCallback(() => {
    const slug = visible[activeIndex];
    if (slug) navigate(`/${slug}`);
  }, [navigate, visible, activeIndex]);

  // Global keyboard shortcuts (only on /blog):
  //   "/" or Cmd/Ctrl+K → focus the search input
  //   ArrowDown / ArrowUp → move selection across the visible results
  //   Home / End → jump to the first / last visible result
  //   Enter → open the active result (works while typing too)
  //   Escape (when input is focused) → clear the query
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const path = window.location.pathname.replace(/\/+$/, "");
      if (path !== "/blog") return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (target?.isContentEditable ?? false);

      const isFocusShortcut =
        (e.key === "/" && !isTyping) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k");

      if (isFocusShortcut) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      if (visible.length === 0) return;

      // Don't hijack Home/End while the user is typing in the search input —
      // those keys should still move the text caret.
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) =>
          i < 0 ? 0 : Math.min(i + 1, visible.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? 0 : i - 1));
      } else if (e.key === "PageDown" && !isTyping) {
        e.preventDefault();
        setActiveIndex((i) =>
          Math.min((i < 0 ? 0 : i) + pageJumpSize, visible.length - 1),
        );
      } else if (e.key === "PageUp" && !isTyping) {
        e.preventDefault();
        setActiveIndex((i) => Math.max((i < 0 ? 0 : i) - pageJumpSize, 0));
      } else if (e.key === "Home" && !isTyping) {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End" && !isTyping) {
        e.preventDefault();
        setActiveIndex(visible.length - 1);
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        openActive();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location.pathname, visible, activeIndex, openActive, pageJumpSize]);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-16 md:py-20 bg-gradient-to-b from-muted/40 to-background">
          <div className="container max-w-4xl">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">
              PlowWow Journal
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3">
              Blog
            </h1>
            <p className="text-muted-foreground text-lg">
              Neighborhood guides, strata snow-removal playbooks, and field notes from
              every PlowWow storm response.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container max-w-6xl">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    if (draft) {
                      clearQuery();
                    } else {
                      e.currentTarget.blur();
                    }
                  }
                }}
                placeholder="Search posts by title or slug…   ( press / to focus, Esc to clear )"
                aria-label="Search blog posts"
                aria-keyshortcuts="/ Escape Control+K Meta+K"
                className="w-full rounded-full border border-border bg-card pl-11 pr-20 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <kbd className="hidden md:inline-flex absolute right-12 top-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground pointer-events-none">
                /
              </kbd>
              {draft && (
                <button
                  type="button"
                  onClick={clearQuery}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Filter posts by category"
              className="mb-6 flex flex-wrap gap-2"
            >
              {BLOG_CATEGORIES.map((cat) => {
                const isActive = cat === activeCat;
                return (
                  <button
                    key={cat}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border border-primary"
                        : "bg-card border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {cat}
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {categoryCounts[cat]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="Sort posts"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1"
              >
                <span className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sort
                </span>
                {([
                  ["published", "Newest published"],
                  ["updated", "Recently updated"],
                ] as const).map(([key, label]) => {
                  const isActive = sortBy === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSort(key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="Filter by date"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1"
              >
                <span className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {sortBy === "updated" ? "Updated" : "Published"}
                </span>
                {([
                  ["all", "All time"],
                  ["7d", "7 days"],
                  ["30d", "30 days"],
                  ["90d", "90 days"],
                  ["365d", "1 year"],
                ] as const).map(([key, label]) => {
                  const isActive = dateWindow === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setDateWindow(key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>


            <details className="mb-6 rounded-xl border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none font-semibold text-foreground">
                Search settings
              </summary>
              <div className="mt-3 flex flex-col gap-2">
                <label htmlFor="scroll-padding" className="flex items-center justify-between gap-4">
                  <span>
                    Scroll viewport padding
                    <span className="ml-2 text-xs text-muted-foreground/80">
                      (triggers auto-scroll when the selected card is within this many pixels of the viewport edge)
                    </span>
                  </span>
                  <span className="font-mono text-foreground tabular-nums">
                    {scrollPadding}px
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="scroll-padding"
                    type="range"
                    min={SCROLL_PADDING_MIN}
                    max={SCROLL_PADDING_MAX}
                    step={8}
                    value={scrollPadding}
                    onChange={(e) => setScrollPadding(parseInt(e.target.value, 10))}
                    className="flex-1 accent-primary"
                  />
                  <input
                    type="number"
                    min={SCROLL_PADDING_MIN}
                    max={SCROLL_PADDING_MAX}
                    step={8}
                    value={scrollPadding}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) return;
                      setScrollPadding(
                        Math.min(SCROLL_PADDING_MAX, Math.max(SCROLL_PADDING_MIN, n)),
                      );
                    }}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setScrollPadding(SCROLL_PADDING_DEFAULT)}
                    className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Reset
                  </button>
                </div>

                <label className="mt-1 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smoothScroll}
                    onChange={(e) => setSmoothScroll(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-foreground font-medium">
                    Smooth auto-scroll to selected card
                  </span>
                  <span className="text-xs text-muted-foreground/80">
                    (when off, the page will not scroll the active result into view)
                  </span>
                </label>

                <label htmlFor="page-jump-size" className="mt-2 flex items-center justify-between gap-4">
                  <span>
                    PageUp / PageDown jump size
                    <span ref={pageJumpTipRef} className="relative inline-block align-middle">
                      <button
                        ref={pageJumpTipBtnRef}
                        type="button"
                        aria-label={`PageUp and PageDown move the active blog selection by ${pageJumpSize} ${pageJumpSize === 1 ? "card" : "cards"} at a time (the current jump size). Selection stops at the first and last card without wrapping.`}
                        aria-expanded={pageJumpTipOpen}
                        aria-controls="page-jump-tip"
                        aria-describedby={pageJumpTipOpen ? "page-jump-tip" : undefined}
                        aria-haspopup="dialog"
                        onMouseEnter={() => setPageJumpTipOpen(true)}
                        onMouseLeave={() => setPageJumpTipOpen(false)}
                        onFocus={() => setPageJumpTipOpen(true)}
                        onBlur={(e) => {
                          const next = e.relatedTarget as Node | null;
                          if (next && pageJumpTipRef.current?.contains(next)) return;
                          setPageJumpTipOpen(false);
                        }}
                        onClick={() => setPageJumpTipOpen((v) => !v)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape" && pageJumpTipOpen) {
                            e.stopPropagation();
                            setPageJumpTipOpen(false);
                          } else if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setPageJumpTipOpen((v) => !v);
                          }
                        }}
                        className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        ?
                      </button>
                      <span
                        id="page-jump-tip"
                        ref={pageJumpTipContentRef}
                        role="tooltip"
                        aria-hidden={!pageJumpTipOpen}
                        hidden={!pageJumpTipOpen}
                        tabIndex={pageJumpTipOpen ? -1 : undefined}
                        className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs font-normal leading-relaxed text-popover-foreground shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Press{" "}
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">PageDown</kbd>{" "}
                        /{" "}
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">PageUp</kbd>{" "}
                        to move the active selection by{" "}
                        <span className="font-semibold text-foreground">
                          {pageJumpSize} {pageJumpSize === 1 ? "card" : "cards"}
                        </span>
                        . Selection stops at the first and last card without wrapping.
                      </span>
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground/80">
                      (number of cards to skip when pressing PageUp or PageDown)
                    </span>
                  </span>
                  <span className="font-mono text-foreground tabular-nums">
                    {pageJumpSize}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="page-jump-size"
                    type="range"
                    min={PAGE_JUMP_SIZE_MIN}
                    max={PAGE_JUMP_SIZE_MAX}
                    step={1}
                    value={pageJumpSize}
                    onChange={(e) => setPageJumpSize(parseInt(e.target.value, 10))}
                    className="flex-1 accent-primary"
                  />
                  <input
                    type="number"
                    min={PAGE_JUMP_SIZE_MIN}
                    max={PAGE_JUMP_SIZE_MAX}
                    step={1}
                    value={pageJumpSize}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isFinite(n)) return;
                      setPageJumpSize(n);
                    }}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setPageJumpSize(PAGE_JUMP_SIZE_DEFAULT)}
                    className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Reset to default
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  Press{" "}
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                    PageDown
                  </kbd>{" "}
                  /{" "}
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                    PageUp
                  </kbd>{" "}
                  to jump{" "}
                  <span className="font-semibold text-foreground">
                    {pageJumpSize} {pageJumpSize === 1 ? "card" : "cards"}
                  </span>{" "}
                  at a time (default {PAGE_JUMP_SIZE_DEFAULT}).
                </p>
              </div>
            </details>

            <div className="flex items-center justify-between mb-6 text-sm text-muted-foreground flex-wrap gap-2">
              <span>
                {posts.length === 0 ? (
                  <>No posts match <strong className="text-foreground">"{query}"</strong></>
                ) : (
                  <>
                    Showing <strong className="text-foreground">{start + 1}</strong>–
                    <strong className="text-foreground">
                      {Math.min(start + PAGE_SIZE, posts.length)}
                    </strong>{" "}
                    of <strong className="text-foreground">{posts.length}</strong>
                    {query ? <> matching <strong className="text-foreground">"{query}"</strong></> : " posts"}
                  </>
                )}
              </span>
              <span>
                Page <strong className="text-foreground">{page}</strong> / {totalPages}
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <p className="text-muted-foreground">
                  Try a different keyword, or{" "}
                  <button
                    type="button"
                    onClick={clearQuery}
                    className="text-primary font-semibold hover:underline"
                  >
                    clear the search
                  </button>
                  .
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((slug, i) => {
                  const isActive = i === activeIndex;
                  const img = imageFor(slug);
                  const cat = postCategories[slug];
                  const publishedAt = publishedAtBySlug[slug];
                  const updatedAt = updatedAtBySlug[slug];
                  const wasUpdated = updatedAt && updatedAt !== publishedAt;
                  return (
                    <Link
                      key={slug}
                      ref={(el) => {
                        cardRefs.current[i] = el;
                      }}
                      to={`/${slug}`}
                      aria-current={isActive ? "true" : undefined}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`group flex flex-col rounded-2xl border bg-card overflow-hidden hover:border-primary hover:shadow-md transition-all ${
                        isActive
                          ? "border-primary ring-2 ring-primary/40 shadow-md"
                          : "border-border"
                      }`}
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-muted relative">
                        {img ? (
                          <img
                            src={img}
                            alt={titleFor(slug)}
                            loading="lazy"
                            width={1280}
                            height={800}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-muted" />
                        )}
                        <span className="absolute top-3 left-3 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground border border-border">
                          {cat}
                        </span>
                        {publishedAt && (
                          <time
                            dateTime={publishedAt}
                            className="absolute bottom-3 left-3 rounded-md border border-primary/30 bg-background/95 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-primary shadow-sm"
                          >
                            {formatDate(publishedAt)}
                          </time>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {publishedAt && (
                            <time
                              dateTime={publishedAt}
                              className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary"
                            >
                              Published {formatDate(publishedAt)}
                            </time>
                          )}
                          {wasUpdated && (
                            <time
                              dateTime={updatedAt}
                              title={`Updated on ${formatDate(updatedAt)} (originally published ${formatDate(publishedAt)})`}
                              aria-label={`Updated on ${formatDate(updatedAt)}`}
                              className="inline-flex items-center gap-1 rounded-full border border-secondary/40 bg-secondary/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-secondary-foreground cursor-help"
                            >
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
                              Updated {formatDate(updatedAt)}
                            </time>
                          )}
                        </div>
                        <h2 className="mt-1 font-heading font-bold text-lg text-foreground group-hover:text-primary leading-snug">
                          {highlight(titleFor(slug), query)}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">
                          {highlight(summaryFor(slug), query)}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground/80">
                          {highlight(`/${slug}`, query)} →
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <nav
                aria-label="Blog pagination"
                className="mt-10 flex items-center justify-center gap-2 flex-wrap"
              >
                <button
                  type="button"
                  onClick={() => goTo(page - 1)}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  const isActive = n === page;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => goTo(n)}
                      aria-current={isActive ? "page" : undefined}
                      className={`min-w-9 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => goTo(page + 1)}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BlogIndex;
