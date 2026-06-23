# Indexing and recall

"Recall" is how TekMemo converts static memory into useful context. Instead of passing an entire massive `notes.md` file to an LLM on every turn, recall searches for the most relevant fragments (chunks) and injects only those into the agent's context window.

## Local recall

Local recall runs entirely on your machine. It is **zero-config by default**: with no embedder and no API keys, it breaks `.tekmemo/` files into chunks and scores them against the query using BM25 + fuzzy matching.

For semantic matching with nothing leaving your machine, enable the **local ONNX embedder** (`recall.localEmbeddings`). The runtime lazy-loads
`@tekbreed/tekmemo-adapter-transformers` on the first recall, and `recall.engine: "auto"` upgrades retrieval to **hybrid** — lexical (BM25 + fuzzy) and vector (semantic) paths are merged, reranked, and weighted by recency and confidence. The vector path is an enhancement: if the embedder fails or the adapter is missing, recall and writes keep working on the lexical path.

| `recall.engine` | Retrieves by | Needs an embedder? |
| --- | --- | --- |
| `lexical` (default fallback) | BM25 + fuzzy keyword match | No |
| `vector` | semantic embeddings | Yes |
| `hybrid` | both, merged + reranked | Yes |
| `auto` (default) | `hybrid` when an embedder is present, else `lexical` | No (falls back to lexical) |

**Best for:**
- Short, simple projects (lexical-only works with zero config)
- Offline or private setups (local ONNX, no network after the first model download)
- Finding exact terms, file names, or package names (BM25)

## Provider-backed recall

Provider-backed recall uses semantic embeddings (vectors) to find context based on *meaning* rather than exact keywords, with no local model to load.

**How it works:**
1. Memory is chunked.
2. An embedding provider (like OpenAI or VoyageAI) converts the chunks into vectors.
3. The vectors are stored in a local recall index (`.tekmemo/indexes/chunks.jsonl`).
4. When a query is made, it is embedded and compared against the database.
5. A reranker (like Voyage Rerank) can optionally re-order the top results for maximum relevance.

**Best for:**
- Large codebases with extensive documentation
- Answering conceptual questions (e.g., "How does authentication work here?")

## Cloud recall

Cloud recall happens when you use TekMemo Cloud as your central memory repository. TekMemo Cloud handles the chunking, embedding, vector storage, and reranking automatically behind the scenes.

**Best for:**
- Teams sharing memory across different machines
- CI/CD pipelines that need access to memory
- Applications built on the TekMemo API

When you run `npx tekmemo cloud index`, the Cloud API detects any changes pushed from your machine and updates the vector indices in the background.
