import { useEffect, useState } from "react";
import { ExternalLink, Mail, MessageSquare, Phone, Star, X } from "lucide-react";

const PHONE = "604-761-1518";
const PHONE_HREF = "tel:+16047611518";
const SMS_HREF = "sms:+16047611518";
const EMAIL = "wow@plowwow.com";
const EMAIL_HREF = "mailto:wow@plowwow.com";
const REVIEWS_URL = "https://www.google.com/search?q=PlowWow+snow+removal+Vancouver";

/**
 * One persistent LS Fencing-style contact floater for the whole site.
 * Dismissal lasts only for the current page view, so it returns on refresh.
 */
export default function PlowWowBot() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", dismissWithEscape);
    return () => window.removeEventListener("keydown", dismissWithEscape);
  }, [visible]);

  if (!visible) return null;

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  return (
    <aside
      aria-label="Contact PlowWow snow removal"
      data-testid="plowwow-contact-floater"
      className="fixed right-2 top-1/2 z-[9999] w-[230px] max-w-[calc(100vw-1rem)] -translate-y-1/2 rounded-2xl border border-sky-300/30 bg-slate-950/95 text-white shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-slate-950/90"
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Hide PlowWow contact panel"
        className={`absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-950 text-slate-300 shadow-md hover:bg-slate-800 hover:text-white ${focusRing}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <img src="/wow-mascot.png" alt="" aria-hidden="true" className="h-12 w-12 shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">PlowWow Snow Removal</p>
          <p className="mt-0.5 text-sm font-semibold leading-tight text-white">Fast quotes & storm help</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <a href={PHONE_HREF} aria-label={`Call PlowWow at ${PHONE}`} className={`group inline-flex items-center gap-2.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-sky-400 ${focusRing}`}>
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex min-w-0 flex-col leading-tight"><span className="text-[10px] font-medium uppercase tracking-wider opacity-75">Call now</span><span className="truncate">{PHONE}</span></span>
        </a>

        <a href={SMS_HREF} aria-label={`Text PlowWow at ${PHONE}`} className={`inline-flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 ${focusRing}`}>
          <MessageSquare className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
          <span className="flex min-w-0 flex-col leading-tight"><span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Text</span><span className="truncate">{PHONE}</span></span>
        </a>

        <a href={EMAIL_HREF} aria-label={`Email PlowWow at ${EMAIL}`} className={`inline-flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 ${focusRing}`}>
          <Mail className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
          <span className="flex min-w-0 flex-col leading-tight"><span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Email</span><span className="truncate">{EMAIL}</span></span>
        </a>

        <a href={REVIEWS_URL} target="_blank" rel="noopener noreferrer" aria-label="Find PlowWow on Google" className={`mt-1 flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 hover:bg-slate-800 ${focusRing}`}>
          <span className="flex min-w-0 items-center gap-2"><Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" /><span className="text-xs font-semibold text-white">Find us on Google</span></span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
}
