# @tekbreed/tekmemo

## 1.0.0-alpha.0

### Major Changes

- Initial release of `@tekbreed/tekmemo` — core memory runtime for agents and AI applications.

  - File-first durable memory model with `core.md`, `conversations.md`, and `notes.md` documents
  - `AgentFSSession` — transactional memory session with lease management and sync support
  - Full in-memory and filesystem-backed `MemoryStore` implementations
  - Chunking, semantic search, and recall pipelines
  - Knowledge graph with node/edge extraction, temporal fact resolution, and metadata filtering
  - Cloud client integration with sync pull/push, snapshot, and validation workflows
  - AI SDK adapter, OpenAI embedder, VoyageAI embedder, and Upstash Vector connector
  - Benchmark kit for performance regression testing
