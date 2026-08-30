# @memofs/cli

## Unreleased

### Minor Changes

- `.memofs/connectors.json` now has a JSON schema, shipped with the CLI at `schema/connectors.json` and exposed via the `@memofs/cli/schema/connectors.json` package export. It mirrors the runtime validator's contract: required `id`/`type`/`secretRef`, optional `enabled`/`schedule`/`sourceMapping`, and no additional properties — so token-shaped fields and typos are flagged in the editor before they ever reach the runtime guardrails.
- `memofs connectors add` and `memofs connectors remove` stamp a `$schema` reference into the file on every write, giving editors validation and autocomplete the same way `config.json` already gets them. The reference prefers the portable `../node_modules/@memofs/cli/schema/connectors.json` path when the CLI package is installed under the project root, and falls back to the hosted copy at `https://docs.memofs.dev/schema/connectors.json` otherwise.
- `memofs init` now predownloads the local embedding model into the shared cache, so the weights are already on disk by the time an agent connects to the MCP server (previously the download started at MCP server boot). The predownload resolves `@memofs/adapter-transformers` from the project's own `node_modules` — where `@memofs/mcp-server` installs it — without the CLI taking a hard dependency on the adapter. Pass `--no-embeddings` (or set `MEMOFS_SKIP_MODEL_DOWNLOAD=1`) to skip it; `--json` mode reports the outcome as a structured `embeddings` field instead of progress output.
- `memofs init` (and `memofs config init`) now write `recall: { engine: "auto", localEmbeddings: true }` into `.memofs/config.json` explicitly. This unifies the local-mode default in the file, and matches the init-time predownload so hybrid recall is on before the MCP server connects.

### Patch Changes

- Updated the CLI config JSON schema description and documentation to reflect the new default local embedding model (`Xenova/bge-small-en-v1.5`) and q8 weights.

## 1.3.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.2

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.1

### Minor Changes

- Added a CLI command (`memofs migrate anchors`) to backfill anchor metadata onto existing structured note entries by parsing file and symbol references.
- Added a CLI command option (`memofs consolidate --archive-deprecated`) to move deprecated memory entries into cold storage archive files and remove them from active recall indexes.
- Added a CLI command (`memofs restore <id>`) to restore archived memory records back to active memory files and reactivate their graph node status.
- Added archived and restored audit event logging to memory events.
- Added a fix option (`--fix`) to the doctor command to automatically consolidate memory graph nodes and move deprecated memory entries into cold storage archive files.
- Added a diagnostic check to the doctor command that warns when deprecated memory entries are pending archive.
- Strengthened generated agent rules files so the MemoFS memory workflow is binding rather than advisory, adding strict requirement headings, forbidding unverified assumptions, and adding task completion memory checks.
- Generating agent rules targets now emits only the primary instructions file, while umbrella agent generation commands produce local workspace rules directories and git conventions files.
- Generating Claude agent rules emits a single import reference when a root agents rules file already exists, maintaining a single source of truth without duplicating content.
- Added advisory warnings to the workspace doctor command when core memory exceeds 200 lines to match instruction file soft limits.
- Removed the pointers section from the generated agent rules template to streamline configuration.
- Removed the hard limit and validation errors for maximum agent rules line counts, replacing it with soft line advisories on core memory.

### Patch Changes

- Fixed Claude Code and Codex session hooks from failing silently when the CLI is not installed globally by adding automatic fallback execution.
- Applied local execution fallback to generated opencode plugin events to ensure compliance markers and status notifications display properly.

## 1.2.0-beta.3

### Minor Changes

- Added zero-dependency TTY step spinners and itemized progress bars for long-running cloud sync operations.
- Added animated progress feedback during workspace integrity diagnostics and external connector runs.
- Added SIGINT and SIGTERM terminal signal handlers to gracefully restore cursor visibility and handle cancellation.
- Added automatic visual animation suppression when output is piped, NO_COLOR is set, or JSON mode is active.

## 1.2.0-beta.2

### Minor Changes

- Added short flag `-p` support for global project ID selection across all cloud and sync subcommands.

### Patch Changes

- Fixed an issue during cloud sync pulls where mandatory pre-sync snapshots were skipped prior to overwriting local workspace files.
- Fixed cloud sync push to properly forward explicit base cursor values when confirming upload completion.

## 1.2.0-beta.1

### Minor Changes

- Optimized runtime configuration and commander option handling for lower startup overhead.

### Patch Changes

- Fixed an incorrect default schema URL in generated configuration files.

## 1.1.0-beta.1

### Minor Changes

- Session hooks for Claude Code, Codex, Cursor, and opencode that automatically load memory context at the start of a session, refresh it after long-conversation compaction, and summarize memory usage when a session ends.
- A compliance summary showing whether an agent loaded context, consulted memory, and saved new information during a session.
- Task-aware memory retrieval, so agents get more relevant results based on the kind of work they're doing.
- Support for opencode across all agent generation commands.
- Workspace initialization now also generates a schema reference for editor validation and autocomplete.
- Config schema references now resolve from your installed CLI version instead of a versioned docs URL, so they can't drift out of sync.
- Generated agent instructions now include clearer workspace rules and links to project conventions.

### Patch Changes

- Fixed an issue in Cloud sync where file manifests could be generated incorrectly.

## 1.0.0-beta.2

### Minor Changes

- A command to initialize a local memory workspace (`memofs init`).
- A command to save durable decisions, constraints, goals, and preferences (`memofs remember`).
- A command to run hybrid semantic and keyword search over memory (`memofs recall`).
- A command to build task-ready context from core memory, recall results, and recent notes (`memofs context`).
- A command to inspect current memory state (`memofs status`).
- A command to consolidate memory — merging duplicates and retiring outdated facts (`memofs consolidate`).
- A command to sync workspace files with MemoFS Cloud (`memofs sync`).
