import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";

// Vercel serves existing files before applying rewrites. Keep the index
// shell private and let the function handle the public index and old aliases.
await mkdir(".blog-runtime", { recursive: true });
await rename("dist/blog/index.html", ".blog-runtime/index.html");

const legacySlugs = (await readdir("src/content/legacy/blog"))
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.slice(0, -3));
await writeFile(".blog-runtime/legacy-slugs.json", JSON.stringify(legacySlugs));
await Promise.all(legacySlugs.filter((slug) => slug !== "neighborhoods" && slug !== "tag")
  .map((slug) => rm(`dist/blog/${slug}/index.html`, { force: true })));
