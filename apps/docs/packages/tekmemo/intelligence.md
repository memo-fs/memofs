# Memory intelligence

TekMemo's intelligence layer is what turns a pile of notes into something an agent can actually *use*: it retrieves the right fragments for a task, extracts entities and relationships from prose, retires facts that have been superseded, and decides how long a new memory should steer retrieval.

Crucially, **all of it works with zero configuration and no API keys.** Every layer has a deterministic, offline fallback. You only reach for a provider model (OpenAI, Voyage, a hosted reranker) when you want higher quality — and when you do, the API stays identical because the adapter contract is provider-neutral.

The layer has four parts:

| Part | What it does | Zero-config default |
| --- | --- | --- |
| **[Recall](#recall)** | Finds the fragments relevant to a task. | Hybrid merge of BM25 lexical + (optional) vector, reranked. |
| **[Extraction](#graph-extraction)** | Reads prose and pulls out entities + relationships into the graph. | Rule-based extractor (no API key). |
| **[Consolidation](#consolidation)** | Merges duplicate entities and retires superseded facts. | Deterministic pass over the graph. |
| **[Durability tiers](#durability-tiers)** | Decides whether a write influences retrieval or is just logged. | Deterministic classifier. |

## Recall

When you call `tekmemo context` or `memo.recall()`, TekMemo runs a retrieval pipeline over your memory. The engine is selected by the [`recall.engine` config](./configuration#recall-engine), with four modes:

| Engine | What runs | Needs an embedder? |
| --- | --- | --- |
| `lexical` | BM25 + fuzzy matching only. | No — zero config. |
| `vector` | Semantic embedding search only. | Yes. |
| `hybrid` | Both paths run, results merged and reranked. | Yes. |
| `auto` *(default)* | `hybrid` when an embedder is available, else `lexical`. | Falls back gracefully. |

### The zero-config path

In its default (`auto`) form, recall runs the **lexical path always** and the **vector path only when an embedder is configured**. If no embedder is present — the common case for a fresh project — recall is BM25 + fuzzy matching over your core memory and notes, indexed on the fly. It works offline, with no keys, immediately.

```ts
const memo = new Tekmemo({ mode: "local", rootDir: "./.tekmemo", projectId: "app" });

// Works with zero config — lexical recall only.
const hits = await memo.recall("how does auth work");
```

The local strategy indexes current core + notes on each recall (cheap at local scale) so results always reflect the latest memory, even with no embedder.

### Adding semantic recall

Plug in an embedder and `auto` mode upgrades to hybrid automatically: the lexical and vector candidate sets are merged, then passed through a reranker:

```ts
import { createTransformersEmbedder } from "@tekbreed/tekmemo-adapter-transformers";
// or: createOpenAiEmbedder / createVoyageEmbedder

const memo = new Tekmemo({
  mode: "local",
  rootDir: "./.tekmemo",
  projectId: "app",
  embedder: createTransformersEmbedder({ model: "Xenova/all-MiniLM-L6-v2" }),
  recall: { engine: "auto" }, // default — hybrid now that an embedder exists
});
```

::: tip The local embedder
The MCP runtime lazy-loads a local ONNX embedder (`Xenova/all-MiniLM-L6-v2`) via the `@tekbreed/tekmemo-adapter-transformers` adapter so hybrid recall works with **no API keys**. The adapter is an optional peer dependency — dynamically imported only on the first embedding request. If it isn't installed, recall silently falls back to the lexical path. No broken boot.
:::

### Reranking

Hybrid merges pass through a reranker before the top-K is returned. The built-in `DeterministicFallbackReranker` scores by lexical similarity (exact + partial term matches), normalized to `[0, 1]`, and needs no network. A provider reranker (when wired through the rerank adapter contract) layers on top for frontier-quality ordering — same input/output shape.

See [Indexing and recall](./architecture/indexing-recall) for the deeper architecture, and [Configuration](./configuration#recall-engine) for the engine matrix.

## Graph extraction

Every write can be fanned out into the graph: prose is read for **entities** (nodes) and **relationships** (edges), turning a free-text note into queryable structure. "We switched from session auth to JWT" becomes a `supersedes` edge you can traverse.

### The extractor contract

An `Extractor` is a provider-neutral adapter — the same pattern as embedders and rerankers. The contract is defined in core; concrete implementations live in adapter packages.

```ts
export interface Extractor {
  readonly name: string;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
```

`ExtractionResult` carries `nodes`, `edges`, and optional `contradictions` (subject–predicate pairs that disagree — the seam consolidation consumes).

### The rule-based default

With no extractor configured, TekMemo runs the **built-in rule-based extractor** — `createRuleBasedExtractor()`. It is deterministic, needs no API key, and recognizes seven structural patterns (including the `supersedes` relationship). It is the zero-config / offline floor guaranteed by ADR 0004, and it's what makes the graph grow from natural prose on day one.

```ts
import { Tekmemo, createRuleBasedExtractor } from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  mode: "local",
  rootDir: "./.tekmemo",
  projectId: "app",
  extractor: createRuleBasedExtractor(), // the default — explicit here
});

await memo.notes.record({
  content: "We replaced session-based auth with JWT.",
  kind: "decision",
});
// → graph now has the entities + a `supersedes` edge, no API key used.
```

### Layering an LLM extractor

For higher-quality extraction, configure an LLM-backed `Extractor` adapter (e.g. a future `@tekbreed/tekmemo-adapter-extractor-openai`). When present, it re-scores on top of the rule-based output — but the rule-based extractor remains the fallback so the write fan-out always calls *one* shape, whether or not an adapter is configured. See [Graph memory](./architecture/graph-memory) for the entity/edge model.

## Consolidation

This is the differentiator of v1 intelligence. Consolidation is a **local, deterministic pass** over the graph that makes memory feel curated: it quietly merges duplicate entities and retires facts that have been superseded — **without ever deleting** (the audit trail is preserved; facts are marked `deprecated`).

```ts
// Preview what a consolidation pass would change (no writes):
const preview = await memo.consolidate({ apply: false });
console.log(preview.plan.merges, preview.plan.retiredNodes);

// Apply it:
const result = await memo.consolidate();
console.log(`${result.mergesApplied} merges, ${result.retirementsApplied} retirements`);
```

What it does:

- **Merge duplicates** — two active nodes that share a canonical label/alias (case-insensitive) are merged into one surviving entity; the absorbed label is recorded as an alias, and edges are rewritten onto the survivor.
- **Retire superseded facts** — when an extractor emits `A supersedes B` (or reports a contradiction `{ from: A, to: B }`), every active edge referencing `B` is marked `deprecated` with a `validUntil`. So the "we used JWT → we switched to OAuth" story retires the JWT fact while keeping it auditable.

The pass is **decide-then-apply**: `consolidateGraph` is a pure function over a graph snapshot (no side effects — trivially testable), and `applyConsolidation` is the thin store adapter that persists the plan. Merges run before retirements so edges land on the surviving node first.

### Why "never delete" matters

A superseded fact isn't erased — it's deprecated. The audit trail (`we used JWT, then switched to OAuth on this date`) survives for any future "why did we change this?" question. Recall and graph queries skip deprecated entries by default, so they don't pollute retrieval, but they're still in `notes.md` and the graph history. This is the same principle that keeps connector re-ingestion idempotent.

## Durability tiers

Not every write should steer future retrieval. A high-confidence `decision` is durable; a tentative scratch `note` drafted mid-session probably isn't. The durability tier decides.

Two levels:

| Tier | Indexed into recall/graph? | Visible in `notes.md` / recent? |
| --- | --- | --- |
| `durable` | **Yes** — surfaces in `recall` and `context`. | Yes |
| `transient` | **No** — does not pollute retrieval. | Yes (the audit trail keeps it) |

A `transient` memory is still recoverable: a human editing `notes.md`, or a future promotion, can make it durable, and the index rebuilds. This is the file-first thesis applied to writes — **files are the source of truth, the derived index is disposable.**

### Distinct from `kind`

`kind` answers *"what is this fact?"* (`decision`, `constraint`, `note`). `tier` answers *"how long should it steer retrieval?"* A `decision` is almost always durable; a `note` is almost always transient — but a high-confidence `note` capturing a real fact should be durable, and a low-confidence `decision` drafted mid-session should be transient. Both dimensions carry signal; the classifier reads both.

### The deterministic floor

The zero-config classifier (`classifyDurability`) is **deterministic** — it runs with no API key and makes defensible calls from `kind` + `confidence` + content shape. It is wrong sometimes. When an LLM/`Extractor` adapter is configured, it re-scores — but the deterministic floor is the honest price of zero-config: file-first + rebuildable index means the failure mode is *"slightly noisier retrieval,"* never *"lost memory."*

Every write returns the tier it was classified into (`WriteMemoryResult.tier`) plus the reason (`tierReason`), so the decision is auditable. You can also set `tier` explicitly on a write to override the classifier.

## Putting it together

A typical write flows through all four layers:

```text
 writeMemory({ content, kind, confidence })
        │
        ├──► durability classifier  ──►  tier: durable | transient
        │        (durable? index it; transient? log only)
        │
        ├──► extractor.extract()     ──►  nodes + edges (+ contradictions)
        │        (rule-based default, LLM adapter optional)
        │
        └──► notes.md + events.jsonl (always — the source of truth)

 later:  memo.recall()        ──►  hybrid lexical+vector, reranked
         memo.consolidate()   ──►  merge dups, retire superseded
```

Every box has a deterministic, offline default. You start with zero keys and get a working memory system; you add providers only to raise quality on the parts that matter to you.

## See also

- [Indexing and recall](./architecture/indexing-recall) — the retrieval pipeline in depth.
- [Graph memory](./architecture/graph-memory) — the entity/relationship model extraction feeds.
- [Configuration](./configuration#recall-engine) — the recall engine matrix and embedder setup.
- [The `Tekmemo` client](./client) — `recall()`, `consolidate()`, and `writeMemory()` signatures.
- ADR 0004 — *v1 intelligence = LLM-based extraction + memory consolidation.*
- ADR 0009 — *write intelligence (blocklist + durability tier).*
