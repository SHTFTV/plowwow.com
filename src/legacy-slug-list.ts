// Lightweight slug enumeration for legacy content. Uses import.meta.glob with
// eager: false so ONLY the filename keys are baked into the bundle at build
// time — the ~2 MB of markdown itself stays out of this chunk. App.tsx uses
// these lists to register routes without pulling in LegacyPage (which
// remains route-lazy).
const pageGlob = import.meta.glob("/src/content/legacy/pages/*.md", { query: "?raw", eager: false });
const blogGlob = import.meta.glob("/src/content/legacy/blog/*.md", { query: "?raw", eager: false });

const slugFromPath = (p: string) => p.split("/").pop()!.replace(/\.md$/, "");

export const legacyPageSlugs: string[] = Object.keys(pageGlob).map(slugFromPath).sort();
export const legacyBlogSlugs: string[] = Object.keys(blogGlob).map(slugFromPath).sort();
