import { Link } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";

const managers = [
  { name: "Ascent Real Estate Management", logo: "/partner-logos/ascent.png", className: "manager-logo-ascent" },
  { name: "Citybase Management Ltd.", logo: "/partner-logos/citybase.png", className: "manager-logo-citybase" },
];

export default function PropertyManagerBanner() {
  return (
    <section id="property-management-partners" className="manager-banner" aria-labelledby="manager-banner-heading">
      <div className="container">
        <div className="manager-banner-heading">
          <div>
            <p className="manager-banner-eyebrow">Part of your winter team</p>
            <h2 id="manager-banner-heading">Property managers we work with</h2>
          </div>

        </div>
        <div className="manager-banner-window" role="region" aria-label="Property management companies. Swipe or scroll to explore." tabIndex={0}>
          <div className="manager-banner-track">
              <div className="manager-banner-group">
                {managers.map(manager => (
                  <div className="manager-banner-card" key={manager.name}>
                    <img className={manager.className} src={manager.logo} alt={manager.name} width={manager.className === "manager-logo-ascent" ? 192 : 506} height={manager.className === "manager-logo-ascent" ? 125 : 72} loading="lazy" />
                  </div>
                ))}
                <Link className="manager-banner-card manager-banner-add" to="/snow-removal-calculator">
                  <span className="manager-banner-plus"><Plus size={25} aria-hidden="true" /></span>
                  <span><strong>Add yours</strong><small>Let’s plan your property’s winter.</small></span>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </Link>
              </div>
          </div>
        </div>
        <p className="manager-banner-hint">Scroll or swipe to explore <span aria-hidden="true">→</span></p>
        <p className="manager-banner-note">Strata and property service coordination across current and past seasons. <Link to="/medical-strata-snow-removal-property-experience">Explore our property experience <span aria-hidden="true">→</span></Link></p>
      </div>
    </section>
  );
}
