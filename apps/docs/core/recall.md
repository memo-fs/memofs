---
title: "Recall & Prompt Context"
description: "Hybrid lexical and semantic retrieval, progressive context disclosure, and the 4-stage strategist pipeline in @memofs/core."
---

# Recall & Prompt Context

MemoFS provides dual retrieval APIs:
1. **`memofs.recall(query, options)`**: Raw ranked search over indexed memory chunks for programmatic lookups.
2. **`memofs.context(input)`**: Token-budgeted, progressive-disclosure prompt briefing generator for AI agents.

## Semantic & Lexical Recall (`memofs.recall`)

`memofs.recall()` executes a hybrid search blending vector similarity (when an embedder is configured) and local BM25/fuzzy lexical search:

```ts
const results = await memofs.recall("how is authentication configured?", {
  limit: 5,
  filter: {
    "metadata.memoryType": { $eq: "notes" },
  },
});

for (const item of results.items) {
  console.log(`[Score: ${item.score}] ${item.text}`);
  if (item.stale) {
    console.warn(`⚠️ Warning: Anchored file ${item.anchor?.file} has drifted!`);
  }
  if (item.unverified) {
    console.warn(`⏳ Warning: Memory exceeded expiry floor.`);
  }
}
```

### Options (`RecallInput`)

| Option | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | (Required) | The natural language search query. |
| `limit` | `number` | `10` | Maximum number of ranked results to return. |
| `filter` | `RecallFilter` | `undefined` | Metadata filter object supporting operators `$eq`, `$ne`, `$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte`, `$exists`, `$contains`. |
| `namespace` | `string` | `undefined` | Logical namespace to restrict search within. |
| `workspaceId` | `string` | `undefined` | Scopes search to a specific workspace ID. |
| `projectId` | `string` | `undefined` | Scopes search to a specific project ID. |

### Item Anatomy (`RecallItem`)

```ts
interface RecallItem {
  id: string;                      // Chunk or document ID
  text: string;                    // Retrieved text snippet
  score?: number;                  // Hybrid relevance score (0.0 to 1.0)
  sourceRefs?: SourceRef[];        // External source references
  metadata?: JsonObject;           // Associated metadata
  anchor?: AnchorRef;              // Bound code anchor ({ file, hash, symbol })
  stale?: boolean;                 // True if code hash drifted (50% score penalty)
  unverified?: boolean;            // True if age > EXPIRY_DAYS (40% score penalty)
}
```

## Progressive Context Briefings (`memofs.context`)

`memofs.context()` assembles a multi-section context briefing engineered specifically for LLM prompt injection. It prevents context window bloat via **Progressive Disclosure**:

```ts
// 1. Initial compact call (returns ~6-8kb briefing)
const briefing = await memofs.context({
  query: "implement user logout with token invalidation",
  taskType: "coding",
  detail: "compact", // default
  maxBytes: 8192,
});

// Inject directly into LLM system prompt
console.log(briefing.text);

// 2. Check for expandable sections
if (briefing.expandable?.length) {
  for (const exp of briefing.expandable) {
    console.log(`Available section: ${exp.section} (${exp.hint})`);
  }

  // 3. On-demand expansion of a single section
  const expandedNotes = await memofs.context({
    query: "implement user logout with token invalidation",
    section: "notes",
    expand: briefing.expandable.find((e) => e.section === "notes")!.cursor,
  });

  console.log(expandedNotes.text);
}
```

### Parameters (`MemoryContextInput`)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `""` | Task description or query to steer memory retrieval. |
| `taskType` | `TaskType` | `"general"` | Task category used to augment the search lexicon: `"coding"`, `"debug"`, `"refactor"`, `"docs"`, `"general"`. |
| `detail` | `"compact" \| "full"` | `"compact"` | `"compact"` returns a lightweight briefing with expansion cursors. `"full"` packs all sections into `maxBytes`. |
| `maxBytes` | `number` | `8192` | Hard byte budget cap for the output string. |
| `section` | `string` | `undefined` | Section to expand (`"entities"`, `"recall"`, `"recent"`, `"notes"`). |
| `expand` | `string` | `undefined` | Opaque cursor returned by a previous compact call. |
| `includeCore` | `boolean` | `true` | Whether to include core memory rules. |
| `includeNotes` | `boolean` | `true` | Whether to include archival notes. |
| `includeRecent` | `boolean` | `true` | Whether to include recent memory write events. |

## The 4-Stage Strategist Pipeline

`memofs.context()` processes memories through a 4-stage pipeline:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. REWRITE  │ ──► │  2. RESOLVE  │ ──► │  3. FILTER   │ ──► │  4. BUDGET   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
Tokenize query &     Match Knowledge      Apply drift (0.5x)   Pack under byte/
expand lexicon by    Graph entities &     & decay (0.6x)       token limit with
taskType.            neighbor states.     penalties.           omitted notices.
```

1. **Rewrite (`rewriteQuery`)**: Analyzes the query, adds task-specific terminology (e.g. for `taskType: "debug"`, adds error/bug lexicons), and tokenizes search terms.
2. **Resolve (`resolveEntities`)**: Discovers matching entities in the Knowledge Graph and constructs high-trust neighbor relationship lines.
3. **Filter (`filterCandidates`)**: Demotes stale anchored facts by 50% (`score *= 0.5`), demotes expired facts by 40% (`score *= 0.6`), and removes superseded/deprecated records.
4. **Budget (`allocateBudget`)**: Slices sections according to `SECTION_WEIGHTS` (`recall: 3`, `entities: 2`, `recent: 1`, `notes: 1`). If a section overflows, it generates clear omitted notices (`[Omitted 4 items to fit context budget]`).

## Hybrid Scoring & Recency Decay

Candidate relevance is computed using a weighted multi-signal formula:

$$\text{finalScore} = (0.7 \times \text{relevance}) + (0.2 \times \text{recencyBoost}) + (0.1 \times \text{confidence})$$

- **Relevance:** Blended vector cosine similarity ($0.6$) and BM25/fuzzy lexical score ($0.4$).
- **Recency Boost:** Exponential half-life decay over **30 days**:
  $$\text{recencyBoost} = 0.5^{(\text{ageDays} / 30)}$$
- **Confidence:** Scaled directly from the memory record's `confidence` score ($0.0$ to $1.0$).