# Architecture

TekMemo is designed around inspectable memory boundaries.

## Layers

1. **Memory contracts** — Core types, schemas, and runtime helpers (`tekmemo`)
2. **Local filesystem** — File-backed storage adapter (`@tekmemo/fs`)
3. **Recall and providers** — Embedding, vector search, and reranking adapters
4. **Graph memory** — Entities and relationships (`@tekmemo/graph`)
5. **Cloud client** — TekMemo Cloud API transport (`@tekmemo/cloud-client`)
6. **Integrations** — CLI, MCP server, and AI SDK tool helpers
