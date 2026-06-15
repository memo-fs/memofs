# Installation

TekMemo is published as three main packages: the core runtime, the CLI distribution, and the MCP server.

## Core Runtime

To integrate TekMemo's memory runtime into your application, install the core package:

```bash
npm install @tekbreed/tekmemo
```

## CLI

To manage your memory folders and run local/cloud/hybrid commands, install the CLI:

```bash
npm install -D @tekbreed/tekmemo-cli
```

## MCP Server

To expose TekMemo memory to MCP-compatible agents (like Claude Code or Cursor), install the MCP server:

```bash
npm install -D @tekbreed/tekmemo-mcp-server
```

## Optional Peer Dependencies

Depending on which features you use, you may need to install one or more peer dependencies:

| Feature | Dependency | Install Command |
| --- | --- | --- |
| **Vercel AI SDK integration** | `ai` | `npm install ai` |
| **OpenAI embeddings/chat** | `openai` | `npm install openai` |
| **Upstash Vector recall** | `@upstash/vector` | `npm install @upstash/vector` |
| **MCP client setup** (e.g. for custom scripts) | `@modelcontextprotocol/sdk` | `npm install @modelcontextprotocol/sdk` |

## Supported Package Managers

The `@tekbreed/tekmemo` package works out of the box with npm, pnpm, Yarn, and Bun.
