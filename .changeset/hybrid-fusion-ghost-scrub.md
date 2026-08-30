---
"@memofs/core": minor
---

# @memofs/core — Working hybrid fusion, per-memory reranking, and legacy ghost-chunk scrub

- Fused the hybrid recall merge: lexical and vector candidate sets now join by memory id, so a memory surfaced by both retrieval paths scores as one candidate with a gated double-hit bonus (`0.6·v + 0.4·l + 0.25·min(v,l)`, clamped to 1) instead of two half-scored siblings. Single-path hits pass through with the dynamic weight collapse to a full-weight single path.
- Consolidated reranker input to one candidate per memory (best-chunk evidence), so a memory chunked into N pieces gets exactly one recall list entry carrying the strongest chunk's text and merged metadata.
- Added `HYBRID_SCORING_DEFAULTS` and `HYBRID_SINGLE_PATH_WEIGHTS` as frozen, named single-source-of-truth constants for every tuning literal in the scoring path.
- Added a one-time maintenance scrub on first hydration: embedding rows whose `sourceId` predates recall-document identity unification (write timestamps instead of memory ids) are dropped once, recorded via the new optional `maintenance.legacyEmbeddingsScrubbedAt` manifest timestamp so the pass never repeats. The scrub is bounded to `note`-source rows, never touches connector or document indexes, and fails closed (no-op, flag unset) when no memory ids could be hydrated.
- Added optional, feature-detected `listDocuments()` to the `RecallStore` port (implemented by the in-memory and file-backed stores) to enumerate embedding rows without loading embeddings.
