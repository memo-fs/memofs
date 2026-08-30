# @memofs/mcp-server

## Unreleased

*No changes yet.*

## 1.3.0-beta.3

### Minor Changes

- Added official Model Context Protocol Registry manifest metadata (`server.json`) for automated ecosystem discovery and subregistry indexing.
- Added `"mcpName": "dev.memofs/mcp-server"` package ownership verification property.
- Added multi-transport support documenting local stdio execution with environment variables (`MEMOFS_API_KEY`, `MEMOFS_RUNTIME`) and hosted Streamable HTTP remote endpoints.

## 1.3.0-beta.2

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.1

### Minor Changes

- Added optional anchor parameters to memory write tool definitions and stale indicators to recall tool output.
- Added outcome, ephemeral cleanup, and failure reason parameters to the agent session completion tool.

## 1.2.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.2

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.1

### Minor Changes

- Non-blocking HuggingFace model prewarming on server startup when `localEmbeddings` is enabled, eliminating cold-start latency on the first memory tool call.
- Progress updates output to `stderr` during initial model weight downloads (`[memofs] Downloading local embedding model weights...`).
- Increased default per-tool request timeout from 30s to 60s to prevent false timeout failures during first-time weight downloads on slower connections.

## 1.1.0-beta.1

### Patch Changes

- Updated internal dependencies.

## 1.0.0-beta.2

### Minor Changes

- Four memory tools: `context`, `recall`, `remember`, and `consolidate`.
- Six session tools for starting, reading, writing, appending, extracting, and completing agent sessions.
- Nine resources covering health, context, core memory, notes, recent memory, and graph nodes and edges.
- Configurable via runtime flags or environment variables, with a read-only mode.
