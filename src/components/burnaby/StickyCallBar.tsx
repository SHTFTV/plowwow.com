import { Phone } from "lucide-react";

const StickyCallBar = () => (
  <a
    href="tel:6047611518"
    className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-heading font-black text-lg py-4 rounded-full shadow-2xl active:scale-95 transition-transform"
    aria-label="Call PlowWow Burnaby"
  >
    <Phone className="w-5 h-5" /> Call Now · 604-761-1518
  </a>
);

export default StickyCallBar;
