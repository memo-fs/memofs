# @tekmemo/mcp-server

## 0.1.1

### Patch Changes

- Replace `any` types with proper TypeScript types across runtime helpers
- Updated dependencies
  - @tekmemo/cloud-client@0.1.1

## 0.1.0

Initial release.

- Model Context Protocol (MCP) boundary adapter for local, cloud, and hybrid TekMemo runtimes
- 28+ tool definitions covering memory, recall, sync, graph, extraction, and agent sessions
- MCP resources and prompts (recall context prompt, memory resource handlers)
- JSON-RPC protocol server with batch request support and input validation
- Output truncation, authorization policies, and request timeouts
- STDIO transport for CLI integration via `@modelcontextprotocol/sdk` (optional peer dependency)
- In-memory runtime for testing and development
