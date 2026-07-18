---
title: "The Memory Layer for Any AI Agent"
description: "Your coding agent is brilliant and has amnesia. MemoFS gives it durable, portable, file-first memory that works with Claude Code, Codex, Cursor, Copilot, opencode — any agent that speaks hooks or MCP — and syncs across machines and teammates through the cloud. Here's the architecture, and how to wire it into whatever you already use."
date: 2026-07-15
author: Christopher S. Aondona
tags: [architecture, memory, ai-agents, hooks, mcp, cloud, file-first]
cover: null
blog: post
pageClass: blog-post-page
outline: deep
---

Your coding agent is the smartest pair-programmer you've ever had — for exactly one session. Close the tab, and it forgets your stack, the deploy quirk you explained three times, the library you already rejected and why. Tomorrow you re-explain everything. The intelligence is real. The amnesia is structural.

We keep papering over it with bigger context windows. But a context window is working memory, not long-term memory — expensive, capped, and gone the instant it overflows. What agents actually need is a place to *keep* things: decisions, constraints, preferences, the shape of your project. Not a transcript. A memory.

The industry's reflexive answer is "spin up a vector database." We think that's the wrong default — and quietly, so does a growing share of the ecosystem, which keeps converging on something much simpler underneath: **plain files.** MemoFS is the memory runtime built around that insight, and it plugs into whatever agent you already use.

This post is the argument in full: why files beat a database for agent memory, the six disciplines that separate a real memory runtime from a folder of notes, and — the part you can act on today — how to give memory to *any* agent, whether it supports hooks or not, and share that memory across every machine and teammate you have.

## Why not just use a vector database?

Vector search is a genuinely good tool for the problem it was built for: finding relevant passages in a large, mostly-static corpus. Agent memory is a different problem wearing similar clothes.

A vector DB for agent memory means: another service to provision and secure, a vendor format your memories are now trapped in, a query language to learn — and, underneath all of it, an **opaque blob store you cannot read.** "What does my agent actually believe about this project?" has no answer you can `cat`. When a memory goes wrong, you can't diff it, can't blame it, can't roll it back. And most of what an agent needs to remember — "we deploy on Fridays," "use D1 for tenant metadata," "the user prefers dark mode" — are structured facts that never needed cosine similarity in the first place.

Files invert every one of those costs:

- **Inspectable.** `cat .memofs/memory/core.md` shows you exactly what the agent knows. `grep` finds every mention of a decision. Debugging memory becomes debugging text.
- **Versionable.** Git tracks `.memofs/` natively. Your memory's history *is* your repo's history — every write diffable, attributable, reversible, for free.
- **Portable.** Copy a directory. That's the migration. Laptop to CI to production to a teammate's machine, no export/import project, no vendor.
- **Universal.** Every language, every runtime, every editor already reads files. No driver, no ORM, no connection pool.

But here's the trap, and it's the whole reason MemoFS exists: **a folder of markdown notes is not intelligent. It's just a slower vector database with worse recall.** "File-first" only becomes a stronger foundation than a vector store when it's backed by discipline at every stage of the pipeline — what gets written, how it's maintained, how it's retrieved, and how it's exposed. Get that wrong and files are a downgrade. Get it right and they're a superpower.

So what does "right" look like? It comes down to six problems every serious memory system has to solve.

## Six problems a memory system has to solve

These are the disciplines that separate a memory *runtime* from a directory of text. MemoFS is, in essence, an opinionated answer to each.

### 1. Files are the truth. The index is disposable.

The highest-leverage decision in the whole design is separating **storage** from **search.** In MemoFS, the memory files are canonical. Everything built on top of them — the full-text index, the vector embeddings, the entity graph — is a *derived artifact* that can be deleted and rebuilt from the files at any time, with zero loss.

MemoFS lays this out as six memory layers, all living as plain files under `.memofs/`:

| Layer | Files | Purpose |
|-------|-------|---------|
| **Core Memory** | `memory/core.md` | The always-on briefing — project rules, stack, constraints. Loaded every session. |
| **Notes Memory** | `memory/notes.md` | Durable long-form records — decisions, rationale, summaries. Retrieved on demand. |
| **Events** | `events/memory-events.jsonl`, `events/conversations.jsonl` | Append-only audit log + conversation history. |
| **Recall Index** | `indexes/chunks.jsonl`, `indexes/embeddings.jsonl` | BM25 + fuzzy + vector index. Disposable. |
| **Graph** | `graph/nodes.jsonl`, `graph/edges.jsonl` | Entities and relationships, with temporal `supersedes` edges. |
| **Snapshots** | `snapshots/snapshots.jsonl` | Versioned checkpoints for safe rollback. |

Because the index is disposable, you get three things directly. **Auditability for free** — the files live in version control, so every write is diffable and reversible with no custom versioning layer. **Algorithmic freedom** — swap embedding models, re-chunk, re-tune ranking as aggressively as you like; the underlying memory is never at risk. **Portability** — the store isn't bound to anyone's database format.

Run `memofs doctor` and it validates the files and rebuilds what's derived. The files are the database. The runtime is the query engine.

### 2. Intelligence belongs at write time, not just at read time.

Retrieval quality is downstream of write quality. Excellent retrieval over noisy memory loses, every time, to decent retrieval over clean memory. So MemoFS does its hardest thinking *before* anything hits disk.

Every write passes through a gate:

- **Secret rejection, first.** A blocklist pass rejects secrets and PII before any other processing runs. API keys, tokens, card numbers — pattern-matched and refused up front. It's why `memofs remember "my key is sk-..."` won't quietly persist your credentials, and why an AgentFS session that tries to extract a secret into durable memory reports `durableMemoryWritten: false` instead of leaking it.
- **Durability classification.** Each candidate memory is tagged **durable** (likely still true and useful later) or **transient** (relevant now, not later) by a deterministic, zero-config classifier — no LLM call required for the common case. Durable memories get indexed for retrieval; transient ones still land in the append-only audit trail. Nothing worth keeping is lost; only what's worth *surfacing* gets indexed.
- **Atomic, structured units.** One memory encodes one fact, decision, or preference — carrying frontmatter at birth: id, timestamp, source, confidence, tags, entity links. Doing that work at write time is exactly what keeps reads fast and cheap.

The payoff: memory that's clean by construction, not by hopeful cleanup later.

### 3. Decay is easy. Staleness is the hard one — and MemoFS is honest about it.

Memory degrades two ways, and conflating them is a classic mistake.

**Decay** is mechanical and basically solved: rarely-touched, low-relevance memories get down-weighted over time with recency scoring. MemoFS does this.

**Staleness** is the deep one: a *high-relevance* memory becomes confidently wrong. A preference changed. An address moved. The system has no signal it happened, so it keeps serving the stale fact with full authority — and an agent can build an increasingly confident, increasingly wrong picture of your project on top of it.

MemoFS attacks this from several angles without pretending it's fully solved. The graph carries **`supersedes` edges** — when a fact changes, the old record isn't deleted, it's linked from its replacement, so "this is current" and "here's what it replaced" both render from the files alone. `memofs consolidate` (also exposed to agents as a tool) runs a consolidation pass that merges duplicate entities and retires superseded facts. Recency decay down-weights the old. What MemoFS does *not* claim is autonomous re-verification against ground truth — knowing a memory went stale without being told still requires a policy you set per fact category. We'd rather name that limit than market around it.

### 4. Retrieval fuses signals — it doesn't bet everything on vectors.

The most common production mistake is retrieval built on vector similarity alone. Embeddings are great at fuzzy semantic matches and quietly terrible at exact identifiers, rare tokens, and "what changed and when" questions.

MemoFS retrieves through **hybrid recall**: keyword (BM25), fuzzy matching, and vector similarity, combined and then reranked, rather than any single signal used in isolation. Entities extracted at write time form a lightweight parallel index that boosts relevant hits without the operational weight of a graph database.

Two details matter here. First, **it works with zero API keys.** Local mode defaults to lexical retrieval (BM25 + fuzzy), so memory is searchable out of the box with no embedder and no cloud. Turn on local ONNX embeddings and recall upgrades to full hybrid — still no keys, still no network. The vector path is a pure enhancement: if an embedder is missing or fails, writes and recall keep working on the lexical path. Second, retrieval is **task-aware** — `memofs context --task-type debug` biases toward errors and constraints; `--task-type refactor` surfaces architectural decisions. And rather than dumping everything into your context window, `memofs.context` returns a compact ~6 KB briefing with expandable sections, so your budget scales as the store grows instead of degrading with it.

### 5. Distribution isn't tool-calling *or* MCP. It's both.

These get framed as competing choices. They're layers. Tool calling is the model-level mechanism by which an LLM invokes a function; MCP is a standard protocol built on top of that same mechanism, adding discovery and transport so any compliant host can use a server with no custom glue. Every MCP call is, underneath, still a tool call.

MemoFS uses each where it fits. The **SDK / direct calls** handle the hot path — the context injection that happens on every single turn, where latency compounds and you control your own process. The **MCP server** (`@memofs/mcp-server`) handles distribution: the same operations exposed as standard MCP tools and resources, so *any* MCP-capable agent gets memory with no bespoke integration. A file-first design maps onto MCP unusually well — each memory file is already a natural addressable resource.

This is the mechanism behind "works with any agent," and the next section is entirely about it.

### 6. The memory store is an attack surface.

If an agent treats written memory as ground truth, then whoever can influence what gets written can steer the agent's future behavior. This is memory poisoning, and it's distinct from the secrets/PII problem — the content looks ordinary; it's crafted to manipulate on retrieval.

MemoFS ships the parts that are genuinely solved and is candid about the parts that aren't. The secret/PII blocklist (Problem 2) is real and runs first. Every memory carries a `source` and channel, so a fact scraped from an untrusted external document is distinguishable from one you stated directly in-session — the raw material any trust-scoring layer needs. And the file-first architecture is a real asset here: a poisoned record sitting in a versioned file is **forensically traceable** in a way a poisoned vector embedding never is. What remains unsolved industry-wide — calibrating trust-scoring to reject attacks without rejecting legitimate corrections — MemoFS names as an open problem rather than a checkbox. Auditability after the fact isn't prevention. But it's a foundation the blob-store approach simply doesn't have.

---

Those six are the architecture. Now the part you can use this time of the day.

## Give memory to the agent you already use

Here's the reframe that matters: **MemoFS is not another agent.** It's a memory layer that clips onto the agent you already have. And it does that in whatever way your agent supports — from fully automatic to a couple of tool calls.

One command sets up everything for a supported platform:

```bash
npm i -g @memofs/cli    # or: npx memofs ...
memofs init             # creates .memofs/ in your project
memofs generate agent claude --project-name "My App"
```

That last command emits three things: a rules file, the platform hooks, and the MCP server config — merged safely into whatever config you already have. What each agent gets depends on what it can do.

### Agents with hooks: zero-touch memory

Some coding agents expose lifecycle hooks — code that runs at session start, when a subagent spawns, around context compaction, and at session end. For these, MemoFS memory is **completely automatic.** You never call a tool by hand.

Today that's **Claude Code**, **Codex**, and **opencode**. For Claude Code and Codex, `memofs generate agent` wires up four behaviors:

| Moment | What happens |
|--------|--------------|
| **Session start** | MemoFS injects your project context — core memory + relevant recall — straight into the model's context. (If cloud credentials are set, it pulls the latest first.) |
| **Subagent start** | Every subagent inherits the same memory. No amnesiac helpers. |
| **After compaction** | When the context window compacts, memory is re-injected — so the very act of summarizing doesn't erase what the agent knew. |
| **Session end** | A compliance summary tells you whether the agent loaded context, consulted memory, and persisted new facts this session. |

The compaction-survival hook is the quiet hero. Long agent sessions inevitably compact their context to stay under the window — and that's precisely when hard-won project knowledge gets summarized into oblivion. MemoFS treats compaction as a re-injection point, so memory outlives the very mechanism that would otherwise destroy it.

The result: you open Claude Code the next morning and it *already knows* your stack, your constraints, the decisions from last week — because the memory was injected before you typed a word.

> A note on honesty: opencode's plugin system can run side effects (cloud pull, session markers, an end-of-session status toast) but can't inject model-visible context the way Claude Code and Codex can. So on opencode, MemoFS handles the automatic parts it *can* and its rules file keeps the "call `memofs.context` yourself" phrasing rather than pretending context is auto-loaded. The tool tells you the truth about what your platform supports.

### Agents without usable hooks: memory via MCP

Plenty of excellent agents don't have context-injecting hooks — **Cursor**, **Gemini CLI**, **GitHub Copilot**. That's completely fine. They speak MCP, and MCP is all MemoFS needs.

```bash
memofs generate mcp cursor      # writes .cursor/mcp.json & .cursor/rules/memofs.mdc
memofs generate mcp copilot     # writes .vscode/mcp.json & .github/copilot-instructions.md
memofs generate mcp gemini      # writes .gemini/settings.json & GEMINI.md
```

That registers the MemoFS MCP server, which exposes memory as standard tools the agent calls when it needs them. The rules file MemoFS also generates instructs the agent to load context at the start of a task, recall before answering, and persist decisions as it makes them. Slightly less magic than hooks — the agent asks for memory instead of having it handed over — but the exact same memory, the exact same intelligence pipeline underneath.

### Any MCP client at all: ten tools and a file tree

Because it's plain MCP over stdio, MemoFS works with *anything* that speaks the protocol — Claude Desktop, Zed, your own custom client. `npx -y @memofs/mcp-server` and you're live. The server exposes:

**Four memory verbs:**

- `memofs.context` — build a task-ready briefing (core + recall + recent + notes)
- `memofs.recall` — hybrid semantic + lexical search over memory
- `memofs.remember` — persist a durable decision, constraint, preference, or note
- `memofs.consolidate` — run the graph consolidation pass

**Six AgentFS session tools** for agents doing real multi-step work — start a session workspace, read/write/append files in it, then extract durable memory and complete. The agent works in a scratch space and MemoFS distills what's worth keeping into permanent memory at the end.

Plus memory files as MCP **resources** (`memofs://memory/core`, `memofs://graph/nodes`, and more) that clients can read, list, and subscribe to — the file-first design paying off again, since every memory file is already an addressable resource.

### In your own code: the SDK

Building your own agent rather than using someone else's? Skip the protocol entirely and call the runtime directly:

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
  projectId: "my-agent",
  mode: "local",
});
await memo.bootstrap();

// Persist a durable fact — passes the write gate (secret filter + durability classify)
await memo.notes.record({ content: "Use D1 for tenant metadata.", kind: "decision" });

// Recall for a task — hybrid retrieval, works offline, no API keys
const hits = await memo.recall("database decisions");

// Or get a packed, task-ready briefing to drop into your prompt
const context = await memo.context({ query: "fix the auth bug", taskType: "debug" });
```

The full surface is namespaced and honest about what it does: `memo.core`, `memo.notes`, `memo.graph`, `memo.snapshots`, `memo.agentfs`, `memo.sync`. It runs on Node and on Cloudflare Workers. Core never imports a vendor package — embedders, rerankers, and extractors are provider-neutral contracts, and adapters (OpenAI, Voyage, Transformers.js, and more) plug in only if you want them. No lock-in hiding in a transitive dependency.

## One brain, every machine, your whole team

Local memory is the foundation. But a memory that only exists on one laptop isn't a memory you can build on. This is where MemoFS Cloud comes in — and its design is deliberately, almost aggressively, boring in the best way.

**The sync path is a file replica, not an engine.** It stores byte-for-byte copies of your `.memofs/` files and syncs them by path and content hash — it never parses, indexes, or embeds what it carries. All the local intelligence stays local, on your machine, where it's fast and private. The sync layer's only job is to make your files *fresh everywhere.* That's a freshness enhancement, not an intelligence transplant — and it means your memory works identically whether the cloud is reachable or not. (The optional hosted runtime — the same open-source engine, run for you in the cloud dashboard — is a separate, opt-in surface; when you use it, it processes those projects' content solely to power recall and consolidation for you.)

Sync is explicit and content-addressed:

```bash
memofs cloud sync push     # upload changed files (diffed by hash)
memofs cloud sync pull      # fetch what you're missing or behind on
memofs cloud sync status    # manifest, cursor, storage
```

Push is a two-phase, hash-verified protocol: it uploads only the files that actually changed (identical content dedupes automatically), and the server verifies every hash before committing. Concurrent pushes from multiple agents to the same project are serialized server-side, so two agents can't corrupt each other's writes — a contended write just backs off and retries. And crucially, **the automatic hooks only ever *pull*.** Pushing is always a conscious act. One session's half-baked "decision" can't silently pollute your teammates' memory; you decide what becomes shared truth.

That unlocks the things people actually want:

- **Multi-device.** Start a design on your laptop, `pull` on your workstation, and the agent there already knows everything.
- **Multi-agent.** Point Claude Code, Cursor, and a custom SDK agent at the same project. They read from one shared brain and write back to it. Your Codex session benefits from what your Claude Code session learned.
- **Teams.** A team is the unit of shared memory. Invite teammates, and everyone's agents draw on the same project knowledge — onboarding a new engineer means their agent inherits months of accumulated context on day one, instead of them re-discovering it the hard way.

For hosted setups, a cloud MCP endpoint is coming soon — one URL plus a bearer API key, read-only by default — so you'll be able to give an agent on a checkout-less machine read access to shared memory without handing it write privileges.

## It's not just for coding

Everything above frames MemoFS around coding agents because that's where the amnesia stings most. But the runtime doesn't care what kind of agent you're building. A support agent that needs to remember a customer's history, a research assistant that accumulates findings across sessions, a personal agent that learns your preferences — they all have the same shape of problem, and the same six disciplines apply. `@memofs/core` is the memory layer; the agent on top is yours.

And memory doesn't only come from conversations. **Connectors** pull external context into the same file-first store — GitHub issues and PRs, Notion pages — normalized into memory your agent can recall, with a strict rule: tokens are resolved at runtime and *never* written to the files that sync. Your project's issue tracker becomes something your agent actually remembers, not something it re-fetches blind every time.

## What we haven't solved yet

A memory system that claims to be finished is lying. In the spirit of Problem 3 and Problem 6, here's what's still open — and, where it's on the [roadmap](/community/roadmap), where it's headed.

- **Staleness on high-confidence facts.** Today MemoFS mitigates it (supersession, consolidation, recency decay) but doesn't autonomously re-verify a confident memory against reality. This one is actively being worked: **per-kind staleness windows** (facts expire on a schedule that matches their kind — identity lasts a year, logistics a week, flagged inline at query time) are in the *Now* phase, with **model-driven staleness re-verification** and parseable **validity windows** queued behind them.
- **Memory-poisoning calibration.** The blocklist stops secrets, not adversarial intent — and trust-scoring against crafted, manipulative memories has no calibration-free solution in the current literature. But the building blocks are a whole planned phase: **write-channel provenance** (a required `channel` on every write that sets default confidence), a **trust gate** that holds suspicious writes out of the recall index while keeping them in the audit trail, a `pending_verification` lifecycle, and a **second-layer PII classifier** layered against the blocklist. Provenance-aware, not solved — but moving.
- **Fully automatic context on every platform.** Agents without context-injecting hooks (Cursor, Gemini, Copilot) rely on the agent *calling* tools rather than having context handed to it. This is the one genuine limit we can't roadmap away: it's an upstream platform capability gap. When those agents add session-start context hooks, MemoFS is ready to use them — until then, MCP tools + a rules file is the honest best we can do, and it works well.

We'd rather ship these as named limits than bury them, and tell you plainly which are moving and which are blocked upstream. A memory you can audit is a memory you can trust — and part of trust is knowing exactly where the edges are, and which ones we're actively pushing outward. The full picture lives on the [public roadmap](/community/roadmap).

## Start remembering

Five minutes, no cloud account required:

```bash
npm i -g @memofs/cli           # the runtime
npx memofs init                # scaffold .memofs/ in your project
memofs generate agent claude   # wire up hooks + MCP for your agent
```

Then open your agent and watch it start the next session already knowing your project.

- **Core runtime** — `@memofs/core` · [docs](/packages/core/)
- **CLI** — `npx memofs` · [commands](/packages/cli/)
- **MCP server** (Claude Code, Cursor, Codex, Copilot, opencode, Zed, any MCP client) — `npx -y @memofs/mcp-server` · [setup](/packages/mcp/)
- **Connectors** — GitHub, Notion, and your own · [docs](/packages/connectors/)

---

*Building agents that remember? Tell us what you're building — and which memory primitives you're still missing. [Open a discussion](https://github.com/memo-fs/memofs/discussions) or [file an issue](https://github.com/memo-fs/memofs/issues).*