# Architecture

TekMemo is designed around inspectable memory boundaries.

## Layers

1. **Memory contracts** — Core types, schemas, and runtime helpers (`@tekbreed/tekmemo`)
2. **Local filesystem** — File-backed storage adapter module
3. **Recall and providers** — Embedding, vector search, and reranking adapters
4. **Graph memory** — Entities and relationships module
5. **Cloud client** — TekMemo Cloud API transport module
6. **Integrations** — Standalone CLI (`@tekbreed/tekmemo-cli`), MCP server (`@tekbreed/tekmemo-mcp-server`), and AI SDK tool helpers
