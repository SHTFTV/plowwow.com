// Resolve the set of public routes impacted by the current git diff.
//
// Used by:
//   scripts/regenerate-seo-baseline.ts --changed
//   scripts/render-snapshot-diffs.ts   --changed
//
// Diff sources (unioned):
//   1. `git diff --name-only <base>...HEAD` — committed changes vs. `base`
//   2. `git diff --name-only HEAD`           — unstaged working-tree changes
//   3. `git diff --name-only --cached`       — staged but uncommitted changes
//
// Base defaults to `origin/main`, then `main`, then `HEAD~1`. Override via
// SEO_CHANGED_BASE=<ref>. If git is unavailable or the repo is shallow,
// resolution falls back gracefully — never throws.
//
// File → route mapping (best-effort, biased toward false positives so a
// regeneration never silently skips an impacted route):
//   src/content/legacy/pages/<slug>.md   → /<slug>
//   src/content/legacy/blog/<slug>.md    → /<slug>
//   public/blog-images/<slug>.jpg        → /<slug>
//   src/data/cities.ts                   → every /:citySlug (whole file
//                                          drives every city snapshot)
//   src/data/cityContent.ts              → every /:citySlug
//   src/pages/CityPage.tsx               → every /:citySlug
//   src/pages/Index.tsx                  → /
//   src/pages/BlogIndex.tsx              → /blog
//   src/pages/Intelligence.tsx           → /intelligence
//   src/pages/AppFeatures.tsx            → /advanced-technology
//   src/pages/Takeoff.tsx                → /takeoff
//   src/pages/GuestPost.tsx              → /guest-post
//   src/pages/Burnaby.tsx                → /burnaby
//   src/pages/NotFound.tsx               → (ignored — not a public URL)
//
// Unknown paths are ignored; empty result → the CLI exits 0 with a note.
import { execFileSync } from "node:child_process";
import { cities } from "../../src/data/cities";

export type ChangedResolution = {
  routes: string[];
  files: string[];
  base: string | null;
  reason?: string;
};

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return null;
  }
}

function resolveBase(): string | null {
  const envBase = process.env.SEO_CHANGED_BASE;
  const candidates = [envBase, "origin/main", "main", "HEAD~1"].filter(Boolean) as string[];
  for (const c of candidates) {
    if (git(["rev-parse", "--verify", c])) return c;
  }
  return null;
}

function changedFiles(): { files: string[]; base: string | null; reason?: string } {
  const base = resolveBase();
  const set = new Set<string>();
  const add = (out: string | null) => {
    if (!out) return;
    for (const line of out.split("\n")) {
      const p = line.trim();
      if (p) set.add(p);
    }
  };
  if (base) add(git(["diff", "--name-only", `${base}...HEAD`]));
  add(git(["diff", "--name-only", "HEAD"]));
  add(git(["diff", "--name-only", "--cached"]));
  return {
    files: [...set],
    base,
    reason: base ? undefined : "no comparable base ref (defaulted to working-tree diff only)",
  };
}

function fileToRoutes(file: string): string[] {
  // Normalize windows-style separators just in case.
  const f = file.replace(/\\/g, "/");
  let m: RegExpMatchArray | null;

  if ((m = f.match(/^src\/content\/legacy\/pages\/([^/]+)\.md$/))) {
    return m[1] === "home" ? ["/"] : [`/${m[1]}`];
  }
  if ((m = f.match(/^src\/content\/legacy\/blog\/([^/]+)\.md$/))) return [`/${m[1]}`];
  if ((m = f.match(/^public\/blog-images\/([^/]+)\.jpg$/))) return [`/${m[1]}`];

  if (
    f === "src/data/cities.ts" ||
    f === "src/data/cityContent.ts" ||
    f === "src/pages/CityPage.tsx"
  ) {
    return cities.map((c) => `/${c.slug}`);
  }

  const staticMap: Record<string, string> = {
    "src/pages/Index.tsx": "/",
    "src/components/HomeBlog.tsx": "/",
    "src/pages/BlogIndex.tsx": "/blog",
    "src/pages/Intelligence.tsx": "/intelligence",
    "src/pages/AppFeatures.tsx": "/advanced-technology",
    "src/pages/Takeoff.tsx": "/takeoff",
    "src/pages/GuestPost.tsx": "/guest-post",
    "src/pages/Burnaby.tsx": "/burnaby",
    "src/pages/SeoReport.tsx": "/seo-report",
  };
  if (staticMap[f]) return [staticMap[f]];

  return [];
}

export function resolveChangedRoutes(): ChangedResolution {
  const { files, base, reason } = changedFiles();
  const routes = new Set<string>();
  for (const f of files) for (const r of fileToRoutes(f)) routes.add(r);
  return { routes: [...routes].sort(), files, base, reason };
}
