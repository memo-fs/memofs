# `@tekmemo/openai`

[![npm](https://img.shields.io/npm/v/%40tekmemo%2Fopenai?label=npm)](https://www.npmjs.com/package/@tekmemo/openai)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-active-brightgreen)](../../README.md)

Production-ready OpenAI embedding adapter for TekMemo.

This package is intentionally **provider-specific** and **BYOK-ready**. It accepts an OpenAI API key from the host application and does not store secrets.

## Install

```bash
pnpm add @tekmemo/openai
```

`@tekmemo/openai` uses the official `openai` SDK for production API calls and keeps a small injectable embeddings-client interface for tests and custom hosts.

## Quickstart

```ts
import { createOpenAIEmbedder } from "@tekmemo/openai";

const embedder = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-small",
  dimensions: 1024
});

const result = await embedder.embedTexts({
  texts: ["TekMemo is file-first memory infrastructure."]
});
```

## Recommended TekMemo defaults

For most TekMemo recall flows:

```ts
createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-small",
  dimensions: 1024
});
```

OpenAI's embedding guide says `text-embedding-3-small` defaults to 1536 dimensions and `text-embedding-3-large` defaults to 3072 dimensions, and the `dimensions` parameter can reduce those vector sizes for compatible v3 embedding models.

## BYOK

```ts
createOpenAIEmbedder({
  apiKey: userProvidedOpenAIKey,
  model: "text-embedding-3-small"
});
```

The package does not persist, encrypt, or log keys. TekMemo Cloud BYOK storage belongs in closed-source cloud code.

## Production features

- official OpenAI SDK client for embeddings
- BYOK-ready config
- model and dimension validation
- batch splitting
- SDK retry/timeout support
- response shape validation
- embedding count validation
- finite-number vector validation
- fake OpenAI client for unit tests

## What this package does not own

- `.tekmemo/` file protocol
- vector storage
- recall store contracts
- reranking
- billing
- cloud BYOK encryption
- tenant/provider routing
