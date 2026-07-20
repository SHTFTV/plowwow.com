import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const SITE = "https://plowwow.com";
const BLOG_DIR = resolve(process.cwd(), "src/content/legacy/blog");
const IMAGE_DIR = resolve(process.cwd(), "public/blog-images");
const OUT = resolve(process.cwd(), "public/rss.xml");

const cleanTitle = (t: string, slug: string) =>
  (t || slug).replace(/\s*\|\s*PlowWow.*$/i, "").replace(/\s+/g, " ").trim();

const plainText = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const gitFirst = (file: string): number => {
  try {
    const v = execFileSync("git", ["log", "--format=%ct", "--", file], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!v) return 0;
    const times = v.split(/\s+/).map((n) => Number(n) * 1000).filter((n) => n > 0);
    return times.length ? times[times.length - 1] : 0;
  } catch {
    return 0;
  }
};

const items = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((file) => {
    const slug = file.replace(/\.md$/, "");
    const filePath = resolve(BLOG_DIR, file);
    const raw = readFileSync(filePath, "utf8");
    const title = cleanTitle(raw.match(/^Title:\s*(.+)$/m)?.[1] ?? "", slug);
    const desc = raw.match(/^Description:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const body = raw.match(/Markdown Content:\s*\n([\s\S]*)$/)?.[1] ?? raw;
    const blurb = (desc || plainText(body)).slice(0, 280).replace(/[\s,;:.-]+$/, "") + "…";
    const pub = gitFirst(`src/content/legacy/blog/${file}`) || statSync(filePath).mtimeMs;
    const url = `${SITE}/${slug}/`;
    const image = existsSync(resolve(IMAGE_DIR, `${slug}.jpg`))
      ? `${SITE}/blog-images/${slug}.jpg`
      : null;
    return { slug, title, blurb, pub, url, image };
  })
  .sort((a, b) => b.pub - a.pub);

const lastBuild = new Date(items[0]?.pub ?? Date.now()).toUTCString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>PlowWow Blog — Snow Removal Insights for Metro Vancouver</title>
    <link>${SITE}/blog/</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Neighborhood snow removal, strata &amp; commercial de-icing guides across Greater Vancouver, BC.</description>
    <language>en-CA</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <image>
      <url>${SITE}/icon-512.png</url>
      <title>PlowWow</title>
      <link>${SITE}/blog/</link>
    </image>
${items
  .map(
    (i) => `    <item>
      <title>${esc(i.title)}</title>
      <link>${i.url}</link>
      <guid isPermaLink="true">${i.url}</guid>
      <pubDate>${new Date(i.pub).toUTCString()}</pubDate>
      <description>${esc(i.blurb)}</description>${
      i.image ? `\n      <enclosure url="${i.image}" type="image/jpeg" length="0" />` : ""
    }
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

writeFileSync(OUT, xml);
console.log(`✓ rss.xml written (${items.length} items)`);
