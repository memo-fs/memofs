# `LlmClient` — a provider-neutral LLM core interface (distinct from `Extractor`)

**Status:** accepted (2026-06-29).

Core gains a fourth provider-neutral contract, **`LlmClient`**, alongside
`MemoryEmbedder`, `Reranker`, and `Extractor`. It is the transport primitive the
LLM-enhanced intelligence features consume: the retrieval strategist (Q23
rewrite/resolve/filter/budget), writer-critic consolidation (Q25a), staleness
re-verification (Q24 v1.x), and semantic consolidation (Q25a). Each of those
features already locks a "deterministic default + adapter-enhanced" seam;
`LlmClient` is the *adapter* half of that seam — the deterministic default runs
when no `LlmClient` is configured.

`Extractor` stays its own contract. Extraction is a *domain* operation (grow the
graph: `extract({ text }) → { nodes, edges, contradictions }`), not a *transport*
operation (call an LLM). `LlmClient` is the transport. A provider adapter's
`Extractor` impl composes an `LlmClient` internally, but the two contracts stay
separate — the same relationship `RemoteBlobMemoryStore` has to `BlobClient`
(domain logic over a transport contract).

## Why a new interface (not reuse `Extractor`)

The locked features need "given a system prompt + user content (+ optional JSON
schema), return text or structured output" — a chat/structured-generation call.
The `Extractor` contract cannot express "rewrite this query," "score these two
facts for consistency," or "propose which notes to merge." CONTEXT.md
deliberately overloaded "adapter" to mean *either* an LLM *or* the `Extractor`
as a hedge; "no legacy support" resolves that hedge into a precise contract.

## Considered options

- **L1 — new `LlmClient` core interface, `Extractor` stays separate (chosen).**
  Captures exactly the shared primitive the four features need; preserves the
  existing deterministic-default + adapter-enhanced seam once, not four times;
  mirrors the established embedder/reranker/extractor contract family.
- **L2 — generalize `Extractor` into the LLM interface.** Rejected: makes the
  common case (graph extraction) pay for the general case, and erases a useful
  domain boundary. Extraction returns a typed domain object; an LLM call returns
  text/structured output. Collapsing them overreaches.
- **L3 — no shared LLM abstraction; each feature takes its own typed callback.**
  Rejected: re-derives the identical deterministic-default + adapter-enhanced
  seam four times, and forces every provider adapter to implement N unrelated
  callbacks instead of one transport contract.

## Consequences

- The provider adapter matrix gains a column: OpenAI (new), Anthropic/local
  (future) implement `LlmClient`; Voyage has no LLM (embedder + reranker only);
  Workers AI may gain one later. An OpenAI adapter implementing both `Extractor`
  and `LlmClient` shares one OpenAI client internally (composition).
- Every LLM-enhanced feature becomes "runs deterministic default; upgraded when
  an `LlmClient` is injected" — the same seam, fourth interface.
- Naming: **`LlmClient`**. _Avoid:_ `ChatModel` (Vercel-AI-SDK-flavored — that
  name belongs in the AI-SDK adapter), `Generator` (too generic).
