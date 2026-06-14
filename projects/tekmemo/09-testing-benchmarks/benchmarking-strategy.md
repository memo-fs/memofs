# TekMemo Benchmarking and Production Testing Strategy

_Last updated: 2026-05-04_

## 1. Purpose

This document defines how TekMemo should be tested, benchmarked, load-tested, and validated before production deployment.

TekMemo is not a normal CRUD app. It is memory infrastructure for AI apps and agents. That means ordinary unit tests are not enough.

A production-grade TekMemo release must prove all of these:

1. **Correctness** — memory reads, writes, updates, forgetting, sync, indexing, and recall behave correctly.
2. **Isolation** — user, project, workspace, tenant, and session memory never leak across boundaries.
3. **Retrieval quality** — recall returns the right memories, not just any semantically similar text.
4. **Temporal correctness** — newer facts override older facts when appropriate.
5. **Conflict handling** — contradicted memories are detected, deprecated, or surfaced safely.
6. **Cost control** — free tiers, indexing, embeddings, reranking, and vector search do not burn money unexpectedly.
7. **Latency** — reads, writes, recall, indexing, and API routes stay within acceptable limits.
8. **Failure safety** — provider failures, malformed files, corrupt JSONL, rate limits, and partial writes do not destroy memory state.
9. **Observability** — every important operation can be traced and debugged.
10. **Regression control** — every release can be compared against previous benchmark baselines.

---

## 2. Benchmarking philosophy

TekMemo should not claim it beats competitors until the claim is measurable.

The benchmark strategy should prove this positioning:

> TekMemo gives developers local-first, inspectable, file-backed memory with measurable recall quality, latency, cost, and failure behavior.

The benchmark system should be built before public claims. Public claims should include:

- dataset used
- runner version
- embedder used
- vector store used
- reranker used
- graph expansion settings
- memory compiler settings
- hardware/runtime environment
- cold/warm cache status
- latency percentiles
- cost estimate
- failure behavior

---

## 3. Recommended repo structure

Add this to the TekMemo monorepo:

```txt
apps/
├─ cloud/
├─ docs/
└─ benchmarks/

packages/
├─ tekmemo/
├─ fs/
├─ ai-sdk/
├─ agentfs/
├─ upstash/
├─ voyage/
├─ openai/
├─ rerank/              # future
├─ graph/               # future
├─ connectors/          # future
├─ cloud-sync/          # future
└─ benchmark-kit/
```

### Why `packages/benchmark-kit`?

`packages/benchmark-kit` contains reusable benchmark logic:

- metric calculations
- benchmark runners
- dataset loading
- report generation
- cost estimation
- release gates
- fake retrievers
- adapter contract helpers

### Why `apps/benchmarks`?

`apps/benchmarks` is the executable app:

- local CLI runner
- datasets
- k6 load tests
- reports
- CI entrypoints
- staging production checks

This split keeps benchmark logic reusable while keeping execution scripts in one place.

---

## 4. Test pyramid for TekMemo

TekMemo needs more than one test layer.

```txt
Unit tests
  ↓
Contract tests
  ↓
Integration tests
  ↓
Golden dataset benchmarks
  ↓
Long-memory benchmarks
  ↓
Cost benchmarks
  ↓
Cloud API load tests
  ↓
Production smoke tests
```

### 4.1 Unit tests

Unit tests validate pure package logic.

| Package | Unit test focus |
|---|---|
| `@tekbreed/tekmemo` | memory paths, manifests, events, chunk registry, conflict detection, memory compiler primitives |
| `@tekbreed/tekmemo/fs` | path resolution, safe read/write/append, missing files, path traversal protection |
| `@tekbreed/tekmemo/ai-sdk` | tool schema validation, command mapping, safe memory injection |
| `@tekbreed/tekmemo/agentfs` | root resolution, sync hooks, leases, checkpoint behavior |
| `@tekbreed/tekmemo-upstash` | namespace resolution, metadata filters, hit mapping, dimension validation assumptions |
| `@tekbreed/tekmemo-voyage` | batching, request mapping, dimension validation, malformed responses |
| `@tekbreed/tekmemo/openai` | model validation, dimensions support, request mapping, empty input handling |
| `@tekbreed/tekmemo/rerank` | deterministic ranking, score normalization, fallback behavior |
| `@tekbreed/tekmemo/graph` | entity extraction boundaries, temporal edges, invalidation, graph expansion |
| `@tekbreed/tekmemo-connectors` | cursor state, dedupe, source manifest, retryable ingestion |
| `@tekbreed/tekmemo-cloud-sync` | sync manifest, conflict resolution, idempotency, offline recovery |

### 4.2 Contract tests

Contract tests are shared test suites that every adapter must pass.

Example:

```txt
MemoryStore contract
├─ InMemoryMemoryStore
├─ NodeFsMemoryStore
├─ AgentFsMemoryStore
└─ CloudSyncMemoryStore
```

The point is simple: if two adapters implement `MemoryStore`, they must behave the same way for core behavior.

Required contracts:

| Contract | Implementations |
|---|---|
| `MemoryStoreContract` | in-memory, fs, agentfs, cloud-sync |
| `MemoryVectorStoreContract` | in-memory vector test store, Upstash adapter, future providers |
| `MemoryEmbedderContract` | fake embedder, Voyage, OpenAI |
| `RerankerContract` | deterministic reranker, provider rerankers |
| `ConnectorContract` | GitHub, file folder, Notion, Slack, future connectors |
| `SyncStoreContract` | local sync, AgentFS, Cloud sync |

### 4.3 Integration tests

Integration tests verify package combinations.

Required integration combinations:

```txt
tekmemo + @tekbreed/tekmemo/fs
tekmemo + @tekbreed/tekmemo/fs + @tekbreed/tekmemo/ai-sdk
tekmemo + @tekbreed/tekmemo/fs + @tekbreed/tekmemo-voyage + @tekbreed/tekmemo-upstash
tekmemo + @tekbreed/tekmemo/fs + @tekbreed/tekmemo/openai + @tekbreed/tekmemo-upstash
tekmemo + @tekbreed/tekmemo/graph + @tekbreed/tekmemo/rerank
tekmemo + @tekbreed/tekmemo-connectors + @tekbreed/tekmemo-cloud-sync
```

Integration tests should have two modes:

| Mode | Purpose | Runs on every PR? |
|---|---|---:|
| Fake client mode | deterministic, free, fast | Yes |
| Real provider smoke mode | validates provider integration | No; manual/nightly only |

---

## 5. Retrieval benchmark metrics

TekMemo recall must be measured with retrieval metrics, not opinions.

### 5.1 Recall@K

Recall@K answers:

> Did at least one expected memory appear in the top K results?

Example:

```txt
Query: What database did we choose for TekMemo Cloud?
Expected: mem_turso_decision
Top 5 returned: mem_turso_decision, mem_cloudflare, mem_pricing...
Recall@5 = 1
```

### 5.2 Precision@K

Precision@K answers:

> How many of the top K results were actually relevant?

If top 5 contains 2 expected memories:

```txt
Precision@5 = 2 / 5 = 0.4
```

### 5.3 MRR

MRR means Mean Reciprocal Rank.

It rewards systems that place the first correct answer near the top.

```txt
Correct result at rank 1 → 1.0
Correct result at rank 2 → 0.5
Correct result at rank 5 → 0.2
No correct result       → 0
```

### 5.4 nDCG@K

nDCG rewards ranking quality when multiple relevant memories exist.

Use it later when benchmark cases include graded relevance:

```txt
high relevance = 3
medium relevance = 2
low relevance = 1
irrelevant = 0
```

### 5.5 Forbidden return rate

This is extremely important for TekMemo.

A memory system must not return outdated or forbidden facts.

Example:

```txt
Old fact: The app uses Express.
New fact: The app migrated to Hono.
Query: What framework does the app use now?
Forbidden return: Express
Expected return: Hono
```

### 5.6 Stale return rate

This measures how often TekMemo returns deprecated or superseded memories.

```txt
staleReturnRate = staleResultsReturned / totalQueries
```

### 5.7 Abstention accuracy

This measures whether TekMemo avoids pretending it knows something when memory has no supporting evidence.

Example:

```txt
Query: What CRM does this customer use?
Memory: no CRM information
Correct behavior: return no confident answer / low-confidence context
```

---

## 6. Benchmark datasets TekMemo needs

Start with small handcrafted datasets. Later, expand to public and larger datasets.

### 6.1 Developer-agent dataset

Purpose:

- test developer memory
- project decisions
- preferences
- architecture recall

Example cases:

```txt
What database did we choose?
What hosting platform are we using?
What does the user prefer for API implementation?
```

### 6.2 Conflict dataset

Purpose:

- test old fact vs new fact
- test deprecation
- test temporal ordering

Example:

```txt
Old: Project uses Express.
New: Project migrated to Hono.
Expected answer: Hono.
Must not return as current truth: Express.
```

### 6.3 Temporal update dataset

Purpose:

- test facts that change over time
- test latest-state recall
- test event ordering

Example:

```txt
April 1: Cloud beta planned for May.
May 2: Cloud beta moved to June.
Query: When is cloud beta planned now?
Expected: June.
```

### 6.4 Repo-aware memory dataset

Purpose:

- test package, route, config, and architecture memory
- test codebase-specific recall

Example:

```txt
Query: Where are memory adapters implemented?
Expected: packages/fs, packages/agentfs, packages/upstash
```

### 6.5 Connector ingestion dataset

Purpose:

- test imported source documents
- test source provenance
- test dedupe
- test deleted/updated source handling

### 6.6 Cloud sync dataset

Purpose:

- test sync conflicts
- test offline edits
- test idempotent push/pull
- test restore points

---

## 7. Reranking benchmark plan

Reranking should be added after basic retrieval is stable.

The full recall pipeline should eventually look like this:

```txt
query
  → keyword retrieval top 50
  → vector retrieval top 50
  → graph expansion top 20
  → merge and dedupe candidates
  → rerank top 20
  → memory compiler top 5
  → prompt-ready context
```

### 7.1 What to measure

| Metric | Meaning |
|---|---|
| Pre-rerank Recall@10 | How much good context raw retrieval found |
| Post-rerank MRR | Whether reranking moved correct memories upward |
| Post-rerank nDCG@10 | Whether ranking quality improved |
| Latency delta | Extra time added by reranker |
| Cost delta | Extra money added by reranker |
| Fallback success | Whether recall still works if reranker fails |

### 7.2 Reranker failure rule

Reranker failure must never break recall.

Required behavior:

```txt
If reranker succeeds:
  use reranked candidates

If reranker fails:
  log failure
  return deterministic merged retrieval results
  mark result metadata.rerankerStatus = "failed_fallback"
```

---

## 8. Graph memory benchmark plan

Graph memory should be tested separately from vector recall.

### 8.1 Graph metrics

| Metric | Meaning |
|---|---|
| Entity precision | Extracted entities are correct |
| Entity recall | Important entities were extracted |
| Edge precision | Relationships are correct |
| Temporal edge correctness | Latest relationship is selected correctly |
| Invalidation accuracy | Old relationships are deprecated |
| Graph expansion usefulness | Expanded nodes improve recall |

### 8.2 Graph benchmark example

```json
{
  "events": [
    { "text": "TekMemo Cloud uses Turso for relational data." },
    { "text": "TekMemo Cloud uses Upstash Vector for recall." },
    { "text": "TekMemo Cloud stores snapshots in R2." }
  ],
  "query": "What infrastructure does TekMemo Cloud use?",
  "expectedEntities": ["TekMemo Cloud", "Turso", "Upstash Vector", "R2"],
  "expectedEdges": [
    ["TekMemo Cloud", "uses", "Turso"],
    ["TekMemo Cloud", "uses", "Upstash Vector"],
    ["TekMemo Cloud", "stores snapshots in", "R2"]
  ]
}
```

---

## 9. Cost benchmark plan

TekMemo needs cost benchmarks because the free tier must not destroy the business.

Track cost per operation:

| Operation | Cost metric |
|---|---|
| Memory write | cost per 1,000 writes |
| Indexing | cost per 1,000 chunks |
| Embedding | cost per 1,000 texts or tokens |
| Vector upsert | cost per 1,000 chunks |
| Recall query | cost per 1,000 queries |
| Reranking | cost per 1,000 rerank calls |
| Cloud sync | cost per 1,000 sync events |
| Connector ingestion | cost per 1,000 documents |

Every production benchmark report should include:

```json
{
  "estimatedCost": {
    "per1000WritesUsd": 0.01,
    "per1000IndexOpsUsd": 0.12,
    "per1000RecallQueriesUsd": 0.08
  }
}
```

### 9.1 Free-tier safety

Developer Cloud Free should have hard caps:

```txt
1 user
1 project
storage cap
indexing cap
recall cap
API key cap
retention cap
no expensive add-ons
```

But local testing remains free:

```txt
local file memory = $0 TekMemo cost
local keyword recall = $0 TekMemo cost
BYO provider semantic recall = user pays provider
hosted cloud semantic recall = TekMemo cost, gated by caps
```

---

## 10. API load testing plan

Use k6 for cloud API testing.

Required test types:

| Test | Purpose |
|---|---|
| Smoke | Confirms critical routes work under tiny load |
| Average-load | Tests expected normal traffic |
| Stress | Pushes beyond expected traffic |
| Spike | Tests sudden traffic bursts |
| Soak | Tests stability over long duration |

### 10.1 Endpoints to test

```txt
GET  /api/v1/health
GET  /api/v1/me
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:projectId/memory/core
PUT  /api/v1/projects/:projectId/memory/core
POST /api/v1/projects/:projectId/notes
POST /api/v1/projects/:projectId/recall/query
POST /api/v1/projects/:projectId/index
GET  /api/v1/usage
```

### 10.2 Metrics to track

```txt
p50 latency
p95 latency
p99 latency
error rate
429 rate
auth failure correctness
database latency
vector store latency
embedding provider latency
queue delay
cold start rate
```

### 10.3 Beta targets

| Metric | Target |
|---|---:|
| API error rate | `< 1%` |
| p95 non-AI API latency | `< 300ms` |
| p95 recall API latency | `< 1500ms` |
| p95 memory read latency | `< 250ms` |
| p95 memory write latency | `< 500ms` |
| indexing job success | `> 99%` |
| auth failure correctness | `100%` |

---

## 11. Observability plan

Before production, every critical operation must emit structured telemetry.

Track these spans:

```txt
tekmemo.memory.read
tekmemo.memory.write
tekmemo.memory.append
tekmemo.memory.event.append
tekmemo.index.chunk
tekmemo.embed.batch
tekmemo.vector.upsert
tekmemo.vector.query
tekmemo.rerank
tekmemo.graph.expand
tekmemo.compiler.build_context
tekmemo.sync.pull
tekmemo.sync.push
tekmemo.api.auth
tekmemo.api.quota_check
```

Every operation should include:

```json
{
  "tenantId": "ten_...",
  "projectId": "proj_...",
  "operation": "recall.query",
  "requestId": "req_...",
  "durationMs": 143,
  "status": "ok",
  "provider": "upstash",
  "costUnit": 1
}
```

Minimum logs:

| Event | Why it matters |
|---|---|
| `memory.write.started` | Debug user memory changes |
| `memory.write.completed` | Confirm durability |
| `memory.write.failed` | Support debugging |
| `recall.query.started` | Trace recall latency |
| `recall.query.completed` | Inspect retrieval quality |
| `recall.query.failed` | Provider failure debugging |
| `quota.exceeded` | Cost control |
| `auth.failed` | Security auditing |
| `sync.conflict_detected` | Data integrity |
| `indexing.job.failed` | Recall correctness |

---

## 12. Edge-case suites

### 12.1 Filesystem edge cases

```txt
missing files
empty files
corrupt JSONL
partial writes
large files
invalid paths
path traversal attempts
read-only directory
concurrent writes
unicode content
very long lines
symlink surprises
case-sensitive vs case-insensitive filesystems
```

### 12.2 Memory edge cases

```txt
duplicate facts
contradictory facts
stale facts
low-confidence facts
multiple users
multiple workspaces
same project slug across tenants
session memory leaking into project memory
user memory leaking into workspace memory
forget requests
deleted source documents
out-of-order events
same event replayed twice
```

### 12.3 Vector and embedding edge cases

```txt
dimension mismatch
empty embedding result
provider timeout
provider rate limit
provider malformed response
zero vectors
NaN values
Infinity values
mixed dimensions
query embedding unavailable
vector store unavailable
metadata filter injection
metadata larger than provider limit
```

### 12.4 Recall edge cases

```txt
no results
too many results
wrong scope
stale chunks
deleted chunks
conflicting chunks
duplicate chunks
reranker failure
graph expansion failure
keyword-only fallback
vector-only fallback
very short query
very long query
ambiguous query
```

### 12.5 Cloud edge cases

```txt
invalid API key
revoked API key
wrong project key
quota exceeded
tenant suspended
billing inactive
clock skew
idempotency replay
queue retries
webhook retry storm
provider outage
database unavailable
```

---

## 13. Production release gates

Before production, every release must pass:

```txt
[ ] typecheck passes
[ ] lint passes
[ ] unit tests pass
[ ] contract tests pass
[ ] integration tests pass
[ ] package builds pass
[ ] coverage threshold passes
[ ] benchmark baseline does not regress beyond allowed limits
[ ] k6 smoke test passes
[ ] auth tests pass
[ ] quota tests pass
[ ] migration tests pass
[ ] rollback path tested
[ ] observability emits request IDs
[ ] cost estimate updated
```

### 13.1 Suggested thresholds

| Area | Minimum gate |
|---|---:|
| Core package coverage | `90%+` |
| Adapter package coverage | `85%+` |
| Cloud service coverage | `80%+` |
| Critical auth/quota logic | `95%+` |
| Recall@5 regression | no more than `-2%` |
| MRR regression | no more than `-3%` |
| p95 API latency regression | no more than `+20%` |
| k6 smoke error rate | `< 1%` |

---

## 14. CI schedule

### 14.1 Every pull request

```txt
ci:typecheck
ci:lint
ci:unit
ci:contract
ci:integration-fake
ci:build
ci:bench-quick
```

### 14.2 Nightly

```txt
nightly:real-provider-smoke
nightly:retrieval-benchmark
nightly:long-memory-benchmark
nightly:cost-report
nightly:load-test-staging
```

### 14.3 Before production deploy

```txt
release:full-test-suite
release:benchmark-regression
release:k6-smoke
release:k6-average-load
release:migration-test
release:rollback-test
release:cost-simulation
```

---

## 15. Public benchmark strategy

Do not publish vague claims.

Bad:

```txt
TekMemo has the best memory.
```

Better:

```txt
TekMemo reached 92% Recall@5 and 0.81 MRR on our public developer-agent memory benchmark using local files, OpenAI embeddings, Upstash Vector, and deterministic reranking.
```

A public benchmark page should include:

```txt
dataset
query count
memory count
embedding provider
vector database
reranker
graph mode
memory compiler mode
hardware/runtime
latency percentiles
cost estimate
failure cases
benchmark code link
```

---

## 16. Implementation phases

### Phase 1 — Add benchmark baseline now

Build:

```txt
packages/benchmark-kit
apps/benchmarks
golden datasets
keyword baseline runner
JSON and Markdown reports
k6 smoke test
```

### Phase 2 — Add package contract suites

Build:

```txt
MemoryStore contract
MemoryEmbedder contract
MemoryVectorStore contract
Reranker contract
Connector contract
Sync contract
```

### Phase 3 — Add semantic recall benchmarks

Build:

```txt
fake embedder benchmark
OpenAI smoke benchmark
Voyage smoke benchmark
Upstash fake-client benchmark
Upstash real smoke benchmark
```

### Phase 4 — Add rerank and graph benchmarks

Build:

```txt
pre-rerank baseline
post-rerank benchmark
graph expansion benchmark
conflict benchmark
temporal benchmark
```

### Phase 5 — Add public reproducible benchmark

Build:

```txt
public dataset
public runner
public report generator
benchmark docs
comparison methodology
```

---

## 17. References

- Vitest coverage docs: https://vitest.dev/guide/coverage
- Grafana k6 API load testing docs: https://grafana.com/docs/k6/latest/testing-guides/api-load-testing/
- OpenTelemetry JavaScript docs: https://opentelemetry.io/docs/languages/js/
- BEIR benchmark repository: https://github.com/beir-cellar/beir
