# File-first memory

TekMemo's core thesis is that **memory should live in files you can read, not in a dashboard you can't.** A project carries its memory in a `.tekmemo/` directory of plain Markdown and JSON — the same kind of files your code already lives in. Everything else (recall indexes, the graph, snapshots) is *derived* from those files and can be rebuilt.

This is not a storage detail. It shapes how the whole system behaves: what's inspectable, what's versionable, what's recoverable, and what you can trust.

## Why file-first

::: tip The one-line version
The files are the source of truth. The recall index and graph are disposable caches derived from them. If you delete the indexes, TekMemo rebuilds them; if you delete the files, the memory is gone — because the files *are* the memory.
:::

- **It works before any cloud setup.** `npx tekmemo init` and you have a working memory system on disk. No account, no keys, no network.
- **It's version-controlled alongside your code.** Commit `.tekmemo/` and every decision, constraint, and architectural choice travels with the commit it was made in. A `git blame` on a decision tells you *when the team chose it*.
- **It's inspectable during code review.** A PR that changes behavior can also carry the memory change that explains *why*. Reviewers read memory like any other file.
- **It gives agents durable context without a hosted dashboard.** Your agent reads the same files a human would. Nothing is hidden inside an opaque prompt or a vendor UI.
- **It's recoverable.** Delete the derived indexes and the system regenerates them from the files. Edit a memory by hand and the next recall reflects it.

## What's source of truth vs. derived

| File | Role | Disposable? |
| --- | --- | --- |
| `memory/core.md` | The stable project briefing. **Source of truth.** | No |
| `memory/notes.md` | Durable decisions, constraints, summaries. **Source of truth.** | No |
| `events/memory-events.jsonl` | Append-only audit ledger of every write. | No (it's the audit trail) |
| `events/conversations.jsonl` | Indexed conversation fragments for recall. | Rebuildable |
| `indexes/*.jsonl` | Recall chunks + embeddings. | **Yes — derived** |
| `graph/*.jsonl` | Entities + relationships extracted from prose. | Rebuildable |
| `snapshots/*` | Point-in-time immutable backups. | No (they're backups) |
| `connectors.json` | Connector config (no secrets). | Source of truth for connector setup |

This split is why TekMemo can offer a zero-config experience: the expensive derived artifacts (embeddings, the recall index) can always be thrown away and regenerated from the cheap, human-readable source files.

## The memory workflow

The file-first model maps cleanly onto how you already work:

```bash
# 1. Memory starts on disk, versioned with the code.
npx tekmemo init

# 2. Record durable facts as you make them.
npx tekmemo remember "Auth uses JWT with refresh rotation." --kind decision --tag auth

# 3. Before a task, pull the relevant memory back.
npx tekmemo context --query "how does auth work"

# 4. Review changes like any other code.
git diff .tekmemo/memory/notes.md

# 5. Snap before a risky change; restore if it went wrong.
npx tekmemo snapshot --label "pre-v2-refactor"
```

Because each of these touches plain files, you can also edit memory directly in your editor — `core.md` is just Markdown — and the next recall picks it up. The API is a convenience layered over files, not a gatekeeper.

## What it means for cloud

Cloud is a **sync transport**, not a separate store of record. In hybrid mode, TekMemo mirrors your `.tekmemo/` files byte-for-byte to the cloud replica so other machines and team members see the same memory. The engine still runs locally; the cloud is a file replica. If you delete a memory locally and push, it's deleted in the cloud too — because the files are authoritative.

See [Sync and events](./architecture/sync-events) for the replication model and [The `Tekmemo` client](./client) for hybrid configuration.

## When local-only is enough

Local-only memory (`mode: "local"`) is the right default for single-developer projects, CI, and anything where you want everything on disk. You reach for cloud sync only when memory needs to follow you across machines or to a team — and when you do, nothing about the file-first model changes.

## See also

- [Memory filesystem](./filesystem-layout) — every file under `.tekmemo/`, what each is for.
- [Core concepts](./concepts) — the four memory layers in detail.
- [Memory intelligence](./intelligence) — how derived indexes are built (and rebuilt) from the files.
