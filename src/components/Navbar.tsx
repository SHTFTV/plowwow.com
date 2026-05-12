import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cities } from "@/data/cities";
import logoMascot from "@/assets/plowwow-mascot.jpg";

const navItems = [
  { label: "Home", href: "/#" },
  { label: "About", href: "/#about" },
  { label: "Residential", href: "/#services" },
  { label: "Commercial", href: "/#services" },
  { label: "Service Areas", href: "/#service-areas" },
  { label: "Services", href: "/#services" },
  { label: "Contact", href: "/#contact" },
];

const cityLinks = [
  { name: "Burnaby", slug: "burnaby" },
  ...cities.map((c) => ({ name: c.name, slug: c.slug })),
].sort((a, b) => a.name.localeCompare(b.name));

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-card shadow-md sticky top-0 z-50">
      <div className="container flex items-center justify-between py-3">
        <a href="/" className="flex items-center gap-2">
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

          <DropdownMenu>
            <DropdownMenuTrigger className="text-foreground font-heading font-semibold text-sm hover:text-primary transition-colors inline-flex items-center gap-1">
              Cities <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto">
              {cityLinks.map((c) => (
                <DropdownMenuItem key={c.slug} asChild>
                  <Link to={`/${c.slug}`} className="font-heading font-semibold">
                    {c.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

            <details className="border-t border-border pt-2">
              <summary className="text-foreground font-heading font-semibold py-2 cursor-pointer hover:text-primary transition-colors">
                Cities
              </summary>
              <div className="flex flex-col gap-1 pl-3 pt-1">
                {cityLinks.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/${c.slug}`}
                    className="text-foreground font-heading py-1.5 hover:text-primary transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </details>

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
