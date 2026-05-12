import { Phone, Mail, MapPin, Facebook, Twitter, Instagram } from "lucide-react";
import logoMascot from "@/assets/plowwow-mascot.jpg";

const Footer = () => (
  <footer id="contact" className="bg-footer text-footer-foreground py-16">
    <div className="container">
      <div className="grid md:grid-cols-4 gap-10">
        <div>
          <figure className="mb-4">
            <img src={logoMascot} alt="PlowWow snow removal company logo and mascot" width={80} height={80} />
            <figcaption className="sr-only">PlowWow — Professional snow removal serving Vancouver and Greater British Columbia</figcaption>
          </figure>
          <p className="text-sm opacity-80">
            We Put The Wow in Plow. Professional snow removal across Vancouver & Greater British Columbia.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-bold text-lg mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><a href="#" className="hover:text-primary transition-colors">Home</a></li>
            <li><a href="#about" className="hover:text-primary transition-colors">About</a></li>
            <li><a href="#services" className="hover:text-primary transition-colors">Services</a></li>
            <li><a href="#service-areas" className="hover:text-primary transition-colors">Service Areas</a></li>
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
        </div>
        <div>
          <h4 className="font-heading font-bold text-lg mb-4">Follow Us</h4>
          <div className="flex gap-4">
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
        © {new Date().getFullYear()} PlowWow.com — All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
