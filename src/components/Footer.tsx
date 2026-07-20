import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Rss } from "lucide-react";
import { Link } from "react-router-dom";
import logoMascot from "@/assets/plowwow-mascot.jpg";

const propertyTypes = [
  { label: "Strata Complexes", href: "/strata-complexes" },
  { label: "Snow Blowers For Sidewalks", href: "/snow-blowers-for-sidewalks" },
  { label: "Commercial Lots", href: "/commercial" },
  { label: "Apartment Complexes", href: "/apartment-complexes" },
  { label: "Strip Malls", href: "/strip-malls" },
  { label: "Residential Houses", href: "/residential-snow-removal" },
];

const whyPlowwow = [
  { label: "Skilled & Courteous Team", href: "/skilled-courteous-team" },
  { label: "Satisfaction Guaranteed", href: "/satisfaction-guaranteed" },
  { label: "Advanced Technology", href: "/advanced-technology" },
  { label: "24/7 Service", href: "/24-7-service" },
  { label: "Strata Experts", href: "/strata-experts" },
  { label: "Snow Relocation", href: "/snow-relocation" },
];

const Footer = () => (
  <footer id="contact" className="bg-footer text-footer-foreground py-16">
    <div className="container">
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-1">
          <figure className="mb-4">
            <img src={logoMascot} alt="PlowWow snow removal company logo and mascot" width={80} height={80} />
            <figcaption className="sr-only">PlowWow — Professional snow removal serving Vancouver and Greater British Columbia</figcaption>
          </figure>
          <p className="text-sm opacity-80">
            We Put The Wow in Plow. Professional snow removal across Vancouver & Greater British Columbia.
          </p>
        </div>

        <nav aria-label="Property types">
          <h4 className="font-heading font-bold text-lg mb-4">Property Types</h4>
          <ul className="space-y-2 text-sm opacity-80">
            {propertyTypes.map((p) => (
              <li key={p.href}>
                <Link to={p.href} className="hover:text-primary transition-colors">{p.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Why PlowWow">
          <h4 className="font-heading font-bold text-lg mb-4">Why PlowWow</h4>
          <ul className="space-y-2 text-sm opacity-80">
            {whyPlowwow.map((w) => (
              <li key={w.href}>
                <Link to={w.href} className="hover:text-primary transition-colors">{w.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h4 className="font-heading font-bold text-lg mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><a href="/#about" className="hover:text-primary transition-colors">About</a></li>
            <li><a href="/#services" className="hover:text-primary transition-colors">Services</a></li>
            <li><a href="/#service-areas" className="hover:text-primary transition-colors">Service Areas</a></li>
            <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
            <li><Link to="/intelligence" className="hover:text-primary transition-colors">Snow Intelligence</Link></li>
            <li><Link to="/app-features" className="hover:text-primary transition-colors">PlowWow App — Features & Pricing</Link></li>
            <li><Link to="/guest-post" className="hover:text-primary transition-colors">Guest Post With Us</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-4">Contact</h4>
          <ul className="space-y-3 text-sm opacity-80">
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <a href="tel:604-761-1518">604-761-1518</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <a href="mailto:Wow@plowwow.com">Wow@plowwow.com</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Vancouver, BC
            </li>
          </ul>
          <div className="flex gap-3 mt-4">
            <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/40 transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" aria-label="Twitter" className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/40 transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/40 transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-footer-foreground/20 mt-10 pt-6 text-center text-sm opacity-60">
        <div>© {new Date().getFullYear()} PlowWow.com — All rights reserved.</div>
        <div className="mt-1">Powered by Industry Army Marketing</div>
      </div>
    </div>
  </footer>
);

export default Footer;
