---
title: "CLI Agent Commands"
description: "CLI commands for managing AgentFS-backed coding agent sessions and working memory."
---

# Agent Commands

The `agent` command family manages local AgentFS session workspaces for coding agents (Codex, Claude Code, etc.). Sessions provide isolated scratch workspaces containing context snapshots, working progress files, and structured output files.

## Session Architecture & Layout

When an agent session starts, a dedicated directory structure is created under `<rootDir>/agent-sessions/<sessionId>/`:

```text
agent-sessions/<sessionId>/
├── context/
│   ├── core.md             # Snapshot of core memory at session start
│   └── notes.md            # Snapshot of notes memory at session start
├── working/
│   ├── plan.md             # Current execution plan
│   ├── commands.md         # Shell commands executed during session
│   ├── errors.md           # Errors encountered and workarounds
│   └── changes.md          # Files modified and changelog
└── output/
    ├── summary.md          # High-level task summary
    ├── durable-memory.md   # Extracted facts to persist
    └── follow-ups.md       # Suggested next steps
```

The latest active session is tracked locally at `.memofs/tmp/agent-sessions/latest.json`.

---

## `memofs agent start`

Starts a new AgentFS-style session workspace, initializing context snapshots and working scratch files.

```bash
memofs agent start --task "Implement OAuth2 login flow"
memofs agent start --task "Refactor query router" --session oauth-flow-v1
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--task <task>` | Agent task or brief (required) | — |
| `--project <id>` | Explicit project ID | Resolved workspace project ID |
| `--actor <id>` | Actor ID performing the task | — |
| `--session <id>` | Explicit safe session ID string | Auto-generated UUID |

### Output

Prints the session ID and formatted instructions directing the agent to read context files, update working files during progress, and write output files before finishing.

---

## `memofs agent paths`

Prints the file paths for the latest or a selected agent session.

```bash
memofs agent paths
memofs agent paths --session oauth-flow-v1
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |

---

## `memofs agent extract`

Extracts output sections (`summary.md`, `durable-memory.md`, `follow-ups.md`) from an agent session workspace.

```bash
memofs agent extract
memofs agent extract --session oauth-flow-v1 --json
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |

---

## `memofs agent complete`

Finalizes an agent session, optionally appending extracted durable memory into canonical `memory/notes.md` and creating a tagged repository checkpoint snapshot.

```bash
memofs agent complete --extract --checkpoint-label "oauth-done"
memofs agent complete --session oauth-flow-v1 --extract
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |
| `--extract` | Append `output/durable-memory.md` into MemoFS `notes.md` | `false` |
| `--checkpoint-label <label>` | Create a repository snapshot bundle with this label | — |