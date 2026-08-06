---
title: Changelog
description: All notable changes to MemoFS & MemoFS Cloud.
sidebar: false
pageClass: changelog-page
---

# Changelog

All notable changes to MemoFS & MemoFS Cloud are documented here.

<NewsletterSignup event="changelog" title="Get release notes by email" description="Be the first to know when a new version ships." />

## Unreleased

Upcoming updates and improvements.

## v1.2.0-beta.3 — August 6, 2026

Vercel AI SDK adapter schema refactoring, CLI UI/UX progress indicators, and terminal signal handling.

### Adapters

#### Fixed
- Refactored the Vercel AI SDK tool input schema to a root object format, fixing tool-calling compatibility with OpenAI, Anthropic, and Google Gemini models.
- Exposed both parameters and inputSchema fields on the memory tool definition for full compatibility across Vercel AI SDK versions.

### CLI

#### Added
- Added zero-dependency TTY step spinners and itemized progress bars for long-running cloud sync operations.
- Added animated progress feedback during workspace integrity diagnostics and external connector runs.
- Added SIGINT and SIGTERM terminal signal handlers to gracefully restore cursor visibility and handle cancellation.
- Added automatic visual animation suppression when output is piped, NO_COLOR is set, or JSON mode is active.

## v1.2.0-beta.2 — July 26, 2026

Project manifest fallback, global CLI flag polish, and cloud sync snapshot fixes.

### Core

#### Fixed
- Improved project ID resolution so local workspace operations automatically fall back to the project manifest when omitted in configuration or flags.

### CLI

#### Added
- Added short flag support for global project ID selection across all cloud and sync subcommands.

#### Fixed
- Fixed an issue during cloud sync pulls where mandatory pre-sync snapshots were skipped prior to overwriting local workspace files.
- Fixed cloud sync push to properly forward explicit base cursor values when confirming upload completion.

## v1.2.0-beta.1 — July 25, 2026

Core hardening, recall improvements, connector enhancements, and cloud app release.

### Cloud

#### Added
- [MemoFS Cloud](https://memofs.dev) is now live!.

### Core

#### Fixed
- Fixed a rare bug where two memory graph nodes could collide and silently overwrite each other.
- Fixed a rare bug where two snapshots created in quick succession could end up with the same ID.
- Fixed an issue where a failed write could leave the memory graph in a partially updated state instead of rolling back cleanly.
- Fixed a file-locking bug on macOS that could stall under heavy load.
- Fixed entity matching so short terms like "db" no longer incorrectly match unrelated longer words.
- Fixed an issue where combining results from different memory sources could drop metadata.

#### Changed
- Reduced memory growth during long-running sessions by capping internal caches.
- Improved consistency between search and ranking so results match more reliably.
- Improved search relevance for headings made up of multiple words.
- Improved recall so results aren't held back when only one search method (keyword or vector) finds matches.
- Improved reliability of context building across more JavaScript runtimes, including web workers.
- Added optional logging for background operations like indexing and graph updates, to make debugging easier.
- The recall pipeline now automatically resolves the appropriate recall store without requiring manual configuration.

### CLI

#### Fixed
- Fixed an incorrect default schema URL in generated configuration files.

#### Changed
- Optimized runtime configuration and commander option handling for lower startup overhead.

### MCP Server

#### Added
- Non-blocking HuggingFace model prewarming on server startup when `localEmbeddings` is enabled, eliminating cold-start latency on the first memory tool call.
- Progress updates output to `stderr` during initial model weight downloads (`[memofs] Downloading local embedding model weights...`).

#### Changed
- Increased default per-tool request timeout from 30s to 60s to prevent false timeout failures during first-time weight downloads on slower connections.

### Connectors

#### Added
- GitHub Discussions connector now maps the discussion category as a label on the resulting note.

### Agents / Hosted MCP

- Documentation updated for the agent generation and hook commands introduced in `1.1.0-beta.1` (agent rules and getting-started guides).

## v1.1.0-beta.1 — July 21, 2026

Persistence and reliability improvements across the core, CLI, and connectors — plus a new system that helps coding agents consistently load and use memory throughout a session.

### Core Reliability

#### Fixed
- Fixed an issue where restarting could cause previously saved memory and graph data to appear lost.
- Fixed file-locking bugs that could cause conflicts between concurrent sessions.
- Fixed a bug where missing remote data could silently corrupt a saved record instead of raising an error.
- Fixed an issue where a failed memory write could be incorrectly reported as successful.

#### Changed
- Improved compatibility so core hashing now works in more JavaScript environments, including web workers.

### Connectors

#### Fixed
- Fixed a bug in connector duplicate-detection that could cause repeated notes to be created on re-runs.

#### Changed
- Unified timeout and retry handling across the built-in GitHub and Notion connectors for more consistent behavior.
- Simplified shared formatting logic between the GitHub and Notion connectors.

### Agent Behavior Enforcement

A new system that helps coding agents reliably load, consult, and save memory throughout a session.

#### Added
- Session hooks for Claude Code, Codex, Cursor, and opencode that automatically load memory context at the start of a session, refresh it after long-conversation compaction, and summarize memory usage when a session ends.
- A compliance summary showing whether an agent loaded context, consulted memory, and saved new information during a session.
- Task-aware memory retrieval, so agents get more relevant results based on the kind of work they're doing.
- Support for opencode across all agent generation commands.

#### Changed
- Workspace initialization now also generates a schema reference for editor validation and autocomplete.
- Config schema references now resolve from your installed CLI version instead of a versioned docs URL, so they can't drift out of sync.
- Generated agent instructions now include clearer workspace rules and links to project conventions.

#### Fixed
- Fixed an issue in Cloud sync where file manifests could be generated incorrectly.

#### Removed
- The old versioned schema URL system, replaced by local schema resolution.

## v1.0.0-beta.2 — July 10, 2026

First public beta.

### Core

#### Added
- A file-first memory runtime — memory lives in your local workspace as the source of truth, not a database.
- A virtual filesystem for project memory, with separate working and output areas.
- A hybrid recall pipeline combining keyword, fuzzy, and vector search with pluggable embedders and rerankers.
- Durable graph memory with nodes, edges, versioned snapshots, and conflict-free writes.
- Support for pluggable embedders, rerankers, recall stores, extractors, and LLM clients.
- A local filesystem-backed memory store for production use, and an in-memory store for testing.

### CLI

#### Added
- A command to initialize a local memory workspace.
- A command to save durable decisions, constraints, goals, and preferences.
- A command to run hybrid semantic and keyword search over memory.
- A command to build task-ready context from core memory, recall results, and recent notes.
- A command to inspect current memory state.
- A command to consolidate memory — merging duplicates and retiring outdated facts.
- A command to sync workspace files with MemoFS Cloud.

### MCP Server

#### Added
- Four memory tools: context, recall, remember, and consolidate.
- Six session tools for starting, reading, writing, appending, extracting, and completing agent sessions.
- Nine resources covering health, context, core memory, notes, recent memory, and graph nodes and edges.
- Configurable via runtime flags or environment variables, with a read-only mode.

### Server

#### Added
- A self-hostable, provider-neutral memory server, available as a Node binary or a Cloudflare Worker.
- Deterministic defaults for every component — keyword-only recall, token-overlap reranking, rule-based extraction — so it works out of the box with no external API keys required.
- Bearer-token authentication.
- JSON-RPC 2.0 over HTTP.

### Adapters

#### Added
- OpenAI embeddings (three models supported).
- Voyage AI embeddings and reranking.
- Local embeddings via Transformers.js — no API key or cloud service required.
- Cloudflare R2 for blob storage.
- Turso/libSQL for metadata storage.
- Cloudflare Workers AI for entity extraction.
- A Vercel AI SDK bridge with tool definitions and context builders.

### Connectors

#### Added
- A local ingestion framework for external sources like GitHub and Notion.
- Secure token handling — credentials are never written to disk.
- Deduplication and stable source references for imported content.

### Shared Utilities

#### Added
- A dependency-free JSON-RPC 2.0 protocol package.
- A testing package with contract tests and fixtures for building your own adapters.
- A benchmarking kit with statistical analysis and markdown reporting.