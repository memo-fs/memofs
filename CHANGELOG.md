# TekMemo Changelog

## 0.2.1

### @tekmemo/ai-sdk

**Patch Changes**
- Replace `any` types with proper TypeScript types across runtime helpers
- Updated dependencies
  - @tekmemo/cloud-client@0.1.1

### @tekmemo/graph

**Patch Changes**
- Replace `any` types with proper TypeScript types across runtime helpers

## 0.2.0

### @tekmemo/agentfs

**Minor Changes**
  - Fix error handling imports in README
  - Remove deprecated `external` tsdown option, use `deps.neverBundle`
  - Add release scripts (prepack, pack:dry-run, release:check)
  - Require Node.js >=22

**Patch Changes**
- Updated dependencies
  - tekmemo@0.2.0

### @tekmemo/ai-sdk

**Minor Changes**
  - Add agent session instructions and prepare-call memory helpers
  - Improve scope policy validation and recall filter creation
  - Require Node.js >=22

**Patch Changes**
- Updated dependencies
  - tekmemo@0.2.0

### @tekmemo/benchmark-kit

**Minor Changes**
  - Require Node.js >=22

### @tekmemo/fs

**Minor Changes**
  - Require Node.js >=22

**Patch Changes**
- Updated dependencies
  - tekmemo@0.2.0

### @tekmemo/graph

**Minor Changes**
  - Fix non-null assertion safety in temporal validity checks
  - Require Node.js >=22

### @tekmemo/openai

**Minor Changes**
  - Require Node.js >=22

### @tekmemo/recall

**Minor Changes**
  - Require Node.js >=22

### @tekmemo/rerank

**Minor Changes**
  - Require Node.js >=22

### @tekmemo/rerank-voyage

**Minor Changes**
  - Require Node.js >=22

**Patch Changes**
- Updated dependencies
  - @tekmemo/rerank@0.2.0

### @tekmemo/upstash-vector

**Minor Changes**
  - Remove deprecated `external` tsdown option, use `deps.neverBundle`
  - Require Node.js >=22

**Patch Changes**
- Updated dependencies
  - @tekmemo/recall@0.2.0

### @tekmemo/voyageai

**Minor Changes**
  - Require Node.js >=22

### tekmemo

**Minor Changes**
  - Add graph memory primitives: nodes, edges, JSONL persistence, rule-based extraction, temporal resolution, and path-finding
  - Improve validation and error types across all memory operations
  - Require Node.js >=22
  - Dual CJS/ESM output via tsdown

## 0.1.1

### @tekmemo/cli

**Patch Changes**
- Replace `any` types with proper TypeScript types across runtime helpers
- Updated dependencies
  - @tekmemo/cloud-client@0.1.1

### @tekmemo/cloud-client

**Patch Changes**
- Replace `any` types with proper TypeScript types across runtime helpers

### @tekmemo/mcp-server

**Patch Changes**
- Replace `any` types with proper TypeScript types across runtime helpers
- Updated dependencies
  - @tekmemo/cloud-client@0.1.1

## 0.1.0

### @tekmemo/adapters
Initial release.
- Convenience umbrella package with subpath re-exports for all TekMemo adapter packages
- Adapter registry with categories, descriptors, and import path maps
- Subpath exports: `agentfs`, `ai-sdk`, `cloud-client`, `openai`, `openai/testing`, `rerank-voyage`, `rerank-voyage/testing`, `upstash-vector`, `voyageai`, `voyageai/testing`
- Optional peer dependencies for `@upstash/vector`, `ai`, and `openai`

### @tekmemo/cli
Initial release.
- Production-grade CLI for TekMemo local and cloud memory management
- Local commands: `init`, `inspect`, `read`, `edit`, `remember`, `recall`, `diff`, `snapshot`, `validate`, `doctor`
- Cloud commands: health, read, write, recall, sync, context compose, graph operations, extraction, benchmarks, exports, snapshots, providers
- Agent session commands: `agent start`, `agent paths`, `agent extract`, `agent complete`
- Runtime modes: local, cloud, hybrid via `--runtime` flag
- JSON output mode with `--json` flag
- Buffered output with color support and `--no-color` option

### @tekmemo/cloud-client
Initial release.
- Project-scoped TekMemo Cloud API client with typed HTTP methods
- Memory CRUD: read core, update core, list notes, create notes
- Recall: query and index semantic memory
- Sync: push, pull, status, and conflict resolution
- Hybrid runtime with local-first, cloud-first, and cloud-only policies
- Structured error types with secret redaction

### @tekmemo/mcp-server
Initial release.
- Model Context Protocol (MCP) boundary adapter for local, cloud, and hybrid TekMemo runtimes
- 28+ tool definitions covering memory, recall, sync, graph, extraction, and agent sessions
- MCP resources and prompts (recall context prompt, memory resource handlers)
- JSON-RPC protocol server with batch request support and input validation
- Output truncation, authorization policies, and request timeouts
- STDIO transport for CLI integration via `@modelcontextprotocol/sdk` (optional peer dependency)
- In-memory runtime for testing and development

### @tekmemo/server
Initial release.
- Hono-based self-hostable TekMemo memory server
- Node.js subpath export with PostgreSQL job queue, S3 object storage, and local storage backends
- In-memory store implementation for testing
- Project-scoped REST API: health, projects, memory CRUD, recall, agent sessions
- Job queue for async operations (extraction, benchmarks, recall indexing)
