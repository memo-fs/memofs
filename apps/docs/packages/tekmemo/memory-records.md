# Memory records

A memory record is the durable unit of knowledge TekMemo stores. Most of the time you don't think about the schema — `tekmemo remember` or `memo.notes.record()` handles it. But understanding the shape helps you write memory that actually pays off: specific, source-aware, and retrievable.

## Kinds

Every record has a `kind` — a tag that says *what this fact is*. TekMemo uses it both for display and for the durability classifier (which decides whether a write steers retrieval). The kinds are:

| Kind | Meaning | Typical tier |
| --- | --- | --- |
| `decision` | A project decision that should be remembered later. | durable |
| `constraint` | A rule, limitation, or invariant the code must respect. | durable |
| `goal` | A target or objective the project is working toward. | durable |
| `preference` | A human or team preference (convention, style). | durable |
| `reference` | A pointer to a document, file, or external source. | durable |
| `summary` | Condensed project knowledge. | durable |
| `note` | General-purpose memory; the catch-all. | often transient |

::: tip `kind` vs `tier`
`kind` answers *"what is this fact?"* — `tier` answers *"how long should it steer retrieval?"* A `decision` is almost always durable; a `note` is often transient — but the classifier reads `kind` + `confidence` + content shape together. See [Memory intelligence → Durability tiers](./intelligence#durability-tiers).
:::

## Writing a record

### CLI

```bash
tekmemo remember "Billing webhooks must verify signatures before mutating state." \
  --kind constraint \
  --tag billing \
  --source architecture-review
```

### Programmatic

The underlying type is `WriteMemoryInput`. The only required field is `content`; everything else is optional metadata that makes the record more retrievable and auditable.

```ts
const result = await memo.notes.record({
  content: "Billing webhooks must verify signatures before mutating state.",
  kind: "constraint",
  tags: ["billing", "security"],
  source: "architecture-review",
  sourceRefs: [
    {
      sourceType: "doc",
      sourceId: "ADR-0014",
      title: "Webhook signature verification",
      url: "https://github.com/org/repo/blob/main/docs/adr/0014.md",
    },
  ],
  confidence: 0.95,
});

console.log(result.id);        // the note id
console.log(result.tier);      // "durable" | "transient" (what the classifier chose)
console.log(result.tierReason); // why it was classified that way
```

## The record shape

| Field | Type | Purpose |
| --- | --- | --- |
| `content` | `string` | **Required.** The memory itself (Markdown). |
| `kind` | `MemoryKind?` | One of the kinds above. Defaults to `note`. |
| `title` | `string?` | Short label for display and recall snippets. |
| `tags` | `string[]?` | Free-form tags for filtering and recall. |
| `source` | `string?` | Who/what authored this (`"agent"`, `"connector"`, a person, a review). |
| `sourceRefs` | `SourceRef[]?` | Provenance — links to files, docs, tickets, external items. |
| `confidence` | `number?` | 0–1. Feeds the durability classifier; higher → more likely durable. |
| `tier` | `DurabilityTier?` | Explicit override of the classifier (`"durable"` / `"transient"`). |
| `metadata` | `object?` | Arbitrary structured metadata (e.g. `occurredAt` for connector notes). |
| `id` | `string?` | Stable id override (connectors use this for content-derived ids). |

The returned `WriteMemoryResult` always carries `id`, `created`, `tier`, and `tierReason` so you can audit exactly what happened.

## What makes a good record

A memory record earns its keep when an agent or human can act on it later without re-deriving it. Good memory is:

- **Specific.** "Use Cloudflare D1 for tenant metadata" beats "we chose a database."
- **Source-aware.** Attach `sourceRefs` pointing to the ADR, ticket, or file that justifies it. Recall surfaces provenance alongside the snippet.
- **Free of secrets.** The write blocklist rejects secret-shaped content, but don't rely on it — never paste credentials. See [Security](./architecture/security).
- **Durable beyond one chat.** If it only matters for the next 10 minutes, it's transient; don't dress scratch state up as a `decision`.
- **Auditable.** A human reading `notes.md` should understand *what* and *why* without context.

## Where records live

Records are written to **`.tekmemo/memory/notes.md`** (the human-readable source of truth) and a corresponding `memory.created` event lands in **`.tekmemo/events/memory-events.jsonl`** (the append-only audit ledger). If classified `durable`, the record is also indexed into the recall store and fanned out into the graph by the extractor. A `transient` record lands in `notes.md` and the ledger but is **not** indexed — it doesn't pollute retrieval. See [File-first memory](./file-first-memory) and [Memory intelligence](./intelligence).

## See also

- [Memory intelligence](./intelligence) — how records become recallable (extraction, recall, durability).
- [The `Tekmemo` client](./client) — the `notes.record()` / `writeMemory()` surface.
- [Connectors](./connectors) — records written by external-source ingestion.
