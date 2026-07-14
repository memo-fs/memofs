# Agent Commands

## `memofs agent start`

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

## `memofs agent paths`

Prints paths for the latest or a selected agent session.

```bash
memofs agent paths
memofs agent paths --session abc123
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |

## `memofs agent extract`

Extracts summary, durable memory, and follow-ups from an agent session.

```bash
memofs agent extract
memofs agent extract --session abc123
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--session <id>` | Session ID or `latest` | `latest` |

## `memofs agent complete`

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