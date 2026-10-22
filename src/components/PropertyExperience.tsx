import { useState } from "react";
import { Link } from "react-router-dom";

const experience = [
  ["Columbia Medical Building", "New Westminster · 2026–27 season"],
  ["Wilson Medical", "Port Coquitlam · 2026–27 season"],
  ["The Embassy", "Burnaby · past strata work"],
  ["University Gate", "Vancouver · past strata work"],
  ["East Georgia strata", "Vancouver · past strata work"],
  ["Ascent Real Estate Management", "Property coordination · past seasons"],
  ["Citybase Management Ltd.", "Property coordination · past seasons"],
];
export default function PropertyExperience() {
  const [paused, setPaused] = useState(false);
  return <section className="property-experience py-12 md:py-16" aria-labelledby="property-experience-heading">
    <div className="container">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-7">
        <div className="max-w-2xl"><p className="text-primary font-bold text-xs tracking-widest uppercase mb-3">Proud to be part of your winter team</p>
          <h2 id="property-experience-heading" className="text-3xl md:text-4xl font-bold">People still need to get there.</h2>
          <p className="text-muted-foreground mt-4">Medical entrances. Shared walkways. Strata ramps. Experience with the routes that matter to your building.</p>
        </div>
        <button type="button" className="property-experience-control rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Resume scrolling" : "Pause scrolling"}</button>
      </div>
      <div className={`property-experience-window ${paused ? "is-paused" : ""}`} tabIndex={0} role="region" aria-label="Current and past property experience. Scroll to explore.">
        <div className="property-experience-track">
          {[0,1].map(copy => <div className="property-experience-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
            {experience.map(([name, detail]) => <div className="property-experience-item" key={name}><span>{name}</span><small>{detail}</small></div>)}
          </div>)}
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-5 mt-6 items-start"><p className="text-sm text-muted-foreground max-w-2xl">Selected current and past work. Management relationships relate to specific properties and seasons.</p><Link className="text-primary font-bold" to="/medical-strata-snow-removal-property-experience">Meet our property experience →</Link></div>
    </div>
  </section>;
}
