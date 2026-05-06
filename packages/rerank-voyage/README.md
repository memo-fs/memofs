# `@tekmemo/rerank-voyage`

[![npm](https://img.shields.io/npm/v/%40tekmemo%2Frerank-voyage?label=npm)](https://www.npmjs.com/package/@tekmemo/rerank-voyage)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-preview-orange)](../../README.md)

Voyage AI reranking adapter for TekMemo.

This package implements the provider-neutral `Reranker` interface from `@tekmemo/rerank`.

## Install

```bash
pnpm add @tekmemo/rerank @tekmemo/rerank-voyage
```

## Usage

```ts
import { createVoyageReranker } from "@tekmemo/rerank-voyage";

const reranker = createVoyageReranker({
  apiKey: process.env.VOYAGE_API_KEY!,
  model: "rerank-2.5-lite"
});

const results = await reranker.rerank({
  query: "memory architecture",
  documents: [
    { id: "doc_1", text: "TekMemo starts from .tekmemo files." },
    { id: "doc_2", text: "Billing is cloud-only." }
  ],
  topK: 1
});
```

## Boundary

This package only calls Voyage reranking.

It does not own:

- vector recall
- embeddings
- `.tekmemo/` protocol
- billing
- cloud BYOK encryption
- tenant/provider routing
