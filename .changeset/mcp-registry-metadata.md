---
"@memofs/mcp-server": patch
---

# @memofs/mcp-server — Official MCP Registry Metadata and Package Verification

- Added `server.json` manifest conforming to the official Model Context Protocol Registry (`registry.modelcontextprotocol.io`) schema (`2025-12-11`).
- Added `"mcpName": "dev.memofs/mcp-server"` to `package.json` for registry namespace package ownership verification.
- Configured multi-transport support documenting local stdio execution with environment variables (`MEMOFS_API_KEY`, `MEMOFS_RUNTIME`) and hosted Streamable HTTP remote endpoints (`https://memofs.dev/api/v1/projects/{projectId}/mcp`).
- Included `server.json` in published package distribution files.
