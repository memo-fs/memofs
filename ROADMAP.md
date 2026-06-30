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

- **Self-hostable runtime — `tekmemo-server`.** Ship a deployable OSS server
  that runs the *same* hosted-runtime engine the cloud runs, with
  **provider-neutral adapters** (bring your own embedder / reranker / extractor /
  LLM client / blob store / metadata store). The fulfillment of the "self-host
  the same engine free" thesis ([ADR 0003](docs/adr/0003-managed-runtime-tier.md)).
  Deploys as a single Node process for OSS self-hosters, and as the cloud's
  **runtime Worker** behind a Service Binding.
- **Two-Worker cloud topology.** TekMemo Cloud runs as **two** Cloudflare Workers
  (commercial + runtime) joined by a Service Binding — a 3 MB free-plan
  constraint forces it, and the runtime-API boundary makes it architecturally
  clean ([ADR 0013](docs/adr/0013-two-worker-split.md)).
- **The `LlmClient` contract + intelligence tier.** A provider-neutral LLM
  transport in core (the 4th member of the embedder/reranker/extractor family,
  [ADR 0014](docs/adr/0014-llm-client-core-interface.md)), powering the
  LLM-enhanced strategist / writer-critic consolidation / staleness re-
  verification. The deterministic defaults run zero-config; the adapter upgrades
  layer on.
- **API freeze on the `Tekmemo` client** — lock the public surface
  (`core`, `notes`, `conversations`, `graph`, `snapshots`, `agentfs`, `sync`,
  `rerank` namespaces + `recall`, `context`, `writeMemory`,
  `listRecentMemories`, `validate`, `health`). Two modes (`local` | `hybrid`),
  no read/write policies — the cloud is a file replica reached via explicit
  sync verbs, never an implicit read policy. After 1.0, changes follow semver.
- **TekMemo Cloud launch — full managed runtime at v1.** Hosted sync (memory in
  sync across devices), Teams (shared projects with concurrency-safe writes),
  and the managed runtime (hosted recall / consolidation / pre-warming / memory
  explorer). Ships as the two-Worker topology above. The full managed runtime
  lands in one release, but its concurrent-write surfaces (Teams shared-project
  writes, hosted-memory writes) **ship only after the concurrency layer
  ([ADR 0010](docs/adr/0010-cloud-concurrency-control-for-b3.md)) that makes
  them safe** — no multi-writer path goes live before its serialization. See
  [ADR 0011](docs/adr/0011-managed-runtime-sequencing.md) and the execution
  plan's Hard ordering rule.
- **Docs & contributor readiness** — runnable examples across the primary
  agent frameworks; a complete, honest contributor funnel; the reprojected docs
  IA ([ADR 0015](docs/adr/0015-docs-blueprint-reprojection.md)).

## Next

In flight after 1.0 — the adapters and surfaces that were deliberately deferred
to keep the launch focused.

- **Native self-host store adapters** — `tekmemo-adapter-s3` (blob) and
  `tekmemo-adapter-postgres` (metadata). OSS self-hosting launches against the
  cloud's R2 + Turso bundle (R2 is S3-compatible, Turso/libSQL is free); the
  native adapters are the first post-launch widen.
- **More store backends** — GCS (blob), D1 + SQLite (metadata).
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
