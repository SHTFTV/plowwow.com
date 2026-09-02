// robots.txt content-type + directives validator.
//
// Boots `vite preview` against dist/ (or hits PUBLIC_BASE) and asserts:
//   1. GET /robots.txt returns 200 with Content-Type text/plain
//   2. Every expected Sitemap: line is present
//   3. Every expected Disallow/Allow directive for the wildcard bot AND
//      per-bot blocks (Googlebot, Bingbot, Twitterbot, facebookexternalhit,
//      GPTBot, Claude-Web, anthropic-ai, PerplexityBot) is present
//
// Writes seo-report/robots-directives.{json,md}; exits 1 on any failure.

import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL } from "./routes";

const EXPECTED_SITEMAPS = [
  `${BASE_URL}/sitemap.xml`,
  `${BASE_URL}/sitemap-static.xml`,
  `${BASE_URL}/sitemap-cities.xml`,
  `${BASE_URL}/sitemap-blog.xml`,
  `${BASE_URL}/sitemap-images.xml`,
];

// Directives keyed by User-agent. Each entry lists required verbatim lines
// that must appear under that UA block. Extra directives are allowed.
const EXPECTED_BLOCKS: Record<string, string[]> = {
  "*": ["Allow: /", "Disallow: /admin", "Disallow: /auth", "Disallow: /api/"],
  Googlebot: ["Allow: /"],
  Bingbot: ["Allow: /"],
  Twitterbot: ["Allow: /"],
  facebookexternalhit: ["Allow: /"],
  GPTBot: ["Allow: /"],
  "Claude-Web": ["Allow: /"],
  "anthropic-ai": ["Allow: /"],
  PerplexityBot: ["Allow: /"],
};

async function waitForServer(url: string, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server never became ready at ${url}`);
}

// Parse a robots.txt body into { userAgent -> Set<directive line> }.
// A blank line ends a block; a new "User-agent:" starts one.
function parseRobots(body: string): Map<string, Set<string>> {
  const blocks = new Map<string, Set<string>>();
  let current: string[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (!current.length || !lines.length) { current = []; lines = []; return; }
    for (const ua of current) {
      const bag = blocks.get(ua) ?? new Set<string>();
      lines.forEach((l) => bag.add(l));
      blocks.set(ua, bag);
    }
    current = []; lines = [];
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) { flush(); continue; }
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      if (lines.length) flush();
      current.push(ua[1].trim());
      continue;
    }
    lines.push(line);
  }
  flush();
  return blocks;
}

async function main() {
  const external = process.env.PUBLIC_BASE?.replace(/\/+$/, "");
  const port = Number(process.env.PUBLIC_PORT ?? 4179);
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

  const failures: string[] = [];
  let contentType = "";
  let httpStatus = 0;
  let body = "";
  const sitemapMisses: string[] = [];
  const blockMisses: { ua: string; missing: string[] }[] = [];
  const missingUas: string[] = [];

  try {
    const res = await fetch(`${base}/robots.txt`);
    httpStatus = res.status;
    contentType = res.headers.get("content-type") ?? "";
    body = await res.text();

    if (httpStatus !== 200) failures.push(`HTTP ${httpStatus} (expected 200)`);
    if (!/text\/plain/i.test(contentType))
      failures.push(`Content-Type "${contentType}" (expected text/plain)`);

    const sitemapLines = new Set(
      [...body.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map((m) => m[1].trim()),
    );
    for (const s of EXPECTED_SITEMAPS) {
      if (!sitemapLines.has(s)) sitemapMisses.push(s);
    }
    if (sitemapMisses.length) failures.push(`missing Sitemap: entries → ${sitemapMisses.join(", ")}`);

    const parsed = parseRobots(body);
    for (const [ua, required] of Object.entries(EXPECTED_BLOCKS)) {
      const found = parsed.get(ua);
      if (!found) { missingUas.push(ua); continue; }
      const missing = required.filter((line) => !found.has(line));
      if (missing.length) blockMisses.push({ ua, missing });
    }
    if (missingUas.length) failures.push(`missing User-agent blocks: ${missingUas.join(", ")}`);
    for (const b of blockMisses)
      failures.push(`User-agent: ${b.ua} missing directives → ${b.missing.join(" | ")}`);
  } finally {
    if (server && !server.killed) server.kill("SIGTERM");
  }

  mkdirSync(resolve("seo-report"), { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    base,
    httpStatus,
    contentType,
    expectedSitemaps: EXPECTED_SITEMAPS,
    missingSitemaps: sitemapMisses,
    missingUserAgents: missingUas,
    blockMisses,
    failures,
  };
  writeFileSync(resolve("seo-report/robots-directives.json"), JSON.stringify(report, null, 2));
  const md = [
    `# robots.txt directives`,
    ``,
    `_Generated ${report.generatedAt}_`,
    ``,
    `- Base: \`${base}\``,
    `- HTTP: **${httpStatus}** · Content-Type: \`${contentType}\``,
    `- Failures: **${failures.length}**`,
    ``,
  ];
  if (!failures.length) md.push(`✅ robots.txt served correctly with all required Sitemap and per-bot directives.`);
  else { md.push(`## Failures`, ``); failures.forEach((f) => md.push(`- ${f}`)); }
  writeFileSync(resolve("seo-report/robots-directives.md"), md.join("\n"));

  if (failures.length) {
    console.error(`✗ robots-directives:\n  · ${failures.join("\n  · ")}`);
    process.exit(1);
  }
  console.log(`✓ robots-directives: ${EXPECTED_SITEMAPS.length} sitemaps, ${Object.keys(EXPECTED_BLOCKS).length} UA blocks OK`);
}

main().catch((err) => { console.error(err); process.exit(1); });
