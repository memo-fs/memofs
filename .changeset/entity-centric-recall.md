---
"@tekbreed/tekmemo": minor
---

# Entity-centric recall: the Entities section renders current state (ADR 0009 Component 3 / Q26)

`tekmemo.context` now renders each resolved graph entity with its
**current state derived from active edges**, not just the static node
summary. This is the high-trust artifact that sits between core and
recall in trust order.

## What changed

The strategist's Resolve stage gains a pure enrichment step
(`resolveEntityState`). Each resolved entity renders as:

```
1. Auth (concept) — currently: uses OAuth2 (supersedes JWT)
   ↳ source: notes.md
```

- **Current state** comes from active outgoing edges (`uses`,
  `prefers`, `depends_on`, `supersedes`). `supersedes` edges name the
  retired neighbor, surfacing the staleness story in one line.
- **Active edges only** — the Component 5 staleness filter is enforced
  inside enrichment, so the rendered state is "current" by construction.
  Deprecated edges never contribute.
- **Provenance** is the first active edge's source ref
  (`path ?? title ?? sourceId ?? sourceType`).
- **Graceful degradation** — an entity with no active stateful edges
  falls back to its static summary (the pre-Q26 behavior). Empty section
  when the graph has nothing for the query.

## What's unchanged

- The 4-verb MCP surface (still 10 tools — Q21's invariant holds).
- `TekMemoMcpRuntime` and the factory — no surface change.
- The `entities` section type and trust order (locked in Q23).
- Memory strategy (zero-config floor: graph ops omitted → enrichment no-ops).

## Why

Per ADR 0009 Component 3: "current state of auth" should resolve to one
entity showing OAuth2 (and that it supersedes JWT), not N fragments.
Entity-centric is an enhancement over fragment recall, gated by
extraction quality — never a replacement. The dedicated
`entity-state.test.ts` pins the rendering; `strategist.test.ts` pins the
pure enrichment function.
