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
import StickyCallBar from "@/components/burnaby/StickyCallBar";

const Burnaby = () => (
  <div className="min-h-screen">
    <BurnabySchema />
    <TopBar />
    <Navbar />
    <main>
      <BurnabyHero />

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

      <UtilityDashboard />
      <NeighborhoodFocus />
      <ServiceTabs />
      <SeasonalPackages />
      <BurnabyFAQ />

      <div id="burnaby-quote">
        <ContactForm />
      </div>
    </main>
    <Footer />
    <StickyCallBar />
  </div>
);

export default Burnaby;
