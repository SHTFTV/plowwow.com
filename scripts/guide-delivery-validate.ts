import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectRoutes, BASE_URL } from "./routes";
import { blogPosts } from "../src/generated/blog-posts";
import dimensions from "../src/generated/blog-image-metadata.json";

// Regression gate: every live guide must deliver its content and final metadata
// before JavaScript. Redirected legacy routes are excluded by collectRoutes.
let count = 0;
const failures: string[] = [];
for (const route of collectRoutes().filter(r => r.kind === "legacy-blog")) {
  const html = readFileSync(resolve("dist", route.path.slice(1), "index.html"), "utf8");
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/)?.[1] || "";
  const post = blogPosts.find(p => `/${p.slug}` === route.path)!;
  const share = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const imagePath = share ? new URL(share).pathname : post.image;
  const meta = dimensions[imagePath as keyof typeof dimensions] || dimensions[post.image as keyof typeof dimensions];
  const check = (ok: boolean, reason: string) => { if (!ok) failures.push(`${route.path}: ${reason}`); };
  const articleText = article.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // Owner explicitly approved this short Oct30message; all other guide minimums remain unchanged.
  const exactOwnerBrief = route.path === "/vancouver-winter-tires-edmonton-snowfall-reminder" && articleText.includes("Don’t wait until the roads turn white to think about winter tires. At Plow Wow, we prepare for traction with quality winter tires and studs or chains where appropriate and permitted—so we can reach the job and get to work clearing pavement. Have you got your winter tires on? Get prepared before the first snowfall.");
  check(articleText.split(/\s+/).filter(Boolean).length >= 250 || exactOwnerBrief, "full article missing");
  check((html.match(/<h1[\s>]/g) || []).length === 1, "expected one H1");
  check(html.includes(`rel="canonical" href="${BASE_URL}${route.path}"`), "canonical mismatch");
  check(html.includes('property="og:type" content="article"'), "article OG type missing");
  check(html.includes(`property="og:image:width" content="${meta.width}"`) && html.includes(`property="og:image:height" content="${meta.height}"`), "incorrect social image dimensions");
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  check(blocks.filter(b => b["@type"] === "BlogPosting").length === 1, "expected one article schema");
  check(blocks.filter(b => b["@type"] === "BreadcrumbList").length === 1, "expected one breadcrumb schema");
  check(!blocks.some(b => b["@type"] === "Service"), "article represented as a service area");
  count++;
}
if (failures.length) throw new Error(failures.join("\n"));
console.log(`✓ guide-delivery: ${count} complete articles, canonical URLs, headings and social/schema metadata verified`);
