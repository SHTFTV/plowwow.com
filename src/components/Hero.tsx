import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play, Phone } from "lucide-react";
import heroBanner from "@/assets/plowwow-banner.webp";
import wowMascot from "@/assets/wow-mascot.webp";
import "./wow-hero.css";

const FLAKES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 47) % 100}%`,
  width: `${3 + (i % 4)}px`,
  height: `${3 + (i % 4)}px`,
  animationDuration: `${8 + (i % 7)}s`,
  animationDelay: `${-(i % 13)}s`,
}));

const Hero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let visible = true;
    const sync = () => {
      if (paused || !motionAllowed || document.hidden || !visible) video.pause();
      else void video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    }, { threshold: 0.05 });
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, [paused, motionAllowed]);

  return (
    <section aria-labelledby="hero-heading" className={`wow-hero ${paused || !motionAllowed ? "wow-motion-paused" : ""}`}>
      <div className="wow-hero-stage">
        <video ref={videoRef} className="wow-hero-film" aria-hidden="true" muted loop playsInline preload="none" poster={heroBanner}>
          <source src="/videos/wow-winter-services.mp4" type="video/mp4" />
        </video>
        <div className="wow-hero-shade" aria-hidden="true" />
        <div className="wow-snow" aria-hidden="true">{FLAKES.map((style, i) => <i key={i} style={style as CSSProperties} />)}</div>
        <div className="wow-hero-grid">
          <div className="wow-hero-copy">
            <p className="wow-eyebrow"><span /> VANCOUVER · LOWER MAINLAND · FRASER VALLEY</p>
            <h1 id="hero-heading">WE PUT THE<br /><span>WOW</span> IN PLOW.</h1>
            <p className="wow-service-label">SNOW REMOVAL &amp; ICE MANAGEMENT</p>
            <p className="wow-hero-description">Your property. Our winter priority.<br />Snow clearing, salting and de-icing for commercial, strata and residential properties.</p>
            <div className="wow-hero-actions">
              <a className="wow-quote" href="/quote">GET YOUR WINTER QUOTE <ArrowUpRight size={20} aria-hidden="true" /></a>
              <a className="wow-call" href="tel:+16047611518"><Phone size={17} aria-hidden="true" />604-761-1518</a>
            </div>
          </div>
          <figure className="wow-hero-mascot">
            <div className="wow-mascot-halo" aria-hidden="true" />
            <span className="wow-mascot-word" aria-hidden="true">WOW</span>
            <img src={wowMascot} alt="Wow, PlowWow’s blue mascot, waving with a snow shovel and orange safety vest" width={1024} height={1024} fetchPriority="high" decoding="async" />
            <figcaption>YOUR WINTER. <strong>HANDLED.</strong></figcaption>
          </figure>
        </div>
        <div className="wow-hero-bottom"><a href="#services">MEET YOUR WINTER CREW <ArrowDown size={14} aria-hidden="true" /></a><button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} disabled={!motionAllowed}>{paused || !motionAllowed ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{!motionAllowed ? "REDUCED MOTION" : paused ? "PLAY MOTION" : "PAUSE MOTION"}</button></div>
      </div>
      <div className="wow-hero-rail"><span>COMMERCIAL LOTS</span><b>✳</b><span>STRATA PROPERTIES</span><b>✳</b><span>RESIDENTIAL</span><b>✳</b><span>SNOW · SALT · DE-ICE</span></div>
      <p className="wow-hero-credit">Original PlowWow mascot over an illustrative plowing, sidewalk-salting and brine-spraying montage. Service scope and timing are confirmed with your quote.</p>
    </section>
  );
};

export default Hero;
