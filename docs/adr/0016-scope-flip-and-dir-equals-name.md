# ADR 0016: npm scope flip (`@tekbreed` → `@tekmemo`) + dir-equals-name SSOT + K4 core layering fix

- **Status:** Accepted
- **Date:** 2026-07-02 (decided); 2026-07-04 (recorded here)
- **Deciders:** Christopher S. Aondona
- **Governing artifact:** [`docs/architecture/reconciliation-2026-07-02.md`](../architecture/reconciliation-2026-07-02.md)
  — keystone decisions K4 (core layering) and the naming rule.

## Context

TekMemo is an OSS project that publishes the memory runtime to npm under a
scoped name and ships the `tekmemo` CLI unscoped (`npm install -g tekmemo`). Two
problems were live in the pre-overhaul tree:

1. **Scope mismatch.** Every published package carried the `@tekbreed/*` scope,
   but the GitHub org/repo is `tekbreed/tekmemo` and the product is **TekMemo**.
   The OSS launch (WF-12) would publish `@tekbreed/tekmemo-*` while the docs,
   README, and CLI all say "TekMemo" — a name/scope drift that confuses
   adopters and weakens the `@tekmemo` namespace the product should own.

2. **Inverted core/CLI dependency (K4).** `packages/client`
   (`@tekmemo/client`) *is* the core runtime — 13 subsystems. `packages/tekmemo`
   (named like the product) *is* the CLI (`bin: { tekmemo }`, depends on the
   runtime). But the runtime reached **up** into the CLI package for foundational
   primitives: `MemoryPath`, `MemoryStore`, `MemoryStoreError`,
   `assertMemoryPath`, canonical paths — imported from `@tekbreed/tekmemo` (the
   CLI) in **18 files**, while the CLI imported core in 1 file (`runner.ts`).
   This is an inverted layering that survives only by pnpm hoisting + build-order
   tolerance. Verified in the reconciliation session.

A third, latent problem: directory names, package names, and published names had
drifted (`packages/client` → `@tekmemo/client`; `packages/tekmemo` → `tekmemo`),
so the directory did not predict the package name.

## Decision

Three locked changes, applied together in WF-2:

### 1. Scope flip — `@tekbreed` → `@tekmemo`

Every published package's npm scope flips from `@tekbreed/*` to `@tekmemo/*`.
The unscoped CLI (`tekmemo`) stays unscoped. Internal workspace tooling stays
`@repo/*` (it is never published). GitHub org / repo URLs / homepage / funding
are unchanged — **only the npm package scope changes**.

### 2. Dir-equals-name SSOT rule

**The directory name equals the package name without its scope**, for every
public package directory. This is the single source of truth enforced in
[`.agents/rules/package-naming.md`](../../.agents/rules/package-naming.md) and
[`.agents/rules/monorepo-structure.md`](../../.agents/rules/monorepo-structure.md).

So `packages/adapter-r2` ↔ `@tekmemo/adapter-r2`, `packages/core` ↔
`@tekmemo/core`, and `packages/tekmemo` ↔ `tekmemo` (unscoped — the one
directory whose name *is* the full published name, because there is no scope to
strip).

### 3. K4 core layering fix — the inverted core/CLI arrow

The three-part move that kills the 18-file circular dependency:

1. **`packages/client` (`@tekmemo/client`) → `packages/core` (`@tekmemo/core`).**
   The core runtime gets the conventional scoped name, holds the primitives, and
   the directory follows the dir-equals-name rule.
2. **`packages/tekmemo` stays `packages/tekmemo` (`tekmemo`, unscoped).** It is
   the CLI; `npm install -g tekmemo` is the install command users expect. The
   CLI depends on `@tekmemo/core`.
3. **Move the primitive *definitions*** (`MemoryPath`, `MemoryStore`,
   `MemoryStoreError`, `assertMemoryPath`, canonical paths) **out of the CLI into
   `@tekmemo/core`**; the CLI re-imports them from `@tekmemo/core`. The 18-file
   cycle inverts to a clean `@tekmemo/core` ← `tekmemo` (CLI) arrow.

The `Tekmemo` class now lives at `packages/core/src/tekmemo/Tekmemo.ts`.

### Why `@tekmemo/core` (not the unscoped `tekmemo`) for the runtime

The unscoped `tekmemo` name stays on the CLI so `npm install -g tekmemo` and
`npx tekmemo` keep working as the primary install surface. `@tekmemo/core` is the
conventional, unambiguous name for the core library and avoids consumers
ambiguous-installing the engine when they meant the tool. (The CONTEXT Q15
glossary reservation of "core" governs *prose* usage — don't say "core" when you
mean the product or the memory runtime; a *package name* `@tekmemo/core` does
not collide with that.)

## Consequences

**Positive:**

- **One namespace.** The OSS launches under the `@tekmemo/*` namespace the
  product owns. Adopters see `@tekmemo/core`, `@tekmemo/adapter-r2`, … and the
  CLI `tekmemo` — consistent with the product name everywhere else.
- **Clean layering.** The 18-file inverted dependency is gone. Core holds the
  primitives; the CLI depends on core, never the reverse. Build order and pnpm
  hoisting no longer paper over a cycle.
- **Predictable naming.** A new reader finds a package by directory name without
  consulting a map; the dir-equals-name rule removes a class of "where does
  this live?" friction.
- **Registry cost: zero.** `@tekmemo/client` was 404 on the public registry
  (verified — pre-launch, unpublished), so the rename + scope flip has no
  downstream-consumer blast radius.

**Negative:**

- **Every internal import updated.** WF-2 touched every `@tekbreed/*` import
  across packages, apps, and docs. Accepted: pre-launch, no deprecation cycle
  needed.
- **The `packages/tekmemo` directory name is now slightly surprising** (it is
  the CLI, not the core). Mitigated by the dir-equals-name rule + the CLI's
  `bin: { tekmemo }` making its role self-evident. Keeping the directory stable
  was chosen over renaming it for path stability and to keep `npm install -g
  tekmemo` obviously mapping to `packages/tekmemo`.

## Alternatives considered

1. **Keep `@tekbreed/*`.** Rejected: the product is TekMemo; launching under
   `@tekbreed/*` cements a name/scope drift that is free to fix now and
   expensive to fix post-publish.
2. **Flip the scope but leave the core/CLI cycle.** Rejected (K4): the rename is
   the right moment to fix the inverted dependency in the same pass — every
   import is being touched anyway, and leaving the cycle would force a second
   repo-wide pass.
3. **Rename the core runtime to the unscoped `tekmemo` and re-scope the CLI.**
   Rejected: breaks `npm install -g tekmemo` / `npx tekmemo`, the install
   command the README and onboarding assume. The unscoped name belongs to the
   CLI.
4. **Give the CLI a scoped name too (`@tekmemo/cli`).** Rejected: the CLI is the
   primary install surface; the unscoped `tekmemo` is what users type. Scoping
   it adds friction for no layering benefit.

## Validation

- **The 18-file cycle is real** — verified in the reconciliation: `packages/client`
  imported primitives from the CLI package in 18 files; the CLI imported core in
  1. After WF-2, the primitives live in `packages/core` and the CLI imports them
  back down.
- **`@tekmemo/client` was unpublished** — registry probe in the reconciliation
  session returned 404. No blast radius.
- **Dir-equals-name holds** — verified against the current tree:
  `packages/core` → `@tekmemo/core`, `packages/adapter-r2` → `@tekmemo/adapter-r2`,
  `packages/tekmemo` → `tekmemo` (unscoped), `tooling/*` → `@repo/*`.

## References

- Reconciliation (2026-07-02): [`docs/architecture/reconciliation-2026-07-02.md`](../architecture/reconciliation-2026-07-02.md)
  — K4 (core layering) + the naming rule (decisions-so-far §1–§2).
- SSOT rules: [`.agents/rules/package-naming.md`](../../.agents/rules/package-naming.md),
  [`.agents/rules/monorepo-structure.md`](../../.agents/rules/monorepo-structure.md).
- [ADR 0007](./0007-ai-sdk-extraction.md) — precedent for moving provider
  implementations out of core into adapter packages (the same seam this ADR
  extends to the primitives themselves).
