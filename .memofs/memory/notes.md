# Notes

Use this file for lower-confidence notes, observations, and working memory.

## 2026-07-12T07:57:40.540Z
- kind: note
- tags: mobile, responsive, hero-title, vitepress, css
- confidence: 0.9
- source: memofs
- metadata: {"id":"mem_5e4871f89c41ac70"}

Title "MemoFS" not showing on initial render - caused by VitePress `.clip` class applying transparent text fill color via scoped styles. Fix: remove `.clip` class in onMounted when splitting title into spans.

## 2026-07-12T08:03:35.133Z
- kind: decision
- tags: animation, homepage, performance, decision
- confidence: 1
- source: memofs
- metadata: {"id":"mem_1753ebbac352f976"}

Removed all homepage animations except terminal typing. Removed: tekOrb (background orbs), tek-reveal-ready (scroll-triggered section reveals), fadeInUp, IntersectionObserver reveal JS. Kept: HeroTerminal's htGlow and htCaret animations.

## 2026-07-12T08:11:31.129Z
- kind: decision
- tags: hero-title, css, vitepress, scoped-styles, fix
- confidence: 1
- source: memofs
- metadata: {"id":"mem_d36306cb0a200e11"}

Fixed MemoFS title not showing on initial render. Root cause: VitePress scoped `.clip` class sets `-webkit-text-fill-color: transparent` with higher specificity than global overrides. Fix: added `.VPHero .name.clip` CSS rule with `!important` to force visible text color as CSS fallback. JS still splits into colored spans for gradient effect, but text is visible even without JS.

## 2026-07-13T07:34:35.791Z — ADR 0020: Agent Behavior Enforcement decision
- kind: decision
- tags: adr, agent-enforcement, hooks, taskType, memofs-status, generate-agent
- confidence: 0.85
- source: memofs
- metadata: {"id":"mem_83e5de18007ffcf1","sourceRefs":[{"sourceType":"document","sourceId":"adr-0020","path":"docs/adr/0020-agent-behavior-enforcement.md","title":"ADR 0020: Agent Behavior Enforcement — Hooks Layer + Smart Context + Observability"},{"sourceType":"document","sourceId":"discovery-1","path":"discovery/1.md","title":"Hooks landscape survey (6 platforms)"},{"sourceType":"document","sourceId":"discovery-2","path":"discovery/2.md","title":"Command Registry / Policy Engine / Memory Orchestrator proposal"}]}

ADR 0020 (Draft): Agent Behavior Enforcement — three layers at v1, one at v1.x. Layer 1: `memofs generate agent <target>` emits both rules file (slimmed, no MemoFS workflow section) + hooks file (SessionStart injection + SubagentStart + PreCompact). 9 targets: claude, codex, cursor, opencode, gemini, cline, cascade, commandcode, copilot. Layer 2: `taskType` enum on `memofs.context` (coding|debug|refactor|docs|general) — smart pull, replaces Discovery 2's per-intent tools. Layer 3: `memofs status` — reads memory-events.jsonl, renders human-readable observability of what agent did with memory + compliance summary. Layer 4 (v1.x): PreToolUse hard gate, opt-in via `--enforce`, documented caveats. Rejected: Command Registry (redundant with MCP tool descriptions), Policy Engine (no event loop — pull not push), per-intent MCP tools (premature fragmentation). CLI `memofs context` must be upgraded to call `memo.context()` (full intelligence pipeline, not just core+notes+text search) for hook injection. Cloud-conditional: hook runs `memofs cloud sync pull` only if cloud configured. SubagentStart available on Claude Code, Codex, Cursor, Copilot — closes subagent bypass for context injection on those 4 platforms.

## 2026-07-13T07:34:36.438Z — MCP servers are pull-only — only platform hooks provide push enforcement
- kind: constraint
- tags: agent-enforcement, mcp, hooks, pull-vs-push, policy-engine
- confidence: 0.95
- source: memofs
- metadata: {"id":"mem_c9e1f27fed309ae9"}

Grilling session finding: Discovery 2's Policy Engine (command registry + runtime orchestration) has a fatal flaw — it's a pull mechanism pretending to be push. An MCP server only runs when the agent calls it; it has no event loop of its own. If the agent never calls any MCP tool, the policy engine never fires. The "runtime owns behavior" claim is only true if the agent chooses to call the runtime, which is the same "the model can ignore it" problem it claims to solve. Only platform lifecycle hooks (SessionStart) provide push enforcement without the agent choosing to pull. The Kubernetes analogy is inverted: a K8s controller owns its execution loop; an MCP server does not. The hook IS the watch loop — it fires on host-emitted events without the agent choosing to invoke it.

## 2026-07-13T07:58:08.511Z — ADR 0020 update: status on session end, opencode in v1, pluggable emitters, local-first intelligence
- kind: decision
- tags: adr, agent-enforcement, memofs-status, opencode, pluggable-emitters, local-first, intelligence
- confidence: 0.9
- source: memofs
- metadata: {"id":"mem_d40d96fec78c5680","sourceRefs":[{"sourceType":"document","sourceId":"adr-0020","path":"docs/adr/0020-agent-behavior-enforcement.md","title":"ADR 0020: Agent Behavior Enforcement"}]}

ADR 0020 updated (Draft): Three changes from grilling session. (1) `memofs status` on session end — Stop hook runs `memofs status` and displays compliance summary as the last thing the developer sees after the agent's session summary. Non-blocking (exit 0, no retry). Uses `systemMessage` (Claude Code, Codex), `session.idle` (opencode), or platform equivalent. Closes the observability loop at the natural review moment. (2) opencode added to v1 ship — 4 v1 platforms: Claude Code, Codex, Cursor, opencode. opencode earns v1 slot because its TS plugin model is the most powerful emission shape (arbitrary code, not just JSON) and it reads AGENTS.md natively. (3) Pluggable hook emitter architecture — HookEmitter + HookModule interfaces. Each platform = one emitter file. New hook behavior = one hook module. Cost of platform N+1 is O(1). Third parties can contribute emitters. (4) Local-first intelligence is a prerequisite — CLI `memofs context` must call `memo.context()` (full pipeline: strategist + RRF + entity graph + local ONNX), not the current watered-down core+notes+text search. Zero API keys for full intelligence. Cloud is freshness-only, not intelligence.

## 2026-07-13T08:01:38.537Z — ADR 0020 Accepted: Agent Behavior Enforcement with cloud trust boundary + compliance honesty clarifications
- kind: decision
- tags: adr, agent-enforcement, accepted, cloud-trust-boundary, compliance-honesty, pluggable-emitters
- confidence: 0.95
- source: memofs
- metadata: {"id":"mem_7f10404b96ed5f2e","sourceRefs":[{"sourceType":"document","sourceId":"adr-0020-accepted","path":"docs/adr/0020-agent-behavior-enforcement.md","title":"ADR 0020: Agent Behavior Enforcement (Accepted)"}]}

ADR 0020 (Accepted): Agent Behavior Enforcement — hooks layer (push) + taskType (smart pull) + memofs status (observability) + pluggable emitter architecture. v1 ships 4 platforms: Claude Code, Codex, Cursor, opencode. v1.x adds 5: Gemini CLI (note: being replaced by Antigravity CLI), Cline, Cascade/Devin, Command Code, Copilot. Two design clarifications locked at acceptance: (1) Cloud Trust Boundary — auto-persist (--persist) writes locally ONLY, never auto-pushes to cloud. Cloud sync push is a separate conscious command. The hook pulls from cloud (freshness) but never pushes to cloud (trust). Prevents hallucinated decisions polluting team context. (2) Compliance Honesty — v1 memofs status shows only what it can verify from memory-events.jsonl: context loaded at session start, memory consulted during session, facts persisted at session end. Cannot verify "memory consulted BEFORE edits" without edit timestamps — that check ships with the hard gate in v1.x. Cursor platform limitation: stop hook has no systemMessage, so status is written to file + developer runs memofs status manually.

## 2026-07-13T12:25:12.806Z — Generate agent-rules uses .md template files as SSOT via ?raw imports
- kind: decision
- tags: adr-0020, agent-rules, templates, dry-ssot, cli, generate
- confidence: 1
- source: memofs
- metadata: {"id":"mem_5c1250bf0281fa2f"}

Refactored `generate agent-rules` to use `.md` template files as the single source of truth instead of hardcoding markdown as TypeScript string literals in `buildBody()`.

**Problem**: `buildBody()` in `agent-rules.ts` hardcoded the entire markdown content (title, intro, MemoFS Memory section, Behavioral Rules, Pointers) as `lines.push(...)` string literals. This was a DRY/SSOT violation — the repo-root `AGENTS.memory.md` / `AGENTS.nomemory.md` template files were ignored, and the code-generated output had diverged from them (different section names, different formats).

**Solution**:
1. Created `.md` template files with `{{placeholder}}` syntax in `packages/cli/src/commands/generate/templates/`:
   - `memory.md` — full template with MemoFS Memory section (used by `generate agent-rules`)
   - `slim.md` — slimmed template without memory section (used by `generate agent` umbrella with hooks)
2. Templates use placeholders: `{{projectName}}`, `{{rulesDir}}`, `{{mcpLabel}}`, `{{mcpPath}}`, `{{rules}}`
3. `templates.ts` imports them via `?raw` suffix (Vite/rolldown feature)
4. Added `rawMdPlugin()` to `packages/cli/tsdown.config.ts` — a rolldown plugin that handles `?raw` imports at build time by reading the file and inlining it as a string constant (mirrors Vite's native `?raw` support that vitest uses)
5. `agent-rules.ts` rewritten: `buildBody()` replaced with `interpolateTemplate()` + `renderRulesSection()` + `resolveMcpLabel()`
6. Removed `AgentRulesPointer` interface, `resolveMcpPointer()`, `resolveDefaultPointers()` — pointers are now baked into templates
7. Removed `EmitAgentRulesOptions.pointers` parameter (was never used in practice)
8. Updated repo-root `AGENTS.memory.md` / `AGENTS.nomemory.md` to match CLI template format
9. Removed duplicate `AGENTS.inject.md`
10. Added 5 new tests (47 total in generate.test.ts): slim mode, Workspace Rules/Pointers sections, placeholder interpolation, custom rules rendering, no-rules-omits-section

**Key files**:
- `packages/cli/src/commands/generate/templates/memory.md` — full template (SSOT)
- `packages/cli/src/commands/generate/templates/slim.md` — slim template (SSOT)
- `packages/cli/src/commands/generate/templates.ts` — raw imports + exports
- `packages/cli/src/commands/generate/raw-exports.d.ts` — ambient type decl for `*.md?raw`
- `packages/cli/tsdown.config.ts` — `rawMdPlugin()` for build-time `?raw` support
- `packages/cli/src/commands/generate/agent-rules.ts` — rewritten to use templates

330 tests pass, lint clean, typecheck clean, build verified.

## 2026-07-13T13:04:51.727Z — apps/docs updated for ADR 0020 agent behavior enforcement + template refactor
- kind: summary
- tags: adr-0020, docs, cli, mcp, changelog, llms.txt
- confidence: 1
- source: memofs
- metadata: {"id":"mem_ad6db461c0b9b1a2"}

Updated `apps/docs` to document the ADR 0020 agent behavior enforcement system and the template-based `generate agent-rules` refactor.

**Files updated (5):**

1. `apps/docs/packages/cli/index.md` — major updates:
   - `memofs context`: added `--task-type` flag (with tip explaining task-biased recall), `--mark-session-start` flag, description updated to mention the intelligence pipeline
   - `memofs status`: new command section with output example showing compliance checks (context loaded, memory consulted, facts persisted)
   - `generate agent-rules`: updated description (mentions git-conventions.md copy), replaced inline target list with a full table (target, output file, MCP config, rules directory), added `opencode` target, added 50-line cap note
   - `generate agent-hooks`: new command section documenting hook emission for 4 platforms with a capability matrix table (SessionStart, PreCompact, Stop, output method per platform)
   - `generate agent`: new umbrella command section with `--no-hooks` flag, example showing full Claude Code setup output (CLAUDE.md + git-conventions.md + settings.local.json)

2. `apps/docs/packages/mcp/index.md` — updated `memofs.context` tool description to include `taskType` parameter and its values

3. `apps/docs/packages/core/client/recall.md` — updated `memo.context()` documentation with a full parameter table (query, taskType, detail, maxBytes), code example using `taskType: "debug"`, and explanation of strategist query augmentation

4. `apps/docs/changelog.md` — added "Unreleased" section with 4 subsections (Core, CLI, MCP Server, Hook System) covering all ADR 0020 additions and the template-based generate refactor

5. `apps/docs/public/llms.txt` — added 3 bullet points to the CLI section: agent behavior enforcement, compliance observability, task-aware context

**Build verification:** VitePress build fails on a pre-existing dead link in `connectors/index.md` (not introduced by these changes). No new dead links introduced.

## 2026-07-13T14:27:18.822Z — Config schema ships inside CLI package via node_modules instead of versioned docs URL
- kind: decision
- tags: config, schema, cli, node-modules, ssot, init
- confidence: 1
- source: memofs
- metadata: {"id":"mem_246596ad1615f21d"}

Refactored config schema to ship inside the CLI package instead of using versioned docs URLs.

**Problem**: The `$schema` field in `.memofs/config.json` pointed to `https://docs.memofs.dev/<version>/config.schema.json` — a versioned URL that required a separate publishing step (`scripts/version-schema.ts`). The versioned schema for `1.0.0-beta.2` didn't even exist in `apps/docs/public/`. Additionally, `memofs init` did NOT write `config.json` — only `memofs config init` did, so users running `memofs init` saw no config file.

**Solution**:
1. Copied `config.schema.json` into `packages/cli/schema/config.schema.json` — the schema now ships with the npm package
2. Added `schema/` to `package.json` `files` field + `./schema/config.schema.json` export map entry
3. Replaced `configSchemaUrl(version)` with `resolveSchemaPath(rootDir)` — resolves a relative path from `.memofs/` to the schema file in the installed `@memofs/cli` package using `import.meta.url`. No version in the URL because `node_modules` already bundles the matching version.
4. `memofs init` now writes `.memofs/config.json` with `$schema` reference (both on fresh init and when `.memofs/` already exists)
5. `memofs config init` updated to use `resolveSchemaPath(rootDir)` instead of `configSchemaUrl(pkg.version)`
6. Removed `scripts/version-schema.ts` (no longer needed)
7. Removed stale `apps/docs/public/1.0.0-alpha.0/config.schema.json`
8. Updated `apps/docs/public/config.schema.json` `$id` to `https://memofs.dev/schema/config.schema.json`
9. Updated docs (`cli/index.md`, `adapter-transformers/README.md`, `changelog.md`) to show the new node_modules-relative `$schema` path
10. Removed `pkg` (package.json) import from `register.ts` — no longer needed since version is not used
11. Added test verifying `memofs init` writes `config.json` with `$schema` reference

**Key files**:
- `packages/cli/schema/config.schema.json` — schema shipped with the package (SSOT)
- `packages/cli/src/config/runtime.ts` — `resolveSchemaPath()` replaces `configSchemaUrl()`
- `packages/cli/src/commands/init.ts` — now writes `.memofs/config.json`
- `packages/cli/src/runner/register.ts` — uses `resolveSchemaPath`, removed `pkg` import
- `packages/cli/package.json` — `schema/` in `files`, export map entry

331 tests pass, lint clean, typecheck clean, build verified.

## 2026-07-13T22:00:13.762Z — Two-Worker split implemented (ticket 48)
- kind: decision
- tags: two-worker-split, service-binding, runtime-worker, ticket-48, cloud-architecture
- confidence: 0.95
- source: memofs
- metadata: {"id":"mem_e5c9f4c072ef820d"}

Two-Worker split implemented proactively (ticket 48). The cloud app is now split into two Workers joined by a Cloudflare Service Binding:

**Runtime Worker** (`workers/runtime.ts`):
- Holds per-project MemoFS instances (LRU cache, max 64 per isolate)
- Assembles runtime from env bindings: R2 (BLOBS), Turso (DATABASE_URL), Voyage (VOYAGE_API_KEY), Workers AI (AI)
- Includes a per-project mutex concurrency layer (acquireLock) that satisfies the ConcurrencyLayer interface — this lifts the GATED_METHODS 503 gate
- Uses `handleRuntimeRequest` from `@memofs/server` for JSON-RPC dispatch
- Routes per-project via `X-Project-Id` request header
- wrangler config: `wrangler.runtime.toml` (name: `memofs-runtime`)

**Commercial Worker** (`workers/app.ts`):
- Auth, billing, dashboard, sync API, React Router SSR — unchanged
- `runtime-client.ts` rewritten as a Service Binding JSON-RPC client (no adapter imports, no @memofs/core/server imports)
- Sends JSON-RPC requests via `env.RUNTIME.fetch()` with `X-Project-Id` header
- wrangler config: `wrangler.toml` (name: `memofs-cloud`, already had `RUNTIME` service binding declared)

**Deploy scripts**: `deploy:runtime` and `deploy:runtime:dev` added to package.json

**Vitest config split**: `vitest.config.ts` is now node-only (no browser project). `vitest.browser.config.ts` is the separate browser config. Commands: `test` (node), `test:browser` (browser), `test:workers` (workers-pool).

**Remaining**: bundle size verification (`wrangler deploy --dry-run` on both Workers) and Service Binding round-trip integration test (needs Miniflare multi-Worker setup) are deferred to when the cloud is deployed.

## 2026-07-14T07:51:30.490Z — Ticket 48 (Two-Worker Split) committed
- kind: summary
- tags: ticket-48, tier-8, two-worker-split, memofs-cloud
- confidence: 1
- source: memofs
- metadata: {"id":"mem_aac0e109c064b676"}

Ticket 48 (Two-Worker Split) committed to memofs-cloud repo (commit d45195f). Runtime Worker (workers/runtime.ts, wrangler.runtime.toml) holds per-project MemoFS instances with RuntimeEnv interface (AI, BLOBS, DATABASE_URL, DATABASE_AUTH_TOKEN, VOYAGE_API_KEY). Commercial Worker (wrangler.toml) slimmed — AI binding removed, reaches runtime via Service Binding (RUNTIME). runtime-client.ts rewritten as JSON-RPC Service Binding client. cloud-info.ts is SSOT for CLOUD_NAME + cloudVersion. memory.tsx gets providers from runtime Worker health endpoint. 8 runtime-client tests pass. Remaining open checkboxes: commercial Worker < 3 MB verification, Service Binding round-trip test (needs multi-Worker Miniflare).

## 2026-07-14T08:20:00.087Z — Tier 4 (Teams Billing) fully implemented and committed
- kind: summary
- tags: tier-4, teams-billing, tickets-27-31, memofs-cloud
- confidence: 1
- source: memofs
- metadata: {"id":"mem_4f315ba1ce23b7ef"}

Tier 4 (Teams Billing) fully implemented and committed (commit e655879). All 5 tickets (27-31) done:

Ticket 27: GET /checkout/teams route (session-auth, owner-verified via getTeamById.ownerAccountId, redirects to Polar checkout with memofs_team_id + memofs_plan + memofs_account_id metadata). Team page (team.tsx) billing section: "Upgrade to Teams" button (no subscription) or "Manage Subscription" link (Polar portal). New getTeamById query + TeamRecord type.

Ticket 28: handleSubscriptionEvent in billing/index.ts extended to check memofs_team_id metadata. applyPlanToTeam writes teams.polarSubscriptionId + upgrades accepted members. downgradeTeam clears polarSubscriptionId + reconciles each member via resolvePlanAfterRemoval. metaString helper extracted for DRY metadata reads.

Ticket 29: removeTeamMember calls reconcilePlan after removal. resolvePlanAfterRemoval checks if account is still in another team with active polarSubscriptionId (multi-team edge case). Shared helpers: listAcceptedMemberAccountIds + reconcilePlan extracted to eliminate Duplicated Code + Shotgun Surgery smells.

Ticket 30: Seat cap enforcement verified (existing createInvitation check at teams.ts:579). No Polar API fetch for seat count.

Ticket 31: Teams plan soon flag flipped to false in plans.ts. Pricing page copy updated. Terms comment updated.

Key files: src/routes/checkout/teams.tsx (new), src/.server/queries/teams.ts (getTeamById, resolvePlanAfterRemoval, applyPlanToTeam, downgradeTeam, reconcilePlan, listAcceptedMemberAccountIds), src/.server/api/billing/index.ts (metaString + handleSubscriptionEvent team path), src/routes/dashboard/team.tsx (TeamBillingCard), src/routes/_home/+utils/plans.ts (soon: false), 15 tests in src/.server/queries/__tests__/teams.test.ts. Code review completed (standards fixes applied).

## 2026-07-14T13:17:35.332Z — Tier 1 (Foundation) fully implemented and committed
- kind: summary
- tags: tier1, foundation, tickets-1-5, writer-attribution, rate-limiting, ip-pin, concurrency
- confidence: 1
- source: memofs
- metadata: {"id":"mem_e7901ee36316f91f"}

Tier 1 (Foundation) fully implemented and committed. All 5 tickets done:

- Ticket 1: decisions.md created (gitignored) recording the Worker topology decision (full split)
- Ticket 2: Concurrency layer verified (already wired in ticket 48) + serialization test added to runtime-api.test.ts proving concurrent calls to same projectId serialize
- Ticket 3: Writer attribution — `writer?: string` added to `WriteMemoryInput` in @memofs/core, threaded through `TimestampedNote` frontmatter, memory event actor (`{type:"user",id:writer}`), `notesRecord` delegate, `recordNote` JSON-RPC handler. Cloud `logMemoryEvent` accepts `writer?` and uses it as `actor`. 22 OSS tests.
- Ticket 4: Tiered sync rate limiting — `consumeSyncToken(apiKeyId, plan)` in rate-limit.ts routes Free/Pro to SYNC_RATE_LIMIT_BASE, Teams to SYNC_RATE_LIMIT_TEAMS. Sync middleware returns 429+Retry-After. Graceful degradation when bindings unset or env unconfigured. `apiKeyId` added to `AuthAccount` (selected in `resolveAccount`). 7 cloud tests.
- Ticket 5: Single-user IP pin — `api_key_pins` table (migration 0006) with 10-min rolling window. `enforceSingleUser(apiKeyId, clientIp, plan)` in account.ts pins Free/Pro keys to first IP; Teams exempt. Runs before rate limiter in sync middleware. 6 cloud tests.

Commits:
- OSS: 4c5a5d8 (tickets 2+3, 9 files, 206 insertions)
- Cloud: 8773831 (tickets 1+3+4+5, 11 files, 1846 insertions)

Total: 35 new tests (22 OSS + 13 cloud). All pass alongside 209 pre-existing. 10 pre-existing failures (oauth-providers + rate-limit env validation) unchanged.

Code review + security review completed. Key findings addressed: file header on sync-rate-limit.test.ts, TSDoc on ApiKeyPin/NewApiKeyPin, comment on consumeSyncToken env-fail catch.

## 2026-07-15T05:08:45.479Z — sha256Hex is async — callers must await
- kind: decision
- tags: sha256Hex, connectors, cli, async-discipline, SSOT
- confidence: 1
- source: assistant:codex
- metadata: {"id":"mem_a2202f912cce3c80"}

`@memofs/core`'s `sha256Hex(value: string): Promise<string>` (exported from `packages/core/src/memofs/sync/sha256.ts`) is ASYNC — it composes `hashBytesHex` which returns a Promise. Callers MUST `await` it. Two historical sync-callers were bugs: `packages/connectors/src/id.ts` (connectorNoteId) and `packages/cli/src/commands/cloud.ts:319` (manifest assignment). Both fixed 2026-07-15 to `await sha256Hex(...)`. The correct pattern is shown in `packages/core/src/memofs/sync/file-replication.ts:138,172,238`: `manifest[path] = await sha256Hex(content);`. `connectorNoteId` is now `async function connectorNoteId(record): Promise<string>` and the runner awaits it at the dedup site.

## 2026-07-15T05:08:54.687Z — connectors shared module layout
- kind: reference
- tags: connectors, DRY, SSOT, shared-module
- confidence: 1
- source: assistant:codex
- metadata: {"id":"mem_66f5a891420c41ae"}

`packages/connectors/src/connectors/shared/` is the DRY home for cross-connector primitives shared by the GitHub + Notion built-ins. Two modules: `http.ts` — `withRequestTimeout(signal?)`, `isAbortError(error)`, `REQUEST_TIMEOUT_MS = 30_000`; `normalize.ts` — `truncate(value, max)`, `formatContent(title, body, url)`, `resolveLimit(raw)`, `MAX_BODY_CHARS = 4000`, `PAGE_SIZE = 25`, `DEFAULT_LIMIT = 50`. The github/notion `fetch.ts` import from `shared/http` (+ `PAGE_SIZE`, `resolveLimit` from `shared/normalize`); the github/notion `normalize.ts` import `formatContent`, `truncate`, `MAX_BODY_CHARS` and re-export `MAX_BODY_CHARS` for tests. Add a new built-in connector → reuse these, don't re-copy.
