import { createRequire } from "node:module";
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


// Use Vite's locked esbuild dependency to package the shared TSX and its
// dependencies for the standalone Vercel Node function.
const requireFromVite = createRequire(import.meta.resolve("vite"));
const { build } = requireFromVite("esbuild");
await build({
  entryPoints: ["scripts/public-blog-handler.ts"],
  outfile: ".blog-runtime/handler.cjs",
  platform: "node",
  target: "node22",
  bundle: true,
  define: { "process.env.NODE_ENV": '"production"' },
});
