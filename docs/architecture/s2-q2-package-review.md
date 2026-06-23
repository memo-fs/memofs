# S2-Q2 — Per-Package Code Review vs. Locked Architecture

> **Status:** Review complete (2026-06-20). Findings are grounded in the actual
> branch state, not the decision docs' claims. Several "locked" items have ADRs
> written but **no code change**, and two untracked app directories actively
> **contradict** locked decisions. **No code changes applied yet** — awaiting
> reconciliation (see "Blocking contradictions" below).
>
> **Method:** `code-review-excellence` skill — context gathering, high-level
> architecture fit, line-level correctness, severity-tagged findings. Compared
> the branch working tree against `docs/architecture/decisions.md` Q1–Q8 + Q7
> per-package review + `cloud-sync-and-refactor.md` D1–D9.

## Headline finding

**The decision docs describe a more complete refactor than the code reflects.**
The branch *did* land the cloud-sync file-replica trim (−4642/+1124 lines: CLI
`cloud.ts`, MCP `tools/handlers.ts`, `factory.ts`, `cloud-runtime.ts`, the cloud
client, tests). But four classes of work the decisions log lists as required
were **never started in code**, and two untracked directories contradict locked
decisions. Treating the branch as "finish D-items, then Q1–Q6" (per decisions
log Q7 sequencing note) understates the gap.

## Blocking contradictions (must reconcile before any fixes)

### B1 — `apps/cloud/` contradicts ADR 0005 on the runtime (Node vs Worker) — DECISION CONFIRMED

Untracked, un-gitignored directory. Contents: a stock **React Router v8** +
`@react-router/node` + `@react-router/serve` + `react-router build/start`
scripts — i.e. a **Node SSR server, not a Cloudflare Worker**. (The earlier
Dockerfile was removed in this branch; the remaining contradiction is the
Node/`@react-router/node` runtime vs the locked Workers + Static Assets
target.)

- **RR version — RESOLVED (v8, not v7).** The original ADR 0005 draft *downgraded*
  the proposal from v8 to v7 on the false premise that "v8 doesn't exist yet."
  Verified false: `react-router@8.0.1` is the `latest` dist-tag and
  **`@react-router/cloudflare@8.0.1`** is the official GA Cloudflare Workers
  adapter (`npm view react-router dist-tags` / `npm view @react-router/cloudflare
  dist-tags`). ADR 0005 has been revised (rev 2, "Revision history") to target
  **v8**; the `apps/cloud` scaffold already pins `react-router@8.0.0`, so the
  version is now consistent with the locked decision. Sub-question (b) below is
  closed.
- **Runtime topology — STILL OPEN (Node SSR vs Workers + Static Assets).**
  `apps/cloud`'s `package.json` uses `@react-router/node` + `@react-router/serve`
  (a Node SSR server) and a `start: react-router-serve` script. ADR 0005 locks
  **Workers + Static Assets** as the deploy target, via `@react-router/cloudflare`
  — the *opposite* runtime. The dir is also not in `pnpm-workspace.yaml`, and its
  README is the unmodified Remix/RR starter (no TekMemo code yet).
- **Decision CONFIRMED (user, 2026-06-20):** TekMemo Cloud = **React Router v8 on
  Cloudflare Workers** (`@react-router/cloudflare`) + Static Assets. `apps/cloud`
  is the intended `apps/tekmemo-cloud` from ADR 0005; its current Node-SSR
  scaffold (`@react-router/node` + `@react-router/serve`) must be rebuilt onto
  `@react-router/cloudflare` (Workers runtime, `wrangler.jsonc`, + workspace
  registration). This is a **code task** (Node→Worker runtime migration), tracked
  under S2-Q3. See S2-Q3 (docs/cloud routing is the same question for the
  dashboard half).

### B2 — `apps/mcp-worker/` is the **shelved** `apps/tekmemo-mcp-worker`, re-added

- Decision Q6 (6c) verdict: **`apps/tekmemo-mcp-worker` SHELVE for v1** —
  "Currently built on the deleted cloud engine … broken under new arch … remove
  from deploy path." The committed branch **did** delete `apps/tekmemo-mcp-worker`
  (−393 lines, visible in `git diff --stat`). But an untracked
  **`apps/mcp-worker/`** now exists with identical purpose and the *same*
  cloud-engine wiring the decision says is dead:
  - `Env.TEKMEMO_API_KEY` / `TEKMEMO_API_URL` + "cloud-only runtime" (README +
    `src/index.ts:22`).
  - README still asserts Cloud mode is a supported backing store and points
    clients at `https://mcp.memo.tekbreed.com/` — exactly the "hosted managed
    MCP endpoint" Q4 says to move to "Later."
  - Not in `pnpm-workspace.yaml` (only `apps/tekmemo-mcp-worker` is listed).
- **This re-introduces the architecture-contradicting app the refactor removed.**
  Either the shelve decision is reversed (then ADR 0003/0005 + Q4/6c must
  update), or this dir should not exist. Decision needed.

### B3 — S2-Q1 extraction is **not done** in code (ADR 0007 says it is)

- ADR 0007 + CONTEXT.md + decisions S2-Q1 describe `ai-sdk/` as already
  extracted to `@tekbreed/tekmemo-adapter-ai-sdk`, with `TekMemoAiRuntime`
  renamed to `TekMemoMemoryRuntime` and the `ai` peer dep dropped from core.
- **Code reality:** `packages/tekmemo/src/ai-sdk/` still has all 14 files
  (runtime, tools, scope, schemas, prepare-call, agent-session). `TekMemoAiRuntime`
  is still the public name in `types/runtime.ts` + `tekmemo-runtime.ts`. There is
  **no `packages/tekmemo-adapter-ai-sdk/` package.** S2-Q1 was recorded as
  "completed" in todos but the migration was never executed — only the decision
  + ADR were drafted. This is the single largest gap between docs and code.

## Required-but-unstarted (D-list + Q-list, confirmed in code)

> These match the decisions log Q7 findings — listed here because I verified
> they are *still* pending, not just claimed to be.

### `packages/tekmemo` (core)

- 🔴 **D4 not done.** `TekMemoRuntimeMode` in `types.ts:10` **still contains
  `"cloud"`**. `RuntimeReadPolicy`/`WritePolicy` (`types.ts:12-22`) **still
  contain `"cloud-only"`**. `config.ts:276` (`resolveMode`) and `:408`
  (`isRuntimeMode`) still accept `"cloud"`; `isReadPolicy:419` still accepts
  `"cloud-only"`. No test references `"cloud"` mode, so removal is safe.
- 🔴 **Q2 connectors path not done.** `memory-paths.ts` `CANONICAL_TEKMEMO_FILES`
  is still **10 files** (lines 69-80); no `.tekmemo/connectors.json`. Q2 locks it
  as the 11th canonical file. `computeLocalManifest()` derives from this array,
  so adding it propagates automatically once the constant + schema exist.
- 🟡 **Q5 Extractor interface not defined** (decision: "define in core now").
  No `Extractor` interface found. Acceptable per decision (defer the *adapter*,
  define the *contract*) — but the contract is also absent.
- 🟡 **Q5 consolidation pass** — no consolidation/merge/retire code present.
  Decision scoped it to v1.

### `packages/tekmemo-adapter-upstash` — **not removed** (Q6 / 6a)

- Decision 6a: **REMOVE**, zero consumers, contradicts D1/D2.
- **Code reality:** package still fully present (`src/`, `tests/`, `package.json`,
  `tsdown.config.ts`). Referenced by README, `pnpm-lock.yaml`, docs
  (`vector-adapters.md`, `package-boundaries.md`, `llms.txt`). Not yet deleted.

### `apps/tekmemo-mcp-worker` (the *old*, committed path)

- Deleted in the branch diff (✅ matches 6c's "remove from deploy path" for the
  *committed* copy) — **but superseded by B2** (the untracked `apps/mcp-worker/`
  re-add). Not in pnpm-workspace.

### `benchmarks/` ↔ `tekmemo-benchmark-kit` — **not consolidated** (6b)

- Not investigated line-level (out of the S2-Q2 critical path); both still
  exist as separate trees. Flagged for follow-up, not a blocker.

## What the branch *did* get right (verified)

- 🎉 Cloud-sync file-replica trim is real and large: `cloud.ts` −2000 lines,
  MCP `tools/handlers.ts`/`definitions.ts` ~−1000, `factory.ts`,
  `cloud-runtime.ts`, cloud-client types frozen to the four-method contract,
  tests updated. Matches D1/D2/D5 intent.
- 🎉 `TekMemoCloudClient` trimmed to health/readiness/sync (types.ts:213-229
  re-exports confirm).
- 🎉 Pre-sync snapshot before mutations present (decisions Q3 references it).
- 🎉 `sha256Hex` now exported from core (`tekmemo/index.ts` +1 line) — supports
  Q3 content-deterministic connector writes.
- `docs/adr/0002–0007` exist; `decisions.md` + `CONTEXT.md` are thorough.

## Cross-cutting (affects multiple packages)

- 🟡 **Docs drift is severe and bidirectional.** `apps/docs/**` still documents
  `cloud-only` policy, `cloud` mode, the hosted MCP endpoint as a v1 feature,
  and the upstash adapter — all removed/shelved by decision. Config JSON schemas
  (`apps/docs/public/config.schema.json`, `1.0.0-alpha.0/config.schema.json`)
  still enumerate `cloud-only`. This is S2-Q3/Q4 scope but blocks "perfectly
  ready" per the user's bar.
- 🟡 **CLI + MCP server still surface `cloud-only` policy** in their CLIs /
  arg parsers (`tekmemo-cli/src/runner.ts:188,192`,
  `tekmemo-cli/src/config/runtime.ts:30-31`,
  `tekmemo-mcp-server/src/bin/tekmemo-mcp.ts:142-158`,
  `http/index.ts:192`). Must move in lockstep with the D4 type trim or the type
  change breaks them.
- 🟢 `Tekmemo.ts:13` doc-comment still says four modes incl. `"cloud"` — trivial
  fix once D4 lands.

## Proposed execution order (after B1/B2/B3 reconciled)

1. **Resolve B3** (ai-sdk extraction) — biggest, touches `tekmemo-cli`, examples,
   docs, tests. Do this before D4 so core's surface is settled.
2. **D4 mode/policy trim** — core `types.ts` + `config.ts` + the four CLI/MCP
   arg-parsers + `Tekmemo.ts` doc-comment + config JSON schemas, in one atomic
   change (lockstep or types break).
3. **Remove upstash** (6a) + drop workspace/lock/README/docs refs.
4. **Q2 connectors.json** — add 11th canonical file + schema in core.
5. **Resolve B1/B2** (apps/cloud + apps/mcp-worker) per user decision.
6. Docs sweep (S2-Q3/Q4).

## Verdict

🔄 **Request changes.** The committed file-replica refactor is sound and large.
But the branch is not "finish D-items then Q1–Q6" — it is "D-items unstarted,
Q2/Q5 unstarted, upstash not removed, ai-sdk extraction not done, *and* two
untracked dirs contradict locked decisions." Need B1/B2/B3 reconciled before I
apply fixes, otherwise I'd be coding against an unresolved target.

---

## S2-Q3 close-out (2026-06-20) — contradictions resolved; one code task decoupled

> Re-audit after the S2-Q2 fixes landed. Every "Blocking contradiction" above is
> re-checked against the current working tree, not the review-time snapshot.

### B1 — `apps/cloud/` runtime (Node vs Worker) — **OPEN, decoupled as a code task**

- **Decision:** TekMemo Cloud = React Router **v8** on Cloudflare Workers
  (`@react-router/cloudflare`) + Static Assets (ADR 0005 rev 2; user-confirmed).
- **Working tree now:** `apps/cloud/package.json` still pins `@react-router/node`
  + `@react-router/serve` (a **Node SSR server**) with a `start:
  react-router-serve` script — the *opposite* runtime from the locked decision.
  `react-router@8.0.0` is correct (v8 confirmed), but the adapter is the Node
  one, not the Cloudflare one. `apps/cloud` is also **absent from
  `pnpm-workspace.yaml`** (only `apps/docs` is listed under `apps/`).
- **Why this no longer blocks the docs/OSS work:** it is a **code task** —
  rebuild the scaffold onto `@react-router/cloudflare` (Workers runtime,
  `wrangler.jsonc`, + workspace registration). It does not affect the OSS
  packages, their docs, or the locked decisions. **Tracked separately** as
  "apps/cloud Node→Worker migration" (low priority, decoupled). The cloud ships
  at v1 per user directive, so this *will* ship — just not on the docs-IA
  critical path.

### B2 — `apps/mcp-worker/` — **RESOLVED (deleted)**

- **Review-time:** untracked `apps/mcp-worker/` re-introduced the shelved
  cloud-engine-backed MCP worker.
- **Now:** directory is **gone** (verified: `apps/mcp-worker` does not exist).
  Q6 6c's "shelve for v1" is honored. (The hosted MCP endpoint itself is a
  separate, shipping-v1 surface — not retracted; see the docs-triage scoping
  note.)

### B3 — `ai-sdk/` extraction (S2-Q1) — **RESOLVED (executed + green)**

- **Review-time:** ADR 0007 claimed the extraction was done; code reality was
  14 files still in core, no adapter package, `TekMemoAiRuntime` un-renamed.
- **Now:** `packages/tekmemo-adapter-ai-sdk/` **exists**; the interface is
  `TekMemoMemoryRuntime` in `packages/tekmemo/src/ai-runtime/`; the `ai` peer
  dep dropped from core. Validated green (typecheck + 507 tests across core /
  adapter / CLI / MCP server). The "recorded complete but never executed" gap is
  closed. (Docs drift on the 3 AI-SDK pages remains — scoped to the triage
  register, §S2-Q1.)

### D4 (mode/policy trim) — **RESOLVED (code); docs pending**

- `TekMemoRuntimeMode` is `local | hybrid | memory`; `"cloud"` dropped.
  `RuntimeReadPolicy` / `WritePolicy` dropped `"cloud-only"`. The four CLI/MCP
  arg-parsers moved in lockstep. **Code green.** The matching docs sweep is the
  D4 section of [`docs-drift-triage.md`](./docs-drift-triage.md) — strictly API
  signature fixes; **cloud product claims are not retracted** (user directive:
  cloud ships at v1).

### upstash removal (Q6 6a) — **RESOLVED (code); docs pending**

- `packages/tekmemo-adapter-upstash/` is **gone**; lockfile + 9 ref files pruned.
  Two docs references remain (`recall.md`, `installation.md`) — triage §Q6.

### connectors.json (Q2) — **RESOLVED**

- 11th canonical file landed in `memory-paths.ts` + template + bootstrap +
  `PathKind`; 369 tests green. Docs gap (`packages/tekmemo/connectors.md`
  missing) is triage §Missing.

### S2-Q3 (this section's own deliverables)

- [ADR 0008](../adr/0008-docs-information-architecture.md) — docs IA: four rules
  (code-is-truth, one-home-per-fact, decisions-linked-not-copied, DRY via
  VitePress includes) + routing blueprint. **Adjusted per user directive:** cloud
  is a shipping-v1 surface; the IA trims stale *API signatures* (D4), not cloud
  product claims.
- [`docs-drift-triage.md`](./docs-drift-triage.md) — the per-file worklist
  (18 stale + 5 missing), with an explicit "not drift — keep as-is" list
  protecting the hosted-MCP / cloud-client product claims.

### Net state

Of the original three blocking contradictions (B1/B2/B3) + four
required-but-unstarted items (D4, upstash, connectors, ai-sdk): **six are
resolved in code** (B2, B3, D4, upstash, connectors — all green), and **one is
decoupled as a code task** (B1, apps/cloud Node→Worker). Docs drift is now fully
scoped to the triage register and gated by `check:links`. The branch is clear to
proceed with the docs sweep and the (separate) cloud-scaffold migration.
