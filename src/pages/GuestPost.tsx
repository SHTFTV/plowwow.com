import { useEffect } from "react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TITLE = "Guest Post With Us — PlowWow";
const DESCRIPTION =
  "Share your snow removal expertise with the PlowWow community. Submit a guest post and reach contractors and property managers across British Columbia.";

const GuestPost = () => {
  useEffect(() => {
    document.title = TITLE;
    let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.name = "description";
      document.head.appendChild(el);
    }
    el.content = DESCRIPTION;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Navbar />
      <main>
        <section className="py-24 md:py-32 bg-intel-night text-white">
          <div className="container max-w-3xl text-center">
            <h1 className="font-display text-4xl md:text-5xl font-extrabold">
              Guest Post With Us
            </h1>
            <p className="font-tech text-lg text-white/80 mt-6">
              Share your snow removal expertise with the PlowWow community.
            </p>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
              Why Write for PlowWow?
            </h2>
            <ul className="space-y-4 font-tech text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-intel-orange font-bold">1.</span>
                <span>Reach thousands of snow removal contractors and property managers across British Columbia.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-intel-orange font-bold">2.</span>
                <span>Build authority in the winter services industry with a backlink to your own site.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-intel-orange font-bold">3.</span>
                <span>Get your insights in front of strata managers, commercial property owners, and residential clients.</span>
              </li>
            </ul>

            <h2 className="font-display text-2xl md:text-3xl font-bold mt-14 mb-6">
              Topics We Love
            </h2>
            <ul className="grid sm:grid-cols-2 gap-3 font-tech text-muted-foreground">
              {[
                "Snow removal best practices",
                "Equipment reviews & recommendations",
                "BC municipal bylaws & compliance",
                "Liability & insurance tips",
                "Pricing strategies for contractors",
                "Weather forecasting tools",
                "Route optimization",
                "Client retention & marketing",
              ].map((topic) => (
                <li key={topic} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-intel-orange shrink-0" />
                  {topic}
                </li>
              ))}
            </ul>

            <h2 className="font-display text-2xl md:text-3xl font-bold mt-14 mb-6">
              Submission Guidelines
            </h2>
            <div className="space-y-4 font-tech text-muted-foreground">
              <p>
                Articles should be original, at least 800 words, and provide actionable value to our audience. We accept how-tos, case studies, equipment reviews, and industry analysis.
              </p>
              <p>
                Include a short author bio (2–3 sentences) with one link to your website or social profile. You may also include one relevant image — please ensure you have the rights to use it.
              </p>
            </div>

            <h2 className="font-display text-2xl md:text-3xl font-bold mt-14 mb-6">
              How to Submit
            </h2>
            <p className="font-tech text-muted-foreground mb-4">
              Email your pitch or finished draft to:
            </p>
            <a
              href="mailto:Wow@plowwow.com?subject=Guest%20Post%20Submission"
              className="inline-flex items-center gap-2 bg-intel-orange hover:bg-intel-orange/90 text-white font-display font-bold rounded-full px-8 py-3 text-lg shadow-xl transition-colors"
            >
              Wow@plowwow.com
            </a>
            <p className="font-tech text-sm text-muted-foreground mt-4">
              We typically review submissions within 5 business days and will let you know if your article is accepted.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default GuestPost;
