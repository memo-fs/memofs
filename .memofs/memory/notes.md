# Notes

Use this file for lower-confidence notes, observations, and working memory.

## 2026-07-18T06:20:17.544Z — resolveSchemaPath: emit portable ./node_modules ref instead of computed relative path
- kind: decision
- tags: cli, config, schema, portability, bug-fix
- confidence: 0.95
- source: memofs
- metadata: {"id":"mem_b33e8c27403afeac","sourceRefs":[{"sourceType":"document","path":"packages/cli/src/config/runtime.ts","title":"resolveSchemaPath implementation"},{"sourceType":"document","path":"packages/cli/tests/config-schema.test.ts","title":"resolveSchemaPath tests"},{"sourceType":"document","path":"apps/docs/packages/cli/index.md","title":"docs $schema example"}]}

resolveSchemaPath (packages/cli/src/config/runtime.ts) was rewritten. The previous implementation called `require.resolve("@memofs/cli/schema/config.json")` and then `path.relative(rootDir/.memofs, resolvedFile)`. Inside the MemoFS monorepo, `@memofs/cli` is a workspace symlink under `node_modules/@memofs/cli -> ../../packages/cli`, and `require.resolve` follows the symlink to the *source* path `packages/cli/schema/config.json` — which lives outside the consumer's project root. `path.relative` then climbs past the root and emits non-portable paths like `../../packages/cli/schema/config.json` or even `../../../Users/.../packages/cli/schema/config.json`.\n\nNew strategy: emit a deterministic, portable `./node_modules/@memofs/cli/schema/config.json` reference (the value the docs advertise) when that file exists under `<rootDir>`; otherwise fall back to the hosted URL `https://memofs.dev/schema/config.json`. `existsSync` follows symlinks, so for npm/pnpm/yarn installs (including workspace symlinks under `node_modules/`) the canonical ref is emitted. For global installs / stripped bundles, the hosted URL keeps editor validation working.\n\nRemoved the now-unused `locateSchemaFile` helper (and `createRequire` / `fileURLToPath` imports). Added `tests/config-schema.test.ts` with 4 tests covering: (1) canonical ref when schema is installed under root, (2) hosted URL fallback when it isn't, (3) regression test that the emitted string never contains `..` (catches the upward-climbing bug), (4) sanity that the packaged schema file used as symlink target actually exists. All 200 CLI tests pass; typecheck + biome clean.

## 2026-07-20T06:31:20.188Z — Hosted MCP + hybrid-mode docs rewritten
- kind: summary
- tags: docs, mcp, mcp-server, cloud, hosted-mcp, hybrid-mode
- confidence: 0.85
- source: opencode
- metadata: {"id":"mem_10a31100999f0f7e"}

Docs improvement for apps/docs/packages/mcp/hosted-mcp-endpoint.md and hybrid-mode.md (Jul 2026):

Both pages were 21–22 line stubs with ambiguities. Rewrote with verified facts from the cloud app (`memofs-cloud`) and the `@memofs/mcp-server` source:

Hosted MCP endpoint (POST /api/v1/projects/:projectId/mcp):
- Free plan = 0 req/min (endpoint locked, returns 402 with limit: external_api). Pro = 60/min, Teams = 300/min, keyed per API key. Entry at src/.server/api/mcp/index.ts.
- Check order: user auth (401) → entitlement (402) → rate limit (429) → project ownership (403/404) → MCP protocol (JSON-RPC).
- Only the 4 memory verbs (context/recall/remember/consolidate) are exposed — AgentFS session tools, graph/raw resources, prompts are NOT available over HTTP and return `MCP_VALIDATION_ERROR "Runtime does not support X"`.
- Read-only keys: context/recall succeed; remember/consolidate fail with MCP authorization error. Read-write: all 4.
- Write attribution: writer field server-stamped from the key's label (tool schema has no writer input → clients can't forge). Each write = one memory_events row.
- Dashboard Memory page = source of truth for exact project URL + per-client snippets (Claude Code `claude mcp add --transport http`, Cursor `.cursor/mcp.json`, VS Code `.vscode/mcp.json`). VS Code uses `servers` top-level key + explicit `"type"` — silently ignored if you use `mcpServers`.
- Project must exist via `memofs push` first — no auto-provision on MCP read/write; 404 otherwise.

Hybrid mode (`--runtime hybrid`):
- Local stdio server (same as local mode) that ALSO mirrors to cloud replica at `--cloud-url`.
- Required flag addition: `--cloud-url <url>`; API key via MEMOFS_API_KEY env block (never inline args).
- Reads: local .memofs/ first; writes: local .memofs/ + cloud replica. Other machines pick up writes via `memofs pull` or `memofs sync` (NOT auto-pushed to all machines).
- Read-only keys enforce only context/recall; remember/consolidate fail with MCP auth error.
- --project-id optional (defaults to key's default workspace project). --root required only for global/app-scoped configs.

Cross-links: index.md See Also now links both child pages. `biome check` ignores apps/docs (markdown not in biome config) — no lint check needed.

Don't track these as code; they're public-facing docs (apps/docs is tracked in git — check `.gitignore` to confirm).
