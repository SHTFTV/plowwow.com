# PlowWow fleet news: source of truth

Recorded November 11, 2026. Scope: the owner-authorized BOSS DRAG PRO fleet announcement only. Preserve existing site, historical articles, quoting, seasonal policy and campaign records.

## Canonical source and production

- Repository: SHTFTV/plowwow.com, main.
- Production domain: https://www.plowwow.com (apex redirects to www).
- Verified owning Vercel project: plowwow-fluff-sparkle, prj_GI6hiDoZPZyc5uo9hYihi8dviyfq; team_kTW4N3LZceZMmT95CWJpgwhM. Do not infer ownership from similarly named projects.
- Baseline main / production before this change: aaebb797438d7adc69c9f2a62735d613e44ec808.
- No repository AGENTS.md, per-site SOT or active publisher lease was found at this baseline; existing docs/editorial/plowwow-city-feature-series.json and docs/WOW-SKINNY-BANNER-STANDARD.md remain authoritative for their respective scope. This one-off owner announcement does not consume or restart the city campaign.
- Use an isolated checkout and fast-forward publication against freshly inspected main. Abort and reconcile if main moves. Never force-overwrite concurrent work.

## Authorized business facts and editorial rules

Owner says the BOSS expandable 8–16-foot rear drag plow is going on one truck today and will be the latest fleet addition. Announce the plan, not completed installation, testing or customer results. Seek large commercial parking lots and strip malls needing efficient snow clearing. Authorized tagline: “Are you ready for Plow Wow?”

Model: BOSS DRAG PRO 8–16 Hydraulic Folding Wing, RPL21616, independently checked at https://www.bossplow.com/en/product/RPL21616 on November 11. Folded 8 feet, fully extended 16 feet; not a constant effective clearing width. Do not substitute DRAG PRO 180Z claims or imagery.

Use actual published evidence for productivity claims. BOSS's exact-model page and https://info.bossplow.com/blog/drag-pro-rear-plow-intended-uses support qualitative benefits of wider passes, more snow per pass and adjustable-wing parking-aisle cleanup. Reviewed sources provide no measured average time savings by lot size. No hypothetical savings tables, invented percentages or clearance-time guarantees. Distinguish manufacturer claims from PlowWow operating results.

Use existing verified service area: Vancouver, Lower Mainland and Fraser Valley. Use the existing homepage contact form /#contact for property-specific commercial assessments; no invented prices, availability or booking commitments. Preserve written-quote and exceptional-weather safeguards. Approximate lot-size examples describe enquiries, not measured output or eligibility thresholds.

## Media and brand

Exact-model original: https://cdn.thetorocompany.com/api/assetstorage/623_43c0d737-fc6d-49c7-affa-29d5f7c094c0/Original (2000×2000 decoded). Manufacturer image linked from the RPL21616 page. Keep BOSS credit and product-reference label; never present it as our installed truck. Mechanical crop of white margins to 2000×1125, reduced to 1600×900, with small PlowWow branding. No upscaling, fabricated installation, unrelated stock or Shutterstock. Review the decoded final, actual hero, homepage/blog card and social crop on desktop and phone. Credit identifies the source; no separate licence/rights evidence is claimed.

Preserve the approved single Wow skinny banner, its dimensions, labels, pause/play and reduced-motion handling. Do not add a second banner.

## Operational evidence and failure isolation

Manual article status must be recorded separately from automation. Publication requires exact source commit, linked production deployment, live article/canonical/schema, image credit and dimensions, working quote destination, homepage/blog/feed/sitemap discovery, and rendered desktop/phone checks. Record any incomplete checks explicitly. Manual deployment is not proof of unattended cloud publishing, alerts, indexing or whole-site operational completion.

For future publisher jobs, load the latest approved per-site SOT and retain source revision/hash with the run receipt. Keep a sole writer lease, idempotency and durable receipts. Isolate failures per item and per feed, continue eligible work in the same run, bound retries/backoff and prevent starvation; retain exact blockers and independent alerts until verified recovery. A single article/image/feed hold must not stall independent work. Global runtime outages are separate. These runtime requirements are not newly implemented or claimed verified by this article release.

Existing city-campaign Chilliwack acceptance hold and planned Burnaby research stay as recorded in the campaign file. This announcement does not clear them.

Receipt: docs/operations/boss-drag-pro-fleet-publication.json (updated after actual verification).

Verification note: the RSS generator now retains existing feed dates and stable order across shallow checkouts and uses explicit Published metadata for new entries. All 211 historical RSS publication dates were compared and preserved. This is a narrow publication safeguard, not a new publisher.
