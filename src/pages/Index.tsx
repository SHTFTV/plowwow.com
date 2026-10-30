import { useEffect } from "react";
import { applyPriorityPageMeta } from "@/lib/priorityPageMeta";
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
import OnlineQuoteCard from "@/components/OnlineQuoteCard";
import HomeBlog from "@/components/HomeBlog";

import PropertyManagerBanner from "@/components/PropertyManagerBanner";
import PropertyExperience from "@/components/PropertyExperience";

const Index = () => {
  useEffect(() => { applyPriorityPageMeta("home"); }, []);
  return (
  <div className="min-h-screen">
    <TopBar />
    <Navbar />
    <main id="main-content" tabIndex={-1}>
    <Hero />
    <OnlineQuoteCard />
    <PropertyExperience />
    <Services />
    <HomeBlog />
    <About />
    <PropertyManagerBanner />
    <SkilledTeamProjects />
    <Features />
    <ServiceAreas />
    <HowItWorks />
    <ContactForm />
    </main>
    <Footer />
  </div>
);
};

export default Index;
