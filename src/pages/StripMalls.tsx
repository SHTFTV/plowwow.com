import { useEffect } from 'react';
import { ArrowUpRight, Clock3, Store, Truck, Footprints, Snowflake, MapPinned } from 'lucide-react';
import TopBar from '@/components/TopBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';
import './strip-malls.css';

const title = 'Strip Mall Snow Removal | Storefronts & Parking | PlowWow';
const description = 'Snow plowing, storefront walk clearing and de-icing for Lower Mainland strip malls. Plan customer access, deliveries and snow storage with PlowWow.';
const canonical = 'https://www.plowwow.com/strip-malls';
const zones = [
  { icon: Truck, number: '01', title: 'Room to arrive.', text: 'Drive aisles, customer parking and turning space. Plan where each pass pushes the snow before the lot fills with cars.' },
  { icon: Footprints, number: '02', title: 'A path to the door.', text: 'Storefront walks, accessible spaces and access aisles, curb ramps and crossings. Connect the cleared lot to the actual entrance.' },
  { icon: Store, number: '03', title: 'Space to keep working.', text: 'Rear doors, delivery approaches, waste access and designated snow-storage areas. Match the plan to each tenant’s operating hours.' },
];

export default function StripMalls() {
  useEffect(() => {
    document.title = title;
    const meta = (key: string, value: string, attribute = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.setAttribute('content', value);
    };
    meta('description', description); meta('og:title', title, 'property'); meta('og:description', description, 'property'); meta('og:url', canonical, 'property');
    meta('og:image', 'https://www.plowwow.com/images/wow-strip-mall-share-v1.jpg', 'property'); meta('og:image:alt', 'Wow plowing a strip-mall parking lot before opening — original brand illustration', 'property');
    meta('twitter:image', 'https://www.plowwow.com/images/wow-strip-mall-share-v1.jpg'); meta('twitter:card', 'summary_large_image');
    let link = document.querySelector('link[rel="canonical"]'); if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); } link.setAttribute('href', canonical);
  }, []);
  return <><TopBar/><Navbar/><main id="main-content" className="strip-page">
    <section className="strip-hero" aria-labelledby="strip-title">
      <figure><img src="/images/wow-strip-mall-plow-v1.webp" width="1672" height="941" loading="eager" alt="Wow operating a pickup plow beside a small shopping plaza, with parking access cleared"/><figcaption>Lot work, planned around the storefronts. Original AI-generated PlowWow illustration; not an actual client property.</figcaption></figure>
      <div className="strip-shade"/>
      <div className="strip-hero-copy"><p className="strip-kicker">STRIP MALL SNOW REMOVAL / LOWER MAINLAND</p><h1 id="strip-title">Strip mall snow removal.<br/><span>Built around your shops.</span></h1><p>From the parking aisle to the shop door. Snow clearing and de-icing planned around your tenants, customers and deliveries.</p><div className="strip-actions"><a className="strip-button" href="#strip-quote">Plan my plaza <ArrowUpRight size={19}/></a><a className="strip-text-link" href="tel:+16047611518">Talk to PlowWow · 604-761-1518</a></div></div>
    </section>
    <section className="strip-zones" aria-labelledby="strip-zones-title"><div className="strip-heading"><p className="strip-kicker">ONE PROPERTY. SEVERAL DIFFERENT JOBS.</p><h2 id="strip-zones-title">The lot is only<br/><span>part of the job.</span></h2><p>Good access joins the pieces together. We walk the site with you and define what belongs in the service plan.</p></div><div className="strip-zone-grid">{zones.map(({icon:Icon,...zone})=><article key={zone.number}><div className="strip-zone-top"><Icon size={26} aria-hidden="true"/><span>{zone.number}</span></div><h3>{zone.title}</h3><p>{zone.text}</p></article>)}</div></section>
    <section className="strip-walk" aria-labelledby="strip-walk-title"><figure><img src="/images/wow-strip-mall-walk-v1.webp" width="1672" height="941" loading="lazy" alt="Wow operating a compact snow blower along the storefront sidewalk, directing snow toward a planted edge"/><figcaption>Smaller equipment for the storefront route. Original AI-generated PlowWow illustration; equipment and snow placement depend on the site.</figcaption></figure><div><p className="strip-kicker">THE RIGHT FIT AT THE FRONT DOOR</p><h2 id="strip-walk-title">Big lot.<br/><span>Small details.</span></h2><p>A one-ton plow and spreader can cover the parking area. Storefront walks may call for a compact blower, a shovel, or an enclosed utility vehicle where the width and access allow.</p><p>We match equipment to clearances, parked vehicles and pedestrian routes, then define salting or de-icing in the agreement.</p><a className="strip-text-link" href="/snow-blowers-for-sidewalks">See how we match sidewalk equipment <ArrowUpRight size={17}/></a></div></section>
    <section className="strip-site-plan" aria-labelledby="strip-plan-title"><div><p className="strip-kicker">BEFORE THE FIRST STORM</p><h2 id="strip-plan-title">Mark the places<br/>that matter.</h2><p>Bring a site plan, or walk the plaza with us. A clear scope gives tenants and crews the same starting point.</p></div><ol><li><MapPinned aria-hidden="true"/><div><h3>Agree the snow-storage areas.</h3><p>Keep sightlines, access aisles, drains and entrances in the plan. Snow relocation or hauling is quoted separately when needed.</p></div></li><li><Clock3 aria-hidden="true"/><div><h3>Share opening and delivery hours.</h3><p>Identify early-opening tenants, delivery windows and access restrictions so we can plan workable service timing.</p></div></li><li><Snowflake aria-hidden="true"/><div><h3>Set the snow and ice scope.</h3><p>Confirm clearing areas, treatment surfaces, service triggers and communication contacts in writing.</p></div></li></ol></section>
    <section className="strip-terms" aria-labelledby="strip-terms-title"><p className="strip-kicker">PRIORITY STARTS WITH A PLACE IN THE PLAN</p><h2 id="strip-terms-title">Limited route capacity.<br/><span>Unlimited seasonal visits.</span></h2><div className="strip-terms-grid"><div><h3>A five-hour route target.</h3><p>Seasonal routes are planned around a five-hour return window in normal conditions. Your agreement defines when that window starts and the included work. Access, prolonged snowfall and equipment disruption can affect timing.</p></div><div><h3>Clear extreme-storm terms.</h3><p>Seasonal service has no visit cap. An extreme-event surcharge of 40% of the agreed per-event baseline applies to continuous snowfall lasting 12 hours or more, or an event of 20 cm or more. Your agreement defines the baseline and event measurement.</p></div></div><p className="strip-plain">Your seasonal plan covers repeat visits. Extreme storms have a defined extra charge.</p></section>
    <section id="strip-quote" className="strip-quote"><p className="strip-kicker">LET’S LOOK AT YOUR PROPERTY</p><h2>Your shops.<br/><span>Our winter conversation.</span></h2><p>Include the plaza address, number of units, storefront walk length, opening hours and delivery needs. PlowWow coordinates the service and billing through one company.</p><ContactForm/></section>
  </main><Footer/></>;
}
