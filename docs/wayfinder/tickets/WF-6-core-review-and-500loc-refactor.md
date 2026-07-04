# WF-6 — Review + refactor @tekmemo/core (code-reviewer + security-reviewer + 500-LoC)

> **Premises superseded (2026-07-04).** This ticket's body was charted
> before the [reconciliation](../../architecture/reconciliation-2026-07-02.md)
> locked K1–K5. Where the body conflicts with K1–K5, the reconciliation wins.
> Tracker migration to GitHub Issues (K5) and local-file deletion are deferred.



`wayfinder:task` · status: open · claimed: no · blocked-by: WF-2 (rename lands first)

## Question

Run the **full review pass on `@tekmemo/core`** (the renamed `packages/client` —
the core memory runtime), the package with the heaviest 500-LoC violations, and
bring it into compliance with AGENTS.md. This is the first review ticket because
core is the most-depended-on package and sets the review pattern for WF-7.

Three passes, in order:
1. **`code-reviewer` skill** — correctness, structure, dead code, type safety,
   adherence to the AGENTS.md coding rules (DRY/SSOT, no `console.log`, Biome
   style, ESM, strict TS). Invoke per AGENTS.md "General Rules".
2. **`security-reviewer` skill** (`security-review`) — secret handling
   (`utils/secrets.ts`, `scanForSecrets`), filesystem path safety
   (`assert-no-symlink-path`, `resolve-absolute-memory-path`), the AgentFS lease
   logic, and any injection surfaces in recall/graph/jsonl parsing.
3. **500-LoC compliance** — split every file over 500 lines. Confirmed
   violations (pre-overhaul paths; will be under `packages/core/`):
   - `src/tekmemo/local-strategy.ts` — **1661 lines** (the big one)
   - `src/graph/store/in-memory-graph-store.ts` — 767
   - `src/tekmemo/helpers.ts` — 706
   - `src/agentfs/session/agent-session.ts` — 687
   - `src/tekmemo/strategist.ts` — 652
   - `src/tekmemo/memory-strategy.ts` — 644
   - `src/tekmemo/Tekmemo.ts` — 628

   Split by responsibility (e.g. `local-strategy.ts` → `+recall/`, `+extraction/`,
   `+consolidation/` modules), preserving the public API so callers are unchanged.

## Definition of done
`code-reviewer` + `security-reviewer` run with findings addressed; no file in
`packages/core/src` exceeds 500 LoC; `pnpm typecheck` + `pnpm test` green; public
API surface unchanged (no downstream breakage).

## Blocks
WF-7 (remaining-package review reuses this pattern).
