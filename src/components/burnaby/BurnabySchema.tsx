import { useEffect } from "react";

const faqs = [
  {
    q: "Do you provide 24/7 snow removal in Burnaby?",
    a: "Yes. PlowWow monitors Burnaby weather 24/7 and dispatches crews automatically when snow accumulation thresholds are reached.",
  },
  {
    q: "Which Burnaby neighborhoods do you service?",
    a: "We service Metrotown, Brentwood, Burnaby Mountain, Capitol Hill, Lougheed, Edmonds, Deer Lake, and surrounding areas.",
  },
  {
    q: "Do you service strata and condo properties in Metrotown and Brentwood?",
    a: "Yes — high-density strata properties are our specialty. We provide priority plowing, salting, and snow relocation with documented service logs.",
  },
  {
    q: "Can you handle the steep hills around Burnaby Mountain and SFU?",
    a: "Absolutely. Our GPS-tracked fleet is equipped for the grades on Burnaby Mountain Parkway, Gaglardi Way and University Drive.",
  },
  {
    q: "How much salt do you apply?",
    a: "We follow BC best-practice application rates of 40–80 g/m² of rock salt, adjusted by surface temperature and precipitation type, with logged applications for liability.",
  },
  {
    q: "Are you WorkSafeBC insured?",
    a: "Yes. PlowWow carries full WorkSafeBC coverage and $5M commercial liability insurance.",
  },
  {
    q: "Do you check SD41 school closures?",
    a: "Yes. We monitor Burnaby School District 41 alerts and prioritize routes to schools, daycares, and senior housing.",
  },
  {
    q: "What is the difference between On-Call and Seasonal Unlimited?",
    a: "On-Call is per-visit billing for occasional events. Seasonal Unlimited locks in a fixed price for unlimited visits Nov 1 – Mar 31 with priority dispatch.",
  },
  {
    q: "Do you follow the City of Burnaby snow plow routes?",
    a: "We coordinate with the City of Burnaby's published snow plow route map so private property service complements municipal clearing.",
  },
  {
    q: "How quickly do you respond after a snowfall starts?",
    a: "Seasonal contract clients in Burnaby receive service within 2–4 hours of trigger accumulation. On-call clients are scheduled after contract routes.",
  },
];

const BurnabySchema = () => {
  useEffect(() => {
    const business = {
      "@context": "https://schema.org",
      "@type": "HomeAndConstructionBusiness",
      additionalType: "https://schema.org/ProfessionalService",
      name: "PlowWow Burnaby Snow Removal",
      image: "https://plowwow.com/og-burnaby.jpg",
      telephone: "+1-604-761-1518",
      email: "Wow@PlowWow.com",
      priceRange: "$$",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Burnaby",
        addressRegion: "BC",
        addressCountry: "CA",
      },
      areaServed: [
        { "@type": "Place", name: "Metrotown, Burnaby" },
        { "@type": "Place", name: "Brentwood, Burnaby" },
        { "@type": "Place", name: "Burnaby Mountain" },
        { "@type": "Place", name: "Capitol Hill, Burnaby" },
        { "@type": "Place", name: "Lougheed, Burnaby" },
        { "@type": "Place", name: "Edmonds, Burnaby" },
      ],
      knowsAbout: [
        "Snow plowing",
        "Snow removal",
        "De-icing",
        "Salt application rates",
        "BC winter safety",
        "Strata snow management",
        "Commercial snow relocation",
      ],
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    };

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };

    const s1 = document.createElement("script");
    s1.type = "application/ld+json";
    s1.text = JSON.stringify(business);
    const s2 = document.createElement("script");
    s2.type = "application/ld+json";
    s2.text = JSON.stringify(faqSchema);
    document.head.appendChild(s1);
    document.head.appendChild(s2);

    const title = document.querySelector("title");
    const prevTitle = title?.textContent;
    if (title) title.textContent = "Snow Removal Burnaby | PlowWow 24/7 Plowing & De-Icing";

    const setMeta = (name: string, content: string) => {
      let m = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!m) {
        m = document.createElement("meta");
        m.name = name;
        document.head.appendChild(m);
      }
      const prev = m.content;
      m.content = content;
      return () => {
        if (prev) m!.content = prev;
      };
    };
    const restoreDesc = setMeta(
      "description",
      "24/7 Snow Removal in Burnaby — Metrotown, Brentwood, Burnaby Mountain. Plowing, salting & strata service. WorkSafeBC insured. Call 604-761-1518.",
    );

    const pageTitle = "Snow Removal Burnaby | PlowWow 24/7 Plowing & De-Icing";
    const pageDescription =
      "24/7 Snow Removal in Burnaby — Metrotown, Brentwood, Burnaby Mountain. Plowing, salting & strata service. WorkSafeBC insured. Call 604-761-1518.";
    const pageUrl = window.location.origin + "/burnaby";
    const ogImage = "https://plowwow.com/og-burnaby.jpg";
    const ogImageWidth = "1200";
    const ogImageHeight = "630";

    const setProperty = (property: string, content: string) => {
      let m = document.querySelector(
        `meta[property="${property}"]`,
      ) as HTMLMetaElement | null;
      const created = !m;
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("property", property);
        document.head.appendChild(m);
      }
      const prev = m.getAttribute("content");
      m.setAttribute("content", content);
      return () => {
        if (created) m!.remove();
        else if (prev !== null) m!.setAttribute("content", prev);
      };
    };

    const restoreProps = [
      setProperty("og:title", pageTitle),
      setProperty("og:description", pageDescription),
      setProperty("og:url", pageUrl),
      setProperty("og:image", ogImage),
      setProperty("og:image:width", ogImageWidth),
      setProperty("og:image:height", ogImageHeight),
      setProperty("og:image:alt", pageTitle),
      setProperty("og:type", "website"),
      setProperty("twitter:card", "summary_large_image"),
      setProperty("twitter:title", pageTitle),
      setProperty("twitter:description", pageDescription),
      setProperty("twitter:image", ogImage),
      setProperty("twitter:image:width", ogImageWidth),
      setProperty("twitter:image:height", ogImageHeight),
      setProperty("twitter:image:alt", pageTitle),
    ];

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    const prevHref = canonical.href;
    canonical.href = pageUrl;

    return () => {
      s1.remove();
      s2.remove();
      if (title && prevTitle) title.textContent = prevTitle;
      restoreDesc();
      restoreProps.forEach((fn) => fn());
      if (createdCanonical) canonical?.remove();
      else if (canonical) canonical.href = prevHref;
    };
  }, []);

  return null;
};

export { faqs };
export default BurnabySchema;
