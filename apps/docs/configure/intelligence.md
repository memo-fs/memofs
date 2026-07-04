# Configure Intelligence

TekMemo utilizes a **4-role intelligence model** to power semantic search, knowledge graph construction, and automated memory consolidation. 

To maintain portability and zero-config defaults, every role features a **deterministic local fallback** that runs without requiring third-party API keys or external models.

---

## The 4-Role Intelligence model

The system isolates intelligence tasks into four separate, composable interfaces:

| Interface | Purpose | Local Fallback (Zero Config) | Enhanced Adapter |
|---|---|---|---|
| **`MemoryEmbedder`** | Computes vector representations for semantic search. | Local BM25 (Lexical) | [OpenAI](../packages/adapters/openai) / [Voyage](../packages/adapters/voyage) / [Transformers.js](../packages/adapters/transformers) |
| **`Reranker`** | Reorders recalled fragments by semantic relevance. | Lexical token-overlap | [Voyage AI](../packages/adapters/voyage) |
| **`Extractor`** | Builds the entity/relationship graph from prose. | Regex & rule-based parser | [OpenAI](../packages/adapters/openai) / [Workers AI](../packages/adapters/workers-ai) |
| **`LlmClient`** | General LLM completion transport for planning/cleanup. | Fallback logic (no-op/simple checks) | [OpenAI](../packages/adapters/openai) |

---

## The Deterministic Seam

If you do not inject an intelligence adapter, TekMemo does not fail; it falls back to the deterministic local engines:

- **No Embedder:** Recall runs BM25 lexical token matching and fuzzy edit-distance search.
- **No Extractor:** Graph building extracts entities based on keyword tags and markdown heading structures.
- **No LlmClient:** Memory consolidation runs rule-based formatting and deduplication without querying an LLM.

Injecting an adapter upgrades specific capabilities on top of these baselines.

---

## Configuration Example

```ts
import { Tekmemo } from "@tekmemo/core";
import { createOpenAIEmbedder, createOpenAiLlmClient } from "@tekmemo/adapter-openai";
import { createVoyageReranker } from "@tekmemo/adapter-voyage";

const memo = new Tekmemo({
  projectId: "agent-session",
  
  // Inject OpenAI for vector generation
  embedder: createOpenAIEmbedder({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  
  // Inject Voyage AI for ranking relevance
  reranker: createVoyageReranker({
    apiKey: process.env.VOYAGE_API_KEY,
  }),
  
  // Inject OpenAI LLM for graph extraction and consolidation
  llmClient: createOpenAiLlmClient({
    apiKey: process.env.OPENAI_API_KEY,
  }),
});
```
