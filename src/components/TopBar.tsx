import { Mail, Facebook, Twitter, Instagram, Rss } from "lucide-react";

const TopBar = () => (
  <div className="bg-topbar text-topbar-foreground py-2">
    <div className="container flex items-center justify-between text-sm">
      <a href="mailto:Wow@plowwow.com" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
        <Mail className="w-4 h-4" />
        Wow@plowwow.com
      </a>
      <div className="flex items-center gap-3">
        <a href="#" aria-label="Facebook"><Facebook className="w-4 h-4 hover:text-primary transition-colors" /></a>
        <a href="#" aria-label="Twitter"><Twitter className="w-4 h-4 hover:text-primary transition-colors" /></a>
        <a href="#" aria-label="Instagram"><Instagram className="w-4 h-4 hover:text-primary transition-colors" /></a>
        <a href="#" aria-label="RSS"><Rss className="w-4 h-4 hover:text-primary transition-colors" /></a>
      </div>
    </div>
  </div>
);

export default TopBar;
