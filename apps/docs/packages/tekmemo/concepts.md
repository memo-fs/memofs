# Core concepts

## Core memory

Core memory is the stable project briefing. It should contain the facts an AI assistant should know every time it works in the project.

## Notes memory

Notes are durable records such as decisions, constraints, preferences, references, summaries, and general notes.

## Events

Events record changes over time. They make sync, audit, and agent workflows easier to inspect.

## Recall

Recall turns memory into searchable context. Local recall can be keyword-based. Cloud or provider-backed recall can use vector search and reranking.

## Graph memory

Graph memory stores entities and relationships. It helps answer questions like “what depends on this?” or “how are these two decisions connected?”

## Context package

A context package is the structured payload sent to an AI model or tool. It can combine core memory, notes, recall results, graph context, and source metadata.

## Package architecture

TekMemo is published as three main packages:
- `@tekbreed/tekmemo` (the core runtime containing the filesystem store, graph memory, vector adapters, and API modules)
- `@tekbreed/tekmemo-cli` (the CLI distribution)
- `@tekbreed/tekmemo-mcp-server` (the MCP server)

When writing code to integrate TekMemo, you import everything directly from the core `@tekbreed/tekmemo` package. See the [API Reference](/api/tekmemo/) page for the list of modules and helper APIs.
