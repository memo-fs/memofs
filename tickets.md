# Tickets: Real E2E Simulation Harness — ADR 0021

> IMPLEMENTATION NOTE (2026-07-24): Per `docs/architecture/decisions.md` (gitignored internal) this was moved from `@memofs/testing/src/real` to private harness `@repo/e2e` at `tooling/e2e/` (private:true, never published). Code lives at `tooling/e2e/src/harness/*`, `src/msw/*`, `src/scenarios/*`, `src/sim/*`, `src/e2e/*.e2e.test.ts`. All checks below map 1:1 to that path. `pnpm --filter @repo/e2e test:e2e` → 79 passed, `pnpm e2e:release` wire, no CI regression.

## 60. Scaffold real harness foundations in @memofs/testing — DONE (moved to @repo/e2e)

- [x] `tooling/e2e/src/harness/core-harness.ts` creates tmpDir via `fs.mkdtemp`, real `createNodeFsStore`, real MemoFS client, `cleanup()` rm -rf, `snapshotFs()`, `assertFileExists()`
- [x] `tooling/e2e/src/index.ts` exports `createRealCoreHarness` + `RealHarness` type, no `node:fs` leak to main export
- [x] `tooling/e2e/tsdown.config.ts` entry, `package.json` private, treeshake true, exports `./real` equivalent via `@repo/e2e`
- [x] `tooling/e2e/vitest.e2e.config.ts` exists, include `src/e2e/**/*.e2e.test.ts`, timeout 300s, `pool:forks` `maxWorkers:1 isolate:false` (Vitest4 fix), `maxConcurrency:1`, MSW setup file `src/msw/setup.ts`
- [x] Scripts `test:e2e`, `test:e2e:live`, `msw:record`, root `e2e:release`, `e2e:release:live`, `e2e:record`, `e2e:core`, `e2e:simulation`; `@repo/e2e` `test:run` echo skip internal not CI
- [x] `.cache/e2e-models/` gitignored and build passes, `pnpm --filter @repo/e2e typecheck` pass
- [x] Demoable: core lifecycle 1 remember proves file-first truth — `.memofs/memory/*.md` exists after test

## 61. CLI real harness — DONE

- [x] `tooling/e2e/src/harness/cli-harness.ts` resolves `../../cli/dist/bin/memofs.mjs` via `node` spawn, cwd=tmpDir, env `MEMOFS_ROOT=tmpDir`, `MEMOFS_HOME`, `NO_COLOR=1`, captures stdout/stderr/exitCode, bin `memofs.mjs` not `memofs-cli.mjs`
- [x] `exec(['init','--no-input'])` creates `.memofs/` with manifest, not touching repo or home
- [x] `exec(['remember','fact'])` + `exec(['context','--json'])` returns parseable JSON containing fact, exit 0
- [x] Exit code assertions: invalid flag → non-zero, malformed `--metadata-json` → actionable error
- [x] Cross-visibility: after CLI remember, CoreRealHarness `search` in same tmpDir finds fact
- [x] Cleanup removes tmpDir even on spawn failure

## 62. MCP and Server real harnesses — DONE

- [x] `tooling/e2e/src/harness/mcp-stdio-harness.ts` launches real McpServer via `StdioClientTransport ^1.29.0` bin `memofs-mcp.mjs`, SDK Client lists tools (4 memory verbs + 6 AgentFS), resources, prompts
- [x] `callTool('memofs.context')` after CLI remember in same tmpDir returns fact
- [x] AgentFS `start, write, append, read, extract, complete` works; traversal `../../outside` fails without touching outside; writable requires `/working/` or `/output/`
- [x] Read-only guard: `MEMOFS_MCP_READ_ONLY=true` causes write tools to fail, read tools pass, files unchanged
- [x] `tooling/e2e/src/harness/mcp-http-harness.ts` and `server-harness.ts` boot Node http on random free port, json-rpc fetch proves `memory.write` + `recall`, `concurrencyLayer {acquire: async (_,fn)=>fn()}`
- [x] Cleanup kills child process + removes tmpDir

## 63. Adapter real harnesses — DONE

- [x] `tooling/e2e/src/harness/turso-harness.ts` creates `file:<tmpDir>/test.db`, real libSQL client via `adapter-turso`, `ensureSchema`, write persists across restart, passes `defineMetadataStoreContractTests`
- [x] `tooling/e2e/src/harness/r2-harness.ts` via file bucket bound R2 bucket construction (Miniflare subject to API change), real `adapter-r2` put/get/list, passes `defineBlobClientContractTests`
- [x] `tooling/e2e/src/harness/transformers-harness.ts` tiny quantized `Xenova/all-MiniLM-L6-v2` 384-dim, cacheDir `.cache/e2e-models`, offline cache, batch order, validation
- [x] `tooling/e2e/src/harness/openai-harness.ts`, `voyage-harness.ts` real adapter code deterministic MSW
- [x] File-first truth: `.memofs/` files after adapter write, snapshotFs captures layout
- [x] Cross-visibility: adapter write visible to core harness same tmpDir

## 64. MSW recorded fixture layer + connector harness + remote adapter MSW — DONE

- [x] `msw ^2.7.0` devDep, `tooling/e2e/src/msw/server.ts` `setupServer(...handlers)`, per-test start/stop
- [x] Handlers `github.ts` `notion.ts` intercept `api.github.com/graphql`, `api.notion.com/v1/databases/:id/query` + `/search` → fixtures sanitized RUN_ID `0021-*`, secret redacted `test-token-***`
- [x] Handlers `openai.ts` `voyage.ts` return `fixtures/openai/embed.json` 384-dim deterministic `generateEmbedding(dim,seed)` sin/cos 6-decimals + rerank fixture, regex `/\/embeddings$/`
- [x] `tooling/e2e/src/msw/record.ts` reads dotenv keys, hits real APIs once, redacts Authorization to `test-token-***`, writes fixtures, no secret in logs
- [x] `tooling/e2e/src/harness/connector-harness.ts` runs real `@memofs/connectors` runner against MSW: first run ingests, second skips unchanged, `connectors.json` contains opaque `secretRef` never raw token
- [x] OpenAI/Voyage adapters via real code + MSW pass contract tests, error messages don't leak token
- [x] Live opt-in: `MEMOFS_E2E_LIVE=1` path

## 65. Scenarios — DONE

- [x] `tooling/e2e/src/scenarios/lifecycle.ts` — CLI init --no-input → core 20 remembers → search paraphrase → context --json → consolidate preview+apply, asserts file count, manifest.json, memory-events.jsonl, no data loss, graph dedup, RUN_ID `test-run-e2e-0021-lifecycle-*`
- [x] `tooling/e2e/src/scenarios/agentfs-interleaved.ts` — AgentFS start/write/append/read/extract/complete + memory remember interleaved, session files under `.memofs/agent-sessions/<id>/working/` + `.memofs/` attribution
- [x] `tooling/e2e/src/scenarios/connectors-merge.ts` — MSW GitHub/Notion ingest + local memory merge + dedup + source attribution, second run idempotent
- [x] `tooling/e2e/src/scenarios/failure-recovery.ts` — kill mid-write partial `.tmp`, corrupt core.md + corrupt manifest + doctor `--json` + validate `--json`, MSW 500/latency, no silent data loss, error redacted
- [x] `tooling/e2e/src/scenarios/golden-snapshots.ts` — asserts exact `.memofs/` layout after each scenario (file list + content hash UUID→`<id>` keep duplicates sorted, `minFileCount floor*0.8`, allowedPrefixes `.memofs/`,`agent-sessions/`,`.cache/`), snapshot files `scenarios/__snapshots__/` 8 json (lifecycle, agentfs-interleaved, connectors-merge, failure-recovery, golden-snapshots, orchestrator, seeded-loop, simulation)
- [x] Each scenario proves contract superset + file-first truth + cross-visibility, validates strict no leak

## 66. Seeded loop simulation + orchestrator full cross-visibility proof — DONE

- [x] `tooling/e2e/src/sim/seeded-loop.ts` `hashStringToSeed`+`mulberry32('memofs-e2e-0021')` avoids seedrandom dep, 50-100 turns `floor(rng()*51)+50`, random actions: remember/recall/search/context/agentfs_write/consolidate weighted 0.4/0.2/0.1/0.1/0.1/0.1, budgets MAX_TURNS 100 MAX_FILES 500 MAX_CONSOLIDATIONS 5, FACT_POOL 20 seeded-*, QUERY_POOL 15, activeSessionId reuse, ends with validate pass, no data loss, no file leak allowedPrefixes
- [x] `tooling/e2e/src/sim/orchestrator.ts` single tmpDir composition `createBaseTmpDir` single source: CLI init → connectors ingest MSW → MCP remember → core recall → server serve → AgentFS → consolidate preview applied=false + apply → failure injection → doctor, proving cross-visibility at each step
- [x] After orchestrator, file-first truth: `.memofs/memory/*.md`, `manifest.json`, `memory-events.jsonl`, `chunks/`, `agent-sessions/` exist, readable, golden snapshot `orchestrator.json` 39 files 7332B, `seeded-loop.json` 24 4393B
- [x] Cross-visibility full proof: `crossVisibilityFull` derived not hardcoded, write via CLI visible to core, MCP, server same tmpDir
- [x] Contract superset: real impls still satisfy contract tests after full run
- [x] Demoable: `pnpm --filter @repo/e2e test:e2e` runs orchestrator + seeded loop 79 passed

## 67. E2E suite wiring, docs, release gate — DONE

- [x] `tooling/e2e/src/e2e/core.e2e.test.ts` CoreRealHarness lifecycle 3 tests
- [x] `tooling/e2e/src/e2e/cli.e2e.test.ts` CliRealHarness spawn proof 7 tests
- [x] `tooling/e2e/src/e2e/mcp.e2e.test.ts` stdio + http harness `createRealCoreHarness` direct import no barrel
- [x] `tooling/e2e/src/e2e/server.e2e.test.ts` server harness
- [x] `tooling/e2e/src/e2e/adapters.e2e.test.ts` Turso file + R2 + Transformers + OpenAI/Voyage via MSW
- [x] `tooling/e2e/src/e2e/connectors.e2e.test.ts` connector harness via MSW, direct `msw/handlers/github` imports not barrel
- [x] `tooling/e2e/src/e2e/remote-adapters.e2e.test.ts` no `../index` barrel, direct `../harness/openai-harness` + `../msw/handlers/openai`, `voyage-harness` + `voyage` handler
- [x] `tooling/e2e/src/e2e/scenarios.e2e.test.ts` direct scenario imports not `../scenarios/index` barrel
- [x] `tooling/e2e/src/e2e/simulation.e2e.test.ts` full orchestrator + seeded loop
- [x] `vitest.e2e.config.ts` runs only these, timeout 300s, `pnpm --filter @repo/e2e test:e2e` 79 passed locally cached, `MEMOFS_E2E_LIVE=1 pnpm test:e2e:live` one live call per adapter else skips
- [x] `tooling/typescript/package.json` exports `./base.json` fix for TS hover `File '@repo/typescript/base.json' not found`, `tooling/e2e/src/**/*.ts` no `.js` extensions, `from "../index"` barrel removed, `biome check` 0 errors, `typecheck` 30 packages pass
- [x] Internal docs `docs/architecture/decisions.md` + `docs/manual-e2e-go-live.md` document `@repo/e2e` private, public docs intentionally NOT documenting it per gitignore rule
- [x] No CI regression: `turbo.json` `test:run` excludes `vitest.e2e.config.ts`, `@repo/e2e` `test:run` echo skip internal not CI, fast path <5min, `pnpm build` + `publint` pass, root scripts `e2e:release`, `e2e:release:live`, `e2e:record`, `e2e:core`, `e2e:simulation`
