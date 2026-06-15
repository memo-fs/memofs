# Local commands

These commands manage your local `.tekmemo/` folder.

## `init`
Creates the `.tekmemo/` directory and canonical memory files.

```bash
npx tekmemo init
```

**Options:**
- `-f, --force` Overwrite existing seed files
- `-p, --project-id <id>` Explicit project ID
- `--no-input` Skip interactive prompts

## `inspect`
Summarizes the current local memory state, including file sizes and record counts.

```bash
npx tekmemo inspect
```

## `remember`
Stores a durable note for humans or coding agents.

```bash
npx tekmemo remember "Use VoyageAI for embeddings" \
  --kind decision \
  --tag architecture \
  --source "team meeting"
```

**Options:**
- `--stdin` Read memory content from standard input
- `--file <path>` Read memory content from a file
- `-k, --kind <kind>` Type of memory (`decision`, `constraint`, `goal`, `preference`, `reference`, `summary`, `note`)
- `--title <title>` Optional note title
- `-t, --tag <tag>` Tag to attach (can be used multiple times)
- `--confidence <n>` Confidence from 0 to 1
- `--source <source>` Source identifier (file, URL, or agent name)
- `--actor <actor>` Actor type (e.g. `agent:claude-code`)
- `--metadata-json <json>` Custom metadata JSON object
- `--allow-secrets` Allow content that looks like a secret

## `context`
Packs project memory into an agent-friendly context block.

```bash
npx tekmemo context --query "database schema work" --max-chars 8000
```

**Options:**
- `-q, --query <query>` Prioritize lines matching a task or query
- `--max-chars <n>` Maximum output characters (default: 12000)
- `--include-events` Include recent memory events
- `--include-chunks` Include recent chunk records

## `read`
Reads a canonical memory document.

```bash
npx tekmemo read core
npx tekmemo read notes
npx tekmemo read manifest
```

## `events`
Reads the memory event log.

```bash
npx tekmemo events --limit 10
```

**Options:**
- `-l, --limit <n>` Limit number of events
- `-s, --strict` Strict protocol validation

## `chunks`
Reads the local chunk index.

```bash
npx tekmemo chunks
```

**Options:**
- `-l, --limit <n>` Limit number of chunks
- `-s, --strict` Strict protocol validation

## `snapshot`
Creates a local memory snapshot bundle.

```bash
npx tekmemo snapshot --label "pre-refactor"
```

**Options:**
- `-l, --label <name>` Snapshot label (default: "manual")

## `diff`
Compares two memory snapshots by ID or label.

```bash
npx tekmemo diff "pre-refactor" "post-refactor"
```

## `search`
Searches memory files for a query.

```bash
npx tekmemo search "database"
```

**Options:**
- `-e, --regex` Treat query as a regular expression

## `doctor`
Diagnoses memory issues and finds missing or corrupt memory files.

```bash
npx tekmemo doctor
```

**Options:**
- `-s, --strict` Strict protocol validation

## `validate`
Performs strict protocol validation. Useful for CI pipelines.

```bash
npx tekmemo validate
```



# Agent Commands

These commands manage local AgentFS sandboxes for AI coding agents.

## `agent start`
Starts a new tracked session for an agent.

```bash
npx tekmemo agent start --task "Refactor auth"
```

## `agent paths`
Prints the standard file paths for the active session.

```bash
npx tekmemo agent paths
```

## `agent extract`
Extracts summaries and durable memory from an active session.

```bash
npx tekmemo agent extract
```

## `agent complete`
Completes the session and writes extracted memory back to the project.

```bash
npx tekmemo agent complete --extract
```

# Cloud Commands

The `cloud` namespace allows you to execute commands directly against TekMemo Cloud or a self-hosted API.

## Core Cloud Commands

Many local commands have cloud equivalents:
- `npx tekmemo cloud remember "Note"`
- `npx tekmemo cloud read notes`
- `npx tekmemo cloud context --query "schema"`
- `npx tekmemo cloud recall --query "billing"`

## Cloud Sync

- `npx tekmemo cloud sync status` - Check sync status.
- `npx tekmemo cloud sync pull` - Pull events.
- `npx tekmemo cloud sync push` - Push local events.

## Cloud Graph

- `npx tekmemo cloud graph list-nodes`
- `npx tekmemo cloud graph create-node`

*(For a full list of cloud commands, run `npx tekmemo cloud --help`)*
