import { useEffect, useRef, useState } from "react";
import "./wow-skinny-banner.css";

const scenes = ["Hand salting", "Walk-behind spreading", "Truck plowing", "Truck salting", "ATV snow clearing"];
/** Shared public-page standard. Brand animation, not customer/project footage. */
export default function WowSkinnyBanner() {
  const video = useRef<HTMLVideoElement>(null);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const apply = () => {
      const v = video.current;
      if (!v) return;
      if (motion.matches || connection?.saveData) { v.pause(); return; }
      setLoaded(true);
      v.play().catch(() => setPlaying(false));
    };
    apply(); motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, []);
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (!v.paused) v.pause();
    else { setLoaded(true); v.play().catch(() => setPlaying(false)); }
  };
  return <section className="wow-skinny" aria-label="PlowWow winter services">
    <video ref={video} className="wow-skinny-video" muted loop playsInline autoPlay={loaded} preload="none"
      poster="/brand-banners/wow-winter-equipment-skinny-v1.webp"
      src={loaded ? "/brand-banners/wow-winter-equipment-skinny-v1.mp4" : undefined}
      aria-hidden="true" onError={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onTimeUpdate={() => setScene(Math.min(4, Math.floor((video.current?.currentTime ?? 0) / 4)))} />
    <div className="wow-skinny-shade" />
    <div className="wow-skinny-inner">
      <img className="wow-skinny-mascot" src="/contractor/wow-outline-source.webp" width="1024" height="1000" alt="Wow in his blue beanie and orange high-visibility vest" />
      <div className="wow-skinny-copy"><span className="wow-skinny-brand">PLOWWOW WINTER CREW</span><strong>{scenes[scene]}</strong><a href="/quote">Plan your snow service <span aria-hidden="true">↗</span></a></div>
      <span className="wow-skinny-credit">AI brand animation</span>
      <button className="wow-skinny-toggle" onClick={toggle} type="button" aria-label={playing ? "Pause winter banner animation" : "Play winter banner animation"}>{playing ? "Pause" : "Play"}</button>
    </div>
  </section>;
}
