# Memory filesystem layout

A local TekMemo project keeps all of its memory under a single `.tekmemo/` directory. Every path is a canonical constant — the layout is fixed, not convention.

```text
.tekmemo/
├── manifest.json                  # project manifest
├── memory/
│   ├── core.md                    # the stable project briefing
│   └── notes.md                   # durable decisions, constraints, summaries
├── events/
│   ├── memory-events.jsonl        # append-only write audit ledger
│   └── conversations.jsonl        # indexed conversation fragments
├── indexes/
│   ├── chunks.jsonl               # recall chunks (derived)
│   └── embeddings.jsonl           # persisted embeddings (derived)
├── graph/
│   ├── nodes.jsonl                # extracted entities
│   └── edges.jsonl                # extracted relationships
├── snapshots/
│   ├── snapshots.jsonl            # snapshot index
│   └── <id>.json                  # point-in-time immutable backups
├── connectors.json                # connector config — 11th canonical file (no secrets)
├── secrets.json                   # DEV-ONLY resolver fallback — gitignored, NOT synced
└── tmp/                           # scratch space
```

## The canonical files

There are exactly **11 canonical files** (defined in `CANONICAL_TEKMEMO_FILES`). They are the sync units and the only paths the engine treats as memory:

| Path | Purpose | Source of truth? |
| --- | --- | --- |
| `.tekmemo/manifest.json` | Project manifest (id, version). | Yes |
| `.tekmemo/memory/core.md` | Stable project briefing — facts the agent must know every time. | Yes |
| `.tekmemo/memory/notes.md` | Durable decisions, constraints, preferences, summaries. | Yes |
| `.tekmemo/events/memory-events.jsonl` | Append-only ledger of every write (the audit trail). | Yes |
| `.tekmemo/events/conversations.jsonl` | Conversation fragments indexed for recall. | Rebuildable |
| `.tekmemo/indexes/chunks.jsonl` | Recall chunks split from large documents. | **Derived** |
| `.tekmemo/indexes/embeddings.jsonl` | Persisted embedding vectors. | **Derived** |
| `.tekmemo/graph/nodes.jsonl` | Extracted entities. | Rebuildable |
| `.tekmemo/graph/edges.jsonl` | Extracted relationships. | Rebuildable |
| `.tekmemo/snapshots/snapshots.jsonl` | Index of named snapshots. | Yes |
| `.tekmemo/connectors.json` | Connector configuration (opaque `secretRef` only — never tokens). | Yes |

Snapshots themselves (`.tekmemo/snapshots/<safe-name>.json`) are the only dynamic canonical path — they're created on demand via `tekmemo snapshot`.

## Hand-edited vs. generated

You normally interact with memory through the CLI or the `Tekmemo` API, never by hand-writing JSONL. But two files are *meant* to be read and edited directly:

- **`memory/core.md`** — plain Markdown. This is your project briefing. Edit it like a README.
- **`memory/notes.md`** — plain Markdown. Decisions and constraints accumulate here. Safe to edit, reorder, or trim.

Everything else (events, indexes, graph, snapshots, connectors) is **machine-managed**. The JSONL files have a schema the engine enforces; hand-editing them risks corruption. If you want to change a memory, change it through `tekmemo remember` / `memo.notes.record()` or by editing `core.md` / `notes.md`.

## Path safety

The engine validates every memory path against a strict allowlist (`assertMemoryPath`). Paths must:

- live inside `.tekmemo/` (no absolute paths, no `\`, no `..` segments, no null bytes),
- be one of the 11 canonical files *or* a `.tekmemo/snapshots/<safe-name>.json` snapshot.

This means agents (and you) **cannot** write to arbitrary paths inside `.tekmemo/`. A write to `.tekmemo/../../../../etc/passwd` or `.tekmemo/memory/arbitrary.txt` is rejected with a `MemoryPathError`. The surface area is fixed by design.

## Secrets never live here

::: danger Never put secrets in `.tekmemo/`
The canonical files sync to the cloud replica and live on disk in plaintext. An API key written into `notes.md` is a leak waiting to happen.
:::

This is enforced two ways:

1. **Write blocklist** — a deterministic, always-on gate (`detectBlockedContent`) that rejects writes matching real secret shapes (provider key prefixes, PEM blocks, JWTs, structured `key=<12+ char>` assignments) *before* they reach the files. A rejected write throws `MemoryWriteBlockedError` with a redacted preview — the secret itself is never echoed. See [Security](./architecture/security).
2. **Connector `secretRef` model** — connectors store only an opaque pointer in `connectors.json`; tokens are resolved at run time and never touch disk. See [Connectors](./connectors).

The one exception is `.tekmemo/secrets.json` — a **dev-only** resolver fallback (a `{ secretRef: token }` map). It is **not** a canonical sync unit, is **gitignored**, and **never syncs**. Add it to `.gitignore` and never commit it.

## Rules of thumb

- **Prefer the API** (`tekmemo ...`, `memo.notes.record()`) over manual writes for anything except `core.md` / `notes.md`.
- **Don't hand-edit** `events/`, `indexes/`, `graph/`, `snapshots/`, or `connectors.json`.
- **Keep `core.md` concise** — it's injected into every context package. Move detail into `notes.md`.
- **Commit `.tekmemo/`** (minus `secrets.json`) so memory travels with your code.

## See also

- [File-first memory](./file-first-memory) — the philosophy behind this layout.
- [Memory records](./memory-records) — the note schema and kinds.
- [Connectors](./connectors) — what `connectors.json` contains.
