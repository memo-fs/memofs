<p align="center">
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-adapter-openai"><img src="https://img.shields.io/npm/v/%40tekbreed%2Ftekmemo-adapter-openai?label=%40tekbreed%2Ftekmemo-adapter-openai&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp; 
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-adapter-openai"><img src="https://img.shields.io/npm/dm/%40tekbreed%2Ftekmemo-adapter-openai?style=for-the-badge" alt="npm downloads" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp; 
  <a href="https://docs.memo.tekbreed.com/packages/tekmemo/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

# `@tekbreed/tekmemo-adapter-openai`

## What is this?

**OpenAI Embedder adapter for TekMemo.** Provides first-class integration with OpenAI's embedding models (text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002) through TekMemo's provider-neutral embedder contract.

## Installation

```bash
npm install @tekbreed/tekmemo-adapter-openai
```

You also need an OpenAI API key from [platform.openai.com](https://platform.openai.com/).

## Quick Start

```ts
import { createOpenAIEmbedder } from "@tekbreed/tekmemo-adapter-openai";

const embedder = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-large",
});

// Embed a batch of texts
const result = await embedder.embed([
  "TekMemo provides unified memory runtime for AI agents",
  "OpenAI offers state-of-the-art embedding models",
]);

console.log(result.embeddings); // number[][]
console.log(result.usage);      // { promptTokens, totalTokens }
```

## Configuration

### Embedder Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | OpenAI API key |
| `model` | `string` | `"text-embedding-3-large"` | Embedding model to use |
| `dimensions` | `number` | model default | Output dimensions (for text-embedding-3 models) |
| `encodingFormat` | `"float" \| "base64"` | `"float"` | Output format for embeddings |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `batchSize` | `number` | `100` | Maximum texts per batch request |
| `organization` | `string` | — | OpenAI organization ID (optional) |

## Supported Models

| Model | Dimensions | Max Tokens | Use Case |
|-------|------------|------------|----------|
| `text-embedding-3-large` | 3072 (configurable) | 8191 | Highest quality |
| `text-embedding-3-small` | 1536 (configurable) | 8191 | Balanced quality/speed |
| `text-embedding-ada-002` | 1536 | 8191 | Legacy, cost-effective |

## Integration with TekMemo Core

```ts
import { bootstrapMemoryStore, createFsRecallStore } from "@tekbreed/tekmemo";
import { createOpenAIEmbedder } from "@tekbreed/tekmemo-adapter-openai";

const store = await bootstrapMemoryStore({ rootDir: "./.tekmemo" });

const embedder = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-large",
  dimensions: 1536, // Optional: reduce dimensions for speed
});

// Local-first persistent recall store backed by .tekmemo/indexes/embeddings.jsonl
const recallStore = createFsRecallStore({ store });

// Now use with TekMemo's memory operations
```

## Advanced: Custom Client

```ts
import { OpenAI } from "openai";
import { createOpenAIEmbedder } from "@tekbreed/tekmemo-adapter-openai";

const customClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: "https://custom-proxy.example.com/v1", // For proxies, Azure, etc.
  defaultHeaders: { "x-custom-header": "value" },
});

const embedder = createOpenAIEmbedder({
  client: customClient,
  model: "text-embedding-3-large",
});
```

## Testing

The package exports fake implementations for testing:

```ts
import { createFakeOpenAIClient } from "@tekbreed/tekmemo-adapter-openai/testing";

const fakeClient = createFakeOpenAIClient({
  embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
  usage: { promptTokens: 10, totalTokens: 10 },
});
```

## Boundary

This package owns the OpenAI embedder adapter implementation. It does not own the TekMemo core contracts, other provider adapters, or the OpenAI service itself.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT