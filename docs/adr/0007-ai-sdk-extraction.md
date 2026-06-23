# ADR 0007: Extract the Vercel AI SDK integration from core; keep AgentFS in core

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Christopher S. Aondona

> **Terminology note (post-Q15):** this ADR predates the Q15 glossary lock
> (2026-06-21). Uses of "engine" refer to what is now canonically the "memory
> runtime." See `docs/CONTEXT.md` → Canonical product nouns.

## Context

`packages/tekmemo` (the core runtime) ships two subsystems whose placement
under the new composable architecture was un-scoped:

1. **`packages/tekmemo/src/ai-sdk/`** — a **Vercel AI SDK integration** (not a
   generic "AI SDK"). It contains:
   - `createAiSdkRuntimeFromTekmemo(memo)` — bridges a `Tekmemo` into a
     `TekMemoAiRuntime` (readCoreMemory / listNotes / createNote / recall),
     routing every recall through the real hybrid engine.
   - `buildMemoryToolDefinition` / `runStructuredMemoryTool` — a Vercel AI SDK
     tool wrapper built on a zod discriminated union
     (`memoryToolInputSchema`: view/create/update/search).
   - `buildPrepareCallMemoryText` / `buildRuntimeMemoryContext` — inject memory
     text into model prompts.
   - `buildAgentSessionInstructions` / `scopePolicy` — prompt + read/write
     scoping for agent sessions.
   - The `ai` package is declared an **optional peer dependency** in core
     (`>=5.0.0 <7.0.0`, resolved `ai@^6`).
2. **`packages/tekmemo/src/agentfs/`** — a **framework-agnostic session-workspace
   primitive.** It defines `AgentfsLikeClient` (readText/writeText/appendText/
   exists/deleteText + optional sync pull/push/checkpoint) and
   `createTekMemoAgentSession`, which spins up an isolated per-session workspace
   (context/working/output files), pulls memory in, scaffolds plan/commands/
   errors/changes/notes, extracts curated durable memory → `notes.md`, and
   checkpoints + syncs before/after. It imports core only (`MemoryStore`,
   `MemoryPath`, canonical paths) — **zero** AI-vendor coupling.

There is a contradiction. `AGENTS.md` requires: *"Core protocol contracts must
be provider-neutral."* Every other integration in the repo follows the adapter
pattern — `tekmemo-adapter-openai`, `-voyage`, `-transformers`, the future
`-extractor` (ADR 0004), and the future `-connectors` (ADR 0002). **The Vercel
AI SDK integration is the one provider implementation living inside core.**
Today core's root `index.ts` re-exports Vercel-AI-SDK-specific tool schemas, so
a user who only wants the memory engine still pulls those types into the
package surface.

`agentfs/` has no such problem — it is a primitive over the memory store (the
session equivalent of `sync/`, `graph/`, `recall/`), not tied to any AI vendor.

The goal stated for this architecture is: **"keep the new architecture as
composable as possible; we will be extending in the nearest future."** The
deciding question is: when the next framework integration (LangChain, OpenAI
Agents SDK, Mastra) is added, where does that code go?

## Decision

**Extract the Vercel AI SDK integration into a new published adapter package;
keep `agentfs/` in core. Split the runtime contract into a framework-neutral
interface in core and a Vercel-specific tool layer in the adapter.**

```
core (packages/tekmemo)
├── TekMemoMemoryRuntime          ← framework-neutral interface (renamed from
│                                    TekMemoAiRuntime)
└── agentfs/                      ← unchanged: framework-agnostic session layer

adapter (packages/tekmemo-adapter-ai-sdk)   ← NEW, published
├── createAiSdkRuntimeFromTekmemo()  implements TekMemoMemoryRuntime
├── buildMemoryToolDefinition / runStructuredMemoryTool   ← zod tool wrapper
├── memoryToolInputSchema
├── buildPrepareCallMemoryText / buildRuntimeMemoryContext
├── buildAgentSessionInstructions
└── scopePolicy
```

### Three sub-decisions

1. **`ai-sdk/` → `@tekbreed/tekmemo-adapter-ai-sdk` (new published package).**
   The Vercel AI SDK integration is a *provider implementation*, so it goes on
   the same seam as the other adapters. The `ai` peer dep moves from
   "optional in core" to a real dep of the adapter (correct: depending on the
   AI SDK adapter means depending on the AI SDK). Core stops re-exporting
   Vercel-specific tool schemas.

2. **`agentfs/` stays in core, unchanged.** It is a framework-agnostic
   primitive over the memory store — the session equivalent of `sync/`. No
   vendor coupling; extracting it would be fragmentation for its own sake.

3. **Runtime interface split into two layers with different homes.**
   - **L1 — `TekMemoMemoryRuntime` interface → core** (renamed from
     `TekMemoAiRuntime`). Methods: `recall`, `readCoreMemory`,
     `updateCoreMemory`, `listNotes`, `createNote`, optional `index`. Pure
     memory operations, zero framework types. The rename drops the AI-SDK-
     flavored name from a core type. It replaces its `JsonObject` re-export
     from `ai` with core's own `JsonObject` (`core/types/json.ts`) — removing
     the last AI-SDK type leak from core.
   - **L2 — Vercel tool/protocol layer → the adapter.** The zod tool wrapper
     (`buildMemoryToolDefinition` / `runStructuredMemoryTool` /
     `memoryToolInputSchema`), the prepare-call/runtime memory-text builders,
     agent-session instructions, and scope policy. All Vercel-AI-SDK-specific.

## Consequences

**Positive:**

- **Pattern parity restored.** Core now follows the same provider-neutral rule
  everywhere: the interface lives in core; each provider implementation lives
  in its own `tekmemo-adapter-*`. The Vercel AI SDK integration is no longer
  the lone violator.
- **Extensibility is additive, not invasive.** Adding LangChain / OpenAI Agents
  SDK / Mastra support = a new adapter package that implements the existing
  `TekMemoMemoryRuntime`. Core never changes. Under the status quo, each new
  framework would bloat core and add another vendor-shaped folder to its public
  surface.
- **Cross-framework contract parity.** A LangChain agent and a Vercel AI SDK
  agent implement the same `TekMemoMemoryRuntime`, so memory semantics are
  identical across frameworks — no drift from re-declaring the contract per
  framework.
- **Core's public surface is vendor-free.** A consumer who only wants the
  memory engine no longer pulls AI-SDK-specific tool schemas.

**Negative:**

- **One bounded migration.** Move `src/ai-sdk/*` → the new package; update
  imports in `packages/tekmemo-cli/src/commands/agent.ts`, the three
  `examples/*`, and the four `apps/docs` pages; drop the `ai` optional peer dep
  from core `package.json`; republish. Finite, ~1 session. No runtime behavior
  change.
- **One public rename.** `TekMemoAiRuntime` → `TekMemoMemoryRuntime` touches
  the interface file, `tekmemo-runtime.ts`, the adapter's exports, the CLI
  command, the example, 3 test files, and the docs. Pre-launch, so no external
  breakage to manage.
- **Adapter gains a real peer dep.** The `ai` peer dependency becomes required
  in the adapter package. This is correct, but consumers who used the
  integration through core must now depend on the adapter.

## Alternatives considered

1. **Status quo (keep `ai-sdk/` and `agentfs/` both in core).** Rejected:
   violates the provider-neutral rule; core's surface ships a Vercel-specific
   integration; every future framework bloats core and re-couples its surface
   to a vendor.
2. **Extract both `ai-sdk/` and `agentfs/`.** Rejected: `agentfs/` has zero
   provider coupling — extracting it adds a package + a dependency hop for no
   benefit. It is a primitive, not an adapter.
3. **Interface (`TekMemoAiRuntime`) lives entirely in the adapter.** Rejected:
   every new framework re-declares the runtime contract → drift. There would be
   no shared type a second adapter could implement.
4. **Rename the interface without moving it.** Rejected: a renamed core type
   that still carries Vercel tool schemas next to it doesn't fix the surface
   leak — this is just status quo with a new label.

## Validation

- Grounded in code: `packages/tekmemo/src/ai-sdk/*` (Vercel integration),
  `packages/tekmemo/src/agentfs/*` (framework-agnostic primitive),
  `core/types/json.ts` (the core `JsonObject` that replaces the `ai` import),
  and `packages/tekmemo/src/index.ts` (the surface that today re-exports
  Vercel tool schemas).
- Pattern precedent: the embedder interface/impl split (`Embedder` interface in
  core; OpenAI/Voyage/transformers impls in adapter packages).
- Consumers identified: `packages/tekmemo-cli/src/commands/agent.ts`;
  `examples/{nextjs,openai-agents-sdk,ai-sdk}/`; `apps/docs` (4 pages).

## References

- Decisions log: `docs/architecture/decisions.md` S2-Q1 (extraction +
  interface split)
- Provider-neutral rule: `AGENTS.md`
- Adapter-pattern precedent: `tekmemo-adapter-openai`, `-voyage`,
  `-transformers`; planned `-extractor` ([ADR 0004](./0004-v1-intelligence-extraction-and-consolidation.md))
  and `-connectors` ([ADR 0002](./0002-connectors-run-locally.md))
- Runtime-via-Tekmemo contract origin: this ADR's Context section (the
  contract was never separately filed as ADR 0001; it is subsumed here and in
  the decisions log, S2-Q1)
