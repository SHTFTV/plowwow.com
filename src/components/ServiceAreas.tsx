import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPin, Search, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CityLink = { name: string; slug: string };

const regions: { title: string; cities: CityLink[] }[] = [
  {
    title: "Metro Vancouver West",
    cities: [
      { name: "Vancouver", slug: "vancouver" },
      { name: "West Vancouver", slug: "west-vancouver" },
      { name: "North Vancouver", slug: "north-vancouver" },
    ],
  },
  {
    title: "Central Metro Vancouver",
    cities: [
      { name: "Burnaby", slug: "burnaby" },
      { name: "Richmond", slug: "richmond" },
      { name: "New Westminster", slug: "new-westminster" },
    ],
  },
  {
    title: "South Metro Vancouver",
    cities: [
      { name: "Surrey", slug: "surrey" },
      { name: "Delta", slug: "delta" },
      { name: "White Rock", slug: "white-rock" },
    ],
  },
  {
    title: "Tri-Cities & East Metro",
    cities: [
      { name: "Coquitlam", slug: "coquitlam" },
      { name: "Port Coquitlam", slug: "port-coquitlam" },
      { name: "Port Moody", slug: "port-moody" },
    ],
  },
  {
    title: "Fraser Valley Northeast",
    cities: [
      { name: "Maple Ridge", slug: "maple-ridge" },
      { name: "Pitt Meadows", slug: "pitt-meadows" },
    ],
  },
  {
    title: "Fraser Valley",
    cities: [
      { name: "Langley", slug: "langley" },
      { name: "Abbotsford", slug: "abbotsford" },
      { name: "Mission", slug: "mission" },
      { name: "Chilliwack", slug: "chilliwack" },
    ],
  },
];

const STORAGE_KEY = "service-areas:query";
const LAST_CITY_KEY = "service-areas:last-city";

const ServiceAreas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initial query: URL ?city=... wins, otherwise restore from localStorage.
  const initialQuery = (() => {
    const fromUrl = searchParams.get("city");
    if (fromUrl !== null) return fromUrl;
    if (typeof window !== "undefined") {
      try {
        return window.localStorage.getItem(STORAGE_KEY) ?? "";
      } catch {
        return "";
      }
    }
    return "";
  })();

  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  // Sync query → URL search param (replace, no history spam) + localStorage.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (query) {
      next.set("city", query);
    } else {
      next.delete("city");
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    try {
      if (query) {
        window.localStorage.setItem(STORAGE_KEY, query);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const userInteractedRef = useRef(false);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return regions;
    return regions
      .map((r) => ({
        ...r,
        cities: r.cities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q),
        ),
      }))
      .filter((r) => r.cities.length > 0);
  }, [q]);

  // Flat list for keyboard navigation
  const flatCities = useMemo(
    () => filtered.flatMap((r) => r.cities),
    [filtered],
  );

  // Clamp active index whenever the filtered list size changes
  useEffect(() => {
    setActiveIndex((i) => {
      if (flatCities.length === 0) return 0;
      if (i >= flatCities.length) return flatCities.length - 1;
      if (i < 0) return 0;
      return i;
    });
  }, [flatCities.length]);

  // Scroll active card into view + move DOM focus to it for visible focus ring
  useEffect(() => {
    const el = cardRefs.current[activeIndex];
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Only steal focus when the user has actually started navigating
    if (userInteractedRef.current) {
      el.focus({ preventScroll: true });
    }
  }, [activeIndex]);

  // Collapse when the user clicks/taps outside the section,
  // but explicitly preserve clicks on the search input, the listbox,
  // any of the city option cards, or any inline label/clear button.
  useEffect(() => {
    if (collapsed) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      // Explicit exclusions — clicks inside these never collapse the dropdown.
      const isInsideAllowed =
        inputRef.current?.contains(target) ||
        listboxRef.current?.contains(target) ||
        cardRefs.current.some((card) => card?.contains(target));
      if (isInsideAllowed) return;

      // Fall back to the section bounds (covers headings, hint, clear button, etc.)
      if (sectionRef.current?.contains(target)) return;

      setCollapsed(true);
      setQuery("");
      setActiveIndex(0);
      userInteractedRef.current = false;
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [collapsed]);

  const moveActive = (delta: number) => {
    userInteractedRef.current = true;
    setActiveIndex((i) => (i + delta + flatCities.length) % flatCities.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (flatCities.length === 0 && e.key !== "Escape") return;
    // Any navigation key reopens a collapsed list
    if (collapsed && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"].includes(e.key)) {
      setCollapsed(false);
    }
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      userInteractedRef.current = true;
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      userInteractedRef.current = true;
      setActiveIndex(flatCities.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatCities[activeIndex];
      if (target) {
        setCollapsed(true);
        userInteractedRef.current = false;
        navigate(`/${target.slug}`);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      userInteractedRef.current = false;
      setQuery("");
      setActiveIndex(0);
      setCollapsed(true);
      document.getElementById("city-search")?.focus();
    }
  };

  // Reset refs on each render of filtered list
  cardRefs.current = [];
  let flatIdx = -1;

  const totalMatches = flatCities.length;
  const activeCity = flatCities[activeIndex];
  const activeRegion = activeCity
    ? filtered.find((r) => r.cities.some((c) => c.slug === activeCity.slug))?.title
    : undefined;

  // Status string for the live region — covers count + active option.
  let statusMessage = "";
  if (q) {
    if (totalMatches === 0) {
      statusMessage = `No cities match ${query}.`;
    } else {
      statusMessage =
        totalMatches === 1
          ? `1 city matches ${query}: ${flatCities[0].name}, ${activeRegion ?? ""}. Press Enter to open.`
          : `${totalMatches} cities match ${query}. ${
              activeCity ? `Active: ${activeCity.name}, ${activeRegion ?? ""}. Press Enter to open.` : ""
            }`;
    }
  } else if (userInteractedRef.current && activeCity) {
    statusMessage = `${activeCity.name}, ${activeRegion ?? ""}. Press Enter to open.`;
  }

  return (
    <section ref={sectionRef} id="service-areas" className="py-20 bg-section-alt">
      <div className="container">
        <h2 className="text-3xl md:text-4xl text-center mb-4 text-foreground">
          City Snow Removal Pages
        </h2>
        <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
          Choose your city for local snow plowing, salting, de-icing, snowfall data, and service details.
        </p>

        {/* Search */}
        <div className="max-w-md mx-auto mb-10">
          <label htmlFor="city-search" className="sr-only">
            Search cities
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
            />
            <Input
              id="city-search"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                userInteractedRef.current = false;
                setCollapsed(false);
                setQuery(e.target.value);
              }}
              onFocus={() => setCollapsed(false)}
              onKeyDown={handleKeyDown}
              placeholder="Search a city — use ↑ ↓ and Enter"
              className="pl-10 pr-10 h-12 rounded-full bg-card border-border"
              autoComplete="off"
              role="combobox"
              aria-label="Search cities"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={!collapsed && flatCities.length > 0}
              aria-controls="city-results"
              aria-activedescendant={
                activeCity ? `city-opt-${activeCity.slug}` : undefined
              }
              aria-describedby="city-search-hint"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p id="city-search-hint" className="text-xs text-muted-foreground text-center mt-2">
            Use ↑ ↓ to navigate, Enter to open, Esc to collapse and reset.
          </p>
          {q && !collapsed && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              {totalMatches} {totalMatches === 1 ? "match" : "matches"} for "{query}"
            </p>
          )}
          {/* Polite live region for screen readers only */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {statusMessage}
          </div>
        </div>

        {collapsed ? (
          <p className="text-center text-muted-foreground py-10">
            Results collapsed. Start typing or focus the search to show cities again.
          </p>
        ) : filtered.length === 0 ? (
          <p role="status" aria-live="polite" className="text-center text-muted-foreground py-10">
            No cities match "{query}". Try a different name.
          </p>
        ) : (
          <div
            ref={listboxRef}
            id="city-results"
            role="listbox"
            aria-label={`City snow removal pages${q ? ` filtered by ${query}` : ""}`}
            className="space-y-12"
          >
            {filtered.map((region) => {
              const headingId = `region-${region.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
              return (
              <div key={region.title} role="group" aria-labelledby={headingId}>
                <h3 id={headingId} className="text-xl md:text-2xl font-heading font-bold text-foreground mb-5 flex items-center gap-2">
                  <MapPin aria-hidden="true" className="w-5 h-5 text-primary" />
                  {region.title}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {region.cities.map((city) => {
                    flatIdx += 1;
                    const isActive = flatIdx === activeIndex;
                    const myIdx = flatIdx;
                    return (
                      <Link
                        key={city.slug}
                        id={`city-opt-${city.slug}`}
                        ref={(el) => {
                          cardRefs.current[myIdx] = el;
                        }}
                        to={`/${city.slug}`}
                        role="option"
                        aria-selected={isActive}
                        aria-posinset={myIdx + 1}
                        aria-setsize={totalMatches}
                        aria-label={`${city.name}, ${region.title}`}
                        tabIndex={isActive ? 0 : -1}
                        onMouseEnter={() => setActiveIndex(myIdx)}
                        onFocus={() => {
                          userInteractedRef.current = true;
                          setActiveIndex(myIdx);
                        }}
                        onClick={() => {
                          // Collapse the dropdown but preserve the query so it
                          // is still there if the user navigates back.
                          setActiveIndex(myIdx);
                          setCollapsed(true);
                          userInteractedRef.current = false;
                        }}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          "group flex items-center justify-between gap-4 bg-card rounded-lg p-5 border transition-colors shadow-sm",
                          "focus:outline-none focus-visible:outline-none",
                          isActive
                            ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        <span className="font-bold text-foreground flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          {city.name}
                        </span>
                        <ArrowRight
                          className={cn(
                            "w-5 h-5 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceAreas;
