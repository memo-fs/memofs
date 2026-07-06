# WF-8 — Documentation rebuild (technical-writer skill)

> **Premises superseded (2026-07-04).** This ticket's body was charted
> before the [reconciliation](../../architecture/reconciliation-2026-07-02.md)
> locked K1–K5. Where the body conflicts with K1–K5, the reconciliation wins.
> Tracker migration to GitHub Issues (K5) and local-file deletion are deferred.



`wayfinder:grilling` · status: open · claimed: no · blocked-by: WF-5 (ADR/doc amendments), WF-6, WF-7 (reviewed code)

## Question

Rebuild the **`apps/docs` site from the empty slate** using the
`technical-writer` skill (AGENTS.md mandates it for documentation). The content
dirs (`api/`, `cli/`, `core/`, `mcp/`) are gutted stubs; only `index.md`,
`changelog.md`, and the `.vitepress` config remain.

Decide and produce:
1. **Information architecture** — follow ADR 0008 (docs IA: four rules + routing
   blueprint) and ADR 0015 (its reprojection). Verify the blueprint still fits
   the post-overhaul package set (`@memofs/core`, `@memofs/adapter-cloudflare`,
   etc.) and amend if the rename changed any routes.
2. **Content per package** — accurate API/reference docs for every published
   package, generated from the *reviewed* code (WF-6/WF-7), not stale memory.
   Use the `copywriting` skill for user-facing prose (AGENTS.md).
3. **Getting-started / installation** reflecting the new scope (`@memofs/*`)
   and the single-Worker cloud deploy.
4. **`README.md` per published package** — AGENTS.md mandates the `copywriting`
   skill for package READMEs.
5. The VitePress config/nav updated to the new package names + structure.

## Definition of done
`pnpm docs:build` green; every published package has accurate reference docs +
a polished README; IA matches ADR 0008/0015 (amended where the overhaul changed it).

## Blocks
WF-12 (OSS launch — docs/READMEs are the public face).
