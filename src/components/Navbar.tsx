import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoMascot from "@/assets/logo-mascot.png";

const navItems = [
  { label: "Home", href: "#" },
  { label: "About", href: "#about" },
  { label: "Residential", href: "#services" },
  { label: "Commercial", href: "#services" },
  { label: "Service Areas", href: "#service-areas" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-card shadow-md sticky top-0 z-50">
      <div className="container flex items-center justify-between py-3">
        <a href="#" className="flex items-center gap-2">
          <img src={logoMascot} alt="PlowWow mascot" width={60} height={60} className="object-contain" />
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-foreground font-heading font-semibold text-sm hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
          <Button variant="default" className="bg-primary hover:bg-primary/90 font-heading font-bold rounded-full px-6">
            Get Quote
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="lg:hidden bg-card border-t border-border pb-4">
          <div className="container flex flex-col gap-3 pt-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground font-heading font-semibold py-2 hover:text-primary transition-colors"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Button variant="default" className="bg-primary font-heading font-bold rounded-full mt-2">
              Get Quote
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
