# Memory filesystem layout

A local TekMemo project uses this structure:

```txt
.tekmemo/
├── manifest.json
├── memory/
│   ├── core.md
│   └── notes.md
├── events/
│   ├── memory-events.jsonl
│   └── conversations.jsonl
├── indexes/
│   └── chunks.jsonl
├── graph/
│   ├── nodes.jsonl
│   └── edges.jsonl
├── snapshots/
│   └── snapshots.jsonl
└── tmp/
```

## Rules

- Do not store secrets in memory files.
- Do not let agents write arbitrary paths inside `.tekmemo/`.
- Prefer CLI or package APIs over manual writes.
- Keep durable decisions concise.
