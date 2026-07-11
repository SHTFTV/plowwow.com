import { useEffect } from "react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IntelligenceHero from "@/components/intelligence/IntelligenceHero";
import IntelligenceFeatures from "@/components/intelligence/IntelligenceFeatures";
import PWIEEngine from "@/components/intelligence/PWIEEngine";
import WeatherBrain from "@/components/intelligence/WeatherBrain";
import WowShield from "@/components/intelligence/WowShield";
import GhostFleet from "@/components/intelligence/GhostFleet";
import IntelligenceCTA from "@/components/intelligence/IntelligenceCTA";

const TITLE = "PlowWow Snow Intelligence — PWIE & Wow-Shield";
const DESCRIPTION =
  "PlowWow's snow intelligence stack: PWIE dispatch, Weather Brain forecasting, Salt-Scan AI, Ghost Fleet GPS, and Wow-Shield™ liability vault.";
const BASE = "https://plowwow.com";
const PATH = "/intelligence";
const URL_ABS = `${BASE}${PATH}`;
const OG_IMAGE = `${BASE}/og-default.jpg`;

const setMeta = (name: string, content: string) => {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
};

const setProp = (property: string, content: string) => {
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

const Intelligence = () => {
  useEffect(() => {
    document.title = TITLE;
    setMeta("description", DESCRIPTION);
    setProp("og:title", TITLE);
    setProp("og:description", DESCRIPTION);
    setProp("og:url", PATH);
    setProp("og:type", "website");
    setCanonical(PATH);

    const ldId = "intelligence-jsonld";
    document.getElementById(ldId)?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = ldId;
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      name: "PlowWow Snow Removal Intelligence",
      provider: {
        "@type": "LocalBusiness",
        name: "PlowWow Snow Removal & De-Ice Management",
        telephone: "+1-604-761-1518",
        address: {
          "@type": "PostalAddress",
          streetAddress: "19906 32nd Ave",
          addressLocality: "Langley",
          addressRegion: "BC",
          postalCode: "V3A 4T1",
          addressCountry: "CA",
        },
      },
      areaServed: "Greater Vancouver, BC",
      description: DESCRIPTION,
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById(ldId)?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <main>
        <IntelligenceHero />
        <IntelligenceFeatures />
        <PWIEEngine />
        <WeatherBrain />
        <WowShield />
        <GhostFleet />
        <IntelligenceCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Intelligence;
