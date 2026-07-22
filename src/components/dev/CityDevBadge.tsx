// Dev-only floating badge shown on city pages.
// - Counts words in <main> (target: 5,800+)
// - Validates JSON-LD blocks (LocalBusiness/FAQPage/BreadcrumbList/Service)
// - Hidden entirely in production builds (returns null when !import.meta.env.DEV)

import { useEffect, useState } from "react";
import {
  collectPageJsonLdIssues,
  countMainWords,
  type JsonLdIssue,
} from "@/lib/jsonLdValidator";

type Snapshot = {
  words: number;
  blocks: number;
  issues: JsonLdIssue[];
};

const TARGET_WORDS = 5800;

export default function CityDevBadge({ cityName }: { cityName: string }) {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot>({ words: 0, blocks: 0, issues: [] });

  useEffect(() => {
    // Wait for hydration + charts + deep-dive lazy content.
    const run = () => {
      const { blocks, issues } = collectPageJsonLdIssues();
      setSnap({ words: countMainWords(), blocks, issues });
    };
    const t1 = window.setTimeout(run, 400);
    const t2 = window.setTimeout(run, 1600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [cityName]);

  if (!import.meta.env.DEV) return null;

  const errors = snap.issues.filter((i) => i.severity === "error").length;
  const warns = snap.issues.filter((i) => i.severity === "warn").length;
  const wordsOk = snap.words >= TARGET_WORDS;
  const schemaOk = errors === 0;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] font-mono text-xs shadow-2xl"
      style={{ maxWidth: open ? 420 : undefined }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-black/85 text-white px-3 py-2 backdrop-blur border border-white/10 hover:bg-black"
        aria-label="Toggle city SEO dev badge"
      >
        <span
          className={
            "inline-block w-2 h-2 rounded-full " +
            (wordsOk && schemaOk
              ? "bg-emerald-400"
              : errors > 0
                ? "bg-red-400"
                : "bg-amber-400")
          }
        />
        <span>
          {snap.words.toLocaleString()} words
          {wordsOk ? " ✓" : ` / ${TARGET_WORDS.toLocaleString()}`}
        </span>
        <span className="opacity-60">|</span>
        <span>
          JSON-LD {snap.blocks} · {errors}E {warns}W
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-black/90 text-white p-3 border border-white/10 max-h-[60vh] overflow-auto">
          <div className="mb-2 font-bold">{cityName} — SEO check</div>
          <div className="mb-2">
            Words: <span className={wordsOk ? "text-emerald-400" : "text-amber-400"}>
              {snap.words.toLocaleString()}
            </span>{" "}
            / target {TARGET_WORDS.toLocaleString()}
          </div>
          <div className="mb-2">
            JSON-LD blocks: {snap.blocks} · errors {errors} · warns {warns}
          </div>
          {snap.issues.length === 0 ? (
            <div className="text-emerald-400">All JSON-LD blocks pass required-field checks.</div>
          ) : (
            <ul className="space-y-1">
              {snap.issues.map((iss, i) => (
                <li
                  key={i}
                  className={
                    iss.severity === "error" ? "text-red-300" : "text-amber-300"
                  }
                >
                  <span className="opacity-70">[{iss.block}]</span> {iss.path} — {iss.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 text-[10px] opacity-60">
            Dev-only badge. Hidden in production builds.
          </div>
        </div>
      )}
    </div>
  );
}
