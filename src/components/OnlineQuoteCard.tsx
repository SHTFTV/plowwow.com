import { ArrowUpRight, Calculator, Check } from "lucide-react";
import mascot from "@/assets/wow-mascot.webp";
import "./wow-hero.css";

export default function OnlineQuoteCard() {
  return <section className="wow-online-quote" aria-labelledby="online-quote-title">
    <div className="wow-online-quote-inner">
      <div className="wow-online-quote-art"><img src={mascot} width="320" height="320" alt="Wow, your PlowWow snow removal guide" loading="lazy"/></div>
      <div className="wow-online-quote-copy">
        <p className="wow-online-quote-kicker"><Calculator size={17} aria-hidden="true"/> SNOW REMOVAL PRICING, MADE CLEARER</p>
        <h2 id="online-quote-title">Get Your Quote Online</h2>
        <p>Enter your address and approximate service area to see a preliminary winter budget. No name or email needed before the prices.</p>
        <ul><li><Check size={16} aria-hidden="true"/> Strata & commercial properties</li><li><Check size={16} aria-hidden="true"/> Seasonal snow & ice packages</li><li><Check size={16} aria-hidden="true"/> Walkways, access & equipment reviewed</li></ul>
        <div className="wow-online-quote-actions"><a className="wow-online-quote-button" href="/quote">Get Your Quote Online <ArrowUpRight size={20} aria-hidden="true"/></a><a className="wow-online-quote-guide" href="/snow-removal-calculator">Snow removal cost calculator <ArrowUpRight size={17} aria-hidden="true"/></a></div>
        <small>The start of our online quoting system for transparency. Explore pricing first; request a reviewed quote when you’re ready.</small>
      </div>
    </div>
  </section>;
}
