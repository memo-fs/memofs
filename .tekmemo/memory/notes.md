# Notes

## 2026-06-18T08:46:09.508Z — Project identity
- kind: summary
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_d42f34bce417d0e5"}

TekMemo (@tekbreed/tekmemo) is an open-source monorepo for AI infrastructure, hosted at github.com/tekbreed/tekmemo. The founder and lead maintainer is Christopher Sesugh (github.com/sponsors/christophersesugh). Licensed under MIT. Docs site at docs.memo.tekbreed.com.

## 2026-06-18T08:46:10.506Z — Monorepo toolchain
- kind: reference
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_fe7b7dfb7361bc95"}

Built with pnpm (v9.15.4) workspaces, Turborepo (v2.9.16) for task orchestration, Biome (v2.4.16) for formatting/linting, tsdown (v0.22.2) for package bundling, TypeScript 6.0.3, Vitest (v4.1.8) for testing, and Changesets for versioning/changelog. Requires Node.js >=22.

## 2026-06-18T08:46:11.642Z — Package boundary rules
- kind: constraint
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_eb7f81b51c64b8bf"}

Package boundaries: @tekbreed/tekmemo owns the API surface and protocol contracts. Separate packages exist for CLI (tekmemo-cli), MCP server (tekmemo-mcp-server), provider adapters (tekmemo-adapter-*), benchmark kit (tekmemo-benchmark-kit), and test utilities (tekmemo-testing). The apps/ directory contains docs site and the Cloudflare MCP Worker. Internal tooling uses @repo/ scope.

## 2026-06-18T08:46:12.517Z — Agent TekMemo memory workflow
- kind: decision
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_4948bcc351e7c4e9"}

At the start of every task, agents MUST call tekmemo_tekmemo_context with the task description, use tekmemo_tekmemo_recall for additional lookups, adhere to returned memory, and persist new facts via tekmemo_tekmemo_remember. This is enforced via AGENTS.md and ensures TekMemo is the single source of truth for project knowledge across all agent sessions.

## 2026-06-18T08:46:14.225Z — CLI testing results
- kind: note
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_6a0b06f531bd051f"}

All tekmemo-cli commands tested successfully on 2026-06-18. Commands tested: init, inspect, config, context, remember, read, events, chunks, snapshot, doctor, validate, search, diff, agent, cloud. Global flags work: --version (1.0.0-alpha.0), --json, -v, -q, --no-color, --help. Edge cases handled gracefully (invalid read target, missing args, empty labels). Note: init --force wipes all .tekmemo/ data (generates new project ID, clears all notes/events/snapshots).

## 2026-06-18T08:50:52.011Z — Core memory populated
- kind: decision
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_9338c7da47037665"}

Core memory (.tekmemo/memory/core.md) was populated on 2026-06-18 with compact always-relevant truths: project identity, first product (TekMemo), monorepo toolchain, architecture constraints, and agent workflow. It is unconditionally injected into every agent context, unlike notes memory which is loaded on-demand.

## 2026-06-18T08:54:22.839Z — AGENTS.md refactored as thin TekMemo bootstrapper
- kind: decision
- tags: none
- confidence: 1
- source: mcp
- metadata: {"id":"mem_dc97f0587d45e505"}

AGENTS.md was refactored to be a thin bootstrapper for TekMemo. All project facts (identity, packages, architecture) were removed — they live in core memory and notes memory. The file now contains only: (1) TekMemo MCP bootstrap instructions, (2) behavioral rules that can't go through MCP, (3) pointers to rules/skills dirs. This implements the DRY/SSOT principle: TekMemo is the single source of truth, agent memory files are minimal pointers.

## 2026-06-18T20:53:45.513Z — AI SDK native tool (not MCP) is primary path for TekMemo memory intelligence
- kind: decision
- tags: ai-sdk, mcp, memory-intelligence, docs, decision
- confidence: 0.95
- source: mcp
- metadata: {"id":"mem_4008eeadc0afa083"}

Design decision (2026-06-18): For TekMemo "memory intelligence" with the Vercel AI SDK, the AI SDK NATIVE tool is the primary recommended path for app/agent developers, with MCP as the complementary path for bring-your-own-client coding agents.

Rationale (grounded in AI SDK v6 official guidance "AI SDK Tools vs MCP Tools"):
- AI SDK Tools: full type safety, same-process execution (low latency), full prompt/schema control. Best for production apps requiring control and performance.
- MCP Tools: dynamic discovery at runtime, separate server (network overhead), best for dev iteration and user-provided tools.

Memory is hot-path (runs every turn) and needs tight access/permission/content controls, so the native tool wins for in-app intelligence.

Implementation mapping (verified against source packages/tekmemo/src/):
- Native tool: `buildRuntimeMemoryToolDefinition({ runtime, access, allowWrites, allowCoreUpdates, allowIndexing, allowSecrets, maxContentChars })` from `@tekbreed/tekmemo`. Single multi-command tool: read_core_memory, update_core_memory, remember, list_notes, recall, build_context, index.
- Runtime: `createLocalAiSdkRuntime({ workspace: createNodeFsMemoryStore({ rootDir }) })` for local; cloud client for cloud.
- Context-first: `buildRuntimeMemoryContext({ runtime, access, query, baseInstructions })` injects memory into the system prompt BEFORE generation.
- "100% intelligence" recipe = context-first (buildRuntimeMemoryContext into system prompt) + tool-augmented (buildRuntimeMemoryToolDefinition) + multi-step (stopWhen: stepCountIs(N)).

IMPORTANT doc-accuracy note: docs/packages/tekmemo/ai-sdk/tools.md currently documents NON-EXISTENT APIs (createTekMemoTool, defineTekMemoTools, createLocalTekMemoTool, defineLocalTekMemoTools). The CORRECT API (buildRuntimeMemoryToolDefinition + createLocalAiSdkRuntime) is documented accurately in docs/packages/tekmemo/ai-sdk/index.md. tools.md must be rewritten to the real exports.

## 2026-06-19T04:52:23.216Z — Layer 5 complete: MCP directive + context instructions block
- kind: summary
- tags: tekmemo, layer-5, mcp, context, directive
- confidence: 0.95
- source: assistant:zcode
- metadata: {"id":"mem_4146862805687e1f"}

Layer 5 complete (refactor/tekmeo-factory, 2026-06-19): MCP agent-context intelligence layer.

1. MCP tool description rewrites (packages/tekmemo-mcp-server/src/tools/definitions.ts) — the 4 core tools now carry agent-directing copy:
   - tekmemo.context: "REQUIRED at the start of every task ... ALWAYS call this before planning or writing code"
   - tekmemo.recall: "Semantic + lexical memory search ... call it instead of guessing or re-deriving facts"
   - tekmemo.remember: "call this WITHOUT being asked whenever you discover a decision/constraint/preference"
   - tekmemo.read_core_memory: "authoritative — treat its contents as hard constraints"

2. Context instructions block in buildContext (packages/tekmemo/src/tekmemo/helpers.ts):
   - Added exported constant AGENT_CONTEXT_DIRECTIVE (adhere / recall-before-answering / persist-discoveries / no-secrets).
   - buildContext now pushes a `directive` section FIRST so all strategies (local/cloud/hybrid) emit the same preamble.
   - MemoryContextResult.sections[].type union extended with "directive" (packages/tekmemo/src/tekmemo/types.ts).

Verified: tekmemo + tekmemo-mcp-server typecheck clean; 342/345 tests pass (new tests/context-directive.test.ts covers directive ordering + empty-floor case).

Remaining: Layer 6 (tests + docs: README, quick-start, config.schema.json).

## 2026-06-19T05:04:22.991Z — Layer 6a: test + doc gap survey for local intelligence features
- kind: summary
- tags: local-intelligence, testing, docs, layer-6, survey
- confidence: 1
- source: mcp
- metadata: {"id":"mem_ff99f2010bbbc9e4"}

Survey of test/doc coverage for the new local-intelligence features (Layers 1-5):

WELL-COVERED (existing tests):
- packages/tekmemo/tests/recall/lexical.test.ts — tokenize, termFrequency, fuzzyOverlap/fuzzyScore, BM25Store (relevance, normalization, fuzzy boost, namespaces, delete/clear, empty cases, invalid docs)
- packages/tekmemo/tests/recall/hybrid-recall.test.ts — recencyBoost (now/half/two-half-lives/missing), readConfidence (clamp/default), mergeHybridCandidates (winner ranking, recency boost, topK, reranker fold, empty, reranker-failure-safe)
- packages/tekmemo/tests/recall/fs-stores.test.ts — FsRecallStore (upsert+rehydrate, delete+persist), FsGraphStore (nodes/edges persist+rehydrate, empty case)
- packages/tekmemo/tests/intelligence/local-intelligence.test.ts — e2e: lexical hybrid recall (zero-config), auto-extract graph facts, restart rehydration, ranked results
- packages/tekmemo-adapter-transformers/tests/transformers-embedder.test.ts — embedText/embedTexts, batching, validation (non-string, empty, allowEmptyText), dimension caching, default model

GAPS (Layer 6b targets):
1. createLazyLocalEmbedder (packages/tekmemo/src/tekmemo/local-embedder.ts) — NO tests. Needs: lazy load only on first call, adapterFactory injection path, missing-export error fallback, retry-after-failure, cacheDir/model forwarding, embedText/embedTexts delegation.
2. RecallEngineConfig / resolveTekmemoConfig.recall (packages/tekmemo/src/tekmemo/config.ts) — NO tests for recall resolution. Needs: constructor>env>file>default priority for engine/localEmbeddings/embeddingModel; env parsing of TEKMEMO_RECALL_ENGINE/TEKMEMO_LOCAL_EMBEDDINGS/TEKMEMO_EMBEDDING_MODEL; invalid engine falls back to "auto"; config.json recall block.
3. MCP factory local-embedder wiring (packages/tekmemo-mcp-server/src/runtime/factory.ts) — existing tests only use mode:"memory". Needs: localEmbeddings default-on (via process.env), TEKMEMO_LOCAL_EMBEDDINGS=0/false disables, mode:"memory"/"cloud" skips embedder wiring, embeddingModel forwarding, explicit recall option passthrough.
4. fs-graph-store edge cases — existing fs-stores.test.ts covers happy path + empty. Could add: getNode on missing id, neighbors direction filtering, stats accuracy, persistence-then-rehydrate for edges specifically.
5. (adapter-transformers already well-tested; minor gaps: MAX_TEXT_LENGTH overflow rejection, toFlatVector unsupported shape, batch size<=0, onProgress forwarding, modelName getter when pipelineFactory omitted but model overridden — OPTIONAL.)

DOC GAPS (Layer 6c):
- config.schema.json — needs `recall` block (engine, localEmbeddings, embeddingModel) + TEKMEMO_RECALL_ENGINE/LOCAL_EMBEDDINGS/EMBEDDING_MODEL env docs.
- READMEs (tekmemo, tekmemo-cli, mcp-server) — mention zero-config local/hybrid recall + the adapter-transformers package.
- llms.txt — reflect new local intelligence story.
- tekmemo-adapter-transformers needs a README.

## 2026-06-19T05:32:06.695Z — Best-effort write path: failing embedder must not break writes
- kind: decision
- tags: tekmemo, recall, write-path, best-effort, testing
- confidence: 1
- source: mcp
- metadata: {"id":"mem_4ed8760c3d62a082"}

Write-path `indexDocument` in `packages/tekmemo/src/tekmemo/local-strategy.ts` is best-effort: its entire body is wrapped in try/catch (the vector index is an enhancement over lexical recall). A failing or missing lazy embedder / recall store must never break a write — lexical (BM25 + fuzzy) recall keeps the memory discoverable. Regression tests live in `packages/tekmemo/tests/intelligence/local-intelligence.test.ts` under the "best-effort write path (failing embedder)" describe block, covering (1) an embedder that rejects on every call and (2) a recall store whose upsert rejects. Inject a failing embedder via `TekmemoConfig.embedder` and a failing store via `recallStore.upsert = vi.fn().mockRejectedValue(...)`.

## 2026-06-19T05:39:17.170Z — tekmemo dist must be rebuilt after local-strategy changes; MCP tests validate the artifact
- kind: constraint
- tags: tekmemo, build, dist, testing, mcp-server, gotcha
- confidence: 1
- source: mcp
- metadata: {"id":"mem_ae6eae9ae59f9486"}

The `tekmemo` package ships a compiled `dist/` (NOT git-tracked — it's a build artifact). Consumers like `@tekbreed/tekmemo-mcp-server` resolve the workspace dependency to `dist/index.mjs`, NOT to source. After any change to `packages/tekmemo/src/tekmemo/local-strategy.ts` (or any write/recall path), you MUST run `pnpm --filter @tekbreed/tekmemo build` and re-run the MCP server tests — a source-level regression test against `src/` can pass while the stale `dist/` still exhibits the bug. This was the root cause of Layer 6b's MCP factory test failure: the `indexDocument` best-effort try/catch existed in src but was absent in the stale dist, so `writeMemory` threw when the lazy local embedder could not find `@tekbreed/tekmemo-adapter-transformers`. The canonical regression test for "failing embedder must not break writes" is `packages/tekmemo/tests/intelligence/local-intelligence.test.ts` (best-effort write path describe block), but the definitive end-to-end check is `packages/tekmemo-mcp-server/tests/factory.test.ts`.

## 2026-06-19T08:40:35.338Z — tekmemo generate agent-rules CLI command
- kind: reference
- tags: cli, generate, agent-rules, tekmemo-cli, mcp
- confidence: 1
- source: mcp
- metadata: {"id":"mem_159e012526236c2c"}

## `tekmemo generate agent-rules` command

Location: `packages/tekmemo-cli/src/commands/generate.ts`, registered in `src/runner.ts` as a `generate` command group with `agent-rules` subcommand.

**Purpose:** emits a <=50-line agent-instructions file that enforces the TekMemo MCP workflow. The file contains ONLY behavioral rules + pointers — no project facts (those live in TekMemo memory, injected at runtime via `context`). This is the SSOT discipline: keep instruction files thin.

**Targets (each with a target-aware MCP config pointer):**
- `agents`  -> `AGENTS.md`                          | MCP: `~/.codex/config.toml` (global)
- `claude`  -> `CLAUDE.md`                           | MCP: `.mcp.json` (project)
- `gemini`  -> `GEMINI.md`                           | MCP: `.gemini/settings.json` (project)
- `copilot` -> `.github/copilot-instructions.md`     | MCP: `.vscode/mcp.json` (project)
- `cursor`  -> `.cursor/rules/tekmemo.mdc`           | MCP: `.cursor/mcp.json` (project) — requires .mdc frontmatter (description/globs/alwaysApply)

**Key exports:** `emitAgentRules` (pure, no IO), `runGenerateAgentRulesCommand` (writes to disk), `AGENT_RULES_TARGETS`, `MAX_AGENT_RULES_LINES` (=50), `parseAgentRulesTarget`, `resolveMcpPointer`.

**Behavior:** `--force` guards overwrite (refuses to clobber existing AGENTS.md/CLAUDE.md without it). `--list` enumerates targets. `--json` emits the standard `{ok,command,data}` envelope (command="generate.agent-rules"). Throws `CliValidationError` if emission would exceed 50 lines.

**Tests:** `packages/tekmemo-cli/tests/generate.test.ts` (26 tests) asserts line cap, target-aware MCP pointers, overwrite protection, --json envelope, --list, unknown-target error.

NOTE: `output.test.ts` fails when `TERM=dumb` or `NO_COLOR` is set in the env (pre-existing, unrelated) — run CLI tests with `TERM=xterm`.

## 2026-06-19T08:44:28.428Z — tekmemo-cli output.test.ts color test fix (TERM=dumb/NO_COLOR)
- kind: reference
- tags: cli, tekmemo-cli, testing, vitest, test-isolation
- confidence: 1
- source: mcp
- metadata: {"id":"mem_a90834519de5936e"}

## Fix: tekmemo-cli output.test.ts color test now environment-independent

Previously `tests/output.test.ts > includes color codes by default` failed when `TERM=dumb` or `NO_COLOR` was set, because `shouldDisableColor()` correctly honors the environment — but the test passed `noColor: false` (Commander's default) and assumed that meant "force color on." It doesn't; `false` just means "fall back to env detection."

Fix applied (in the test, not production code): the test now temporarily forces `TERM=xterm-256color` and deletes `NO_COLOR`, restoring both in a `finally` block. Verified green under `TERM=dumb`, `NO_COLOR=1`, and `TERM=xterm`.

The production logic in `src/output/output.ts` (`shouldDisableColor`) is correct and was NOT changed — color should be env-controlled. The fix is purely a test-isolation fix.

## 2026-06-19T09:06:21.352Z — Tooling package rename canonicalized in docs/rules (no @repo/*-config, no test-utils)
- kind: decision
- tags: tooling, rename, tsdown, typescript, legacy-cleanup, refactor
- confidence: 1
- source: assistant:zcode
- metadata: {"id":"mem_ce5c7fec6228427c"}

Tooling packages were renamed (on the refactor/tekmeo-factory branch) to match their directory names. Canonical names (verified 2026-06-19 via `pnpm ls -r` + every package.json/tsconfig.json/tsdown.config.ts in the repo):

- `tooling/tsdown` → `@repo/tsdown` (was `@repo/tsdown-config`)
- `tooling/typescript` → `@repo/typescript` (was `@repo/typescript-config`)
- `tooling/utils` → `@repo/utils` (unchanged)
- `tooling/test-utils` → REMOVED (`@repo/test-utils` no longer exists)

All actual source/config already uses the new names; the stale `*-config` / `test-utils` references were confined to docs/rules/READMEs and were cleaned on 2026-06-19 in: `.agents/rules/{adding-new-package,monorepo-structure,package-boundaries,package-build-rules,package-naming,typescript-rules}.md`, `AGENTS.md`, `tooling/{tsdown,typescript,utils}/README.md`, and `docs/runbook.md`. A repo-wide grep for `@repo/tsdown-config|@repo/typescript-config|@repo/test-utils|tooling/test-utils` now returns zero matches.

INTENTIONAL compat aliases that must NOT be removed (documented + tested):
- `TEKMEMO_MCP_TOKEN` = legacy alias for `TEKMEMO_MCP_BEARER_TOKEN` (apps/tekmemo-mcp-worker + packages/tekmemo-mcp-server/src/http/index.ts). Tested in apps/tekmemo-mcp-worker/tests/index.test.ts.
- `TEKMEMO_CLOUD_URL` = alias for `TEKMEMO_API_URL` (cloud-client/client.ts + http/index.ts).
- `OpenAIRestClient` = `@deprecated` alias for `OpenAISdkEmbeddingsClient` (packages/tekmemo-adapter-openai/src/client/openai-client.ts).
- `DEFAULT_CONVERSATIONS_MEMORY`, `DEFAULT_MEMORY_CORE` = `@deprecated` aliases in packages/tekmemo/src/core/defaults/templates.ts.

The earlier TekMemo note (mem_4008eeadc0afa083) claiming `docs/packages/tekmemo/ai-sdk/tools.md` documents non-existent APIs (createTekMemoTool etc.) is STALE — that file now correctly documents `buildRuntimeMemoryToolDefinition` + `createLocalAiSdkRuntime`. A repo grep for the old API names returns no matches.

## 2026-06-19T09:36:34.533Z — Repo rename: TekBreed OSS -> TekMemo (prose only; keep org/legal TekBreed)
- kind: decision
- tags: rename, brand, tekmemo, prose, legal, license, decision
- confidence: 1
- source: assistant:zcode
- metadata: {"id":"mem_ed2f374749cd1688","sourceRefs":[{"sourceType":"document","path":"CODE_OF_CONDUCT.md","title":"Code of Conduct"},{"sourceType":"document","path":"CONTRIBUTING.md","title":"Contributing guide"},{"sourceType":"document","path":"SECURITY.md","title":"Security policy"},{"sourceType":"document","path":"LICENSE","title":"MIT License (copyright holder = TekBreed)"}]}

Repository rename decision (refactor/tekmeo-factory branch, completed 2026-06-19): The monorepo's project/product name is "TekMemo" everywhere in user-facing prose. The legacy "TekBreed OSS" / "@tekbreed/oss" / "tekbreed-oss" names (old project/package/dir identifiers) have been fully removed from all LIVE files.

RENAMED to "TekMemo" (project prose):
- CODE_OF_CONDUCT.md (3 refs: project intro, maintainer line, community line)
- CONTRIBUTING.md ("hosts TekBreed open-source work" -> "hosts TekMemo open-source work")
- SECURITY.md ("TekBreed takes security seriously" -> "TekMemo takes security seriously")
- docs/runbook.md: `@tekbreed/oss` -> `@tekbreed/tekmemo`; dir tree `tekbreed-oss/` -> `tekmemo/`
- .agents/rules/monorepo-structure.md: dir tree `tekbreed-oss/` -> `tekmemo/`
- .tekmemo/memory/notes.md: "@tekbreed/oss" -> "@tekbreed/tekmemo" in the project-identity note

INTENTIONALLY KEPT as "TekBreed" (these reference the tekbreed ORG/legal entity, NOT the project name — do NOT rename):
- All 7 LICENSE files (root + tekmemo-adapter-openai/upstash/voyage, tekmemo-benchmark-kit, tekmemo-testing): "Copyright (c) 2026 TekBreed." = legal copyright holder.
- apps/docs/.vitepress/config.mts: `ariaLabel: "TekBreed on X"` — X handle is @tekbreed.
- apps/docs/.vitepress/theme/components/HeroVisual.vue:8: "official TekBreed logo" — brand asset comment.
- apps/docs/.vitepress/theme/custom.css:7: "/* TekBreed Brand Colors */" — design comment.

UNCHANGED (correct as-is, these are the real identifiers): GitHub repo github.com/tekbreed/tekmemo, npm scope @tekbreed/* (tekmemo, tekmemo-cli, tekmemo-mcp-server, adapters), docs domain docs.memo.tekbreed.com, cloud app memo.tekbreed.com, X @tekbreed.

Out of scope (left untouched): .tekmemo/snapshots/*.json still contain old "TekBreed OSS" text — these are immutable historical snapshots and must NOT be edited. docs/runbook.md still has stale file:// links pointing at the old local path /Users/codingsimba/Desktop/projects/oss/ (path bug, unrelated to brand rename).

Verification: repo grep for "TekBreed OSS" / "@tekbreed/oss" / "tekbreed-oss" in live (non-snapshot) files returns ZERO matches. Bare "TekBreed" returns exactly the 9 intentional org/legal/brand refs above.

## 2026-06-19T10:53:04.865Z — ADR 0001: AI SDK runtime delegates to the Tekmemo class
- kind: decision
- tags: ai-sdk, recall, runtime, architecture, adr
- confidence: 0.95
- source: assistant:zcode
- metadata: {"id":"mem_8dcc301c41886a23"}

Decision (ADR 0001, 2026-06-19): The AI SDK runtime now delegates to the Tekmemo class via `createAiSdkRuntimeFromTekmemo(memo: Tekmemo): TekMemoAiRuntime` (packages/tekmemo/src/ai-sdk/runtime/tekmemo-runtime.ts). Every runtime method (recall, readCoreMemory, updateCoreMemory, listNotes, createNote) delegates to the corresponding Tekmemo method, so recall ALWAYS flows through the intelligent hybrid engine (BM25 + fuzzy + embeddings + recency + reranker) — never a naive text search. The legacy `createLocalAiSdkRuntime({ workspace })` factory and local-runtime.ts were deleted (pre-launch, no backward-compat needed, zero internal consumers). `index()` is intentionally omitted from the runtime because Tekmemo has no public re-index API; the tool's index command throws a clear "not supported" error. The runtime is mode-agnostic — local, cloud, and hybrid Tekmemo instances all produce intelligent recall with no agent code change. Validated by packages/tekmemo/tests/ai-sdk/tekmemo-runtime.test.ts (8 tests green; headline test proves smart recall) and the full suites (tekmemo 386 passed, tekmemo-mcp-server 39 passed). Docs corrected across 4 files; runnable example at examples/ai-sdk/agent.ts.

## 2026-06-19T11:53:53.719Z — TekMemo OSS launch plan (locked 2026-06-19) — todos/5.md
- kind: decision
- tags: launch-plan, oss, beta, monetization, contributor, examples, roadmap, cloud-funnel, grill-with-docs
- confidence: 1
- source: assistant:zcode
- metadata: {"id":"mem_8187d5a6d8c59a88","sourceRefs":[{"sourceType":"document","path":"todos/0.md","title":"Original launch brief"},{"sourceType":"document","path":"todos/5.md","title":"Locked launch plan (authoritative)"}]}

TekMemo OSS launch plan LOCKED on 2026-06-19 via grill-with-docs skill (todos/0.md grilled to resolution; authoritative plan written to todos/5.md — where the two conflict, todos/5.md wins).

PHASING (Q2): Two-phase. Soft launch Mon Jun 22 (X + Discord only, "repo is contributor-ready"). Public launch Mon Jun 29 (immovable) across HN, Product Hunt, Reddit r/opensource + r/programming + r/LocalLLaMA, Dev.to, Hashnode, X. Jun 22-28 = 0.md §5 Day 1-7 content runway (Day1 Why AI memory is broken; Day2 Database-first vs file-first; Day3 Memory for agents; Day4 How TekMemo stores memory; Day5 Local-first infra; Day6 Countdown; Day7 Launch tomorrow).

SCOPE (Q1) = "credible repo landing" (Option A). IN: 4 governance docs, 4 examples, 6-8 good-first-issues, 1.0.0-beta.0 version cut, GitHub hygiene, tightened cloud funnel, 1 canonical tutorial. DEFERRED to 30-day runway: remaining 6 framework examples (LangGraph, Mastra, Express, Fastify, NestJS, CrewAI[Python-only]), remaining 4 tutorials, full 10-framework matrix, awesome-tekmemo repo, benchmark writeup. Rationale: 0.md lists ~60 deliverables; shipping all at quality by Jun 29 is not credible; deferred items are quality-sensitive work 0.md §7 already schedules post-launch.

Q3 CONTRIBUTOR FUNNEL: Author 6-8 good-first-issues from CONFIRMED backlog (not invented) — split ~3 docs/examples (Next.js example, transformer-adapter README, benchmark writeup) + ~3-4 code (config.schema.json recall block, CLI error-message polish, doc-accuracy pass). Ship GOOD_FIRST_ISSUES.md at root as index. Add 4 missing GitHub labels: security, performance, cli, mcp. Do NOT farm the full 15-20 from 0.md §2 — speculative issues rot.

Q4 VERSIONING: Ship 1.0.0-beta.0 via Changesets landing on/before Jun 29 (npm tag + GitHub release together). Why not alpha: undersells a working repo. Why not 1.0.0: AI SDK helpers / MCP factory / recall config still settling. GitHub hygiene batched Jun 29 MORNING before any public post (non-negotiable): (1) publish Release matching 1.0.0-beta.0; (2) supersede stale v0.2.0-beta (May 11) — mark older, don't delete; (3) fix repo description "TekBreed OSS" -> "File-first memory for AI applications and agents"; (4) set repo topics ai, memory, agents, mcp, local-first, rag. KNOWN INTENTIONAL TENSION: Jun 22 soft launch shows repo still on alpha.0 + stale description; Jun 29 public launch locks version + hygiene.

Q5 EXAMPLES (ship 4): (1) Vercel AI SDK agent — EXISTS examples/ai-sdk/agent.ts; (2) OpenAI Agents SDK — NEW, Tool wrapper over TekMemo; (3) Next.js API route — NEW, wraps AI SDK example in route handler; (4) MCP coding-agent setup — NEW, serves the stated USP (memory for daily coding agents), uses `tekmemo generate agent-rules` + Cursor/Claude Code config. QUALITY BAR: each must be runnable + tested + correct against real API — a broken example on its acquisition surface is net-negative. 4 excellent > 10 half-built.

Q6 GOVERNANCE DOCS (ship all 3 by Jun 22): ROADMAP.md = Now/Next/Later columns, NO DATES (Now: 1.0 stabilization + API freeze on Tekmemo client + AI SDK helpers + recall config schema; Next: hosted MCP endpoint + hosted vector recall/graph/evals; Later: framework integrations + Python SDK + benchmarks). GOVERNANCE.md = short ~40 lines honest solo-maintainer doc (maintainer Christopher Sesugh sole decider; decisions via ADR; path-to-maintainer criteria; COC contact) — NOT template cosplay. root CHANGELOG.md = single source of truth reconciling two conflicting sources (docs changelog.md wrongly dates alpha.0 as 2026-01-15; real npm publish was 2026-05): beta.0 entry 2026-06-29, backfilled alpha.0, older history collapsed to "Pre-alpha".

Q7 CLOUD FUNNEL: memo.tekbreed.com is LIVE (HTTP 200) and a waitlist CTA already exists in docs header. Action = COPY ONLY (no new infra): rewrite announcement bar + README cloud table so the line is explicit — core runtime = public beta (free, MIT, usable today) vs TekMemo Cloud = early access (separate waitlist). Avoid "two betas, is this stable?" blur. MANUAL CHECK Jun 22: confirm memo.tekbreed.com actually collects emails behind auth wall. Do NOT suppress CTA for launch — public launch day is peak free attention.

Q8 TUTORIALS: Ship ONE canonical by Jun 28 — "Build agent memory with the Vercel AI SDK" (narrative deep-dive of existing examples/ai-sdk/agent.ts; teaches context-first + tool-augmented pattern = TekMemo's differentiator). Lands Jun 28 to reflect final beta API. Remaining 4 tutorials (Chat/MCP/RAG/Multi-Agent) -> 0.md §7 weekly cadence weeks 2-5.

EXECUTION ORDER: Now-Jun22: governance docs, GOOD_FIRST_ISSUES + issues + labels, 3 new examples, cloud copy, announce X+Discord. Jun22-28: harden+test examples, write tutorial, publish Day1-7 content, cut beta.0. Jun29 morning: GitHub hygiene batch, then publish across all channels.
