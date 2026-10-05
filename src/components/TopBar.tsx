import { Mail, Rss } from "lucide-react";

const TopBar = () => (
  <div className="bg-topbar text-topbar-foreground py-2">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:bg-white focus:text-black focus:p-3">Skip to main content</a>
    <div className="container flex items-center justify-between text-sm">
      <a href="mailto:Wow@plowwow.com" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
        <Mail className="w-4 h-4" />
        Wow@plowwow.com
      </a>
      <div className="flex items-center gap-3">
        <a href="/rss.xml" aria-label="RSS"><Rss className="w-4 h-4 hover:text-primary transition-colors" /></a>
      </div>
    </div>
  </div>
);

export default TopBar;
