# ADR 0002: Connectors run locally; the cloud only replicates files

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Christopher S. Aondona

> **Terminology note (post-Q15):** this ADR predates the Q15 glossary lock
> (2026-06-21). Uses of "engine" refer to what is now canonically the "memory
> runtime." See `docs/CONTEXT.md` → Canonical product nouns.

## Context

TekMemo ingests external data (Notion, GitHub, Slack, …) into a user's
`.tekmemo/` memory via "connectors." The original proposal
(`new-architecture.md`) said connectors should live "in the cloud and sync with
the local memory engine."

That directly conflicts with the locked refactor
(`docs/architecture/cloud-sync-and-refactor.md` D1/D2): **the cloud is a dumb
file replica. It never embeds, recalls, extracts, or ingests.** A connector is
an ingestion operation — it fetches, normalizes, chunks, embeds, and extracts.
Hosting it server-side would re-open the "cloud-as-engine" decision the refactor
was built to close, and would force the cloud to embed/extract, contradicting D7
(indexes are derived locally).

So the placement of connectors is not a UX detail — it determines whether the
cloud stays a replica or silently becomes an engine again.

## Decision

**Connectors run locally; the cloud only replicates the resulting files.**

- The connector fetch + normalize + ingest pipeline runs on the user's machine
  (CLI, MCP server, or a local daemon) and writes into `.tekmemo/` through the
  **local** engine.
- The cloud then replicates those bytes like any other canonical file. The cloud
  never runs a connector.
- Users still add connectors from the **web dashboard** (control plane): the
  dashboard stores connector config + a credential pointer; the local runtime
  pulls that config down via sync and executes. This is the `git`/GitHub Actions
  model — the *what* is versioned, the *credential* is fetched live.
- Connector config lives in a new canonical file, `.tekmemo/connectors.json`
  (the 11th sync unit). Tokens **never** ride in the file-replica (R2 blobs are
  readable); `connectors.json` holds only an opaque `secretRef`. Tokens live
  server-side and are fetched over an authenticated call at run time.
- Connector-ingested content is written as notes with `source: "connector"`, a
  stable `sourceId` (external id), and a content-derived `id` — so re-ingest of
  unchanged content reproduces identical bytes (no phantom sync conflicts, and
  a connector run can never clobber a human-authored note under the
  last-writer-wins D6 model).

## Consequences

**Positive:**

- D1/D2 hold unchanged. The cloud remains a dumb replica; there is no second
  engine to drift from the local files.
- No new hosted-worker cost. Connectors reuse the local runtime that already
  does recall/embed/graph for $0 (the `-transformers` adapter runs ONNX locally,
  no API key).
- The "add from the web" UX is preserved without compromising the architecture —
  config syncs, execution stays local.
- Secrets never land in R2.

**Negative:**

- A connector runs only while the user's local runtime is alive (CLI/MCP
  session/daemon). There is no server-side schedule. Honest for a local-first
  OSS product (like `git` only fetching when you run it), but a user expecting
  24/7 cloud ingestion must wait for the managed-runtime tier.
- Adds one new canonical file (`connectors.json`) and one new authenticated
  endpoint (`GET .../connectors/:id/secret`) to the future cloud contract.

## Alternatives considered

1. **Cloud-side connector jobs that write files to R2 (no embedding).** Rejected:
   even ingestion-without-indexing is engine-like, adds a cloud cron/queue
   worker (cost, complexity), and means the cloud holds external-source data the
   local engine didn't authorize.
2. **Full cloud-engine connectors (abandon D1/D2).** Rejected: reverts the core
   thesis of the refactor.
3. **Purely local config (no web).** Rejected: silently breaks the "manage from
   the web" UX and either loses cross-device config or forces raw tokens onto
   disk in a repo-local `.tekmemo/`.

## Validation

- Architecture fit: consistent with `cloud-sync-and-refactor.md` D1/D2/D5/D7.
- Schema fit: `packages/tekmemo-mcp-server/src/schema.ts` `sourceRefSchema`
  already enumerates `"connector"` as a valid `sourceType` with a `sourceId`.
- Implementation tracked in [decisions log](../architecture/decisions.md) Q1–Q3
  and Q7 (per-package).

## References

- Decisions log: `docs/architecture/decisions.md` Q1, Q2, Q3
- Cloud refactor spec: `docs/architecture/cloud-sync-and-refactor.md` D1, D2, D7
- Future cloud contract additions: `.tekmemo/connectors.json` (11th sync unit);
  `GET /v1/projects/:projectId/connectors/:connectorId/secret`
