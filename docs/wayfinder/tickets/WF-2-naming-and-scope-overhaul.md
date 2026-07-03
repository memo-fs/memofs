# WF-2 — Execute workspace naming + scope overhaul (@tekbreed → @tekmemo)

`wayfinder:task` · status: done · claimed: yes · blocked-by: none

## Question

Execute the naming/structure overhaul mechanically and SSOT-correctly so that
**directory name = package name (minus scope)** and the scope flips
`@tekbreed → @tekmemo`. This is task work (the *what* is locked in the map
Notes); the risk is completeness — zero missed references.

Concrete work:
1. **Rename directories:** `packages/client → packages/core`. Keep
   `packages/adapter-r2` as `@tekmemo/adapter-r2`; the reconciliation rejects
   the old `adapter-cloudflare` direction, and WF-1 owns the later
   blob/metadata split.
2. **Rewrite every `package.json` `name`** to the final map (see MAP Notes):
   core `@tekmemo/core`, adapters `@tekmemo/adapter-*`, etc.; `packages/tekmemo`
   stays `tekmemo`; `apps/cloud` → `@tekmemo/cloud`; `apps/docs` → `@tekmemo/docs`.
3. **Fix `repository.directory`** in each package.json (currently points at old
   `packages/tekmemo-*` paths — broken after the dir renames).
4. **Rewrite all internal imports** `@tekbreed/* → @tekmemo/*` (and
   `@tekmemo/client → @tekmemo/core`) across `packages/*/src`, `apps/*/src`,
   `examples/`, `benchmarks/`. (~30+ sites — grep, replace, verify.)
5. **Drop stale `@tekbreed/tekmemo-cli`** references: root `devDependencies`
   + the `package-naming.md` table row. The CLI lives in `packages/tekmemo`.
6. **Remove `apps/cloud/package-lock.json`** (npm lockfile inside a pnpm
   workspace) — the cloud app rejoins the pnpm workspace + turbo graph.
7. **Update SSOT docs:** `package-naming.md` and `monorepo-structure.md` tables
   to match the new dirs/names exactly.
8. **pnpm-workspace.yaml** still lists `apps/cloud` (correct) — verify no
   `apps/cloud-2` reference remains once that app is handled (see WF-3).
9. `pnpm install` to regenerate the lockfile; `pnpm typecheck` + `pnpm test` green.

## Definition of done
Every package dir name matches its package.json name; no `@tekbreed/*` import
remains in source; no broken `repository.directory`; `validate:workspace` passes.

## Resolution

Completed the local naming and scope overhaul for the workspace:

- `packages/client` is now `packages/core`, published as `@tekmemo/core`.
- `packages/tekmemo` stays the unscoped `tekmemo` CLI package.
- Public packages use `@tekmemo/*`; internal tooling stays `@repo/*`.
- `packages/adapter-r2` stays `@tekmemo/adapter-r2`; the stale
  `adapter-cloudflare` rename direction is rejected by the reconciliation.
- Workspace package metadata, repository directories, lockfile references, and
  local SSOT rule docs were aligned to the reconciled package map.
- Workspace package versions were bumped to `1.0.0-beta.1`.
- The `@tekmemo/core` / `@tekmemo/testing` workspace dependency cycle warning was
  removed by dropping the unnecessary testing-package dependency on core.

Local verification passed for package identity/version scans and stale
package-name scans. Package-manager install/typecheck commands are handed to the
maintainer to run locally per project preference.

## Blocks
All implementation tickets depend on correct names; design tickets (WF-1, WF-3)
can run in parallel. WF-5 (doc amendments) consumes the final names.
