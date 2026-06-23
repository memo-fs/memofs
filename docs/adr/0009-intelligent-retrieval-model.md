# ADR 0009: The intelligent retrieval model — surface, strategist, write gate, and progressive delivery

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** Christopher S. Aondona

> **Terminology note (post-Q15):** uses of "smart" in this ADR are shorthand
> for the quantified north star: cold-start token reduction (Q16). See
> `docs/CONTEXT.md` → Intelligence north star.

## Context

ADR 0004 locked the v1 intelligence *surface* (hybrid recall + LLM extraction +
consolidation) and named consolidation the differentiator. But an audit of the
actual runtime code surfaced a deeper gap ADR 0004 did not close: **the
retrieval model itself — when and how memory is fetched, and what the agent
actually receives when it asks.** ADR 0004 answered "what intelligence runs";
this ADR answers "how that intelligence reaches the agent."

Three findings drove it, all verified in code on 2026-06-22:

1. **The model-facing MCP surface is a category error.** The MCP server exposes
   ~25 model-facing tools (`packages/tekmemo-mcp-server/src/tools/definitions.ts`),
   including developer-level runtime methods (`graph_upsert_nodes`,
   `graph_neighbors`, `graph_path`, `sync_push`). The model isn't a developer;
   it cannot choose intelligently among them. For a **pull-only channel** (every
   closed coding-agent host — Claude Code, Codex, Cursor, Cline, Roo Code —
   loads an MCP server and invokes its tools when *they* decide to; there is no
   hook for TekMemo to inject memory before the model thinks), **the tool
   surface *is* the intelligence surface.** 25 verbs the model can't choose
   among is worse than 4 verbs each doing maximum work.

2. **`tekmemo.context` is a flat assembler, not a strategist.** `buildContext()`
   in `packages/tekmemo/src/tekmemo/helpers.ts` concatenates directive → core →
   recent → recall → notes and byte-truncates. It passes the caller's query
   *verbatim* into recall. No rewriting, no entity resolution, no active-only
   filtering, no budget allocation. Truncation is the only intelligence, and
   truncation is not intelligence. Since MCP is pull-only, the intelligence
   ceiling of the entire MCP path is set by **how much intelligence fits inside
   one tool call.**

3. **The recall ↔ consolidation loop is open.** Consolidation
   (`packages/tekmemo/src/graph/consolidation/consolidate.ts`) correctly marks a
   superseded node `status: "deprecated"` (tests green). But recall operates on
   text chunks + metadata only — it never consults graph node status (verified:
   zero matches for `status`/`deprecated`/`active` anywhere in `src/recall/`).
   So consolidation retires a fact, and `tekmemo.context` still serves it. The
   one feature that makes memory *feel* smart (it stops telling you the old
   answer) is architecturally absent.

A parallel industry review (2026-06-22) converged on the same gaps from a
different angle: write discipline beats retrieval cleverry ("mediocre retrieval
over clean memory beats great retrieval over noisy memory"); staleness ≠ decay
("a highly-retrieved memory is accurate right until it changes, then becomes
confidently wrong"); and "be skeptical of any design that relies purely on the
agent deciding when to call the memory tool." Two independent signals pointing
at the same place is high-confidence signal.

## Decision

**Adopt a unified retrieval model governed by one invariant and delivered
across six components.**

### The invariant (stated once, obeyed by every component)

> **Files are the source of truth and keep everything. The derived index is
> disposable and prunes aggressively. Every intelligence layer is
> deterministic-by-default with an LLM-adapter hook.** Zero-config users get
> genuine intelligence; adapter/cloud users get the frontier version. No layer
> is the exception.

This is the same seam the embedder (BM25 always, vector when configured),
reranker (fallback always, adapter when configured), and extractor (rule-based
always, LLM when configured — ADR 0004) already follow. This ADR extends it to
the two layers that were missing it: the write gate and the retrieval
strategist.

### Component 1 — Model-facing surface collapses to 4 verbs (Q21)

The ~25 MCP tools collapse to **4 high-signal verbs**:

- `tekmemo.context` — the smart briefing composer (Components 2–6 all live
  inside this one call).
- `tekmemo.recall` — deep semantic search when the model wants more than the
  briefing.
- `tekmemo.remember` — write memory (runs the Component 6 write gate).
- `tekmemo.consolidate` — the intelligence lever (ADR 0004): merge + retire.

The old developer-level tools (`graph_*`, `sync_*`, `snapshot`, etc.) become
**runtime methods the developer calls imperatively** (`memo.graph.neighbors()`,
`memo.sync.push()`) — already the `TekMemoMemoryRuntime` surface — not
model-facing tools. A deferred opt-in "developer mode" MCP profile may
re-expose them for power users building custom agents; **not v1.**

**MCP is pull-only; this is accepted, not worked around.** Push-based
retrieval (context injection before the model thinks) is impossible through
MCP by host architecture. It remains available on the in-process adapter path
(`@tekbreed/tekmemo-adapter-ai-sdk` / `TekMemoMemoryRuntime`). Both surfaces
are first-class; the runtime is one, the surfaces are many.

### Component 2 — The retrieval strategist (Q23) is a 4-stage pipeline inside `tekmemo.context`

`buildContext()` is replaced by a **4-stage pipeline**, each stage a pure
function (mirroring the `consolidateGraph` / `applyConsolidation` split already
in the codebase — independently testable, not a black box):

| Stage | Deterministic default (always runs, zero-config) | LLM-enhanced (when adapter configured) |
|---|---|---|
| **Rewrite** | Built-in synonym/abbreviation lexicon + tokenization | Adapter expands to semantic variants |
| **Resolve** | Graph alias/label lookup against extracted entities | Adapter disambiguates |
| **Filter** | `status === "active"` only (drops `deprecated` — see Component 5) | Adapter scores trustworthiness |
| **Budget** | Weighted section allocation by `maxBytes` (core > entities > recall > recent) | Adapter prioritizes within recall |

**Core memory is non-negotiable.** `core.md` is injected *before* the
strategist runs and is *excluded from budget competition* — it gets its bytes
first, always. The strategist only budgets the *remaining* `maxBytes`. This is
the read-side enforcement of the locked principle: *a small core memory is
always injected; everything else is explicitly searched, not guessed at by the
agent.* The strategist decides what to search; the model never has to guess
"should I also search for auth?"

### Component 3 — Entity-centric recall: a separate "Entities" section (Q26)

`tekmemo.context` renders output in **trust order**: Core (Tier-1, always
injected) → **Entities** (resolved from the graph, high-trust) → Recall
(unresolved fragments, lower-trust, broader).

The **Entities section** sits between core and recall. Each resolved entity
renders as: label + type + current-state summary (active edges only — the
Component 5 filter is what makes the state "current") + provenance. Sourced
from `resolveCurrentFacts` over the graph, called by the strategist's Resolve
stage.

**Degrades gracefully:** when the graph has nothing for a query (extraction is
weak/absent — the rule-based extractor only catches 7 patterns), the Entities
section is simply empty and recall fragments carry the briefing exactly as
today. Entity-centric is an *enhancement over* fragment recall, gated by
extraction quality (the ADR 0004 critical path), never a replacement. Rejected:
folding entities into recall (loses the high-trust artifact distinction); a
separate tool verb (violates the 4-verb discipline); replacing fragment recall
outright (collapses for any note the extractor didn't process).

### Component 4 — Progressive recall: per-section expansion cursors (Q27)

`tekmemo.context` returns a **compact briefing with expandable sections**, each
carrying an opaque expansion token. The agent calls back with `section` +
`expand` to pull only what it needs.

```
## Core Memory        (always full — Tier-1, non-negotiable)
## Entities           (compact: resolved entities, current-state summary)
1. Auth — currently: OAuth2 (supersedes JWT)
   ↳ expand: tekmemo.context(section="entities", expand="auth")
## Recall             (compact: top-K fragments by budget)
   ↳ 14 more fragments available
   ↳ expand: tekmemo.context(section="recall", expand="...")
```

This is the headline delivery of the Q16 north star (cold-start token
reduction): compact ≈ 6kb; full ≈ 80kb; the agent pulls the 2kb it needs and
stops — vs ~64kb truncated today. The token is opaque and encodes resolved
pointers from the first call, so the second call re-resolves fast.

**Selective, not sequential.** Sequential pagination loads everything in order;
selective expansion lets the agent stop early. The one new machinery: the
strategist must be **stateful across two calls** (session-scoped cursor cache),
which today's stateless `buildContext()` is not. Expansion is a *parameter* on
`tekmemo.context`, not a 5th verb. Rejected: an `tekmemo.expand` verb
(violates 4-verb discipline); LLM-decided expansion (the research's anti-pattern
— re-introduces the judgment load the strategist exists to remove).

### Component 5 — The staleness loop closes (Q24, v1 mechanical)

The strategist's **Filter stage drops/marks anything whose extracted entities
include a `status: "deprecated"` node.** This is pure wiring — the data already
exists (consolidation produces it), the strategist already has a Filter stage,
they just need connecting. Near-zero new code. **Unblocks all of Q17 Tier-2.**

Distinct from **decay** (old-and-rarely-relevant, already solved by the 30-day
recency half-life in `hybrid-recall.ts`): staleness is *confidently wrong
because the world changed*, which ranking makes worse, not better.

Deferred to v1.x: a **re-verification stage in consolidation** (LLM-enhanced)
scores active facts for consistency with recent memory; low-truth facts get
`status: "unverified"` (a third state — flagged, not retired), which the Filter
surfaces with a warning rather than hiding. This folds into ADR 0004's update
(see ADR 0004 revision history).

### Component 6 — Write intelligence: blocklist + durability tier (Q22)

The write gate on `tekmemo.remember` / `writeMemory`, distinct from
retrieval-time intelligence. Two layers:

1. **Hard-reject write blocklist** (secrets/PII). This is the same safety
   thesis as the connector `secretRef` model (ADR 0002), applied to memory
   content — an agent writing an API key into syncable `notes.md` is a security
   hole today. Deterministic, always-on, no LLM. **Ships as a security fix
   regardless of the rest.**
2. **Soft durability tier**, 2-level: `durable` (indexed into recall store +
   graph; surfaced by `recall`/`context`) or `transient` (written to
   `notes.md` for the audit trail and `list_recent_memories`, but **not**
   indexed — does not pollute retrieval). Distinct from `kind` (what the fact
   *is*); tier is how long it should influence retrieval.

**Files keep everything that passes the blocklist** (full audit trail;
file-first intact). **The disposable recall index + graph prune by tier**
(rebuildable, never the source of truth). This is the memweave thesis — files
as source of truth, derived index disposable — applied to writes.

The tier is assigned by a **deterministic classifier** (from `kind` +
`confidence` + content shape) as the zero-config floor, **re-scored by a
configured LLM/`Extractor` adapter** when present. The deterministic floor is
the honest price of zero-config: it makes wrong calls (a terse `decision` that's
actually transient), but the file keeps everything and the index is rebuildable,
so the failure mode is "slightly noisier retrieval," not "lost memory."

Tier-1 (`core.md`) stays a **file** (replace-whole-file op, structurally small),
not a tier on a note — a future promotion op bridges note → core. Rejected: a
3-level taxonomy with `core` as a tier (creates two competing "what's always in
context" mechanisms, violating the one-home-per-fact discipline).

## Consequences

**Positive:**

- **The MCP intelligence story becomes coherent.** A pull-only channel's
  intelligence ceiling is set by how much intelligence fits inside one tool
  call. One strategist-powered `tekmemo.context` call returns a curated,
  budgeted, active-only, progressively-expandable briefing — instead of a
  truncated dump. This is the only way to make a pull-only surface feel
  intelligent.
- **The Q16 north star gets a concrete delivery mechanism.** Progressive recall
  (Component 4) is the "biggest single cutter" of cold-start tokens: ~6kb
  compact + targeted expansion vs ~64kb truncated today.
- **Write discipline compounds.** Cleaner memory at the source (Component 6)
  means every downstream layer (strategist, consolidation, recall) works over a
  cleaner signal — source cuts compound; sink cuts are one-shot.
- **The staleness loop closes.** Consolidation and recall finally agree:
  retired facts stop being served. Without this, Tier-2 search returns lies
  confidently.
- **The invariant is now consistent across all intelligence layers.** No layer
  is the exception to "deterministic-default + adapter-enhanced." Zero-config
  users get genuine intelligence at every layer; the managed-tier cloud (ADR
  0003) runs the frontier version.

**Negative:**

- **The strategist is the largest single v1 lift.** A 4-stage pipeline replacing
  a flat assembler, plus a session-scoped cursor cache for progressive expansion
  (stateful across two calls — new machinery). Mitigated by each stage being a
  pure, independently-testable function.
- **The deterministic rewrite lexicon and tier classifier are maintenance
  surface.** They need curation and will never match LLM quality. The LLM path
  mitigates; it does not eliminate the curation burden.
- **Progressive recall's compact rendering is load-bearing.** If the one-line
  index entries are bad, the agent expands the wrong thing. This is a copy/format
  problem (deferred to implementation), not architectural — but it's a real
  quality risk.
- **Collapsing 25 MCP tools to 4 is a breaking change for any consumer of the
  current surface.** Pre-launch (D8), so no deprecation cycle — but the branch
  must finish the collapse before v1 ships.
- **The strategist must be instrumented for evaluation.** If the benchmark kit
  (`tekmemo-benchmark-kit`) can't see the rewrite/resolve/filter/budget trace,
  measuring Q16 token-reduction is a black box. The strategist should expose its
  scoring signals as eval metadata.

## Alternatives considered

1. **Keep the flat `buildContext()` assembler; add intelligence via more tools.**
   Rejected: a pull-only channel's failure mode is the model *not choosing to
   retrieve, or choosing the wrong tool*. More tools makes that worse, not
   better. The fix is fewer tools doing more — which requires the intelligence
   inside the tool, which requires the strategist.
2. **LLM-only strategist (no deterministic floor).** Rejected: breaks the
   zero-config thesis (Q15/Q18 — zero-API-key intelligence is the trust story).
   Gating the headline feature behind a provider key inverts the architecture.
3. **Hard-reject writes for non-durable content (no tier).** Rejected: deletes
   information (violates the mark-never-delete thesis Q3 and consolidation
   enshrine), and is bypassable by a human editing `notes.md` (so the "gate" is
   a fiction under file-first). The files-keep-everything / index-prunes split
   is the only option consistent with both sacred properties.
4. **3-level tier taxonomy (`core`/`durable`/`transient`).** Rejected: making
   `core` a tier on a note creates two competing "always-in-context" mechanisms
   (the `core.md` file *and* a `tier: "core"` flag). `core.md` as a
   replace-whole-file is the better Tier-1 enforcement; a promotion op bridges.
5. **`tekmemo.expand` as a 5th verb; `tekmemo.entities` as a 6th.** Rejected:
   re-opens the 4-verb discipline Q21 closed. Both are parameters on
   `tekmemo.context`.
6. **Sequential cursor pagination for progressive recall.** Rejected: that's
   "more of the same," not "expand only what I need." The agent expands blindly.
   Selective per-section expansion is what delivers the token cut.

## Validation

- **25 tools today** (verified: `grep -c "name: \"tekmemo" definitions.ts` →
  25). Q21 mandates 4.
- **`buildContext()` is a flat assembler** (verified:
  `packages/tekmemo/src/tekmemo/helpers.ts` — directive → core → recent → recall
  → notes, concatenated, byte-truncated; query passed verbatim to recall).
- **The staleness loop is open** (verified: zero matches for
  `status`/`deprecated`/`active` in `src/recall/`; consolidation marks
  `deprecated` in `consolidate.ts`, recall never checks).
- **No write-time filter exists** (verified: `writeMemory` hashes content and
  appends; "durable" appears only in template docstrings, never as a gate).
- **`resolveCurrentFacts` and the `supersedes` edge type exist** (Q17 mechanism
  column; `invalidate-superseded-edges.ts`), so the strategist's Resolve and
  Filter stages have primitives to call.
- **The deterministic-default + adapter-enhanced seam is proven** by the
  embedder/reranker/extractor layers already shipping (ADR 0004).
- **The decisions this ADR captures are all locked** in
  [`decisions.md`](../architecture/decisions.md): Q21 (surface), Q22 (write
  intelligence), Q23 (strategist), Q24 (staleness, v1 mechanical), Q26
  (entity-centric), Q27 (progressive recall).

## References

- Decisions log: [`decisions.md`](../architecture/decisions.md) — Q21, Q22, Q23,
  Q24, Q26, Q27 (all locked).
- [ADR 0004](./0004-v1-intelligence-extraction-and-consolidation.md) — v1
  intelligence surface (extraction + consolidation); this ADR's Component 5
  v1.x re-verification + `unverified` status updates it.
- [ADR 0007](./0007-ai-sdk-extraction.md) — the `TekMemoMemoryRuntime` contract
  (framework-neutral L1) this ADR's strategist implements behind.
- Code: `packages/tekmemo/src/tekmemo/helpers.ts` (`buildContext` — the flat
  assembler this ADR replaces), `packages/tekmemo/src/graph/consolidation/`
  (the `deprecated` markings the Filter honors),
  `packages/tekmemo-mcp-server/src/tools/definitions.ts` (the 25-tool surface
  that collapses to 4).
- Q16 north star (cold-start token reduction) — the metric progressive recall
  (Component 4) delivers against.
