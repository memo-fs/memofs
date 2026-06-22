---
"@tekbreed/tekmemo": minor
"@tekbreed/tekmemo-mcp-server": minor
---

# Progressive recall: compact briefing + per-section expansion (ADR 0009 Component 4 / Q27)

`tekmemo.context` now defaults to a **compact briefing** (~6kb) with
expandable sections. The agent calls back with `section` + `expand` to
pull only the section it needs and stops. This is the headline delivery
of the Q16 cold-start token-reduction north star: compact ≈ 6kb vs
~64kb truncated before — the agent pulls the 2kb it needs instead of a
truncated dump.

## What changed

`tekmemo.context` gains three optional parameters:

- **`detail`** (`"compact"` | `"full"`, default `"compact"`): the
  disclosure level. `"full"` restores today's whole-budget behavior in
  one call (no affordances, no cache) — the escape hatch for the
  benchmark kit and power users.
- **`section`** (`"entities" | "recall" | "recent" | "notes"`): expand a
  single section. Set together with `expand`.
- **`expand`** (opaque string): the cursor a compact call returned in
  `MemoryContextResult.expandable`. Encodes the first call's resolved
  pointers so the second call re-resolves fast (no re-rewrite).

The result gains **`expandable`** — an array of `{ section, cursor,
available?, hint }` entries telling the model what it can pull. Each
section's rendered text ends with a copy-pasteable
`↳ expand: tekmemo.context(section="...", expand="<cursor>")` line.

In compact mode:

- **Recall** is capped at the top-3 fragments; the rest are advertised
  as expandable.
- **Recent** is capped at the top-3 events; the rest are expandable.
- **Entities** render in full (already compact one-liners from Q26 —
  capping them would lose the high-trust artifact).
- **Notes** are omitted (the expand target).
- **Core memory + directive** remain non-negotiable and always full.

## New machinery

A **session-scoped `ContextCache`** (LRU, 8 entries, 10-min TTL) held
per `Tekmemo` instance. Compact calls write their resolved pointers
(full ranked recall list, recent events, expanded terms) into it;
expand calls read from it and re-render just the requested section. The
cache is a fast-re-resolve optimization, not durable state — a miss
degrades gracefully to a fresh compact briefing with a warning.

This is the one genuinely new piece Q27 introduces: the strategist
must be **stateful across two calls**, which today's stateless
`buildContext()` was not. The pure strategist functions
(`rewriteQuery`, `resolveEntities`, `resolveEntityState`,
`filterCandidates`, `allocateBudget`) stay pure — only the applier
gains modes + cache (mirrors the existing decide/apply discipline).

## What's unchanged

- **The 4-verb MCP surface** (still 10 tools — Q21's invariant holds).
  Expansion is a parameter on `tekmemo.context`, not a 5th verb.
- **`TekMemoMcpRuntime` and the factory** — no structural change, just
  pass-through of the new optional params.
- **The AI SDK adapter** (`@tekbreed/tekmemo-adapter-ai-sdk`) —
  untouched. Its `buildRuntimeMemoryContext` reads
  `readCoreMemory`/`listNotes`/`recall` directly and never calls
  `memo.context()`, so the push-based context-injection path is
  unaffected by the compact default.
- **All existing regression assertions** — the golden content for the
  fixture queries survives the compact cap (the corpus is small and the
  golden notes are the top lexical hits).

## Graceful degradation

- Malformed/expired `expand` cursor → fresh compact briefing + warning
  (never a hard error; progressive disclosure is best-effort).
- No `cache` supplied (e.g. a custom runtime) → compact and expand work
  statelessly; expand always falls back to compact.
- Memory strategy gets progressive too (consistent behavior across
  local/memory/hybrid modes).

## Why

Per ADR 0009 Component 4: progressive is the "biggest single cutter" of
cold-start tokens. A pull-only channel's intelligence ceiling is set by
how much intelligence fits inside one tool call — so the compact
briefing carries the high-trust floor (directive + core + entities) and
defers the broad stuff (recall tail, notes) to targeted expansion.
Selective, not sequential: the agent expands only what it needs and
stops, vs. sequential pagination which loads everything in order.

Rejected: sequential cursor pagination ("more of the same"); a
`tekmemo.expand` verb (violates the 4-verb discipline); LLM-decided
expansion (re-introduces the judgment load the strategist exists to
remove).
