### Hybrid Recall Architecture

Memo FS retrieves context from three parallel retrieval channels:

1. **Vector Channel:** Semantic search utilizing the configured `MemoryEmbedder` (e.g. Voyage, OpenAI, or local ONNX). This handles conceptual similarity where keyword matching fails.
2. **Lexical Channel (BM25):** Full-text search over exact terms, ensuring highly specific keywords, error messages, and filenames are precisely matched.
3. **Fuzzy Channel:** Character-level edit distance matching to handle spelling mistakes, syntax fragments, and name variations.

Results are normalized and combined using Reciprocal Rank Fusion (RRF) to select the most relevant memory records for the agent context.
