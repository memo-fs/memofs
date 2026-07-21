---
title: Roadmap
description: What's coming to MemoFS — the open-source memory runtime, adapters, and CLI.
sidebar: false
---

# Roadmap

This roadmap covers the **open-source MemoFS runtime** — the core memory engine,
provider adapters, and CLI. It's ordered by what ships first: each phase below
is unblocked and actively being worked, then builds on the phase before it.

One principle runs through everything: **the deterministic floor always works.**
Every intelligence feature has a rule-based path that runs with no API key and
no model. An LLM, when you configure one, is an upgrade layered on top — never a
requirement.

::: tip Following along
Landed work is written up in the [changelog](/community/changelog). Want to help
ship an item? See [contributing](/community/contributing).
:::

## Now — Smarter deterministic retrieval

Sharpening the zero-dependency recall and consolidation path so the free,
offline floor is genuinely good on its own.

- [ ] **Reciprocal Rank Fusion** — replace weighted-score blending with RRF so
  vector and lexical results merge by rank, not by scale. Swapping embedders no
  longer breaks fusion.
- [ ] **Per-kind staleness windows** — facts expire on a schedule that matches
  their kind (identity lasts a year, logistics a week). Stale facts are flagged
  inline at query time, no background job.
- [ ] **Entity coreference** — alias enrichment from parentheticals and
  abbreviations at write time, plus token-Jaccard matching at read time, so
  "React" and "React.js" resolve to one entity while "React Native" stays
  distinct.
- [ ] **Adaptive baseline recall** — the fast path skips the vector-embed and
  reranker API calls on turns that don't need deep retrieval, and falls back to
  pure BM25 when no embedder is configured.
- [ ] **Restructured durability classifier** — hard gates plus soft votes
  (temporal deixis and syntactic mood signals) decide whether a memory is
  durable, transient, or ambiguous — with a deterministic tie-breaker.
- [ ] **Consolidation diff gate** — a deterministic structural diff rejects
  merge proposals that drop entities, dates, or negation markers before any
  model is consulted.

## Next — LLM-enhanced intelligence

Optional, provider-pluggable upgrades. Each stage checks for a configured
`LlmClient` and cleanly falls back to the deterministic path when none is
present.

- [ ] **LlmClient adapters** — Workers AI and OpenAI implementations with
  defensive parsing (malformed model output degrades to plain text, never
  throws).
- [ ] **LLM-enhanced retrieval strategist** — query rewrite, entity resolution,
  result filtering, and budget allocation, each with a deterministic fallback.
- [ ] **Writer–critic consolidation** — a second semantic pass proposes merges
  and supersessions for near-duplicate facts that exact-match logic misses.
- [ ] **Staleness re-verification** — the model re-checks flagged-stale facts
  against current memory and either clears the flag or marks them for
  retirement.

## Next — More provider adapters

Self-host on your own stack. Every adapter passes the shared contract suite, so
they're drop-in.

- [ ] **S3 blob adapter** — native `@aws-sdk/client-s3` blob storage, a drop-in
  alternative to R2.
- [ ] **Postgres metadata adapter** — a `pg`-backed metadata store with
  transactional concurrency, replicating the Turso schema.
- [ ] **OpenAI extractor + LlmClient** — completes the canonical self-host
  bundle: S3 + Postgres + OpenAI.

## Next — Trust, safety & temporal validity

Provenance-aware writes and richer fact lifecycles.

- [ ] **Write channel provenance** — a required `channel` on every write
  (direct session, agent inference, tool call, connector, untrusted external)
  that sets default confidence.
- [ ] **Trust gate** — suspicious writes (e.g. an untrusted source superseding a
  direct-session fact) are recorded in the audit trail but held out of the
  recall index.
- [ ] **`pending_verification` lifecycle** — held records live in notes,
  surface in recent-memory listings, and clear or retire through the existing
  staleness machinery.
- [ ] **Second-layer PII regex classifier** — deterministic detectors (email,
  phone, SSN, card via Luhn, IP, address) layered against the blocklist; both
  must pass for a write to proceed.
- [ ] **Promote-on-supersession** — a correction that supersedes a higher-tier
  fact is lifted above it in recall so it isn't buried under the stale fact.
- [ ] **Validity windows** — parseable temporal deixis ("this week", "tomorrow")
  sets `validUntil`, making a fact durable-with-expiry and auto-filtered at
  query time.

## Recently shipped

**Agent behavior enforcement** — a four-layer system that ensures agents load,
consult, and persist memory every session: a task-type-aware context command, a
`status` compliance command, and `generate agent` hook emitters for Claude Code,
Codex, Cursor, and opencode. See the [changelog](/community/changelog) for the
full write-up.