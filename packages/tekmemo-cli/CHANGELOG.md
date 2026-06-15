# @tekbreed/tekmemo-cli

## 1.0.0-alpha.0

### Minor Changes

- Initial alpha release of the TekMemo package family.

  **`@tekbreed/tekmemo`** — Core memory runtime for agents and AI applications.

  - File-first durable memory model with `core.md`, `conversations.md`, and `notes.md` documents
  - `AgentFSSession` — transactional memory session with lease management and sync support
  - Full in-memory and filesystem-backed `MemoryStore` implementations
  - Chunking, semantic search, and recall pipelines
  - Knowledge graph with node/edge extraction, temporal fact resolution, and metadata filtering
  - Cloud client integration with sync pull/push, snapshot, and validation workflows
  - AI SDK adapter, OpenAI embedder, VoyageAI embedder, and Upstash Vector connector
  - Benchmark kit for performance regression testing

  **`@tekbreed/tekmemo-cli`** — Full-featured CLI for TekMemo memory management.

  - `tekmemo init` — initialise a memory workspace
  - `tekmemo runtime read/remember/snapshot/validate` — local runtime commands
  - `tekmemo cloud *` — full suite of cloud commands (context, recall, sync, graph, exports, evals)
  - `tekmemo agent start/complete/extract/paths` — agent session lifecycle
  - `tekmemo search`, `tekmemo chunks`, `tekmemo diff`, `tekmemo doctor`, `tekmemo inspect`
  - JSON output envelope for machine-readable integration
  - Config file support (`tekmemo.config.ts`)

  **`@tekbreed/tekmemo-mcp-server`** — Model Context Protocol server for TekMemo.

  - Exposes TekMemo memory operations as MCP tools for LLM agents
  - `tekmemo-mcp` binary — drop-in stdio MCP server
  - Configurable runtime mode (`local`, `memory`, `cloud`, `hybrid`)
  - Requires `@modelcontextprotocol/sdk >=1.29.0`

### Patch Changes

- Updated dependencies
  - @tekbreed/tekmemo@1.0.0
