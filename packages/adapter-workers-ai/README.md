# `@tekmemo/adapter-workers-ai`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekmemo/adapter-workers-ai"><img src="https://img.shields.io/npm/v/%40tekmemo%2Fadapter-workers-ai?label=%40tekmemo%2Fadapter-workers-ai&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@tekmemo/adapter-workers-ai"><img src="https://img.shields.io/npm/dm/%40tekmemo%2Fadapter-workers-ai?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Cloudflare Workers AI extractor adapter for TekMemo.

## What is this?

**Cloudflare Workers AI frontier extractor adapter for TekMemo.** Implements
core's provider-neutral `Extractor` contract against a Cloudflare Workers AI
binding (`env.AI`), extracting subject–predicate–object facts into the memory
graph.

## Installation

```bash
npm install @tekbreed/tekmemo-adapter-workers-ai
```

Peer dependency: `@cloudflare/workers-types` (for the `Ai` binding type).

## Quick Start

```ts
import { createWorkersAiExtractor } from "@tekbreed/tekmemo-adapter-workers-ai";

const extractor = createWorkersAiExtractor({ ai: env.AI });

// Pass it to the Tekmemo runtime:
// new Tekmemo({ store, projectId, mode: "local", extractor, ... })
```

## Resilience

The adapter parses the model's output **defensively**: malformed JSON, missing
fields, or unknown relation types are dropped (never thrown). A failed
extraction returns an empty `{ nodes, edges }`, so the write fan-out stays
resilient — and the rule-based extractor remains available as the fallback when
no `Ai` binding is configured.

## Boundary

This package owns the Workers AI extractor adapter implementation. It does not
own the TekMemo core `Extractor` contract, other adapters, or the Workers AI
service itself.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development
scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
