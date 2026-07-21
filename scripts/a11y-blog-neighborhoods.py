"""Sandbox-friendly runner for the /blog/neighborhoods a11y scan.

The Node script at scripts/a11y-blog-neighborhoods.ts is the CI entrypoint
(uses @axe-core/playwright). This Python driver exists so the same suite
can be executed in environments where only Python Playwright ships with
system browser libs. Outputs to the same seo-report/ files.
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE", "http://localhost:8080")
OUT = Path("seo-report"); OUT.mkdir(parents=True, exist_ok=True)
AXE = Path("node_modules/axe-core/axe.min.js").read_text()

SCENARIOS = [
    ("default",                  f"{BASE}/blog/neighborhoods/"),
    ("city=vancouver",           f"{BASE}/blog/neighborhoods/?city=vancouver"),
    ("city=vancouver&tag=Strata",f"{BASE}/blog/neighborhoods/?city=vancouver&tag=Strata"),
    ("city=citywide",            f"{BASE}/blog/neighborhoods/?city=citywide"),
]

async def scan(page, scenario, url):
    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_selector("#results-heading")
    await page.evaluate(AXE)
    res = await page.evaluate("""async () => {
      const r = await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] }
      });
      return r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
    }""")

    aria = []
    pagination = await page.locator('nav[aria-label="Blog pagination"]').count()
    if pagination:
        aria.append({"name":"Pagination has aria-label","ok":True})
        cur = await page.locator('nav[aria-label="Blog pagination"] [aria-current="page"]').count()
        aria.append({"name":"Pagination has aria-current=page","ok":cur == 1})
        prev = await page.locator('nav[aria-label="Blog pagination"] button[aria-label="Previous page"]').count()
        nxt  = await page.locator('nav[aria-label="Blog pagination"] button[aria-label="Next page"]').count()
        aria.append({"name":"Previous button labelled","ok":prev == 1})
        aria.append({"name":"Next button labelled","ok":nxt == 1})
        btns = page.locator('nav[aria-label="Blog pagination"] button')
        n = await btns.count()
        too_small = 0
        for i in range(n):
            box = await btns.nth(i).bounding_box()
            if not box or box["width"] < 44 or box["height"] < 44:
                too_small += 1
        aria.append({"name":"All pagination buttons ≥ 44×44 px","ok":too_small == 0,
                     "detail": None if too_small == 0 else f"{too_small} button(s) below target"})
    else:
        aria.append({"name":"Pagination not required (single page)","ok":True})

    city_group = await page.locator('[role="group"][aria-label="Filter by neighborhood"]').count()
    aria.append({"name":"City filter group labelled","ok":city_group == 1})
    active = await page.locator('[role="group"][aria-label="Filter by neighborhood"] button[aria-pressed="true"]').count()
    aria.append({"name":"City filter exposes aria-pressed","ok":active >= 1})

    tag_group = await page.locator('[role="group"][aria-label="Filter by topic"]').count()
    if tag_group:
        tactive = await page.locator('[role="group"][aria-label="Filter by topic"] button[aria-pressed="true"]').count()
        aria.append({"name":"Topic filter exposes aria-pressed","ok":tactive >= 1})

    live = await page.locator("#results-heading[aria-live='polite']").count()
    aria.append({"name":"Results heading has aria-live=polite","ok":live == 1})

    return {"scenario":scenario,"url":page.url,"axeViolations":res,"ariaChecks":aria}

async def main():
    findings = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()
        for scenario, url in SCENARIOS:
            findings.append(await scan(page, scenario, url))
        # Keyboard-drive next page.
        await page.goto(f"{BASE}/blog/neighborhoods/", wait_until="domcontentloaded")
        if await page.locator('nav[aria-label="Blog pagination"] button[aria-label="Next page"]').count():
            btn = page.locator('nav[aria-label="Blog pagination"] button[aria-label="Next page"]')
            await btn.focus()
            await page.keyboard.press("Enter")
            await page.wait_for_load_state("domcontentloaded")
            findings.append(await scan(page, "page-2 via keyboard", page.url))
        await browser.close()

    critical = sum(1 for f in findings for v in f["axeViolations"] if v["impact"] in ("critical","serious"))
    aria_fail = sum(1 for f in findings for c in f["ariaChecks"] if not c["ok"])
    summary = {"generatedAt":__import__("datetime").datetime.utcnow().isoformat()+"Z",
               "base":BASE,"scenarios":len(findings),
               "criticalOrSeriousAxe":critical,"ariaFailures":aria_fail,"findings":findings}
    (OUT/"a11y-blog-neighborhoods.json").write_text(json.dumps(summary, indent=2))
    md = ["# /blog/neighborhoods — Accessibility Scan","",
          f"_Generated {summary['generatedAt']}_","",
          f"- Scenarios: **{len(findings)}**",
          f"- Critical/serious axe violations: **{critical}**",
          f"- ARIA/keyboard check failures: **{aria_fail}**",""]
    for f in findings:
        md += [f"## {f['scenario']}","",f"`{f['url']}`",""]
        if not f["axeViolations"]: md.append("_No axe violations._")
        else:
            md.append("### Axe violations"); md.append("")
            for v in f["axeViolations"]:
                md.append(f"- **{v['impact'] or 'n/a'}** `{v['id']}` ({v['nodes']} node{'' if v['nodes']==1 else 's'}) — {v['help']}")
        md += ["","### ARIA / keyboard checks",""]
        for c in f["ariaChecks"]:
            det = f" — {c['detail']}" if c.get('detail') else ""
            md.append(f"- {'✓' if c['ok'] else '✗'} {c['name']}{det}")
        md.append("")
    (OUT/"a11y-blog-neighborhoods.md").write_text("\n".join(md))

    bar = "─" * 60
    print(f"\n{bar}\n/blog/neighborhoods a11y scan\n{bar}")
    print(f"  Scenarios          : {len(findings)}")
    print(f"  Critical/serious   : {critical}")
    print(f"  ARIA check fails   : {aria_fail}\n{bar}")
    print(f"Report: seo-report/a11y-blog-neighborhoods.md\n")
    if critical or aria_fail:
        print("✗ a11y failures — see seo-report/a11y-blog-neighborhoods.md")
        sys.exit(1)
    print("✓ a11y clean.")

asyncio.run(main())
