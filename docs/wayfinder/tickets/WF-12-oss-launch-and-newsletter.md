# WF-12 — OSS launch standardization + newsletter capture

`wayfinder:grilling` · status: open · claimed: no · blocked-by: WF-2, WF-8 (docs), WF-9 (clean beta to point to)

## Question

Standardize the **OSS presentation** so the project is launch-ready, and stand up
a **newsletter signup** on the cloud app so arriving users can register interest
while the cloud is still being built.

Decide + produce:
1. **OSS standardization** — polish the public OSS surface for launch:
   - Root `README.md` (use `copywriting` skill — AGENTS.md): clear value prop,
     install (`@tekmemo/*`), quickstart, link to docs + newsletter.
   - `CONTRIBUTING.md`, `GOOD_FIRST_ISSUES.md`, `GOVERNANCE.md`, `SECURITY.md`,
     `LICENSE` consistency (the `opensource-guide-coach` skill fits here).
   - Repo description, topics, sponsor button pointing correctly.
2. **Newsletter** — choose a service (research: Buttondown / Resend / Cloudflare
   Email Workers / ConvertKit — pick one that fits an OSS-first, low-cost,
   Cloudflare-native posture; AGENTS.md says evaluate existing before new deps).
   Decide whether it's a Cloudflare-native solution (Email Workers / D1 store)
   vs an external service, and why.
3. **Landing capture** — a simple landing route on `apps/cloud` (or the docs
   site) with an email-capture form → the chosen newsletter service. Conform +
   Zod v4 for the form (AGENTS.md forms rule). "Direct users to signup while we
   build."
4. The signup flow tested (Miniflare + Playwright per AGENTS.md).

## Definition of done
Polished OSS repo + README; newsletter service chosen + wired; landing email
capture live and tested; docs/README link to it.

## Blocks
None — this is the launch terminus. Fog beyond it is the actual cloud build-out
(managed runtime, phase 3, etc. — separate efforts, not this map).
