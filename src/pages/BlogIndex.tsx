import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { legacyBlogSlugs } from "./LegacyPage";

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

// Slugs that have a matching hero image in /public/blog-images/<slug>.jpg.
const SLUGS_WITH_IMAGES = new Set([
  "cloverdale-snow-removal",
  "fort-langley-snow-removal",
  "lynn-valley-snow-removal",
  "north-vancouver-snow-removal",
  "squamish-snow-removal",
  "steveston-snow-removal",
  "tsawwassen-snow-removal",
  "west-vancouver-snow-removal",
]);
const imageFor = (slug: string) =>
  SLUGS_WITH_IMAGES.has(slug) ? `/blog-images/${slug}.jpg` : null;

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

const highlight = (text: string, query: string) => {
  const terms = tokenize(query);
  if (terms.length === 0) return text;
  // Single regex with alternation — splits text into [pre, match, pre, match, ...]
  // Sort longest-first so "snow removal" matches before "snow" alone.
  const pattern = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
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
  const allPosts = useMemo(() => [...legacyBlogSlugs].sort(), []);

  const query = (searchParams.get("q") ?? "").trim();
  const terms = useMemo(() => tokenize(query), [query]);

  const posts = useMemo(() => {
    if (terms.length === 0) return allPosts;
    return allPosts.filter((slug) => {
      // Build one haystack per post and require every term to appear somewhere.
      const haystack = (
        titleFor(slug) +
        " " +
        slug +
        " " +
        summaryFor(slug)
      ).toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [allPosts, terms]);

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));

  const requested = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(requested)
    ? Math.min(Math.max(1, requested), totalPages)
    : 1;

  const start = (page - 1) * PAGE_SIZE;
  const visible = posts.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    const title =
      page === 1
        ? "PlowWow Blog — Snow Removal Insights & Strata Tips"
        : `PlowWow Blog — Page ${page} of ${totalPages}`;
    document.title = title;

    const description =
      "PlowWow blog: snow removal insights, neighborhood guides, and strata tips for Greater Vancouver, BC.";
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
    setMeta("description", description);
    setProp("og:title", title);
    setProp("og:description", description);
    setProp("og:type", "website");
    setProp("og:url", "/blog");
    setCanonical("/blog");

    const ldId = "blog-index-jsonld";
    document.getElementById(ldId)?.remove();
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = ldId;
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "PlowWow Blog",
      description,
      url: "/blog",
    });
    document.head.appendChild(ld);
    return () => { document.getElementById(ldId)?.remove(); };
  }, [page, totalPages]);

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
          <div className="container max-w-4xl">
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
              <div className="grid md:grid-cols-2 gap-4">
                {visible.map((slug, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <Link
                      key={slug}
                      ref={(el) => {
                        cardRefs.current[i] = el;
                      }}
                      to={`/${slug}`}
                      aria-current={isActive ? "true" : undefined}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`group block rounded-2xl border bg-card p-5 hover:border-primary hover:shadow-md transition-all ${
                        isActive
                          ? "border-primary ring-2 ring-primary/40 shadow-md"
                          : "border-border"
                      }`}
                    >
                      <h2 className="font-heading font-bold text-lg text-foreground group-hover:text-primary leading-snug">
                        {highlight(titleFor(slug), query)}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                        {highlight(summaryFor(slug), query)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground/80">
                        {highlight(`/${slug}`, query)} →
                      </p>
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
