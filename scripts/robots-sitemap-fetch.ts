// Fetch-based verification for the public robots.txt and sitemap index.
// Confirms:
//   - /robots.txt returns 200 with a text/plain content-type and a Sitemap:
//     line pointing at the sitemap index.
//   - /sitemap.xml returns 200 with an XML content-type and is a <sitemapindex>
//     that references every expected split sitemap.
//   - each referenced split sitemap returns 200 with an XML content-type and
//     is a non-empty <urlset>.
//
// Default target is the local `vite preview` server against dist/. Override
// with PUBLIC_BASE=https://plowwow.com to hit the live origin.
//
// Writes seo-report/robots-sitemap.{json,md}; exits non-zero on any failure.

import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_SPLITS = [
  "/sitemap-static.xml",
  "/sitemap-cities.xml",
  "/sitemap-blog.xml",
  "/sitemap-images.xml",
];

type Check = { name: string; url: string; ok: boolean; details: string[] };

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server never became ready at ${url}`);
}

function isXmlCT(ct: string | null): boolean {
  if (!ct) return false;
  const c = ct.toLowerCase();
  return c.includes("application/xml") || c.includes("text/xml");
}
function isTextCT(ct: string | null): boolean {
  return !!ct && ct.toLowerCase().includes("text/plain");
}

async function main() {
  const external = process.env.PUBLIC_BASE?.replace(/\/+$/, "");
  const port = Number(process.env.PUBLIC_PORT ?? 4178);
  let server: ChildProcess | null = null;
  let base: string;
  if (external) {
    base = external;
  } else {
    base = `http://localhost:${port}`;
    server = spawn("bunx", ["vite", "preview", "--port", String(port), "--strictPort"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", () => {});
    server.stderr?.on("data", () => {});
    await waitForServer(base + "/");
  }

  const checks: Check[] = [];
  try {
    // 1) robots.txt
    {
      const url = `${base}/robots.txt`;
      const res = await fetch(url);
      const body = await res.text();
      const ct = res.headers.get("content-type");
      const details: string[] = [`status=${res.status}`, `content-type=${ct}`];
      const sitemapLine = [...body.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map((m) => m[1]);
      details.push(`Sitemap: entries=${sitemapLine.length}`);
      const ok =
        res.status === 200 &&
        isTextCT(ct) &&
        sitemapLine.some((s) => s.endsWith("/sitemap.xml"));
      if (!res.ok) details.push("status ≠ 200");
      if (!isTextCT(ct)) details.push("content-type must be text/plain");
      if (!sitemapLine.some((s) => s.endsWith("/sitemap.xml")))
        details.push("Sitemap: directive missing or does not point at /sitemap.xml");
      checks.push({ name: "robots.txt", url, ok, details });
    }

    // 2) sitemap.xml index
    let indexOk = false;
    let referenced: string[] = [];
    {
      const url = `${base}/sitemap.xml`;
      const res = await fetch(url);
      const body = await res.text();
      const ct = res.headers.get("content-type");
      const details: string[] = [`status=${res.status}`, `content-type=${ct}`];
      const isIndex = /<sitemapindex\b/.test(body);
      referenced = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
      details.push(`isSitemapIndex=${isIndex}`, `references=${referenced.length}`);
      const missing = EXPECTED_SPLITS.filter((s) => !referenced.includes(s));
      if (missing.length) details.push(`missing split refs: ${missing.join(", ")}`);
      if (!isXmlCT(ct)) details.push("content-type must be application/xml or text/xml");
      const ok = res.status === 200 && isIndex && isXmlCT(ct) && missing.length === 0;
      indexOk = ok;
      checks.push({ name: "sitemap.xml (index)", url, ok, details });
    }

    // 3) each referenced split
    if (indexOk) {
      for (const path of referenced) {
        const url = `${base}${path}`;
        const res = await fetch(url);
        const body = await res.text();
        const ct = res.headers.get("content-type");
        const isUrlset = /<urlset\b/.test(body);
        const urlCount = [...body.matchAll(/<url\b/g)].length;
        const details: string[] = [
          `status=${res.status}`,
          `content-type=${ct}`,
          `isUrlset=${isUrlset}`,
          `urls=${urlCount}`,
        ];
        if (!isXmlCT(ct)) details.push("content-type must be XML");
        if (!isUrlset) details.push("not a <urlset>");
        if (urlCount === 0) details.push("empty urlset");
        const ok = res.status === 200 && isXmlCT(ct) && isUrlset && urlCount > 0;
        checks.push({ name: `split ${path}`, url, ok, details });
      }
    }
  } finally {
    if (server && !server.killed) server.kill("SIGTERM");
  }

  const failed = checks.filter((c) => !c.ok);
  mkdirSync(resolve("seo-report"), { recursive: true });
  writeFileSync(
    resolve("seo-report/robots-sitemap.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), base, failed: failed.length, checks }, null, 2),
  );
  const md = [
    `# robots.txt + sitemap index public fetch`,
    ``,
    `_Generated ${new Date().toISOString()}_`,
    ``,
    `- Base: \`${base}\``,
    `- Checks: **${checks.length}** · Failed: **${failed.length}**`,
    ``,
    `| Check | Status |`,
    `| --- | --- |`,
    ...checks.map((c) => `| ${c.name} | ${c.ok ? "✅" : "❌"} |`),
    ``,
  ];
  if (failed.length) {
    md.push(`## Failures`, ``);
    for (const c of failed) {
      md.push(`### ${c.name} — \`${c.url}\``);
      for (const d of c.details) md.push(`- ${d}`);
      md.push(``);
    }
  }
  writeFileSync(resolve("seo-report/robots-sitemap.md"), md.join("\n"));

  if (failed.length) {
    console.error(`\n✗ robots-sitemap-fetch: ${failed.length}/${checks.length} checks failed`);
    for (const c of failed) console.error(`  · ${c.name}\n      ${c.details.join("\n      ")}`);
    process.exit(1);
  }
  console.log(`✓ robots-sitemap-fetch: ${checks.length}/${checks.length} checks passed against ${base}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
