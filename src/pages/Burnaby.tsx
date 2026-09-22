import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import BurnabySchema from "@/components/burnaby/BurnabySchema";
import BurnabyHero from "@/components/burnaby/BurnabyHero";
import SnowfallChart from "@/components/burnaby/SnowfallChart";
import ServiceMap from "@/components/burnaby/ServiceMap";
import UtilityDashboard from "@/components/burnaby/UtilityDashboard";
import NeighborhoodFocus from "@/components/burnaby/NeighborhoodFocus";
import ServiceTabs from "@/components/burnaby/ServiceTabs";
import SeasonalPackages from "@/components/burnaby/SeasonalPackages";
import BurnabyFAQ from "@/components/burnaby/BurnabyFAQ";
import CityDeepDive from "@/components/CityDeepDive";
import DirectionsCard from "@/components/city/DirectionsCard";
import RelatedCities from "@/components/city/RelatedCities";
import { getLocationDeep } from "@/data/locations";
import { Link } from "react-router-dom";

const Burnaby = () => {
  const deep = getLocationDeep("burnaby");
  return (
  <div className="min-h-screen">
    <BurnabySchema />
    <TopBar />
    <Navbar />
    <main>
      <BurnabyHero />

      <section className="py-16 bg-background" aria-labelledby="burnaby-plan-heading">
        <div className="container">
          <div className="max-w-3xl mb-10">
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Burnaby winter service</p>
            <h2 id="burnaby-plan-heading" className="text-3xl md:text-4xl font-black text-foreground mb-4">
              A site-specific plan for Burnaby hills, ramps and busy entrances
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Conditions can differ between Burnaby Mountain, Metrotown and South Burnaby during the same storm. Before winter, we identify your priority surfaces, access limits, snow-storage areas and treatment expectations so crews arrive with the right equipment and a clear scope.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Strata & apartments",
                body: "Entrances, walkways, drive lanes and parkade ramps planned around resident access and the property’s service triggers.",
              },
              {
                title: "Commercial properties",
                body: "Parking areas, loading zones and pedestrian routes cleared around operating hours, site access and documented priorities.",
              },
              {
                title: "Residential service",
                body: "Driveway, steps and walkway service for properties that fit an active Burnaby route, quoted by layout and scope.",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-heading text-xl font-black text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" id="climate">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              Burnaby's Winter, by the Numbers
            </h2>
            <p className="text-muted-foreground">
              Snowfall patterns and service zones for every Burnaby property.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <SnowfallChart />
            <ServiceMap />
          </div>
        </div>
      </section>

      <section className="py-12" id="directions">
        <div className="container">
          <DirectionsCard
            cityName="Burnaby"
            province="BC"
            cityHall={{ lat: 49.2488, lon: -122.9805, address: "4949 Canada Way" }}
          />
        </div>
      </section>

      <UtilityDashboard />
      <NeighborhoodFocus />
      <ServiceTabs />
      <SeasonalPackages />
      <BurnabyFAQ />

      {deep && <CityDeepDive data={deep} />}

      <section className="py-14 border-y border-border bg-card" aria-labelledby="burnaby-winter-guide-heading">
        <div className="container max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
            Burnaby planning guide
          </p>
          <h2 id="burnaby-winter-guide-heading" className="text-2xl md:text-3xl font-black text-foreground mb-4">
            Plan steep grades, parkade ramps and overnight refreeze
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            Our Burnaby snow and ice guide covers hill approaches, parkade ramps, pedestrian routes, drainage, snow storage and the follow-up checks that help manage changing temperatures.
          </p>
          <Link to="/burnaby-hills-parkade-snow-ice-plan" className="inline-flex items-center font-bold text-primary hover:underline">
            Read the Burnaby hills and parkade snow plan →
          </Link>
        </div>
      </section>

      <RelatedCities citySlug="burnaby" cityName="Burnaby" count={4} />

      <div id="burnaby-quote">
        <ContactForm />
      </div>
    </main>
    <Footer />
  </div>
  );
};

export default Burnaby;
