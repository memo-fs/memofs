# CLI commands

## Local commands

| Command | Purpose |
| --- | --- |
| `init` | Create `.tekmemo/`. |
| `inspect` | Summarize memory state. |
| `remember` | Store durable memory. |
| `context` | Pack context for an agent. |
| `read` | Read core memory, notes, or manifest. |
| `events` | Read memory events. |
| `chunks` | Read chunk index. |
| `search` | Search memory text. |
| `snapshot` | Create a local snapshot. |
| `diff` | Compare snapshots. |
| `doctor` | Diagnose memory issues. |
| `validate` | Strict CI validation. |

## Safety

`remember` should reject likely secrets unless explicitly overridden after human review.
