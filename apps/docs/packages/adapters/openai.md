# OpenAI Adapter (`@memofs/adapter-openai`)

The OpenAI adapter provides vector embedding capabilities utilizing OpenAI's embeddings API endpoint.

---

## Installation

Install the adapter package in your workspace:

```bash
npm install @memofs/adapter-openai
```

---

## Usage

Use `createOpenAIEmbedder` to instantiate an embedder for the `Tekmemo` client:

```ts
import { Tekmemo } from "@memofs/core";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new Tekmemo({
  store: createNodeFsMemoryStore({ rootDir: "./.memofs" }),
  projectId: "openai-project",
  embedder: createOpenAIEmbedder({
    apiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small", // or text-embedding-3-large, text-embedding-ada-002
    dimensions: 1536, // Optional dimension configuration
  }),
});
```

---

## Configuration API (`OpenAIEmbedderConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | OpenAI API Key. Defaults to `process.env.OPENAI_API_KEY`. |
| `model` | `string` | No | Model name (default: `"text-embedding-3-small"`). |
| `dimensions` | `number` | No | Target output vector dimensions. |
| `baseUrl` | `string` | No | Optional API base URL override for proxy servers. |
