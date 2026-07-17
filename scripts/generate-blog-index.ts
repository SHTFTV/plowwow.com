import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BLOG_DIR = resolve(process.cwd(), "src/content/legacy/blog");
const IMAGE_DIR = resolve(process.cwd(), "public/blog-images");
const OUT_FILE = resolve(process.cwd(), "src/generated/blog-posts.ts");

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
    const publishedAtMs = gitTimestamp(`src/content/legacy/blog/${file}`) || statSync(filePath).mtimeMs;

    return {
      slug,
      title,
      blurb: (description || plainText(body)).slice(0, 180).replace(/[\s,;:.-]+$/, "") + "…",
      image: hasHeroImage ? `/blog-images/${slug}.jpg` : null,
      alt: imageMatch?.[1]?.trim() || `${title} by PlowWow`,
      publishedAt: new Date(publishedAtMs).toISOString(),
    };
  })
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));

mkdirSync(resolve(process.cwd(), "src/generated"), { recursive: true });
writeFileSync(
  OUT_FILE,
  `export type BlogPostSummary = {\n  slug: string;\n  title: string;\n  blurb: string;\n  image: string | null;\n  alt: string;\n  publishedAt: string;\n};\n\nexport const blogPosts = ${JSON.stringify(posts, null, 2)} satisfies BlogPostSummary[];\n`,
);

console.log(`✓ blog-posts.ts written (${posts.length} posts)`);