# Roadmap

This roadmap communicates **direction, not dates.** Columns are ordered by
priority; items move left as they get shipped. No calendar commitments —
TekMemo ships when it's right, not when a date says so.

> Looking for something specific? Open an issue with the `question` label, or
> see [`GOOD_FIRST_ISSUES.md`](./GOOD_FIRST_ISSUES.md) for ways to contribute
> today.

---

## Now

Active focus — the work in flight toward a stable 1.0.

- **API freeze on the `Tekmemo` client** — lock the public surface
  (`core`, `notes`, `conversations`, `graph`, `snapshots`, `agentfs`, `sync`,
  `rerank` namespaces + `recall`, `context`, `writeMemory`,
  `listRecentMemories`, `validate`, `health`). After 1.0, changes follow
  semver.
- **Freeze the AI SDK helpers** — `buildRuntimeMemoryContext`,
  `buildRuntimeMemoryToolDefinition`, `runRuntimeMemoryTool`,
  `createAiSdkRuntimeFromTekmemo`, `TekMemoMemoryRuntime`. These ship in
  [`@tekbreed/tekmemo-adapter-ai-sdk`](packages/tekmemo-adapter-ai-sdk); the
  framework-neutral `TekMemoMemoryRuntime` interface is frozen in core.
- **Lock the recall configuration schema** — `engine`, `localEmbeddings`,
  `embeddingModel` + the `TEKMEMO_RECALL_*` env vars.
- **TekMemo Cloud launch** — ship the hosted layer alongside the OSS 1.0:
  hosted sync (keep memory in sync across devices) and the hosted managed MCP
  endpoint. The cloud runs as one Cloudflare Worker (Hono API + React Router v8
  dashboard) per [ADR 0005](docs/adr/0005-cloud-tech-stack.md).
- **Docs & contributor readiness** — runnable examples across the primary
  agent frameworks; a complete, honest contributor funnel.

## Next

In flight after 1.0 — team features and the managed-runtime tier.

- **Managed-runtime tier** — run the *same* local `Tekmemo` memory runtime + an embedder
  on hosted infra against the user's R2-resident files; expose hosted recall /
  graph / evals by API. The long-term purpose of the cloud ([ADR 0003](docs/adr/0003-managed-runtime-tier.md));
  v1's file-replica sync is the foundation for it.
- **Workspaces** — shared memory across a team, with access controls.
- **Observability** — recall quality, latency, and usage analytics.
- **Audit logs** — append-only history of memory reads/writes for compliance.

## Later

On the horizon once Cloud fundamentals are stable.

- **More framework integrations** — LangGraph, Mastra, NestJS, Express.
- **Python SDK** — first-class memory for Python agent frameworks
  (CrewAI, LangGraph-Python), not just a port of the CLI.
- **Benchmark suite publication** — reproducible TekMemo-vs-vector-DB results
  using `@tekbreed/tekmemo-benchmark-kit`.
- **Graph memory expansions** — richer relationship types and traversal.

---

## How to influence this roadmap

- **File an issue** tagged `enhancement` with a concrete use case.
- **Open a discussion** for larger directions before writing code.
- **Significant changes** are recorded as ADRs in [`docs/adr/`](./docs/adr/).

This roadmap is a living document. Priorities shift as we learn what users
actually build.
