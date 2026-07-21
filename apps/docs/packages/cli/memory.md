# Memory Commands

## `memofs init`

Initializes a new MemoFS memory workspace, generating the canonical `.memofs/` structure (11 files across `memory/`, `events/`, `indexes/`, `graph/`, and `snapshots/`).

```bash
memofs init
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --force` | Overwrite existing seed files | `false` |
| `-p, --project-id <id>` | Explicit project ID | — |
| `--no-input` | Skip interactive prompts | `false` |

## `memofs remember`

Stores a durable note in `memory/notes.md` and appends an event to `events/memory-events.jsonl`.

```bash
memofs remember "Use VoyageAI for vector embeddings" --kind decision
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--stdin` | Read content from stdin | `false` |
| `--file <path>` | Read content from a file inside the root | — |
| `-k, --kind <kind>` | Note kind (`note`, `decision`, `constraint`, etc.) | `note` |
| `--title <title>` | Optional note title | — |
| `-t, --tag <tag>` | Tag to attach (repeatable) | `[]` |
| `--confidence <n>` | Confidence score from 0 to 1 | — |
| `--source <source>` | Source identifier | — |
| `--actor <actor>` | Actor type or `type:id` | `user` |
| `--metadata-json <json>` | Metadata JSON object | — |
| `--allow-secrets` | Allow content that looks like a secret | `false` |

## `memofs context`

Packs project memory (core memory, notes, entities, and relevant recall) into a condensed context block for agents. Calls the same intelligence pipeline (strategist + hybrid recall + entity graph) that the MCP server uses — hook-injected context matches MCP-delivered context.

```bash
memofs context --query "deployment steps" --json
memofs context --query "fix auth bug" --task-type debug
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-q, --query <query>` | Prioritize memories matching a task/query | — |
| `--task-type <type>` | Task type for strategist query augmentation: `coding`, `debug`, `refactor`, `docs`, `general` | `general` |
| `--max-chars <n>` | Maximum output characters | `12000` |
| `--mark-session-start` | Write a `memory.indexed` session-start event marker (used by hook scripts) | `false` |

> [!TIP]
> The `--task-type` flag tailors which memories surface first. For example, `--task-type debug` biases recall toward error-related and constraint memories, while `--task-type refactor` surfaces architectural decisions.

## `memofs read`

Reads a canonical memory document: `core`, `notes`, or `manifest`.

```bash
memofs read core
memofs read notes
memofs read manifest
```

## `memofs inspect`

Displays a status dashboard of the current memory filesystem, including counts of notes, events, chunks, graph nodes/edges, and snapshots.

```bash
memofs inspect
```

## `memofs search`

Searches memory files (core, notes, conversations) for a query string or regular expression.

```bash
memofs search "authentication"
memofs search "auth.*middleware" --regex
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --regex` | Treat query as a regular expression | `false` |

## `memofs events`

Reads the memory event log (`events/memory-events.jsonl`).

```bash
memofs events --limit 20
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit number of events (0 = all) | `0` |
| `-s, --strict` | Strict protocol validation | `false` |

## `memofs chunks`

Reads the local chunk index (`indexes/chunks.jsonl`).

```bash
memofs chunks --limit 50
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit number of chunks (0 = all) | `0` |
| `-s, --strict` | Strict protocol validation | `false` |

## `memofs snapshot`

Creates a local memory snapshot bundle in `snapshots/`.

```bash
memofs snapshot --label "before-refactor"
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --label <name>` | Snapshot label | `manual` |

## `memofs diff`

Compares two memory snapshots by ID or label.

```bash
memofs diff before-refactor after-refactor
```

## `memofs doctor`

Finds missing or corrupt memory files and validates referential integrity.

```bash
memofs doctor
memofs doctor --strict
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --strict` | Strict protocol validation | `false` |

## `memofs validate`

Runs strict protocol validation for CI pipelines. Exits with a non-zero code if any memory file is missing or invalid.

```bash
memofs validate
```

## `memofs status`

Shows a compliance summary for the most recent agent session. Reads `events/memory-events.jsonl` and checks whether the agent loaded context at session start, consulted memory during the session, and persisted new facts.

```bash
memofs status
memofs status --hook   # Stop-hook JSON: {"systemMessage": "MemoFS compliance — ..."}
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--hook` | Emit Stop-hook JSON (`{"systemMessage": ...}`) for agent hooks. Claude Code and Codex display `systemMessage` from Stop-hook output (Codex requires JSON on Stop-hook exit 0) | `false` |

**Output example:**

```text
# MemoFS Status
Root: /path/to/project

## Store Health
- Core memory: present
- Notes memory: present
- Total events: 42

## Compliance (session started at 2026-07-13T12:00:00Z)
- ✓ Context loaded at session start
- ✓ Memory consulted during session
- ✓ Facts persisted
```

When no session-start event is found, the command degrades gracefully and suggests running `memofs generate agent <target>` to install hooks that mark the session boundary automatically.