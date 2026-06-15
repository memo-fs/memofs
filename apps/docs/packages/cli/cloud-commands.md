# Cloud commands

The CLI gives you direct access to TekMemo Cloud APIs. You can read context, trigger indexing, and sync memory without writing code.

## Environment

Set these variables before running cloud commands:

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
export TEKMEMO_PROJECT_ID="proj_123"
```

*Alternatively, you can save these in `.tekmemo/config.json` using `npx tekmemo config init`.*

## Parent-level options

These options apply to every `tekmemo cloud` subcommand:

| Option | Default | Description |
| --- | --- | --- |
| `--cloud-url <url>` | `TEKMEMO_CLOUD_URL` or `TEKMEMO_API_URL` | TekMemo Cloud API URL |
| `--api-key <key>` | `TEKMEMO_API_KEY` | TekMemo Cloud API key |
| `--workspace-id <id>` | `TEKMEMO_WORKSPACE_ID` | Default cloud workspace ID |
| `--project-id <id>` | `TEKMEMO_PROJECT_ID` | Default project ID |
| `--timeout-ms <n>` | `30000` | Cloud request timeout in ms |
| `-j, --json` | `false` | Output raw JSON |
| `-v, --verbose` | `false` | Increase verbosity |

## Core commands

### `cloud health`

Check the connection and health of the TekMemo Cloud API.

```bash
npx tekmemo cloud health
```

**Options:** None (inherits parent-level options only).

---

### `cloud context`

Pack cloud memory into an agent-friendly context block.

```bash
npx tekmemo cloud context --query "current task" --json
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `-q, --query <query>` | string | *required* | Task/query to build context |
| `-l, --limit <n>` | number | — | Maximum recall items |
| `--max-bytes <n>` | number | — | Maximum response bytes |
| `--include-core` | boolean | `true` | Include core memory |
| `--include-notes` | boolean | `true` | Include notes memory |
| `--include-recent` | boolean | `true` | Include recent memory |

---

### `cloud recall`

Search TekMemo Cloud memory using keyword, vector, or hybrid search.

```bash
npx tekmemo cloud recall "billing webhooks" --limit 5 --strategy hybrid
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `<query>` | string | *required* | Text to search for |
| `-l, --limit <n>` | number | — | Maximum recall items |
| `--strategy <strategy>` | `local` / `vector` / `hybrid` | `vector` | Recall strategy |
| `--fallback <mode>` | `none` / `local` | — | Fallback mode |
| `--rerank` | boolean | `false` | Request reranking |

---

### `cloud index`

Request background indexing for the project's recall search.

```bash
npx tekmemo cloud index --mode changed
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--mode <mode>` | `all` / `changed` / `core` / `notes` | `changed` | Indexing mode |
| `--force` | boolean | `false` | Force re-indexing |

---

### `cloud remember`

Store durable memory directly in TekMemo Cloud.

```bash
npx tekmemo cloud remember "Use D1 for sync truth." --kind decision
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `[content]` | string | — | Memory content |
| `--stdin` | boolean | `false` | Read content from stdin |
| `--file <path>` | string | — | Read content from file |
| `-k, --kind <kind>` | `decision` / `constraint` / `goal` / `preference` / `reference` / `summary` / `note` | `note` | Type of memory |
| `--title <title>` | string | — | Optional note title |
| `-t, --tag <tag>` | string[] | — | Tag (repeatable) |
| `--confidence <n>` | number (0–1) | — | Confidence score |
| `--source <source>` | string | — | Source identifier |
| `--metadata-json <json>` | JSON | — | Custom metadata |
| `--allow-secrets` | boolean | `false` | Allow secret-like content |

---

### `cloud read`

Read a TekMemo Cloud memory document.

```bash
npx tekmemo cloud read core
npx tekmemo cloud read notes --limit 50
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `<target>` | `core` / `notes` | *required* | Document to read |
| `-l, --limit <n>` | number | — | Max notes (when target is `notes`) |

---

### `cloud update-core`

Replace the project's core memory.

```bash
npx tekmemo cloud update-core "This project uses Next.js and D1."
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `[content]` | string | — | New core memory content |
| `--stdin` | boolean | `false` | Read content from stdin |
| `--file <path>` | string | — | Read content from file |
| `--allow-secrets` | boolean | `false` | Allow secret-like content |

---

### `cloud recent`

List recent memory events from the cloud.

```bash
npx tekmemo cloud recent
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `-l, --limit <n>` | number | — | Maximum recent items |

---

### `cloud validate`

Validate cloud memory health and report warnings or errors.

```bash
npx tekmemo cloud validate
npx tekmemo cloud validate --strict
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `-s, --strict` | boolean | `false` | Strict protocol validation |

---

### `cloud readiness`

Check TekMemo Cloud production readiness. More lenient than `health` — allows missing API key and project ID.

```bash
npx tekmemo cloud readiness
```

**Options:** None (inherits parent-level options only).

---

### `cloud context-compose`

Compose full context package from cloud (core, recall, graph).

```bash
npx tekmemo cloud context-compose --query "database schema"
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `-q, --query <query>` | string | *required* | Task/query to build context |
| `-l, --limit <n>` | number | — | Maximum recall items |
| `--strategy <strategy>` | `auto` / `vector` / `local` | `auto` | Context composition strategy |
| `--rerank` | boolean | `false` | Request reranking |
| `--include-core-memory` | boolean | `true` | Include core memory |
| `--include-recall-results` | boolean | `true` | Include recall results |
| `--include-graph-context` | boolean | `true` | Include graph context |

---

### `cloud evals`

Run context quality evaluations.

```bash
npx tekmemo cloud evals --fixture-ids eval_001,eval_002 --iterations 3
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--fixture-ids <ids>` | comma-separated | — | Evaluation fixture IDs |
| `--iterations <n>` | number | — | Number of iterations |
| `--thresholds-json <json>` | JSON | — | Thresholds JSON object |

---

### `cloud benchmarks`

Run context benchmarks.

```bash
npx tekmemo cloud benchmarks --iterations 5
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--fixture-ids <ids>` | comma-separated | — | Benchmark fixture IDs |
| `--iterations <n>` | number | — | Number of iterations |
| `--thresholds-json <json>` | JSON | — | Thresholds JSON object |

---

## Cloud sync

### `cloud sync status`

Read the current sync status for a client.

```bash
npx tekmemo cloud sync status --client-id my-laptop
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--client-id <id>` | string | — | Optional sync client ID |

---

### `cloud sync pull`

Pull sync events from the cloud.

```bash
npx tekmemo cloud sync pull --client-id my-laptop --since-server-version 42 --limit 100
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--client-id <id>` | string | *required* | Sync client ID |
| `--since-server-version <n>` | number | — | Pull events after this version |
| `-l, --limit <n>` | number | — | Maximum events to return |

---

### `cloud sync push`

Push local sync events to TekMemo Cloud.

```bash
npx tekmemo cloud sync push \
  --client-id my-laptop \
  --events-json '{"events": [...]}' \
  --checkpoint-json '{"lastSeq": 99}'
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--client-id <id>` | string | *required* | Sync client ID |
| `--events-json <json>` | JSON | — | Event array or object with events array |
| `--checkpoint-json <json>` | JSON | — | Optional checkpoint object |
| `--stdin` | boolean | `false` | Read events JSON from stdin |
| `--file <path>` | string | — | Read events JSON from file |

---

## Cloud graph

### `cloud graph list-nodes`

List graph nodes with pagination and status filters.

```bash
npx tekmemo cloud graph list-nodes --limit 20 --status active
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `-l, --limit <n>` | number | — | Maximum nodes to return |
| `--cursor <string>` | string | — | Pagination cursor |
| `--status <status>` | `active` / `deprecated` / `conflicted` / `deleted` | — | Filter by status |

---

### `cloud graph create-node`

Create a graph node.

```bash
npx tekmemo cloud graph create-node \
  --node-id decision_42 \
  --type decision \
  --label "Use D1 for sync" \
  --summary "Store sync truth in D1" \
  --aliases "sync-strategy,d1-approach" \
  --metadata-json '{"status":"accepted"}'
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--node-id <id>` | string | *required* | Node ID |
| `--type <type>` | string | *required* | Node type |
| `--label <label>` | string | *required* | Node label |
| `--summary <summary>` | string | — | Node summary |
| `--aliases <aliases>` | comma-separated | — | Node aliases |
| `--metadata-json <json>` | JSON | — | Metadata JSON object |

---

### `cloud graph list-edges`

List graph edges with pagination and status filters.

```bash
npx tekmemo cloud graph list-edges --limit 20
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `-l, --limit <n>` | number | — | Maximum edges to return |
| `--cursor <string>` | string | — | Pagination cursor |
| `--status <status>` | `active` / `deprecated` / `conflicted` / `deleted` | — | Filter by status |

---

### `cloud graph create-edge`

Create a graph edge between two nodes.

```bash
npx tekmemo cloud graph create-edge \
  --from decision_42 \
  --to decision_7 \
  --type depends_on \
  --weight 0.9 \
  --metadata-json '{"rationale":"D1 chosen first"}'
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--edge-id <id>` | string | auto | Edge ID (auto-generated if omitted) |
| `--from <id>` | string | *required* | Source node ID |
| `--to <id>` | string | *required* | Target node ID |
| `--type <type>` | string | *required* | Edge type |
| `--directed` | boolean | `true` | Directed edge |
| `--weight <n>` | number (0–1) | — | Edge weight |
| `--metadata-json <json>` | JSON | — | Metadata JSON object |

---

### `cloud graph neighbors`

Find graph neighbors around a node.

```bash
npx tekmemo cloud graph neighbors \
  --node-id decision_42 \
  --direction both \
  --depth 2 \
  --limit 50
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--node-id <id>` | string | *required* | Seed node ID |
| `--direction <dir>` | `in` / `out` / `both` | `both` | Traversal direction |
| `--depth <n>` | number | — | Search depth |
| `-l, --limit <n>` | number | — | Maximum results |

---

### `cloud graph path`

Find a graph path between two nodes.

```bash
npx tekmemo cloud graph path --from decision_42 --to decision_7 --max-depth 5
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--from <id>` | string | *required* | Start node ID |
| `--to <id>` | string | *required* | Target node ID |
| `--max-depth <n>` | number | — | Maximum search depth |

---

## Cloud extraction

### `cloud extraction run`

Run graph extraction.

```bash
npx tekmemo cloud extraction run --mode full --force
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--mode <mode>` | `full` / `core` / `notes` / `sync` / `connectors` | — | Extraction mode |
| `--force` | boolean | `false` | Force re-extraction |

---

### `cloud extraction jobs`

List extraction jobs.

```bash
npx tekmemo cloud extraction jobs --limit 10
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `-l, --limit <n>` | number | — | Maximum jobs to return |

---

## Cloud exports

### `cloud exports create`

Create a memory export archive.

```bash
npx tekmemo cloud exports create --label "pre-migration-backup"
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--label <name>` | string | — | Export label |

---

### `cloud exports download`

Download an export archive.

```bash
npx tekmemo cloud exports download --export-id export_abc123
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--export-id <id>` | string | *required* | Export ID |

---

## Cloud snapshots

### `cloud snapshots create`

Create a memory snapshot.

```bash
npx tekmemo cloud snapshots create --label "pre-deploy" --trigger manual
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--label <name>` | string | — | Snapshot label |
| `--trigger <trigger>` | `manual` / `sync` / `system` | `manual` | Trigger type |

---

### `cloud snapshots download`

Download a snapshot archive.

```bash
npx tekmemo cloud snapshots download --snapshot-id snap_xyz789
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--snapshot-id <id>` | string | *required* | Snapshot ID |

---

## Cloud providers

### `cloud providers list`

List configured provider credentials.

```bash
npx tekmemo cloud providers list
```

**Options:** None (inherits parent-level options only).

---

### `cloud providers create`

Register a provider credential for use by TekMemo Cloud.

```bash
npx tekmemo cloud providers create \
  --provider openai \
  --key-name production \
  --secret sk-proj-... \
  --embedding-model text-embedding-3-small
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--provider <provider>` | `voyageai` / `openai` / `upstash-vector` | *required* | Provider type |
| `--key-name <name>` | string | *required* | Key name |
| `--secret <secret>` | string | *required* | Provider secret |
| `--rest-url <url>` | string | — | REST URL (required for `upstash-vector`) |
| `--embedding-model <model>` | string | — | Embedding model |
| `--rerank-model <model>` | string | — | Rerank model |

---

### `cloud providers test`

Test a provider credential.

```bash
npx tekmemo cloud providers test --credential-id cred_42
```

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--credential-id <id>` | string | *required* | Credential ID |

---

## Quick reference

```
tekmemo cloud
├── health                         Check cloud health
├── context                        Build context block
├── recall                         Search cloud memory
├── index                          Trigger recall indexing
├── remember                       Store durable memory
├── read                           Read core or notes
├── update-core                    Replace core memory
├── recent                         List recent events
├── validate                       Validate cloud memory
├── readiness                      Check production readiness
├── context-compose                Compose full context package
├── evals                          Run context quality evals
├── benchmarks                     Run context benchmarks
├── sync
│   ├── status                     Read sync status
│   ├── pull                       Pull sync events
│   └── push                       Push local events
├── graph
│   ├── list-nodes                 List graph nodes
│   ├── create-node                Create graph node
│   ├── list-edges                 List graph edges
│   ├── create-edge                Create graph edge
│   ├── neighbors                  Find graph neighbors
│   └── path                       Find graph path
├── extraction
│   ├── run                        Run graph extraction
│   └── jobs                       List extraction jobs
├── exports
│   ├── create                     Create memory export
│   └── download                   Download export archive
├── snapshots
│   ├── create                     Create cloud snapshot
│   └── download                   Download snapshot archive
└── providers
    ├── list                       List provider credentials
    ├── create                     Create provider credential
    └── test                       Test provider credential
```

Use `--help` on any command to see the full list of options:

```bash
npx tekmemo cloud graph --help
npx tekmemo cloud sync push --help
```
