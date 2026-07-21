---
title: Changelog
description: All notable changes to MemoFS cloud and packages.
sidebar: false
pageClass: changelog-page
---

# Changelog

All notable changes to MemoFS cloud and packages are documented here.

<NewsletterSignup event="changelog" title="Get release notes by email" description="Be the first to know when a new version ships." />

## Unreleased

No unreleased changes.

## v1.1.0-beta.1 — 2026-07-21

Persistence and async-hashing hardening across core, CLI, and connectors, plus a four-layer system that enforces agent memory use across every session.

### Core Reliability

#### Fixed
- Filesystem-backed recall and graph stores now hydrate before mutating, so a
  fresh process preserves previously persisted documents and graph nodes.
- Local filesystem locks publish atomically, retain live holders regardless of
  age, and release only the lock instance that owns the file.
- Remote-blob append now surfaces a missing referenced blob instead of
  overwriting the manifest with partial content.
- Durable AgentFS memory writes now surface storage failures instead of
  reporting an incomplete session as successful.

#### Changed
- `sha256Hex` now returns `Promise<string>` and uses Web Crypto, making the
  root core entry Worker-loadable without a static `node:crypto` dependency.

### Connectors

#### Fixed
- `connectorNoteId` is now `async` and awaits `sha256Hex`, fixing the dedup
  key used by the connector runner. The prior sync call sliced a `Promise`,
  which made every connector write produce garbage note ids, broke re-run
  dedup, and blocked `tsc` and `prepack` from completing.

#### Changed
- The built-in GitHub and Notion fetchers now share a single
  request-timeout/abort helper module instead of each carrying its own copy —
  same `30 s` timeout and abort handling, one source of truth.
- The built-in GitHub and Notion connectors now share normalization
  primitives (`truncate`, `formatContent`, `resolveLimit`,
  `MAX_BODY_CHARS`, `PAGE_SIZE`, `DEFAULT_LIMIT`) from a shared module, with
  `MAX_BODY_CHARS` re-exported from each connector's normalize entry point so
  existing test and consumer imports keep working.

### Agent Behavior Enforcement

A four-layer system that ensures agents load, consult, and persist MemoFS memory at
every session.

#### Added
- A task-type enum with a guard and constants, exported from the core package — the
  strategist augments the recall query per task type so task-relevant memories surface
  first.
- The context input now carries a task type field so the strategist rewrites the recall
  query using lexicon expansion and task-specific prepends.
- The status command reads the memory events log and renders a compliance summary
  showing whether the agent loaded context, consulted memory, and persisted facts.
- The context command accepts a task-type flag, validates it against the task-type
  enum, and passes through for strategist query augmentation.
- The context command accepts a mark-session-start flag that writes an indexed event
  with a session-start hook marker so the status command can find the session boundary.
- The generate agent command emits a slimmed rules file, platform-specific hooks, and
  a git-conventions copy in one command.
- The generate agent-hooks command emits SessionStart, PreCompact, and Stop hook
  configuration for Claude Code, Codex, Cursor, and opencode.
- Opencode target support across all generate commands.
- Platform-local rules directory creation with a git-conventions copy on all generate
  commands.
- The MCP context tool now accepts an optional task type parameter, validated via the
  task-type guard from the core package.
- A SessionStart hook injects MemoFS context at session start, fail-closed on
  supported platforms.
- A SubagentStart hook injects context into subagent sessions.
- A PreCompact hook re-injects context after conversation compaction.
- A Stop hook runs the status command and displays the compliance summary at session
  end.
- Per-platform hook emitters for Claude Code, Codex, Cursor, and opencode, each using
  the appropriate platform mechanism.

#### Changed
- Workspace initialization now also writes a config file with a schema reference;
  previously only the config init subcommand did this.
- The schema pointer in the config file now resolves from the installed CLI package
  instead of a versioned docs URL, eliminating version drift and a separate publishing
  step.
- Agent rules generation now uses markdown template files as the single source of
  truth, inlined at build time, instead of hardcoding markdown in TypeScript.
- Generated instructions files now include Workspace Rules and Pointers sections with
  a Git conventions link to the platform-local rules directory.
- The agent-rules generation targets table now includes opencode, covering both the
  agent instructions file and the MCP configuration file.

#### Fixed
- The cloud `computeLocalManifest` call now awaits `sha256Hex`, so manifest
  hashes are real digests instead of serialized `Promise` objects. The prior
  sync call silently produced invalid manifests and blocked `tsc` from passing.

#### Removed
- The versioned schema URL function — replaced by a resolver that locates the schema
  in the installed CLI package.
- The schema versioning script — the schema now ships with the CLI package.

## v1.0.0-beta.2 — 2026-07-10

First public beta.

### Core

#### Added
- A provider-neutral memory runtime client with file-first architecture — local
  workspace directories are the canonical memory store.
- An AgentFS virtual filesystem for project memory files, with working and output
  area segregation.
- A hybrid recall pipeline combining BM25, fuzzy, and vector channels with pluggable
  embedders, rerankers, and recall stores.
- Durable graph memory with nodes, edges, versioned snapshots, and merge-free writes.
- Provider contracts for embedders, rerankers, recall stores, extractors, LLM
  clients, and memory stores.
- A local filesystem-backed memory store behind a dedicated subpath export, for
  production use.
- An in-memory store for tests and transient sessions.

### CLI

#### Added
- A workspace initialization command that sets up the local memory directory.
- A remember command that persists durable decisions, constraints, goals, preferences,
  and notes.
- A recall command that runs semantic and lexical hybrid search over memory.
- A context command that builds task-ready memory context from core memory, recall
  results, recent events, and notes.
- An inspect command that shows current memory state.
- A consolidate command that runs a graph consolidation pass — merging duplicates and
  retiring superseded facts.
- A sync command that pushes and pulls workspace files to and from MemoFS Cloud in
  hybrid mode.
- Global flags for root directory, runtime, cloud URL, API key, workspace and project
  IDs, timeout, JSON output, verbosity, quiet mode, and color control.

### MCP Server

#### Added
- Four memory tools: context, recall, remember, and consolidate.
- Six AgentFS session tools for starting, reading, writing, appending, extracting, and
  completing sessions.
- Nine MCP resources covering health, context, core memory, notes, recent memory,
  graph nodes and edges, and per-session context and durable memory.
- Runtime flags for root directory, project ID, cloud URL, API key, read-only mode,
  and write permission.
- Environment-variable support for all runtime and authentication configuration.

### Server

#### Added
- A self-hostable, provider-neutral hosted-memory server, shipped as both a Node
  binary and a Worker subpath.
- A hosted runtime factory accepting a required store and optional embedder, reranker,
  extractor, and LLM client.
- Deterministic defaults for every intelligence slot: lexical-only recall, token-
  overlap reranker, rule-based extractor, and a regex/deterministic LLM strategist.
- A server binary with bearer authentication via server token and require-auth
  environment variables.
- JSON-RPC 2.0 transport over HTTP, available at the root or a dedicated RPC path.

### Adapters

#### Added
- An OpenAI embedder adapter supporting three embedding models.
- A Voyage AI embedder and reranker adapter with no separate SDK dependency.
- A local Transformers.js ONNX embedder adapter requiring no API key or cloud
  service.
- A Cloudflare R2 blob storage adapter.
- A Turso/libSQL metadata store adapter.
- A Cloudflare Workers AI frontier extractor adapter.
- A Vercel AI SDK runtime bridge adapter with tool definitions and context builders.

### Connectors

#### Added
- A local-only ingestion framework for external sources such as GitHub and Notion.
- A secret resolver for runtime token resolution — tokens are never written to disk.
- A connector runner that emits through the local engine with connector-write
  discipline: explicit source label, content-derived identifiers, and stable source
  references.

### Shared Utilities

#### Added
- A dependency-free JSON-RPC 2.0 protocol package with types, parsers, validation,
  and response helpers.
- A testing package with contract tests, fakes, and fixtures for adapter authors.
- A benchmark kit with benchmarks, runners, statistical analysis, and markdown
  reporters.
