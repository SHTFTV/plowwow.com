import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CalculatorEmbed from "@/components/CalculatorEmbed";
import "./quote-page.css";

export default function Quote({ cityName, citySlug }: { cityName?: string; citySlug?: string }) {
 const videoRef = useRef<HTMLVideoElement>(null);
 const [videoPaused, setVideoPaused] = useState(true);
 const title = cityName ? `${cityName} Snow Removal Quote | PlowWow` : "Snow Removal Quotes Online & Cost Calculator | PlowWow";
 const description = `Enter your ${cityName || "Metro Vancouver"} address to see one combined residential snow removal starting price. Driveway, sidewalk, walkway and steps included. No email required.`;
 useEffect(() => {
  document.title = title;
  const url = `https://www.plowwow.com/${citySlug ? `${citySlug}/quote` : "quote"}`;
  for (const [key, value] of [["robots", citySlug ? "noindex,follow" : "index,follow"], ["description", description], ["og:title", title], ["og:description", description], ["og:url", url], ["og:image", "https://www.plowwow.com/quote-media/wow-quote-hero.webp"], ["twitter:title", title], ["twitter:description", description]]) {
   const attr = key.startsWith("og:") ? "property" : "name";
   let meta = document.querySelector(`meta[${attr}="${key}"]`);
   if (!meta) { meta = document.createElement("meta"); meta.setAttribute(attr, key); document.head.appendChild(meta); }
   meta.setAttribute("content", value);
  }
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
  canonical.href = url;
 }, [title, description, citySlug]);
 useEffect(() => {
  const video = videoRef.current;
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => { if (preference.matches) video?.pause(); else video?.play().catch(() => {}); };
  sync(); preference.addEventListener("change", sync);
  return () => preference.removeEventListener("change", sync);
 }, []);
 const toggleVideo = () => { const video = videoRef.current; if (!video) return; if (video.paused) video.play().catch(() => {}); else video.pause(); };
 return <div className="pw-quote"><TopBar/><Navbar/><main id="main-content" className="plow-quote" tabIndex={-1}>
  <section className="pq-hero pq-video-hero">
   <video className="pq-background-video" ref={videoRef} muted loop playsInline preload="metadata" poster="/quote-media/estimator-plow-hero.jpg" aria-label="PlowWow winter service promotional video" onPlay={() => setVideoPaused(false)} onPause={() => setVideoPaused(true)}><source src="/videos/plowwow-snow-removal-operations.mp4" type="video/mp4"/></video>
   <div className="pq-video-shade" aria-hidden="true"/>
   <button className="pq-video-toggle" onClick={toggleVideo} aria-pressed={!videoPaused}>{videoPaused ? "Play background" : "Pause background"}</button>
   <div className="pq-hero-copy"><p className="pq-kicker">SNOW REMOVAL · ONE COMBINED ESTIMATE</p>
    <h1>{cityName ? `${cityName} Snow Removal Quote` : <>Your address.<br/><em>Your snow removal price.</em></>}</h1>
    <p className="pq-lede">Driveway, sidewalk, walkway and steps. One address. One starting price.</p><CalculatorEmbed showIntro={false}/>
   </div>
   <figure className="pq-wow"><img src="/quote-media/wow-quote-hero.webp" alt="Wow holding a snow removal quote clipboard" width="1536" height="1024" fetchPriority="high"/><figcaption>AI concept illustration · Wow with a quote sheet. Background: PlowWow promotional winter-service footage.</figcaption></figure>
  </section>
  <section className="pq-booking"><h2>Your price first. Follow-up when you want it.</h2><p>Enter a complete street address and city. Your combined residential starting estimate appears immediately, with no measurements, signup or email required.</p><p>The estimate is for a standard residential property on a seasonal route, before GST. Larger properties, commercial sites and unusual access need a confirmed quote.</p><p>If you want a follow-up, the button carries your address and estimate into the request form.</p></section>
 </main><Footer/></div>;
}
