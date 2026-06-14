# TekMemo — Reranking Package Plan

## 1. Why reranking needs its own package

Reranking should not live inside vector recall.

Vector recall finds candidate chunks.

Reranking improves the ordering of candidate chunks.

The flow is:

```txt
query
  -> embed query
  -> vector recall top 20-50
  -> rerank candidates
  -> return top 5-10
```

---

# 2. Required package: `@tekbreed/tekmemo/rerank`

## Purpose
Provider-neutral reranking contracts.

## Exports

```ts
export interface RerankDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface RerankInput {
  query: string;
  documents: RerankDocument[];
  topK?: number;
}

export interface RerankResult {
  id: string;
  text: string;
  score: number;
  rank: number;
  metadata?: Record<string, unknown>;
}

export interface Reranker {
  rerank(input: RerankInput): Promise<RerankResult[]>;
}
```

## Must include
- input validation
- deterministic fallback reranker
- score sorting helper
- stable rank assignment
- provider adapter contract tests

---

# 3. Provider packages

## `@tekbreed/tekmemo/rerank-voyage`

### Role
Default cloud beta reranker.

### Must support
- model config
- API key config
- topK
- result mapping
- metadata preservation
- BYOK

### Edge cases
- empty documents
- empty query
- topK larger than document count
- provider timeout
- provider rate limit
- invalid response
- result count mismatch
- duplicate document IDs

---

## `@tekbreed/tekmemo/rerank-cohere`

### Role
Later rerank provider for users who already use Cohere.

### Must support
- model config
- API key config
- topN/topK mapping
- document ID preservation
- BYOK

---

## `@tekbreed/tekmemo/rerank-jina`

### Role
Later rerank provider for users who prefer Jina or multilingual rerank options.

### Must support
- model config
- API key config
- topK
- result mapping
- BYOK

---

# 4. Implementation order

```txt
1. @tekbreed/tekmemo/rerank
2. @tekbreed/tekmemo/rerank-voyage
3. @tekbreed/tekmemo/rerank-cohere
4. @tekbreed/tekmemo/rerank-jina
```

---

# 5. Cloud beta recommendation

Use only:

```txt
@tekbreed/tekmemo/rerank
@tekbreed/tekmemo/rerank-voyage
```

Do not expose provider selection in Cloud beta.

Add BYOK settings later for Pro+.
