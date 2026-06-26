# File-First Memory Runtimes for AI Agents: A Reference Architecture

*A short technical note on building durable, auditable, and retrievable long-term memory for AI agents*

---

## Abstract

Production agent platforms (Claude Code, OpenClaw, Manus) have independently converged on plain files as their primary memory substrate, ahead of managed vector databases. This paper argues that file-first memory becomes genuinely intelligent — not just simple — when it follows six disciplines: (1) files are treated as the sole source of truth, with every index built on top of them disposable and rebuildable; (2) intelligence is applied at write time, not just retrieval time; (3) maintenance separates *decay* (mechanical, solved) from *staleness* (semantic, unsolved) and treats them differently; (4) retrieval fuses multiple signals rather than relying on vector similarity alone; (5) the system is distributed through both native tool calling and MCP, which are complementary layers, not alternatives; and (6) the memory store itself is treated as an adversarial attack surface, with write-time filtering and read-time trust-aware retrieval addressing a problem distinct from secrets/PII rejection. The paper closes by naming what remains genuinely unsolved, because a credible memory runtime should be honest about its limits rather than market around them.

---

## 1. Introduction

LLM context windows are finite; agents that persist across sessions need memory that lives outside that window. The default industry answer has been a vector database behind a RAG pipeline. But a quieter pattern has emerged in the highest-traffic production agents: plain markdown files as the memory layer, not a managed embeddings store. This is not a regression to simplicity — done well, it is a stronger foundation than a pure vector store, because files are inspectable, diffable, portable across models, and git-native.

The risk is treating "file-first" as synonymous with "simple." A folder of markdown notes with no further structure is not intelligent; it is just a slower vector database with worse recall. Intelligence in a memory system is not one algorithm — it is a discipline applied at every stage of the pipeline: what gets written, how it's maintained, how it's retrieved, and how it's exposed to agents. This paper lays out that pipeline as a reference architecture.

"100% smart" is used loosely here to mean a system that writes only what is worth keeping, never serves a stale fact with unwarranted confidence, retrieves what's needed without depending on the agent to guess correctly, and remains fully auditable. As Section 10 makes clear, this is closer to a continuous engineering discipline than a state a system reaches once and keeps.

---

## 2. The Invariant: Files as Truth, Index as Disposable

The single highest-leverage architectural decision is separating **storage** from **search**. Memory files (markdown + structured frontmatter) are the canonical record. Every retrieval structure built on top of them — full-text index, vector embeddings, entity graph — is a derived artifact that can be deleted and rebuilt from the files at any time, with no loss of information.

This buys three things directly:

- **Auditability for free.** If the files live in a version-controlled store, every memory write is diffable, attributable, and reversible without any custom versioning logic.
- **Algorithmic freedom.** Because the index is disposable, embedding models, chunking strategies, and ranking algorithms can be swapped or re-tuned aggressively without risking the underlying memory.
- **Portability.** The memory store is not bound to a vendor's database format. Migrating runtimes is a file copy, not an export/import project.

The cost is concurrency. Multiple writers touching the same files at once is the one place this pattern breaks cleanly — addressed in Section 8, not solved by the files themselves.

One scoping note, stated here rather than left implicit: everything in this paper assumes memory content is primarily textual. Multi-modal content — images, audio, uploaded files — can be addressed as linked artifacts referenced from a memory file's frontmatter, but their extraction, indexing, and retrieval raise a separate set of problems this paper does not attempt to cover.

---

## 3. Write-Path Intelligence

Retrieval quality is downstream of write quality. A system with mediocre retrieval over clean memory consistently outperforms one with excellent retrieval over noisy memory. Four disciplines matter at write time:

**Hard rejection before anything else.** A blocklist pass rejects secrets and PII before any other processing touches the content. This is non-negotiable and should run first, not as a downstream filter. In practice this is two layers working together, not one: pattern-matching (regex and format validators) for high-confidence, well-structured cases — API keys, tokens, SSNs, card numbers — and a lightweight classifier for the harder, unstructured cases where PII is embedded in ordinary prose rather than a clean field. The two layers have opposite failure modes worth tracking separately: the pattern layer's risk is false negatives (PII that doesn't match a known shape), the classifier's risk is false positives (legitimate technical content, like a code sample containing a placeholder key, flagged as sensitive). It is worth being explicit that this blocklist defends against *content that is sensitive regardless of who wrote it or why*. That is a narrower and different defense than the one needed against content deliberately crafted to manipulate the agent's future behavior, which Section 9 addresses separately.

**Explicit durability classification.** Each candidate memory is classified as durable (will likely remain true and useful later) or transient (relevant now, not later). This should default to a deterministic, cheap heuristic, with an LLM call reserved for genuinely ambiguous cases — not the other way around, since LLM-classify-everything is expensive and inconsistent at scale. The heuristic should check a small number of concrete signals rather than attempt open-ended judgment: temporal deixis ("today," "right now," "this week" skew transient), syntactic mood (an imperative or one-off logistics statement skews transient; a declarative identity or preference statement skews durable), and a category whitelist (decisions, stated preferences, and identity facts default durable; ephemeral status updates default transient). Disagreement between signals — not the mere absence of a strong one — is what should escalate to the LLM fallback.

**Atomic, structured units.** One memory unit should encode one fact, decision, or preference — not a paragraph that bundles several. Atomicity is what makes deduplication, supersession, and conflict detection precise later in the pipeline. Each unit should carry frontmatter metadata at the moment of creation: identity, timestamp, source, confidence, tags, and entity links. Doing this work at write time — rather than inferring it later from raw text — is what allows reads to stay fast and cheap.

Confidence is the field most often left implicit, and it shouldn't be. A memory's confidence should be a small categorical value (low / medium / high) rather than a free-floating numeric score, assigned at write time from a fixed rule: a fact directly stated by the user, or confirmed by the agent's own verified action, gets high confidence; an agent inference or a single unconfirmed mention gets medium; anything extracted from an untrusted or third-party source gets low by default, regardless of how confidently it reads. Confidence is not the same axis as durability — a fact can be durable and low-confidence at once — and it should move only in response to an explicit event (contradiction, source re-verification, or supersession, Section 4), never by silent decay alongside relevance scoring. Conflating confidence decay with relevance decay is one of the more common ways a system ends up serving a stale fact with unwarranted authority.

**Agent-derived facts as first-class citizens.** Many systems only capture what the user explicitly stated and silently drop the agent's own conclusions or recommendations. This is a real coverage gap: an agent that reasons its way to a conclusion has produced a memory just as legitimate as a user-stated fact, and should write it with the same status.

A practical default for what survives to disk: **everything that clears the blocklist gets written to an immutable record, even if classified transient; durability classification controls what gets indexed for retrieval, not what gets preserved.** Indexing is cheap to redo if a classification was wrong; an unrecorded memory is not recoverable. Recoverability should be the default, indexing eligibility the tunable layer on top of it. This also means a transient-classified record is never truly discarded: a later consolidation pass (Section 4) can promote it into the index retroactively if subsequent context shows it was durable after all — the immutable record is what makes that promotion safe, since nothing has to be reconstructed from scratch.

### 3.1 A Worked Example

The abstractions above are easiest to see in one concrete unit. A single memory file might look like this:

```
---
id: mem_4f2a91
created: 2026-04-12T09:14:00Z
source: user_message
channel: direct_session
durability: durable
confidence: high
tags: [preference, deployment]
entities: [tekmemo, staging-env]
supersedes: null
---
User prefers staging deploys to run on Fridays only, to leave a full
week for monitoring before a weekend.
```

If this preference later changes, the old file is never edited in place — a new file is written and linked back, preserving the audit trail from Section 2:

```
---
id: mem_7c10e3
created: 2026-07-02T16:40:00Z
source: user_message
channel: direct_session
durability: durable
confidence: high
tags: [preference, deployment]
entities: [tekmemo, staging-env]
supersedes: mem_4f2a91
---
User now prefers staging deploys on any weekday, since the team added
automated rollback and no longer needs the Friday buffer.
```

`mem_4f2a91` is not deleted. It is excluded from the retrieval index once superseded, but it remains on disk, diffable in git, and reachable by following the `supersedes` link backwards — which is exactly what makes the trust-order override in Section 5 possible: the system can render "this is current" and "here is what it replaced" from the files alone, with no separate versioning layer.

---

## 4. Maintenance Intelligence

Memory degrades in two distinct ways that are often conflated:

**Decay** is the mechanical, solved problem: memories that are rarely accessed and low in relevance get pruned or down-weighted over time. This can be handled with straightforward access-frequency and recency scoring.

**Staleness** is the hard, unsolved problem: a *high-relevance* memory becomes confidently wrong — a job, an address, a stated preference that has since changed — and the system has no signal that this happened. Staleness is not fixed by a cleverer retrieval algorithm; it is mitigated operationally, by defining expiry or revalidation windows per fact *category* before scale, not after.

A related and easy-to-miss failure mode: if a system treats a written memory as ground truth and that memory happens to be wrong, an agent can build an increasingly confident and increasingly incorrect picture of the world on top of it. A useful guard is to treat repeated contradiction of a memory as a forced re-verification trigger, rather than letting confidence simply decay alongside relevance — being contradicted should *raise*, not lower, the priority of double-checking a fact.

For reconciling conflicting updates, a **writer-critic** pattern is more reliable than a single pass: one model proposes a consolidated update, a second checks it against the original for data loss, hallucination, or incorrect conflict resolution, and only a passing check commits. In a file-first system this pairs naturally with **supersedes-links** rather than silent overwrites — the old file is preserved and explicitly linked from its replacement, preserving the audit trail that git already gives the rest of the system for free.

One caveat worth stating plainly: the reliability gain depends on the critic being a genuinely independent check, not just a second call. A critic drawn from the same model family as the writer shares the same blind spots and biases, so "two LLM calls" is not automatically "independent verification." The data-loss axis specifically — did the update drop an entity, a date, or a qualifier present in the original — is better implemented as a programmatic diff against the original record than as a second model judgment, reserving the critic's LLM call for the harder, genuinely semantic question of whether the conflict was resolved correctly.

---

## 5. Read-Path Intelligence

The most common production mistake is retrieval built on vector similarity alone. The current best practice is **multi-signal fusion** — semantic similarity, keyword (BM25) matching, and entity matching, combined via reranking rather than any single signal used in isolation. The standard fusion mechanism is Reciprocal Rank Fusion (RRF), which operates on ranks rather than raw scores and so avoids the scale-incompatibility problem of averaging a cosine-similarity score directly against a BM25 score (Cormack, Clarke, & Buettcher, 2009).

Hybrid retrieval has been shown to meaningfully outperform either single-signal approach across multiple independent benchmarks, and the gap is largest precisely on the query types embeddings handle worst: a 2026 retrieval benchmark over mixed text-and-table financial documents found fusion improving over both constituent methods on every metric and every dataset subset tested, with the largest single gain — more than eight percentage points of Recall@5 over BM25 alone — on the subset requiring multi-step numerical reasoning, the closest available proxy for the temporal, multi-hop questions ("what changed, and when") this paper is most concerned with (*From BM25 to Corrective RAG*, arXiv:2604.01733, 2026).

Entity awareness does not require a full graph database — entities extracted at write time into a lightweight parallel index, matched against query entities, can boost relevant results without the operational overhead of a graph store. The harder part of this is not extraction but resolution: the same entity referenced by full name in one file, by pronoun in another, and by role title in a third needs to collapse to a single identity for the entity signal to mean anything, and alias/coreference resolution across files written months apart remains the weak point in lightweight entity indexing — not extraction itself.

Two further disciplines at render time:

**Trust order should not override supersession.** A common default renders memory in a fixed trust hierarchy (e.g., core memory, then entity facts, then general recall). This is reasonable as a default, but a recall item that explicitly supersedes a higher-tier fact should be promoted above its normal slot — otherwise a correction can be silently buried beneath the stale fact it's correcting, and models tend to weight earlier-presented context as more authoritative regardless of recency.

**Progressive disclosure over full inlining.** Rendering a summary with an expandable reference, rather than inlining full content by default, is what allows a context budget to scale as the memory store grows instead of degrading linearly with it.

---

## 6. Tiered Memory and the Retrieval-Trigger Problem

A pure "let the agent decide when to retrieve" design is unreliable in practice, because agents do not reliably know what they don't know — they skip retrieval when they need it, or call it reflexively when they don't. The pattern that holds up is tiered, not fully agent-driven, and it has a name: MemGPT's virtual context management framed exactly this problem in operating-system terms, treating an LLM's context window as a constrained physical-memory resource and managing movement between it and a larger external store the way an OS pages between RAM and disk (Packer et al., 2023). What follows is a file-first instantiation of that pattern, where the external store is the versioned file tree from Section 2 rather than a database:

- **Tier 1 — Core/working memory.** A small, curated set, always injected into context automatically. It is excluded from the *dynamic* token budget — meaning it has a fixed, reserved allocation rather than competing turn-by-turn against Tier 2 content for space — not that it is free; it still consumes tokens on every single turn, which is exactly why it must stay small. No agent decision is required to populate it.
- **Tier 2 — Archival/long-tail memory.** Retrieved on demand, either through a cheap automatic baseline pass run every turn (entity/keyword match against the current input, low cost, no agent judgment needed) or an explicit deep-search tool the agent calls when it recognizes a genuine gap.

The quality of that tool's description matters more than is usually assumed: a docstring that states precisely when to call it (and when not to) does most of the practical work that "agent judgment" is often credited with.

---

## 7. Distribution: Tool Calling and MCP

These are not competing choices. Tool calling is the model-level mechanism by which an LLM invokes a function and receives a result. MCP is a standardized protocol built on top of that same mechanism, adding a discovery layer, a transport layer, and a session layer so that any compliant host can use a server's capabilities without custom integration work. Every MCP tool call is still, underneath, a tool call.

The practical split for a memory runtime:

- **Native SDK / direct tool calling** for the hot path — specifically Tier 1 core-memory injection, where latency compounds on every turn and the runtime controls its own process.
- **An MCP server wrapping the same operations** for distribution — write/search/forget exposed as MCP Tools, and individual memory files exposed as MCP Resources (read-only, listable, subscribable), which maps unusually well onto a file-first design since each memory file is already a natural addressable resource.

Worth tracking: the next MCP specification revision moves toward a stateless core that can run behind ordinary load-balancing infrastructure, and adds TTL-based caching to tool and resource list responses — directly relevant to a memory server, since most hosts currently re-fetch a tool list every session even when it rarely changes.

The honest cost of MCP is a real hop — serialization and a process or network boundary — with currently weaker streaming and cancellation semantics than an in-process call. This should be measured, not assumed away.

---

## 8. Concurrency and Consistency

Files are an excellent source of truth for a single writer. They are a liability the moment multiple agents or processes write concurrently, since unguarded concurrent writes can silently corrupt data. The practical split:

- **Single-machine / single-writer:** an advisory file lock is sufficient, provided it includes explicit recovery from a stale lock left behind by a crashed process — this is the most common place local locking schemes quietly fail.
- **Multi-agent / distributed:** a thin transactional layer (an embedded, serializable database) should sit in front of the files and arbitrate writes, rather than letting writers race directly on disk. The files remain canonical; the transactional layer guards the write path, it does not replace the files as the source of truth.

---

## 9. Threat Model: Adversarial and Poisoned Memory

The blocklist in Section 3 solves one problem: content that is sensitive on its face — secrets, PII — should never be written, regardless of who or what produced it. It does not solve a different and increasingly well-documented problem: content that looks ordinary but is deliberately crafted to manipulate the agent's future behavior once it is retrieved. This is memory poisoning, and unlike the secrets/PII case, an attacker does not need write access to the store at all — only the ability to influence what gets classified as durable and indexed.

A 2025 demonstration, MINJA, showed that an agent's memory bank can be corrupted purely through normal query-and-observation interaction, with no direct write access, by crafting inputs designed to produce memory records that later get retrieved against unrelated future queries and steer the agent's reasoning toward an attacker-chosen outcome (Dong et al., 2025). A January 2026 follow-up built and evaluated defenses specifically for memory-based agents: composite trust scoring across multiple independent signals at the input/output boundary, paired with a retrieval-time defense that sanitizes the index using temporal decay and pattern-based filtering (Devarangadi Sunil et al., 2026). That paper's most useful finding for a reference architecture is a negative one: trust-threshold calibration is hard in both directions. Too conservative, and the system rejects legitimate entries wholesale. Too permissive, and subtle attacks pass through unfiltered. There is no calibration-free solution in the current literature.

This sits adjacent to, but is distinct from, the contradiction-trigger mechanism in Section 4. A benign contradiction — an address changes, a preference changes — and an adversarial one — a planted entry engineered to look like a legitimate correction — produce the same surface signal: a new write that conflicts with an existing record. They warrant different responses. Treating every contradiction identically, as Section 4 does in isolation, stops being sufficient once adversarial input is in scope: a forced re-verification step is the right response to a benign contradiction, but an adversarial one needs the trust-scoring treatment above applied *before* it is allowed to compete for the contradiction-resolution slot at all, not after.

Three consequences follow for the write path specifically:

1. **State the blocklist's scope rather than assume it.** It is a known-pattern filter for content that is sensitive regardless of intent. It is not a defense against adversarial intent, and should not be described as one — that requires the trust-scoring layer above, which inspects provenance and behavioral pattern rather than content alone.
2. **Source and channel matter as much as content.** A memory unit derived from a tool call against an untrusted external document (an email, a scraped page, a third-party API response) carries different risk than one derived from a direct, in-session user statement. The `source` field proposed in Section 3 needs to be granular enough to distinguish these, because the trust-scoring layer needs that distinction as an input signal, not an afterthought.
3. **Durability classification is itself part of the attack surface.** An attacker's actual goal is to get a malicious record classified as durable and indexed. A heuristic tuned purely for cost (Section 3) should not be the last checkpoint a record passes before becoming retrievable by other sessions or users.

None of this is fully solved. Calibration between false rejection and missed attacks remains an open empirical question, and the threat model is young enough — most of the literature cited here is less than eighteen months old — that conventions for how memory-runtime vendors should report on it haven't stabilized. What can be said with confidence is the shape of the asymmetry: a file-first architecture's auditability (Section 2) is a genuine asset here, since a poisoned record sitting in a versioned file is forensically traceable in a way a poisoned vector embedding is not. But auditability after the fact is not prevention, and prevention is the part that remains unsolved industry-wide.

---

## 10. Open Problems

A credible account of this architecture should name what it does not solve:

- **Staleness on high-confidence facts** remains algorithmically unsolved industry-wide. The mitigation is operational discipline (per-category expiry policy), not a retrieval trick.
- **Memory poisoning calibration** is unsolved for the same structural reason staleness is (Section 9): there is no algorithmic substitute for an explicit, per-deployment policy choice about acceptable false-rejection versus false-acceptance rates, and the literature on it is new enough that no consensus default yet exists.
- **Evaluation is immature.** The closest standardized benchmarks remain conversation-focused rather than workflow-focused, and are not yet a reliable substitute for a small, domain-specific internal evaluation set tracked over time — recall hit-rate, tokens per retrieval, and latency trend are the leading indicators worth watching.
- **Multi-agent shared-memory governance** — who can write what, how conflicting agent perspectives reconcile, how access is scoped — is largely unaddressed across the field, not just in file-first designs.
- **"100% smart" is not a state a system reaches.** It is a discipline maintained continuously across write quality, maintenance policy, retrieval tuning, and adversarial robustness as the memory store and its usage patterns grow. Any claim otherwise should be treated skeptically.

---

## 11. Reference Architecture Summary

```
                     FILES (source of truth, versioned)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        blocklist →    durability      atomic units +
        hard reject    classification   frontmatter
        (+ adversarial-intent
         trust scoring, §9)
                              │
                              ▼
                    immutable write log
                    (all non-blocklisted writes)
                              │
                              ▼
              DISPOSABLE INDEX (rebuildable, never authoritative)
              BM25 + vector + entity links + temporal metadata
              + trust-aware sanitization at retrieval time (§9)
                              │
                              ▼
                 TIERED READ PATH
        Tier 1: core memory — always injected, fixed allocation
        Tier 2: archival — automatic baseline + on-demand deep search
                              │
                              ▼
           multi-signal retrieval (RRF) → trust-order render
              (supersession overrides trust order)
                              │
                              ▼
                  exposed via native tool calling (hot path)
                  + MCP server: Tools (write/search) +
                                Resources (memory files)
```

---

## References

- Packer, C., Fang, V., Patil, S. G., Lin, K., Wooders, S., & Gonzalez, J. E. (2023). *MemGPT: Towards LLMs as Operating Systems.* arXiv:2310.08560.
- Cormack, G. V., Clarke, C. L. A., & Buettcher, S. (2009). *Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods.* SIGIR 2009.
- *From BM25 to Corrective RAG: Benchmarking Retrieval Strategies for Text-and-Table Documents.* arXiv:2604.01733 (2026).
- Dong, Y. et al. (2025). *MINJA: Memory Injection Attacks on LLM Agents via Query-Only Interaction.* NeurIPS 2025.
- Devarangadi Sunil, B., Sinha, I., Maheshwari, P., Todmal, S., Mallik, S., & Mishra, S. (2026). *Memory Poisoning Attack and Defense on Memory-Based LLM-Agents.* arXiv:2601.05504.
- Mem0. *State of AI Agent Memory 2026: Benchmarks, Architectures & Production Gaps.* mem0.ai/blog/state-of-ai-agent-memory-2026
- Mem0. *Building Production-Ready AI Agents with Scalable Long-Term Memory.* arXiv:2504.19413
- MachineLearningMastery. *The 6 Best AI Agent Memory Frameworks You Should Try in 2026.*
- Atlan. *Best AI Agent Memory Frameworks in 2026: Compared and Ranked.*
- Towards Data Science. *A Practical Guide to Memory for Autonomous LLM Agents.*
- Towards Data Science. *memweave: Zero-Infra AI Agent Memory with Markdown and SQLite — No Vector Database Required.*
- Medium (Micheal Lanham). *The Markdown File That Beat a $50M Vector Database.*
- DEV Community. *AI Agent Memory Management — When Markdown Files Are All You Need?*
- Fountain City. *How to Build AI Agent Memory in 2026.*
- Medium (Tejpal Kumawat). *Agent Memory Systems: A Complete Engineering Guide.*
- Model Context Protocol. *Specification 2025-11-25*, modelcontextprotocol.io
- Model Context Protocol Blog. *The 2026-07-28 MCP Specification Release Candidate.*
- decodethefuture.org. *What Is MCP? Model Context Protocol Explained for 2026.*
- Elastic. *What is the Model Context Protocol (MCP)?*