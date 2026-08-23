# PlowWow completion audit

## Release gate

PlowWow is considered release-ready only when all of the following are verified:

- [ ] Production build succeeds.
- [ ] Unit tests succeed.
- [ ] E2E smoke tests succeed.
- [ ] SEO/prerender validation chain succeeds.
- [ ] Sitemap and robots directives validate against production.
- [ ] Canonicals and legacy redirects validate.
- [ ] JSON-LD validation succeeds.
- [ ] Important service and city routes render useful server-readable content.
- [ ] Quote/contact conversion paths are functional.
- [ ] No fabricated reviews, projects, certifications, or service claims are present.
- [ ] No secrets or local environment files are tracked.
- [ ] Production deployment is healthy after the completion changes.

## Security note

A tracked `.env` file was removed from the repository on 2026-08-23 and environment-file patterns were added to `.gitignore`. Any credentials that were previously committed must be treated as exposed and rotated outside the repository. This audit does not reproduce secret values.

## Live-content finding

During the completion pass, the production homepage was found to expose an editorial instruction in rendered/indexable text: `Select all in the GitHub editor (Ctrl+A / Cmd+A), paste this, then click Commit changes.` This must not remain in production content.

## Workflow

1. Fix release-blocking content/security issues.
2. Run the existing automated validation suite and inspect failures.
3. Fix genuine regressions rather than weakening validators.
4. Verify production after deployment.
5. Mark this checklist complete only with evidence.
