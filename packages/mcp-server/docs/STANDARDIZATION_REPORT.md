# MCP Standardization Report

## Changed

- Added runtime mode vocabulary: `local`, `cloud`, `hybrid`, `memory`.
- Changed binary default from in-memory runtime to local `.tekmemo/` runtime.
- Added `createLocalTekMemoMcpRuntime` backed by `tekmemo` and `@tekmemo/fs`.
- Added `createCloudTekMemoMcpRuntime` backed by the real `@tekmemo/cloud-client` interface.
- Added `createHybridTekMemoMcpRuntime` for local+cloud use.
- Wired `tekmemo-mcp --runtime cloud` and `tekmemo-mcp --runtime hybrid` through `@tekmemo/cloud-client`.
- Added primary agent tool `tekmemo.context`.
- Added primary write tool `tekmemo.remember`.
- Kept `tekmemo.write_note` as a backward-compatible alias.
- Added memory resources: `tekmemo://memory/core`, `tekmemo://memory/notes`, `tekmemo://memory/recent`.
- Added `tekmemo.validate`, `tekmemo.snapshot`, and `tekmemo.update_core_memory`.
- Added read-only server option to block write tools.
- Updated docs for local, cloud, and hybrid architecture.

## Cloud client wiring

`@tekmemo/mcp-server` now depends on `@tekmemo/cloud-client` and delegates all Cloud API work to that package.

```txt
@tekmemo/mcp-server
  → @tekmemo/cloud-client
  → TekMemo Cloud API
```

MCP does not own raw endpoint URLs, API-key header construction, retry behavior, timeout behavior, response-envelope parsing, or typed cloud errors.

## Supported binary runtime modes

```bash
tekmemo-mcp --runtime local --root .
tekmemo-mcp --runtime memory
tekmemo-mcp --runtime cloud --cloud-url https://memo.tekbreed.com/api/v1
tekmemo-mcp --runtime hybrid --root . --cloud-url https://memo.tekbreed.com/api/v1
```

## Recommended next step

Make TekMemo Cloud implement the public API contract in `@tekmemo/cloud-client/docs/API_CONTRACT.md`, then run MCP cloud/hybrid integration tests against a local Cloudflare dev server.
