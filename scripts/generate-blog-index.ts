import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BLOG_DIR = resolve(process.cwd(), "src/content/legacy/blog");
const IMAGE_DIR = resolve(process.cwd(), "public/blog-images");
const OUT_FILE = resolve(process.cwd(), "src/generated/blog-posts.ts");
const JSON_OUT = resolve(process.cwd(), "public/blog-index.json");

const cleanTitle = (title: string, slug: string) =>
  (title || slug)
    .replace(/\s*\|\s*PlowWow.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

const plainText = (markdown: string) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const gitTimestamps = (file: string): { first: number; last: number } => {
  try {
    const value = execFileSync("git", ["log", "--format=%ct", "--", file], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!value) return { first: 0, last: 0 };
    const times = value.split(/\s+/).map((v) => Number(v) * 1000).filter((n) => Number.isFinite(n) && n > 0);
    if (times.length === 0) return { first: 0, last: 0 };
    return { first: times[times.length - 1], last: times[0] };
  } catch {
    return { first: 0, last: 0 };
  }
};

// Themed OG fallbacks — mascot-only framing so legacy posts without a bespoke
// hero still ship a branded 1200x630 share image (no /og-default.jpg fallback).
// Each theme file lives at public/blog-images/_theme-<name>.jpg.
type Theme = "strata" | "commercial" | "residential" | "storm" | "citywide";
const THEME_ALT: Record<Theme, string> = {
  strata: "PlowWow Wow mascot alone in front of a Metro Vancouver strata condominium building on a bright plowed sidewalk with snow-dusted evergreens",
  commercial: "PlowWow Wow mascot alone on a plowed and salted Metro Vancouver commercial retail parking lot with safety cone and tidy snow banks",
  residential: "PlowWow Wow mascot alone on a freshly plowed Metro Vancouver residential driveway in front of a West Coast craftsman home with snow-dusted evergreens",
  storm: "PlowWow Wow mascot alone on a freshly cleared Metro Vancouver road during a light Pineapple Express snowfall with plow tracks and evergreens",
  citywide: "PlowWow Wow mascot alone on a plowed Metro Vancouver hillside street with the North Shore mountains and downtown skyline in the background",
};
function pickTheme(slug: string, title: string): Theme {
  const hay = `${slug} ${title}`.toLowerCase();
  if (/strata|condo|apartment|townhome|hoa|council/.test(hay)) return "strata";
  if (/commercial|parking|retail|strip-mall|business|industrial|warehouse|office/.test(hay)) return "commercial";
  if (/residential|driveway|home|house|homeowner|property/.test(hay)) return "residential";
  if (/storm|pineapple|arctic|outflow|emergency|blizzard|record|forecast|weather/.test(hay)) return "storm";
  return "citywide";
}

const posts = readdirSync(BLOG_DIR)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const slug = file.replace(/\.md$/, "");
    const filePath = resolve(BLOG_DIR, file);
    const raw = readFileSync(filePath, "utf8");
    const title = cleanTitle(raw.match(/^Title:\s*(.+)$/m)?.[1] ?? "", slug);
    const description = raw.match(/^Description:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const body = raw.match(/Markdown Content:\s*\n([\s\S]*)$/)?.[1] ?? raw;
    const imageMatch = body.match(/!\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]+")?\)/);
    const heroPath = resolve(IMAGE_DIR, `${slug}.jpg`);
    const hasHeroImage = existsSync(heroPath);
    // Prefer file mtime so newly added posts always sort to the top of the
    // carousel. Git timestamps are unreliable here because bulk commits give
    // every post the same second, which collapses the sort to alphabetical
    // slug order and freezes the homepage carousel. Fall back to git only
    // when mtime is missing.
    const mtimeMs = statSync(filePath).mtimeMs;
    const git = gitTimestamps(`src/content/legacy/blog/${file}`);
    const publishedAtMs = mtimeMs || git.first;
    const updatedAtMs = Math.max(mtimeMs, git.last || 0) || mtimeMs;

    const theme = pickTheme(slug, title);
    const image = hasHeroImage ? `/blog-images/${slug}.jpg` : `/blog-images/_theme-${theme}.jpg`;
    // When we fall back to a themed image, always use the descriptive theme alt
    // so screen readers get mascot-only framing wording (not the short markdown alt).
    const markdownAlt = imageMatch?.[1]?.trim() ?? "";
    const alt = hasHeroImage
      ? (markdownAlt || `${title} by PlowWow`)
      : (markdownAlt.length >= 40 ? markdownAlt : THEME_ALT[theme]);

    // Topic tags — derived deterministically from slug + title so the neighborhood
    // index can offer topic filters without any per-post metadata.
    const hay = `${slug} ${title} ${description}`.toLowerCase();
    const tagRules: [string, RegExp][] = [
      ["Strata", /strata|condo|apartment|townhome|hoa|council/],
      ["Commercial", /commercial|parking|retail|strip-mall|business|industrial|warehouse|office|plaza/],
      ["Residential", /residential|driveway|homeowner|house-|craftsman/],
      ["Liability", /liability|slip|fall|insurance|occupier|claim/],
      ["De-Icing", /de-ic|salt|brine|calcium|magnesium|pet-safe/],
      ["Weather", /pineapple|arctic|outflow|storm|forecast|emergency|weather|record|blizzard/],
      ["Contracts", /contract|seasonal|per-visit|budget|cost|pricing|quote/],
      ["Equipment", /equipment|fleet|skid|plow|blower|technology|gps|salt-scan/],
    ];
    const tags = tagRules.filter(([, re]) => re.test(hay)).map(([t]) => t);

    return {
      slug,
      title,
      blurb: (description || plainText(body)).slice(0, 180).replace(/[\s,;:.-]+$/, "") + "…",
      image,
      alt,
      theme,
      tags,
      hasCustomHero: hasHeroImage,
      publishedAt: new Date(publishedAtMs).toISOString(),
      updatedAt: new Date(updatedAtMs).toISOString(),
    };
  })
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));

mkdirSync(resolve(process.cwd(), "src/generated"), { recursive: true });
writeFileSync(
  OUT_FILE,
  `export type BlogPostSummary = {\n  slug: string;\n  title: string;\n  blurb: string;\n  image: string;\n  alt: string;\n  theme: "strata" | "commercial" | "residential" | "storm" | "citywide";\n  tags: string[];\n  hasCustomHero: boolean;\n  publishedAt: string;\n  updatedAt: string;\n};\n\nexport const blogPosts = ${JSON.stringify(posts, null, 2)} satisfies BlogPostSummary[];\n`,
);

// Machine-readable index used by the live-carousel verifier and by the
// on-page diagnostics view. Includes a build timestamp + the exact top-4
// slugs rendered in the homepage carousel (matches HomeBlog.tsx filter).
const carousel = posts.filter((p) => p.hasCustomHero).slice(0, 4).map((p) => p.slug);
const generatedAt = new Date().toISOString();
writeFileSync(
  JSON_OUT,
  JSON.stringify(
    {
      generatedAt,
      count: posts.length,
      carousel,
      posts: posts.map((p) => ({ slug: p.slug, publishedAt: p.publishedAt, updatedAt: p.updatedAt })),
    },
    null,
    2,
  ),
);

console.log(`✓ blog-posts.ts written (${posts.length} posts) + blog-index.json (carousel=${carousel.length})`);