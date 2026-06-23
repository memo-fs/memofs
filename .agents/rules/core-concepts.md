## Core Concepts

Before writing any code, understand these memory layers:

| Layer | File | Purpose |
|---|---|---|
| **Core Memory** | `core.md` | Compact, always-relevant canonical truth |
| **Archival Memory** | `notes.md` | Durable notes, summaries, long-form archival |
| **Recall Memory** | `conversations.jsonl` | Indexed fragments for semantic retrieval |
| **Sync State** | Runtime metadata | Whether memory is synced, stale, or queued |
| **Restore Points** | Snapshots | Versioned checkpoints for history and rollback |

Memory is **project-scoped**, **user-scoped**, or **session-scoped**. Never mix scope levels without explicit intent.