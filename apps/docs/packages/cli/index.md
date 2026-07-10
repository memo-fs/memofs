# Command Line Interface (CLI)

The `@memofs/cli` package provides the primary command-line tool for managing local and hybrid memory workflows.

---

## Installation

Install the CLI as a development dependency in your project:

::: code-group

```sh [npm]
npm install -D @memofs/cli
```

```sh [pnpm]
pnpm add -D @memofs/cli
```

```sh [yarn]
yarn add -D @memofs/cli
```

```sh [bun]
bun add -d @memofs/cli
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

Or install globally:

::: code-group

```sh [npm]
npm install -g @memofs/cli
```

```sh [pnpm]
pnpm add -g @memofs/cli
```

```sh [yarn]
yarn global add @memofs/cli
```

```sh [bun]
bun add -g @memofs/cli
```

:::

You can also run it on demand without installation:

```bash
npx memofs --help
```

---

## Global Flags

All commands accept these global flags before the subcommand:

| Flag | Description | Default |
|------|-------------|---------|
| `-r, --root <path>` | Project root containing `.memofs/` | Current directory |
| `--runtime <mode>` | Runtime mode: `local` or `hybrid` | `local` |
| `--cloud-url <url>` | MemoFS Cloud API URL | `MEMOFS_CLOUD_URL` env |
| `--api-key <key>` | MemoFS Cloud API key | `MEMOFS_API_KEY` env |
| `--workspace-id <id>` | Default cloud workspace ID | — |
| `--project-id <id>` | Default cloud project ID | — |
| `--timeout-ms <n>` | Cloud request timeout in milliseconds | — |
| `-j, --json` | Output machine-readable JSON | `false` |
| `-v, --verbose` | Show detailed output | `false` |
| `-q, --quiet` | Suppress all output except errors | `false` |
| `--no-color` | Disable colored output | `false` |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MEMOFS_RUNTIME` | Runtime mode: `local` or `hybrid` |
| `MEMOFS_CLOUD_URL` | MemoFS Cloud API URL |
| `MEMOFS_API_KEY` | MemoFS Cloud API key |
| `MEMOFS_WORKSPACE_ID` | Cloud workspace ID |
| `MEMOFS_PROJECT_ID` | Cloud project ID |
| `MEMOFS_ROOT` | Project root containing `.memofs/` |
| `MEMOFS_RECALL_ENGINE` | Recall engine: `lexical`, `vector`, `hybrid`, or `auto` |
| `MEMOFS_LOCAL_EMBEDDINGS` | Enable local embeddings (`1` or `true`) |
| `MEMOFS_EMBEDDING_MODEL` | Embedding model name |

---

## Configuration File

Create `.memofs/config.json` to persist defaults without storing secrets:

```bash
memofs config init --runtime hybrid --cloud-url https://memofs.dev/api/v1
```

```json
{
  "$schema": "https://docs.memofs.dev/1.0.0-beta.2/config.schema.json",
  "runtime": "hybrid",
  "root": ".",
  "cloud": {
    "baseUrl": "https://memofs.dev/api/v1",
    "workspaceId": "ws_abc123"
  },
  "recall": {
    "engine": "hybrid",
    "localEmbeddings": true
  }
}
```

Inspect the resolved configuration:

```bash
memofs config get
```

---

## Memory Commands

### `memofs init`

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

---

### `memofs remember`

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

---

### `memofs context`

Packs project memory (core memory, notes, and optional events/chunks) into a condensed context block for agents.

```bash
memofs context --query "deployment steps" --json
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-q, --query <query>` | Prioritize lines matching a task/query | — |
| `--max-chars <n>` | Maximum output characters | `12000` |
| `--include-events` | Include recent memory events | `false` |
| `--include-chunks` | Include recent chunk records | `false` |

---

### `memofs read`

Reads a canonical memory document: `core`, `notes`, or `manifest`.

```bash
memofs read core
memofs read notes
memofs read manifest
```

---

### `memofs inspect`

Displays a status dashboard of the current memory filesystem, including counts of notes, events, chunks, graph nodes/edges, and snapshots.

```bash
memofs inspect
```

---

### `memofs search`

Searches memory files (core, notes, conversations) for a query string or regular expression.

```bash
memofs search "authentication"
memofs search "auth.*middleware" --regex
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --regex` | Treat query as a regular expression | `false` |

---

### `memofs events`

Reads the memory event log (`events/memory-events.jsonl`).

```bash
memofs events --limit 20
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit number of events (0 = all) | `0` |
| `-s, --strict` | Strict protocol validation | `false` |

---

### `memofs chunks`

Reads the local chunk index (`indexes/chunks.jsonl`).

```bash
memofs chunks --limit 50
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit number of chunks (0 = all) | `0` |
| `-s, --strict` | Strict protocol validation | `false` |

---

### `memofs snapshot`

Creates a local memory snapshot bundle in `snapshots/`.

```bash
memofs snapshot --label "before-refactor"
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --label <name>` | Snapshot label | `manual` |

---

### `memofs diff`

Compares two memory snapshots by ID or label.

```bash
memofs diff before-refactor after-refactor
```

---

### `memofs doctor`

Finds missing or corrupt memory files and validates referential integrity.

```bash
memofs doctor
memofs doctor --strict
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-s, --strict` | Strict protocol validation | `false` |

---

### `memofs validate`

Runs strict protocol validation for CI pipelines. Exits with a non-zero code if any memory file is missing or invalid.

```bash
memofs validate
```

---

## Agent Commands

### `memofs agent start`

Starts an AgentFS-style workspace for Codex, Claude Code, or another coding agent.

```bash
memofs agent start --task "Implement OAuth2 login flow"
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--task <task>` | Agent task or brief (required) | — |
| `--project <id>` | Project ID | Resolved project ID |
| `--actor <id>` | Actor ID | — |
| `--session <id>` | Explicit safe session ID | — |

---

### `memofs agent paths`

Prints paths for the latest or a selected agent session.

```bash
memofs agent paths
memofs agent paths --session abc123
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |

---

### `memofs agent extract`

Extracts summary, durable memory, and follow-ups from an agent session.

```bash
memofs agent extract
memofs agent extract --session abc123
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |

---

### `memofs agent complete`

Completes an agent session and optionally persists durable memory to MemoFS notes.

```bash
memofs agent complete --extract --checkpoint-label "oauth-done"
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |
| `--extract` | Append extracted durable memory to notes | `false` |
| `--checkpoint-label <label>` | Checkpoint label | — |

---

## Generate Commands

### `memofs generate agent-rules`

Emits a MemoFS-enforcing agent instructions file for a supported platform. The file contains behavioral rules and MCP config pointers — no project facts (those live in MemoFS memory).

```bash
memofs generate agent-rules claude --project-name "My App"
memofs generate agent-rules --list
```

**Supported targets:** `agents` (AGENTS.md), `claude` (CLAUDE.md), `gemini` (GEMINI.md), `copilot` (.github/copilot-instructions.md), `cursor` (.cursor/rules/memofs.mdc).

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--project-name <name>` | Project name in the header | Directory basename |
| `-f, --force` | Overwrite an existing instructions file | `false` |
| `--list` | List supported targets and their MCP config locations | `false` |

---

## Connectors Commands

### `memofs connectors list`

Lists configured connectors from `connectors.json`.

```bash
memofs connectors list
```

---

### `memofs connectors add`

Adds a connector row to `.memofs/connectors.json`.

```bash
memofs connectors add --type github --secret-ref gh_token --id my-github
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--type <type>` | Connector type (`github`, `notion`, etc.) (required) | — |
| `--secret-ref <ref>` | Opaque pointer to a token stored server-side (required) | — |
| `--id <id>` | Connector ID | — |
| `--schedule <schedule>` | Schedule hint | — |
| `--source-mapping <json>` | Source-specific config as JSON | — |
| `--disabled` | Add the connector in disabled state | `false` |

---

### `memofs connectors remove`

Removes a connector by ID.

```bash
memofs connectors remove my-github
```

---

### `memofs connectors run`

Runs enabled connectors to ingest data into `.memofs/`.

```bash
memofs connectors run
memofs connectors run --type github
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--type <type>` | Run only connectors of this type | — |

---

## Cloud Commands

Cloud commands require `--cloud-url` and `--api-key` flags or the `MEMOFS_CLOUD_URL` and `MEMOFS_API_KEY` environment variables.

### `memofs cloud health`

Checks MemoFS Cloud health endpoint.

```bash
memofs cloud health
```

---

### `memofs cloud readiness`

Checks MemoFS Cloud readiness endpoint.

```bash
memofs cloud readiness
```

---

### `memofs cloud sync status`

Reads the current cloud sync status.

```bash
memofs cloud sync status
```

---

### `memofs cloud sync pull`

Pulls file replicas from the cloud into the local `.memofs/` directory.

```bash
memofs cloud sync pull
memofs cloud sync pull --since <cursor>
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--since <cursor>` | Pull everything changed since this cursor | — |

---

### `memofs cloud sync push`

Pushes local `.memofs/` file replicas to the cloud.

```bash
memofs cloud sync push
memofs cloud sync push --base-cursor <cursor>
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--base-cursor <cursor>` | Cursor the client last synced at | — |

---

## Config Commands

### `memofs config get`

Prints the resolved CLI configuration (mode, project ID, workspace ID, cloud status).

```bash
memofs config get
```

---

### `memofs config init`

Creates `.memofs/config.json` without storing secrets.

```bash
memofs config init --runtime hybrid --cloud-url https://memofs.dev/api/v1
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --force` | Overwrite existing config | `false` |
| `--runtime <mode>` | Runtime mode: `local` or `hybrid` | `local` |
| `--cloud-url <url>` | MemoFS Cloud API URL | — |
| `--workspace-id <id>` | Cloud workspace ID | — |
| `--project-id <id>` | Cloud project ID | — |
