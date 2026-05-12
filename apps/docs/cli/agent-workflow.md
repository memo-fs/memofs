# Agent Workflow

The CLI includes specific commands to help coding agents manage sessions and memory.

## Adding to agent instructions

You can add this to your coding agent's system prompt or custom instructions (e.g. in `.cursorrules`):

```md
This project uses TekMemo for durable project memory.

Before planning, run:
npx tekmemo context --query "<current task>"

When a durable decision is made, run:
npx tekmemo remember "<decision>" --kind decision --actor agent:<tool-name>

Do not store secrets, credentials, private keys, API tokens, or customer data in TekMemo.
```

**Tip:** Use the `--json` flag when you want your tool to parse the output programmatically.

## Agent subcommands

The `agent` subcommand group is designed for AgentFS-backed TekMemo coding sessions.

### `agent start`
Starts an AgentFS-style workspace for Codex, Claude Code, or another coding agent.

```bash
npx tekmemo agent start --task "Refactor the database schema" --actor "assistant:claude"
```

**Options:**
- `--task <task>` Agent task or brief (required)
- `--project <id>` Project ID
- `--actor <id>` Actor ID (e.g. `assistant:codex`)
- `--session <id>` Explicit safe session ID

### `agent paths`
Prints paths for the latest or selected agent session.

```bash
npx tekmemo agent paths --session "latest"
```

**Options:**
- `--session <id>` Session ID or `latest` (default: `latest`)

### `agent extract`
Extracts a summary, durable memory, and follow-ups from an agent session.

```bash
npx tekmemo agent extract
```

**Options:**
- `--session <id>` Session ID or `latest` (default: `latest`)

### `agent complete`
Completes an agent session and optionally persists durable memory.

```bash
npx tekmemo agent complete --extract --checkpoint-label "schema-update-done"
```

**Options:**
- `--session <id>` Session ID or `latest` (default: `latest`)
- `--extract` Append `output/durable-memory.md` to TekMemo notes
- `--checkpoint-label <label>` Checkpoint label
