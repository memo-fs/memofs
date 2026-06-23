# Installation

TekMemo is published as three packages: the core runtime, the CLI, and a self-hostable MCP server. (A hosted cloud-only MCP endpoint is also available with no install — see [MCP](../mcp/).)

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

## MCP

There are two ways to expose TekMemo to MCP-compatible agents (like Claude Code or Cursor):

- **Hosted server (cloud-only)** — no package to install. Point your client at `https://mcp.memo.tekbreed.com/` with a bearer token. See [Hosted MCP](../mcp/hosted).
- **Self-hosted stdio server** — install the package for file-first `local`, `cloud`, or `hybrid` memory:

```bash
npm install -D @tekbreed/tekmemo-mcp-server
```

See the [MCP guide](../mcp/) for choosing between the two and [Client setup](../mcp/client-setup) for per-client config.

## Optional Peer Dependencies

Depending on which features you use, you may need to install one or more peer dependencies:

| Feature | Dependency | Install Command |
| --- | --- | --- |
| **Vercel AI SDK integration** | `@tekbreed/tekmemo-adapter-ai-sdk`, `ai` | `npm install @tekbreed/tekmemo-adapter-ai-sdk ai` |
| **Voyage AI embeddings/reranking** | `@tekbreed/tekmemo-adapter-voyage`, `voyageai` | `npm install @tekbreed/tekmemo-adapter-voyage voyageai` |
| **OpenAI embeddings** | `@tekbreed/tekmemo-adapter-openai`, `openai` | `npm install @tekbreed/tekmemo-adapter-openai openai` |
| **Local zero-API-key embeddings** | `@tekbreed/tekmemo-adapter-transformers` | `npm install @tekbreed/tekmemo-adapter-transformers` |
| **MCP client setup** (e.g. for custom scripts) | `@modelcontextprotocol/sdk` | `npm install @modelcontextprotocol/sdk` |

## Supported Package Managers

The `@tekbreed/tekmemo` package works out of the box with npm, pnpm, Yarn, and Bun.
