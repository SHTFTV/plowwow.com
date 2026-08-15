import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Features from "@/components/Features";
import ServiceAreas from "@/components/ServiceAreas";
import HowItWorks from "@/components/HowItWorks";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import SkilledTeamProjects from "@/components/SkilledTeamProjects";
import HomeBlog from "@/components/HomeBlog";

const Index = () => (
  <div className="min-h-screen">
    <TopBar />
    <Navbar />
    <Hero />
    <Services />
    <About />
    <SkilledTeamProjects />
    <Features />
    <ServiceAreas />
    <HowItWorks />
    <HomeBlog />
    <ContactForm />
    <Footer />
  </div>
);

export default Index;
