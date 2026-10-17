import { useEffect, useRef, useState } from "react";
import "./wow-crew.css";

export default function WowCrew() {
  const section = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPaused(reduce.matches);
    update();
    reduce.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setWaiting(false); observer.disconnect(); }
    }, { threshold: .25 });
    if (section.current) observer.observe(section.current);
    return () => { observer.disconnect(); reduce.removeEventListener("change", update); };
  }, []);
  return <section ref={section} id="wow-crew-footer" className={`wow-crew-footer${paused ? " wow-crew-paused" : ""}${waiting ? " wow-crew-waiting" : ""}`} aria-labelledby="wow-crew-title">
    <div className="wow-crew-stage" role="img" aria-label="A synchronized crew of Wow mascots in PlowWow safety vests and blue beanies">
      <div className="wow-crew-formation">{[0,1,2,3,4].map(i => <div key={i} className={`wow-crew-performer wow-crew-${i}`}><img className="wow-crew-character" src="/images/wow-approved-crew.webp" width="1024" height="1000" loading="lazy" alt="" aria-hidden="true" /></div>)}</div>
    </div>
    <div className="wow-crew-copy"><p className="wow-crew-eyebrow">THE PLOWWOW WINTER CREW</p><h2 id="wow-crew-title">Good people.<br />Proper gear.<br /><span>Let’s go.</span></h2><p>Shovelers, independent operators, subcontractors and snow-service companies: talk to PlowWow about winter work. Service coordination and customer billing stay with PlowWow.</p><div className="wow-crew-actions"><a href="/contractor-apply">Talk winter work ↗</a><a href="/quote">Need snow service? ↗</a></div><p className="wow-crew-caption">Original PlowWow brand artwork. Synchronized Wow crew animation.</p><button className="wow-crew-pause" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Play animation" : "Pause animation"}</button></div>
  </section>;
}
