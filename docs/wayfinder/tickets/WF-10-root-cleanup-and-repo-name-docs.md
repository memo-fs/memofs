# WF-10 — Root cleanup + document the new repo/package names

> **Premises superseded (2026-07-04).** This ticket's body was charted
> before the [reconciliation](../../architecture/reconciliation-2026-07-02.md)
> locked K1–K5. Where the body conflicts with K1–K5, the reconciliation wins.
> Tracker migration to GitHub Issues (K5) and local-file deletion are deferred.



`wayfinder:task` · status: open · claimed: no · blocked-by: WF-2 (final names land first)

## Question

General cleanup of the **project root** so it reflects the post-overhaul repo
coherently — no stale scaffolding, stray dirs, or name contradictions. AGENTS.md
DRY/SSOT applies to root-level docs too.

Work:
1. **Stale scaffolding removal:**
   - `apps/cloud-2/` — delete once WF-3 confirms full port into `apps/cloud`.
   - `apps/cloud/package-lock.json` (npm, inside pnpm workspace) — WF-2 removes.
   - `.opencode/`, `opencode.json`, `.pnpm-store/`, `agent-sessions/` — decide
     keep/gitignore/remove; they look like leftover tooling state.
   - `.DS_Store` files — gitignore (verify `.gitignore` covers them).
2. **Root docs consistency** — `README.md`, `ROADMAP.md`, `CONTRIBUTING.md`,
   `CONTRIBUTORS.md`, `GOOD_FIRST_ISSUES.md`, `GOVERNANCE.md`, `SECURITY.md`:
   update any `@tekbreed/*` package references → `@tekmemo/*`, and any old dir
   names, so the public repo describes the packages users actually install.
3. **`docs/tekmemo.md`, `docs/runbook.md`, `docs/benchmark.md`,
   `docs/releases.md`** — align package names + the D1/single-Worker reality.
4. **Verify** `pnpm validate:workspace` green from a clean root.

## Definition of done
Root contains only intended files; every root doc names the current packages
correctly; no reference to deleted dirs or the old scope.

## Blocks
Nothing hard — but WF-12 (OSS launch) benefits from a clean root.
