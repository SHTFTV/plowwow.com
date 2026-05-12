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

const TITLE = "Snow Removal Intelligence | PlowWow PWIE Engine, Weather Brain & Wow-Shield";
const DESCRIPTION =
  "PlowWow's Snow Intelligence stack: the PWIE Ice-Fighter formula, Weather Brain forecasting, Salt-Scan AI, Ghost Fleet GPS dispatch and the Wow-Shield™ Liability Vault. Proof of work for BC strata and commercial properties.";

const setMeta = (name: string, content: string) => {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
};

const Intelligence = () => {
  useEffect(() => {
    document.title = TITLE;
    setMeta("description", DESCRIPTION);

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
