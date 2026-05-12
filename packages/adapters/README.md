# `@tekmemo/adapters`

Convenience package for TekMemo adapter imports.

The core `tekmemo` package stays provider-neutral and does not depend on AI SDK, vector store, embedding, rerank, or cloud transport packages. `@tekmemo/adapters` is the optional aggregation package for apps that want one install target and predictable adapter import paths.

## Install

```bash
npm install @tekmemo/adapters
```

Install external peers only for the adapter subpaths you use:

```bash
# AgentFS session workspace adapter
npm install @tekmemo/adapters @tekmemo/agentfs tekmemo

# AI SDK tools
npm install @tekmemo/adapters ai tekmemo @tekmemo/fs

# OpenAI embedding adapter
npm install @tekmemo/adapters openai

# Upstash Vector recall adapter
npm install @tekmemo/adapters @upstash/vector
```

VoyageAI adapters use HTTP/fetch and do not require a provider SDK package.

## Usage

Import implementation APIs from subpaths:

```ts
import { createTekMemoAgentSession } from "@tekmemo/adapters/agentfs";
import { defineTekMemoTools } from "@tekmemo/adapters/ai-sdk";
import { createVoyageEmbedder } from "@tekmemo/adapters/voyageai";
import { createOpenAIEmbedder } from "@tekmemo/adapters/openai";
import { createUpstashRecallStore } from "@tekmemo/adapters/upstash-vector";
import { createVoyageReranker } from "@tekmemo/adapters/rerank-voyage";
import { createTekMemoCloudClient } from "@tekmemo/adapters/cloud-client";
```

The root import is metadata-only:

```ts
import { adapterImportPaths, tekMemoAdapters } from "@tekmemo/adapters";
```

This design prevents the root import from loading optional peer dependencies such as `ai`, `openai`, or `@upstash/vector`.

## Reexported subpaths

| Import path | Reexports |
| --- | --- |
| `@tekmemo/adapters/agentfs` | `@tekmemo/agentfs` |
| `@tekmemo/adapters/ai-sdk` | `@tekmemo/ai-sdk` |
| `@tekmemo/adapters/cloud-client` | `@tekmemo/cloud-client` |
| `@tekmemo/adapters/openai` | `@tekmemo/openai` |
| `@tekmemo/adapters/openai/testing` | `@tekmemo/openai/testing` |
| `@tekmemo/adapters/upstash-vector` | `@tekmemo/upstash-vector` |
| `@tekmemo/adapters/voyageai` | `@tekmemo/voyageai` |
| `@tekmemo/adapters/voyageai/testing` | `@tekmemo/voyageai/testing` |
| `@tekmemo/adapters/rerank-voyage` | `@tekmemo/rerank-voyage` |
| `@tekmemo/adapters/rerank-voyage/testing` | `@tekmemo/rerank-voyage/testing` |

## Package boundary

`@tekmemo/adapters` depends on first-party adapter packages. The core `tekmemo` package does not depend on `@tekmemo/adapters`.
