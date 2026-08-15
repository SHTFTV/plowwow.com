// Submit URLs to IndexNow (Bing, Yandex, DuckDuckGo). Non-fatal: never fails the build.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KEY = "9fecee0b18c8d530a63a5e75596da18d";
const HOST = "plowwow.com";
const PUBLIC = join(process.cwd(), "public");

function urlsFromSitemaps(): string[] {
  const urls = new Set<string>();
  for (const f of readdirSync(PUBLIC)) {
    if (!/^sitemap.*\.xml$/.test(f)) continue;
    try {
      const xml = readFileSync(join(PUBLIC, f), "utf-8");
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
    } catch {}
  }
  return [...urls];
}

async function main() {
  const urlList = urlsFromSitemaps();
  if (!urlList.length) { console.log("[indexnow] no sitemap URLs found, skipping"); return; }
  const body = { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList };
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    console.log(`[indexnow] submitted ${urlList.length} URLs -> HTTP ${res.status}`);
  } catch (e) {
    console.warn("[indexnow] ping failed (non-fatal):", (e as Error).message);
  }
}
main();
