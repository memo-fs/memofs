# TekMemo Master Restructured Plan


---

<!-- Source: README.md -->

# TekMemo Documentation — Restructured Source of Truth

_Last updated: 2026-05-03_

## Purpose

This documentation set reorganizes the uploaded TekMemo plans into a cleaner source-of-truth structure for building:

1. **TekMemo OSS** — the free, local-first, file-first memory runtime for AI apps and agents.
2. **TekMemo Cloud** — the hosted sync, API, dashboard, usage, team, and restore layer.
3. **TekMemo Enterprise later** — governance, SSO, audit exports, advanced retention, private deployment, and custom controls.

The old documents are preserved in `archive/originals/` so no previous context is lost.

---

## Strategic decision

TekMemo should not compete as “another memory API.”

TekMemo should compete as:

> **The file-first memory runtime for AI apps and agents — local by default, inspectable by humans, versionable like code, and syncable to the cloud when teams need hosted infrastructure.**

This creates a clearer wedge against memory APIs, graph memory services, and agent frameworks.

---

## New documentation map

| File | Purpose |
|---|---|
| `docs/product/01-product-strategy.md` | Product positioning, wedge, competitors, what TekMemo must become. |
| `docs/product/02-oss-core-and-free-testing.md` | OSS package model, local file memory, free testing, BYO-provider mode. |
| `docs/product/03-cloud-product-and-ui.md` | Cloud product model, dashboard IA, required screens, design principles. |
| `docs/product/04-pricing-and-commercial-strategy.md` | Updated pricing, quotas, add-ons, competitor-aware pricing logic. |
| `docs/architecture/05-memory-architecture.md` | Memory filesystem, memory layers, event log, conflict detection, hybrid retrieval, graph memory. |
| `docs/architecture/06-api-contract.md` | Canonical API groups, response envelopes, auth, API key rules. |
| `docs/architecture/07-infrastructure-and-backend.md` | Cloudflare, Turso, Upstash, R2, Queues, Durable Objects, folder structure. |
| `docs/architecture/08-database-schema-prisma.md` | Prisma schema strategy, control-plane DB, tenant-data DB, future schema extensions. |
| `docs/roadmap/09-execution-roadmap.md` | Combined 4-week survival plan, 90-day roadmap, and later strategic roadmap. |
| `docs/operations/10-launch-and-revenue-plan.md` | Beta launch, service revenue, founder outreach, positioning, first income path. |
| `docs/operations/11-oss-governance-and-community.md` | OSS launch guide, repo structure, license, contribution, security. |
| `docs/reference/12-competitor-and-benchmark-strategy.md` | Competitor matrix, pricing comparisons, benchmark strategy, comparison pages. |
| `docs/reference/13-implementation-checklists.md` | Execution checklists merged from Day 1 and Weeks 1–4. |
| `docs/reference/14-document-merge-map.md` | What was merged, changed, preserved, and intentionally postponed. |

---

## What changed

### 1. Free developer testing is now first-class

TekMemo must let developers test without paying TekMemo or any cloud provider.

The new model has four modes:

1. **Local file memory** — completely free, no cloud, no API key.
2. **Local keyword recall** — free search over local `.tekmemo/` files.
3. **Local semantic recall with BYO provider** — user pays their own embedder/vector infrastructure if they want.
4. **Developer Cloud Free** — hosted sandbox with hard caps.

### 2. Paid prices were not lowered

The original prices were already strategically low compared with current memory-platform pricing. The better move is to **increase perceived value and free testing**, not make the business fragile by underpricing.

### 3. Developer Cloud Free was adjusted

The free hosted plan is now more useful, but still hard-capped so it does not create uncontrolled cost.

### 4. Standout features were added to the roadmap

The roadmap now includes:

- memory filesystem standard
- memory event log
- memory inspector UI
- graph memory
- temporal memory
- hybrid retrieval
- conflict detection
- memory decay and forgetting
- memory compiler
- MCP server
- repo-aware memory
- connector framework
- public benchmark suite
- governance and audit layer
- local/cloud sync with snapshots

### 5. “Build now” and “build later” are separated

The first 4 weeks still stay focused on survival:

- OSS core
- local file memory
- Cloud beta
- projects
- core memory
- notes
- API keys
- basic recall
- usage
- pricing
- revenue path

The advanced features are included, but clearly placed after launch so the first month does not collapse under scope.

---

## Recommended launch message

> TekMemo is the file-first memory runtime for AI apps and agents. Start locally for free with inspectable `.tekmemo/` memory files, then sync to TekMemo Cloud when you need hosted APIs, recall, restore history, teams, and production controls.

---

## Repository recommendation

```txt
tekmemo/
├─ apps/
│  ├─ docs/
│  └─ examples-showcase/
├─ packages/
│  ├─ tekmemo/
│  ├─ ai-sdk/
│  ├─ fs/
│  ├─ agentfs/
│  ├─ upstash/
│  ├─ voyage/
│  └─ openai/
├─ examples/
│  ├─ local-file-memory/
│  ├─ ai-sdk-agent/
│  ├─ cloud-api/
│  └─ mcp-server-later/
├─ .github/
├─ README.md
├─ LICENSE
├─ CONTRIBUTING.md
├─ SECURITY.md
└─ pnpm-workspace.yaml
```

Private cloud app can remain in a separate private repo until you are ready to open selected cloud SDKs or examples.



---

<!-- Source: docs/product/01-product-strategy.md -->

# TekMemo Product Strategy

_Last updated: 2026-05-03_

## 1. Product thesis

TekMemo should become:

> **A file-first, local-first, developer-owned memory runtime for AI apps and agents.**

This is stronger than “an AI memory API” because many competitors already offer memory APIs, graph memory, managed retrieval, and open-source SDKs.

TekMemo’s durable wedge is ownership:

- memory starts locally
- memory is stored in visible files
- memory can be inspected by humans
- memory can be versioned like code
- memory can be synced to cloud when needed
- memory can be debugged, restored, and governed

---

## 2. What TekMemo is

TekMemo is a memory runtime that gives AI apps and agents durable, structured, inspectable memory.

It provides:

- local memory files
- memory store abstraction
- memory layers
- notes and archival memory
- conversation/event history
- structured memory operations
- semantic recall adapters
- cloud sync later
- API access in TekMemo Cloud
- dashboard inspection in TekMemo Cloud

---

## 3. What TekMemo is not

TekMemo should not be positioned as:

- a generic vector database
- a chatbot UI
- a note-taking app
- a full agent framework
- a LangChain clone
- a replacement for all databases
- a generic file storage app

TekMemo can integrate with agents, but it should not force developers into one agent runtime.

---

## 4. Core positioning

### One-line positioning

**TekMemo is the file-first memory runtime for AI apps and agents.**

### Longer positioning

TekMemo lets developers give AI apps durable memory without locking that memory inside a black-box API. Start locally with inspectable `.tekmemo/` files, then use TekMemo Cloud when you need hosted APIs, sync, recall infrastructure, restore history, teams, and usage controls.

### Developer-facing promise

> Build memory-enabled AI apps locally for free. Inspect everything. Sync only when you are ready.

### Cloud-facing promise

> Stop building the memory backend yourself. TekMemo Cloud hosts sync, recall, API keys, restore history, usage, teams, and billing around your project memory.

---

## 5. Target users

### Primary users

- AI app developers
- agent builders
- coding-agent developers
- JS/TS product engineers
- founders building AI products
- small technical teams
- consultants building AI workflows for clients

### Secondary users

- devtool teams
- internal platform teams
- education platforms
- research tooling teams
- support automation teams
- knowledge assistant builders

---

## 6. Core use cases

### 6.1 Agent personalization

Apps can remember user preferences, previous answers, repeated constraints, and communication style.

Example:

```txt
User prefers TypeScript examples, React Router v7, and production-grade explanations.
```

### 6.2 Project memory

Agents can remember architecture decisions, product constraints, package choices, and implementation history.

Example:

```txt
This project uses React Router v7 on Cloudflare Workers and Turso for relational data.
```

### 6.3 Coding-agent memory

Coding agents can remember repo conventions, file structure, architecture decisions, previous bugs, and review feedback.

Example:

```txt
In this repo, backend route files stay thin. Business logic lives in src/domain services.
```

### 6.4 Team memory

Teams can share durable knowledge across AI workflows.

Example:

```txt
All production API routes must return a request ID and use the canonical JSON envelope.
```

### 6.5 Memory inspection and audit

Teams can inspect what the AI remembers and why.

Example:

```txt
Memory source: Support thread from 2026-05-01
Last used: 2026-05-03
Status: active
Confidence: 0.91
```

### 6.6 Local-first development

Developers can prototype memory-enabled apps without paying for hosted memory or external infrastructure.

Example:

```bash
pnpm add @tekbreed/tekmemo @tekbreed/tekmemo/fs
```

---

## 7. Strategic wedge against competitors

Most competitors compete on:

- managed memory APIs
- graph memory
- context engineering
- connectors
- retrieval performance
- enterprise governance

TekMemo should compete on:

- file-first ownership
- local-first developer workflow
- TypeScript-first experience
- memory-as-code
- transparent inspection
- cloud sync as an upgrade path
- low-cost self-host/testing path

---

## 8. Product pillars

### Pillar 1 — Own your memory

Developers should be able to inspect, export, copy, version, and migrate memory.

### Pillar 2 — Start free locally

The first useful TekMemo experience must not require a credit card, hosted database, or TekMemo Cloud account.

### Pillar 3 — Sync when useful

Cloud should feel like an upgrade, not a requirement.

### Pillar 4 — Debug memory like code

Every memory should have source, timestamps, confidence, status, and usage history.

### Pillar 5 — Beat on workflow, not just retrieval

Memory retrieval alone is not enough. TekMemo must own the whole memory lifecycle:

```txt
capture -> structure -> inspect -> index -> recall -> use -> update -> conflict-check -> expire -> restore
```

---

## 9. Product layers

| Layer | Product | Purpose |
|---|---|---|
| Core runtime | TekMemo OSS | Local file memory, memory APIs, adapters. |
| Hosted service | TekMemo Cloud | Sync, hosted API, dashboard, recall, usage, teams. |
| Advanced layer | TekMemo Cloud Pro/Team/Business | Restore, audit, webhooks, advanced usage, team controls. |
| Enterprise later | TekMemo Enterprise | SSO, SLA, audit exports, custom retention, private deployment. |

---

## 10. Strategic recommendation

Do not try to outbuild every competitor immediately.

Win a focused category first:

> **Developer-owned memory for AI apps and coding agents.**

Then expand into:

1. graph memory
2. connectors
3. benchmarks
4. MCP
5. enterprise governance
6. managed context engineering

---

## 11. Product decision rules

When deciding whether to build a feature, ask:

1. Does it make memory more inspectable?
2. Does it improve local-first adoption?
3. Does it make cloud more valuable without forcing lock-in?
4. Does it help developers integrate faster?
5. Does it help teams trust memory in production?
6. Does it create revenue or reduce onboarding friction?

If the answer is no, postpone it.



---

<!-- Source: docs/product/02-oss-core-and-free-testing.md -->

# TekMemo OSS Core and Free Developer Testing

_Last updated: 2026-05-03_

## 1. Core decision

TekMemo must let developers test meaningful memory workflows without paying TekMemo or any cloud provider.

This is not only a generosity feature. It is a strategic adoption feature.

If developers can run TekMemo locally in minutes, they are more likely to:

- trust it
- test it deeply
- write examples
- report issues
- use it in OSS projects
- upgrade to cloud later

---

## 2. Free testing model

TekMemo should support four testing modes.

| Mode | Cost to developer | TekMemo cost | Best for |
|---|---:|---:|---|
| Local file memory | $0 | $0 | Trying memory storage and structured operations. |
| Local keyword recall | $0 | $0 | Searching local memory without embeddings. |
| Local semantic recall with BYO provider | User pays provider | $0 | Testing real semantic recall locally. |
| Developer Cloud Free | $0 | controlled cost | Testing hosted API and dashboard. |

---

## 3. OSS package model

Recommended package structure:

```txt
packages/
├─ tekmemo/          # core runtime
├─ ai-sdk/           # Vercel AI SDK integration
├─ fs/               # local filesystem adapter
├─ agentfs/          # AgentFS adapter
├─ upstash/          # Upstash Vector adapter
├─ voyage/           # Voyage embedder
├─ openai/           # OpenAI embedder
├─ mcp/              # MCP server later
├─ graph/            # graph memory later
└─ connectors/       # connector framework later
```

---

## 4. Core package responsibilities

### `@tekbreed/tekmemo`

Owns:

- memory file conventions
- memory types
- store interfaces
- bootstrap logic
- structured memory commands
- validation
- serialization
- event log primitives
- memory layer rules

It should not depend on:

- Cloudflare
- Turso
- Upstash
- React
- a specific LLM provider

### `@tekbreed/tekmemo/fs`

Owns:

- local `.tekmemo/` read/write
- file locks where possible
- path normalization
- local snapshots
- local import/export

### `@tekbreed/tekmemo/ai-sdk`

Owns:

- AI SDK tool definitions
- `remember` tool
- `recall` tool
- `forget` tool
- `inspect` tool later
- prepare-call helper

### `@tekbreed/tekmemo-upstash`

Owns:

- vector upsert
- vector query
- metadata filters
- namespace strategy
- chunk IDs
- stale chunk replacement

### `@tekbreed/tekmemo-voyage` and `@tekbreed/tekmemo/openai`

Own:

- embedder interfaces
- batching
- rate-limit handling
- dimension validation
- provider-specific error mapping

---

## 5. Local `.tekmemo/` filesystem

Recommended v1 structure:

```txt
.tekmemo/
├─ manifest.json
├─ memory/
│  ├─ core.md
│  ├─ notes.md
│  ├─ facts.jsonl
│  ├─ procedures.jsonl
│  ├─ preferences.jsonl
│  └─ policies.jsonl
├─ conversations/
│  └─ conversations.jsonl
├─ events/
│  └─ memory-events.jsonl
├─ indexes/
│  ├─ keyword.json
│  └─ chunks.jsonl
├─ snapshots/
│  └─ snapshot-manifest.jsonl
├─ graph/
│  ├─ nodes.jsonl
│  └─ edges.jsonl
└─ config.json
```

### Why files matter

Files make memory:

- visible
- portable
- diffable
- backup-friendly
- easy to inspect
- easy to version
- easier to trust

---

## 6. Minimum local API

```ts
import { createTekMemo } from "@tekbreed/tekmemo";
import { createFsStore } from "@tekbreed/tekmemo/fs";

const memo = createTekMemo({
  store: createFsStore(".tekmemo"),
});

await memo.remember({
  scope: "project",
  type: "semantic",
  content: "This app uses React Router v7 on Cloudflare Workers.",
  source: {
    kind: "manual",
  },
});

const results = await memo.recall({
  query: "What stack does this app use?",
});
```

---

## 7. No-cost local capabilities

These must work without external services:

- create `.tekmemo/`
- read/write core memory
- append notes
- append conversations
- append memory events
- inspect memory files
- search by keyword
- list memories by scope/type/tag/status
- export/import
- snapshots
- basic conflict warnings using deterministic rules

---

## 8. Optional cost-bearing capabilities

These should require BYO provider or TekMemo Cloud:

- semantic embeddings
- vector recall
- reranking
- graph enrichment using LLM extraction
- connector ingestion
- cloud sync
- hosted snapshots
- team access
- webhooks

---

## 9. BYO-provider mode

BYO-provider mode prevents TekMemo from losing money while still giving developers deep testing power.

Example config:

```ts
const memo = createTekMemo({
  store: createFsStore(".tekmemo"),
  embedder: openaiEmbedder({
    apiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small",
  }),
  vector: upstashVector({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  }),
});
```

### Rule

TekMemo should never hide that BYO mode means the developer pays their provider directly.

---

## 10. CLI commands

Recommended CLI surface:

```bash
tekmemo init
tekmemo status
tekmemo remember "Project uses Turso for relational data"
tekmemo recall "What database does this project use?"
tekmemo inspect
tekmemo events
tekmemo snapshot create
tekmemo snapshot list
tekmemo export --format json
tekmemo import ./memory-export.json
tekmemo cloud login
tekmemo cloud sync
```

---

## 11. OSS examples required at launch

### Example 1 — Local file memory

Demonstrates:

- install
- init
- remember
- recall with keyword search
- inspect files

### Example 2 — AI SDK agent

Demonstrates:

- memory tools
- simple chat agent
- local memory persistence
- no cloud required

### Example 3 — BYO semantic recall

Demonstrates:

- OpenAI or Voyage embedder
- Upstash vector adapter
- local store + semantic recall

### Example 4 — Cloud API later

Demonstrates:

- API key
- hosted project
- remote memory write
- remote recall query

---

## 12. Free testing success criteria

TekMemo free testing succeeds when a developer can:

1. install packages
2. initialize `.tekmemo/`
3. write memory locally
4. inspect the memory as files
5. run simple recall locally
6. integrate with an agent
7. decide whether they need cloud later

No credit card. No hosted dependency. No vendor lock-in.



---

<!-- Source: docs/product/03-cloud-product-and-ui.md -->

# TekMemo Cloud Product and UI Specification

_Last updated: 2026-05-03_

## 1. Product definition

TekMemo Cloud is the hosted commercial layer for TekMemo.

It provides:

- hosted project memory
- cloud sync
- hosted API
- API keys
- recall infrastructure
- usage metering
- restore history
- dashboard inspection
- team/project administration
- billing and plan controls

TekMemo Cloud should not look or feel like a chatbot. It is a memory infrastructure dashboard.

---

## 2. Cloud value proposition

Developers pay for TekMemo Cloud because they do not want to build:

- multi-tenant memory storage
- API key auth
- usage metering
- quota enforcement
- sync infrastructure
- restore history
- project-level memory dashboards
- team access controls
- hosted recall/indexing pipelines

---

## 3. Core entities

| Entity | Meaning |
|---|---|
| Tenant | Organization/account boundary. |
| User | Human account under a tenant. |
| Project | Primary memory boundary for an app, agent, workspace, or product. |
| Memory document | Canonical structured memory file. |
| Memory note | Archival or durable note. |
| Conversation | Append-only conversational history. |
| Chunk | Indexed recall unit. |
| Recall job | Async indexing or recall pipeline job. |
| API key | Programmatic access credential. |
| Restore point | Snapshot of memory state. |
| Usage event | Metered action. |

---

## 4. Dashboard navigation

Recommended first release navigation:

```txt
Overview
Projects
Memory
Recall
Usage
Billing
API Keys
Settings
```

Add after the core loop is stable:

```txt
Webhooks
Team
History & Restore
Graph
Connectors
Benchmarks
Audit Logs
```

---

## 5. Required first-release screens

### 5.1 Overview

Purpose: show health, usage, and next actions.

Sections:

- current plan card
- projects used / limit
- storage used / limit
- indexing ops used / limit
- recall queries used / limit
- active API keys
- recent activity
- quota warnings
- onboarding checklist

### 5.2 Projects

Purpose: create and manage memory projects.

Actions:

- create project
- view project
- open memory
- open API keys
- open recall tester
- open settings

Project creation should be a **dialog**, not a separate page, because the first version requires minimal input:

- project name
- slug
- environment
- optional description

A separate creation page is only needed later if project creation includes advanced setup such as provider config, region, dedicated database, connector selection, or initial import.

### 5.3 Project detail

Tabs:

- Overview
- Memory
- Notes
- Recall
- API Keys
- Usage
- Settings
- History later
- Graph later

### 5.4 Memory

Purpose: inspect and edit canonical memory.

Sections:

- memory layer selector
- editor panel
- metadata panel
- last updated
- source/provenance
- status
- save action
- restore/create snapshot action later

### 5.5 Notes

Purpose: append durable archival memory.

Features:

- create note
- list notes
- filter by kind/tag
- view source
- mark note for indexing

### 5.6 Recall

Purpose: test retrieval.

Features:

- query input
- project selector
- layer filters
- top-k control
- result list
- score/confidence
- source link
- raw JSON toggle
- reindex action

### 5.7 API Keys

Purpose: connect apps to TekMemo Cloud.

Features:

- create key
- list keys
- revoke key
- show prefix
- last used
- scopes
- project binding

Create key modal fields:

- key name
- key type: user key or project key
- project binding
- scopes
- optional note

Success state:

```txt
Copy your key now.
This is the only time the full secret will be shown.
```

### 5.8 Usage

Purpose: help users understand quota and cost.

Cards:

- storage
- indexing operations
- recall queries
- API requests
- projects
- users
- webhooks later

### 5.9 Billing

Purpose: show plan, upgrade path, invoices, and add-ons.

First release can be simple:

- current plan
- limits
- upgrade CTA
- manual payment/contact path
- invoice link later

### 5.10 Settings

Sections:

- tenant settings
- project defaults
- provider config later
- data export
- delete project

---

## 6. Empty states

### No projects

**Create your first project**

Projects are the primary memory boundary inside TekMemo Cloud. Create a project to start editing core memory, appending notes, generating API keys, and testing recall.

CTA: **Create project**

### No API keys

**Create your first API key**

Use API keys to connect your backend to TekMemo Cloud. Project-scoped keys are recommended for production.

CTA: **Create API key**

### No recall index

**Index memory before recall**

Recall needs indexed chunks. Start with core memory and notes, then run indexing to test retrieval.

CTA: **Index project memory**

---

## 7. Design principles

### Principle 1 — Memory must feel inspectable

Users should always know what memory exists, where it came from, and how it changed.

### Principle 2 — Make layers visible

Do not flatten everything into one memory bucket.

### Principle 3 — Infrastructure, not chatbot

The UI should feel closer to Vercel, Supabase, Linear, Sentry, or GitHub than a consumer chat app.

### Principle 4 — Show provenance

Memory without source is hard to trust.

### Principle 5 — Make quota visible but not annoying

Usage should be visible in context and should only interrupt when necessary.

---

## 8. UI hierarchy

Recommended layout:

```txt
Sidebar
  global navigation
Top bar
  tenant/project selector, search, account
Main area
  page content
Right panel when useful
  metadata, activity, source, usage
```

---

## 9. Feature rollout by UI depth

### First release

- Overview
- Projects
- Project detail
- Memory editor
- Notes
- Recall tester
- API Keys
- Usage
- Billing basics
- Settings

### Second release

- History & Restore
- Webhooks
- Team
- Activity feed
- better onboarding

### Third release

- Memory Inspector
- Graph view
- Conflict center
- Connector setup
- Benchmark dashboard
- Audit logs

---

## 10. UI moat

TekMemo Cloud should win by making memory understandable.

The dashboard should answer:

- What does this agent remember?
- Where did this memory come from?
- What changed recently?
- Which memories are stale?
- Which memories conflict?
- Which memories are used most?
- Which plan limit is being approached?
- Can I restore an earlier state?

This is how TekMemo becomes trusted infrastructure instead of just another backend API.



---

<!-- Source: docs/product/04-pricing-and-commercial-strategy.md -->

# TekMemo Pricing and Commercial Strategy

_Last updated: 2026-05-03_

## 1. Pricing decision

Do **not** lower TekMemo paid prices at launch.

The existing prices are already aggressive:

- Pro — **$14/month**
- Team — **$59/month**
- Business — **$169/month**

The stronger strategic move is:

1. keep paid pricing stable
2. improve the free/local developer path
3. increase plan value with smarter quotas
4. use BYO-provider mode to avoid running at a loss
5. keep add-ons available for heavy usage

---

## 2. Why not reduce prices further?

Cutting prices too low creates four problems:

1. support burden becomes expensive
2. heavy users can create infrastructure cost faster than revenue
3. the product may look cheap instead of serious
4. you lose room for discounts and founder offers

TekMemo should compete by being **cheaper and more developer-owned**, not by racing to zero on cloud infrastructure.

---

## 3. Final plan ladder

| Plan | Price | Best for |
|---|---:|---|
| OSS / Self-host | Free | Local/self-hosted developers. |
| Developer Cloud | Free | Hosted evaluation and API testing. |
| Pro | $14/month | Solo builders and indie products. |
| Team | $59/month | Startups and small teams. |
| Business | $169/month | Production teams and platform teams. |
| Enterprise | Custom | Security, compliance, private deployment, SLA. |

---

## 4. Updated quotas

The original paid prices stay, but quotas should be improved so TekMemo feels clearly generous.

| Feature | Developer Cloud | Pro | Team | Business | Enterprise |
|---|---:|---:|---:|---:|---|
| Monthly price | $0 | $14 | $59 | $169 | Custom |
| Projects | 2 | 10 | 30 | 150 | Custom |
| Users | 1 | 1 | 10 | 30 | Custom |
| Hosted storage | 50 MB | 500 MB | 3 GB | 25 GB | Custom |
| Indexing ops/month | 5,000 | 75,000 | 350,000 | 1,500,000 | Custom |
| Recall queries/month | 5,000 | 50,000 | 250,000 | 1,000,000 | Custom |
| Retention | 14 days | 45 days | 120 days | 365 days | Custom |
| API keys | 1 | 5 | 15 | 75 | Custom |
| Webhooks | 0 | 2 | 15 | 75 | Custom |
| Shared projects | No | No | Yes | Yes | Yes |
| Roles | No | No | Basic | Advanced | Advanced |
| Restore UI | No | Basic | Yes | Advanced | Advanced |
| Audit trail | No | Basic | Basic | Advanced | Advanced |
| Usage analytics | Basic | Basic | Yes | Advanced | Advanced |
| SSO/SAML | No | No | No | No | Yes |
| SLA | No | No | No | No | Yes |

---

## 5. Free testing without loss

### 5.1 OSS / Self-host Free

This is the strongest free tier.

Includes:

- local `.tekmemo/` memory files
- core memory
- notes
- conversations
- event log
- keyword recall
- snapshots
- import/export
- local examples
- AI SDK integration

No TekMemo infrastructure cost.

### 5.2 Developer Cloud Free

This is a hosted evaluation tier, not a production tier.

Rules:

- hard caps
- no add-ons
- no grace buffer
- no webhooks
- abuse protection
- rate limits
- storage cap
- retention cap

### 5.3 BYO-provider mode

Users can test deeper semantic recall by bringing their own:

- OpenAI API key
- Voyage API key
- Upstash Vector token
- local vector database later

This keeps developer testing flexible without making TekMemo pay unlimited AI costs.

---

## 6. Rate limits

Monthly quotas are not enough. Also apply request-rate limits.

| Plan | Requests/minute |
|---|---:|
| Developer Cloud | 60 |
| Pro | 300 |
| Team | 1,000 |
| Business | 3,000 |
| Enterprise | Custom |

Rate limits are abuse controls, not billing dimensions.

---

## 7. Add-ons

Keep add-ons for paid plans.

| Add-on | Included amount | Price |
|---|---:|---:|
| Indexing Pack | +50,000 indexing ops/month | $8/month |
| Recall Pack | +50,000 recall queries/month | $8/month |
| Storage Pack | +5 GB storage | $10/month |
| Retention Pack | +90 days retention | $12/month |
| Extra User Pack | +5 users | $15/month |
| Extra Project Pack | +10 projects | $10/month |

Developer Cloud does not support add-ons.

---

## 8. Annual pricing

Use approximately 15–17% annual savings.

| Plan | Monthly | Annual |
|---|---:|---:|
| Pro | $14/month | $139/year |
| Team | $59/month | $590/year |
| Business | $169/month | $1,690/year |

This is slightly cleaner than the previous annual numbers and easier to market.

---

## 9. Founder pricing

Use temporary founder offers without changing public pricing.

### Founding Pro

- $9/month for first 6 months
- manual approval
- limited seats
- good for early adopters

### Founding Team

- $39/month for first 6 months
- includes onboarding call
- limited to first 10 teams

### Setup package

- $149–$499 fixed price
- integrate TekMemo into one app
- includes 1–2 calls
- best early revenue path

### Architecture review

- $49–$99
- 60–90 minutes
- memory architecture audit

---

## 10. Commercial positioning

Do not position pricing as “cheap storage.”

Position pricing around:

- hosted memory infrastructure
- API keys
- sync
- recall
- restore/history
- usage controls
- teams
- inspection
- operational trust

---

## 11. Pricing page copy

### Hero headline

**Hosted memory infrastructure for AI apps and agents**

### Subheadline

Start locally for free with TekMemo OSS. Upgrade to TekMemo Cloud when you need hosted APIs, sync, recall infrastructure, restore history, teams, and usage controls.

### Primary CTA

**Start free**

### Secondary CTA

**Use OSS locally**

---

## 12. OSS vs Cloud section

### Self-host TekMemo

Use the open-source runtime on your own machine or infrastructure. Best for developers who want full control, local testing, and inspectable file memory.

### Use TekMemo Cloud

Use hosted memory infrastructure with API keys, sync, recall, restore history, usage metering, and team/project administration.

---

## 13. Limit behavior

### Developer Cloud

- hard cap
- no grace buffer
- upgrade required
- no add-ons

### Paid plans

- hard caps for projects/users/API keys/webhooks
- soft caps for indexing/recall/storage
- 5% grace buffer
- add-on or upgrade required after grace

---

## 14. Billing implementation priority

### Launch acceptable

- pricing page
- current plan card
- upgrade/contact CTA
- manual payment/invoice flow

### Post-launch

- self-serve checkout
- invoices
- add-ons
- usage warnings
- downgrade scheduling
- cancellation/export flow

---

## 15. Strategic conclusion

Do not lower the prices.

Instead:

- keep prices low and clean
- increase free/local usefulness
- improve paid quotas
- add BYO-provider mode
- use founder discounts tactically
- monetize services while SaaS grows

This gives TekMemo a better chance to beat competitors without creating a loss-making cloud product.



---

<!-- Source: docs/architecture/05-memory-architecture.md -->

# TekMemo Memory Architecture

_Last updated: 2026-05-03_

## 1. Architecture thesis

TekMemo memory should be:

- file-first
- layered
- event-sourced where useful
- inspectable
- syncable
- conflict-aware
- retrieval-ready
- graph-ready
- policy-aware

The core architectural idea:

> Memory should not be a hidden blob in a vector database. Memory should be a structured runtime state that humans and agents can inspect, update, diff, restore, and reason over.

---

## 2. Memory lifecycle

```txt
capture
  -> normalize
  -> classify
  -> write to layer
  -> emit event
  -> index
  -> retrieve
  -> compile context
  -> use in model call
  -> observe outcome
  -> update/deprecate/forget
```

---

## 3. Memory layers

| Layer | Scope | Purpose | Build phase |
|---|---|---|---|
| Working memory | session/run | temporary task context | later |
| Core memory | project/user/workspace | compact canonical facts | now |
| Semantic memory | user/project | durable facts/preferences | now/later |
| Episodic memory | conversations/events | what happened over time | now/later |
| Procedural memory | project/agent | how to do tasks | later |
| Archival memory | project/workspace | long notes/summaries | now |
| Policy memory | tenant/project | rules and constraints | later |
| Graph memory | project/workspace/user | entities and relationships | later |

---

## 4. File-first memory standard

Recommended local structure:

```txt
.tekmemo/
├─ manifest.json
├─ config.json
├─ memory/
│  ├─ core.md
│  ├─ notes.md
│  ├─ facts.jsonl
│  ├─ preferences.jsonl
│  ├─ procedures.jsonl
│  └─ policies.jsonl
├─ conversations/
│  └─ conversations.jsonl
├─ events/
│  └─ memory-events.jsonl
├─ indexes/
│  ├─ chunks.jsonl
│  ├─ keyword.json
│  └─ vector-manifest.json
├─ graph/
│  ├─ nodes.jsonl
│  └─ edges.jsonl
├─ snapshots/
│  └─ snapshot-manifest.jsonl
└─ sync/
   ├─ sync-state.json
   └─ pending-operations.jsonl
```

---

## 5. Manifest

`manifest.json` should describe the memory store.

```json
{
  "version": "0.1.0",
  "storeId": "store_01H...",
  "projectId": "proj_local",
  "createdAt": "2026-05-03T00:00:00.000Z",
  "updatedAt": "2026-05-03T00:00:00.000Z",
  "format": "tekmemo-file-store",
  "features": {
    "events": true,
    "snapshots": true,
    "keywordIndex": true,
    "vectorIndex": false,
    "graph": false,
    "sync": false
  }
}
```

---

## 6. Memory record shape

```json
{
  "id": "mem_01H...",
  "scope": "project",
  "type": "semantic",
  "layer": "core",
  "content": "This app uses React Router v7 on Cloudflare Workers.",
  "tags": ["architecture", "stack"],
  "source": {
    "kind": "manual",
    "id": "src_01H..."
  },
  "confidence": 0.95,
  "importance": "high",
  "status": "active",
  "createdAt": "2026-05-03T00:00:00.000Z",
  "updatedAt": "2026-05-03T00:00:00.000Z",
  "lastUsedAt": null,
  "expiresAt": null
}
```

---

## 7. Memory event log

Every meaningful memory mutation should emit an event.

Event types:

```txt
memory.created
memory.updated
memory.merged
memory.deprecated
memory.forgotten
memory.restored
memory.conflict_detected
memory.indexed
memory.recalled
snapshot.created
sync.pushed
sync.pulled
```

Example:

```json
{
  "id": "evt_01H...",
  "type": "memory.created",
  "memoryId": "mem_01H...",
  "actor": {
    "kind": "user",
    "id": "user_123"
  },
  "source": {
    "kind": "api",
    "requestId": "req_123"
  },
  "timestamp": "2026-05-03T00:00:00.000Z",
  "data": {
    "scope": "project",
    "layer": "core"
  }
}
```

---

## 8. Conflict detection

TekMemo should detect contradictions instead of silently accumulating bad memory.

Conflict examples:

```txt
Old: Project uses Express.
New: Project now uses Hono.
```

```txt
Old: User prefers Python examples.
New: User prefers TypeScript examples.
```

Conflict actions:

- mark old memory deprecated
- ask user to choose
- merge memories
- keep both with temporal validity
- escalate to conflict center in UI

V1 can use deterministic rules:

- same subject + different value
- same key + newer timestamp
- manually defined conflict groups
- source priority rules

Later versions can use LLM-assisted conflict detection.

---

## 9. Memory decay and forgetting

Not all memory deserves to live forever.

Fields:

- importance
- confidence
- last used
- created at
- expires at
- pinned
- status

Recommended retention behavior:

| Importance | Default behavior |
|---|---|
| pinned | never decay automatically |
| high | keep unless contradicted |
| medium | decay after inactivity window |
| low | summarize or remove quickly |
| temporary | expire automatically |

Forgetting must be auditable:

- soft forget: mark as forgotten
- hard delete: remove content after retention/export policy

---

## 10. Hybrid retrieval

TekMemo should not depend on vector search alone.

Retrieval stack:

1. scope filter
2. keyword search
3. vector search
4. graph traversal
5. temporal filtering
6. reranking
7. policy filtering
8. context compilation

V1 can start with:

- keyword search locally
- vector search with Upstash in cloud
- metadata filters

Later:

- graph retrieval
- temporal validity
- reranker support
- multi-source context assembly

---

## 11. Chunk registry

Each indexed chunk should map back to a real source.

```json
{
  "id": "chunk_01H...",
  "sourceType": "memory_document",
  "sourceId": "memdoc_123",
  "projectId": "proj_123",
  "tenantId": "ten_123",
  "contentHash": "sha256:...",
  "indexStatus": "active",
  "vectorProvider": "upstash",
  "embedder": "openai:text-embedding-3-small",
  "createdAt": "2026-05-03T00:00:00.000Z",
  "updatedAt": "2026-05-03T00:00:00.000Z"
}
```

---

## 12. Memory compiler

The memory compiler turns raw memories into model-ready context.

```txt
retrieved memories
  -> filter by scope
  -> remove stale/deprecated items
  -> resolve conflicts
  -> dedupe
  -> rank
  -> compress
  -> include provenance
  -> produce final context pack
```

Example output:

```txt
Relevant memory:
1. User is building TekMemo with React Router v7 and Cloudflare Workers.
2. User prefers TypeScript-first implementation plans.
3. Current launch target is OSS public + Cloud beta within 4 weeks.
4. Cost sensitivity is high; prefer free/local-first workflows.
```

---

## 13. Graph memory

Graph memory should become one of TekMemo’s serious differentiators after the first launch.

Graph node examples:

```txt
User
Project
Package
Decision
File
Feature
Bug
Provider
Plan
```

Graph edge examples:

```txt
User -> builds -> TekMemo
TekMemo -> uses -> Cloudflare Workers
Project -> depends_on -> Turso
Decision -> supersedes -> Old Decision
Memory -> sourced_from -> Conversation
```

Graph memory should support:

- entity extraction
- relationship extraction
- temporal validity
- source provenance
- graph traversal
- graph view in UI

---

## 14. Repo-aware memory

For developer tools, repo-aware memory can be a killer feature.

TekMemo should index:

- package manager
- framework
- route map
- API structure
- database schema
- coding conventions
- architecture docs
- TODOs
- changelog
- test setup
- previous bugs

Output:

```txt
Project architecture memory
Code convention memory
Dependency memory
API memory
Database memory
Deployment memory
```

---

## 15. Sync architecture

Local/cloud sync should use operation logs, not blind overwrite.

Operations:

```txt
memory.create
memory.update
memory.delete
note.append
snapshot.create
index.enqueue
```

Sync rules:

- every operation has ID
- operations are idempotent
- cloud assigns server sequence
- local records last synced sequence
- conflicts produce conflict records
- user can resolve conflicts in Cloud UI

---

## 16. Build order

### Build now

- `.tekmemo/` file store
- core memory
- notes
- conversations
- events
- keyword search
- local examples
- cloud project memory
- cloud basic recall

### Build next

- memory inspector
- cloud sync
- snapshots
- conflict center
- advanced usage

### Build later

- graph memory
- temporal validity
- memory compiler
- MCP server
- connectors
- benchmarks
- governance

---

## 17. Strategic architecture rule

Every advanced feature should preserve the core promise:

> Developers own and understand their memory.

If a feature makes memory more opaque, do not build it that way.



---

<!-- Source: docs/architecture/06-api-contract.md -->

# TekMemo Cloud API Contract

_Last updated: 2026-05-03_

## 1. API principle

TekMemo Cloud API should be:

- tenant-aware
- project-aware
- plan-aware
- quota-aware
- versionable
- predictable
- easy to document
- easy to test with cURL

All public API routes should live under:

```txt
/api/v1/*
```

---

## 2. Authentication

Use bearer API keys at launch.

```http
Authorization: Bearer tm_...
```

Supported key types:

- user key
- project key
- service account key later

---

## 3. API authorization flow

Every request should flow like this:

```txt
parse bearer token
  -> resolve API key prefix
  -> verify hash
  -> check revocation
  -> resolve tenant
  -> resolve optional project binding
  -> check scopes
  -> check plan
  -> check quota
  -> execute operation
  -> record usage
  -> return response with request ID
```

---

## 4. Scopes

Recommended scopes:

```txt
project:read
project:write
memory:read
memory:write
memory:index
memory:recall
usage:read
apikey:manage
webhook:manage
billing:read
```

Developer Cloud should receive minimal scopes.

---

## 5. Response envelopes

### Success

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

### List

```json
{
  "data": [],
  "meta": {
    "requestId": "req_123",
    "pagination": {
      "nextCursor": null
    }
  }
}
```

### Error

```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Your plan has reached its monthly recall query limit.",
    "details": {}
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## 6. Status codes

| Code | Meaning |
|---:|---|
| 200 | OK |
| 201 | Created |
| 202 | Accepted |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Validation error |
| 429 | Rate limited or quota exceeded |
| 500 | Internal error |

---

## 7. Endpoint groups

First release:

```txt
Health
Me / Context
Projects
Memory
Notes
Recall
Usage
API Keys
Billing basics
```

Post-launch:

```txt
Webhooks
Snapshots
Restore
Sync
Graph
Connectors
Audit Logs
```

---

## 8. Health

### `GET /api/v1/health`

No auth required.

```json
{
  "data": {
    "status": "ok",
    "service": "tekmemo-cloud",
    "version": "v1"
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## 9. Context

### `GET /api/v1/me`

Returns tenant, project binding, API key type, and scopes.

Required: any valid key.

---

## 10. Projects

### `GET /api/v1/projects`

List projects visible to the key.

Scope: `project:read`

### `POST /api/v1/projects`

Create project.

Scope: `project:write`

Request:

```json
{
  "name": "Main App",
  "slug": "main-app",
  "environment": "prod",
  "description": "Primary product memory"
}
```

### `GET /api/v1/projects/:projectId`

Read project.

### `PATCH /api/v1/projects/:projectId`

Update project metadata.

### `DELETE /api/v1/projects/:projectId`

Soft-delete project.

---

## 11. Memory

### `GET /api/v1/projects/:projectId/memory/core`

Read core memory.

Scope: `memory:read`

### `PUT /api/v1/projects/:projectId/memory/core`

Replace/update core memory.

Scope: `memory:write`

Request:

```json
{
  "content": "# Core Memory\n\n- This app uses React Router v7.",
  "source": {
    "kind": "api"
  }
}
```

### `GET /api/v1/projects/:projectId/memory`

List memory records by filters.

Filters:

- type
- layer
- status
- tag
- cursor

### `POST /api/v1/projects/:projectId/memory`

Create structured memory record.

### `PATCH /api/v1/projects/:projectId/memory/:memoryId`

Update memory record.

### `DELETE /api/v1/projects/:projectId/memory/:memoryId`

Forget memory.

---

## 12. Notes

### `GET /api/v1/projects/:projectId/notes`

List notes.

### `POST /api/v1/projects/:projectId/notes`

Append note.

Request:

```json
{
  "title": "Architecture decision",
  "content": "Use Turso for relational data and Upstash Vector for recall.",
  "kind": "architecture",
  "tags": ["decision", "infra"]
}
```

---

## 13. Recall

### `POST /api/v1/projects/:projectId/recall/index`

Trigger indexing.

Scope: `memory:index`

Response: `202 Accepted`

### `GET /api/v1/projects/:projectId/recall/jobs`

List indexing jobs.

### `POST /api/v1/projects/:projectId/recall/query`

Run recall.

Scope: `memory:recall`

Request:

```json
{
  "query": "What database does this project use?",
  "topK": 8,
  "layers": ["core", "notes"],
  "includeSources": true
}
```

Response:

```json
{
  "data": {
    "query": "What database does this project use?",
    "results": [
      {
        "id": "chunk_123",
        "score": 0.91,
        "content": "Use Turso for relational data.",
        "source": {
          "type": "memory_note",
          "id": "note_123"
        }
      }
    ]
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## 14. API keys

### `GET /api/v1/api-keys`

List keys.

### `POST /api/v1/api-keys`

Create key.

Request:

```json
{
  "name": "Production backend",
  "type": "project",
  "projectId": "proj_123",
  "scopes": ["memory:read", "memory:write", "memory:recall"]
}
```

### `POST /api/v1/api-keys/:apiKeyId/revoke`

Revoke key.

---

## 15. Usage

### `GET /api/v1/usage/current`

Return current usage for tenant.

### `GET /api/v1/projects/:projectId/usage/current`

Return project-level usage.

---

## 16. Billing

First release can expose read-only plan context:

### `GET /api/v1/billing/current-plan`

Returns plan, limits, usage, and upgrade path.

Post-launch:

- checkout session
- portal session
- add-on purchase
- downgrade schedule
- invoice list

---

## 17. Webhooks later

Events:

```txt
memory.updated
indexing.completed
indexing.failed
recall.ready
usage.warning
quota.exceeded
restorepoint.created
conflict.detected
```

Security:

- signing secret
- replay protection
- retry policy
- delivery logs

---

## 18. API design rules

1. Every response includes `requestId`.
2. Every quota-sensitive operation records usage.
3. Every project-scoped endpoint includes `projectId` in path.
4. Errors use stable codes.
5. API keys are never returned after creation.
6. Project keys cannot access other projects.
7. Free-tier hard caps must be enforced server-side.
8. API docs must include cURL examples.



---

<!-- Source: docs/architecture/07-infrastructure-and-backend.md -->

# TekMemo Cloud Infrastructure and Backend Architecture

_Last updated: 2026-05-03_

## 1. Architecture principle

TekMemo Cloud should use:

> **One Cloudflare app, thin routes, strong service layer, clear repository/adapters boundary.**

Do not create a separate API app at launch. React Router v7 on Cloudflare Workers can serve both UI and `/api/v1/*` routes.

---

## 2. Platform stack

| Component | Use |
|---|---|
| React Router v7 | Cloud UI and route actions/loaders. |
| Cloudflare Workers | Runtime for UI and API. |
| Turso | Durable relational product data. |
| Upstash Vector | Hosted vector recall. |
| OpenAI/Voyage | Embeddings. |
| R2 | Snapshots, exports, restore bundles, larger objects. |
| Queues | Async indexing, webhooks, usage aggregation. |
| Durable Objects | Locks, rate limits, coordination. |
| KV | low-risk cache/config only. |
| Turnstile | bot protection on signup/public forms. |

---

## 3. High-level architecture

```txt
Users / Client Apps
        |
        v
Cloudflare Workers
  React Router UI + /api/v1 routes
        |
        +--> Auth/session/API key validation
        +--> Tenant/project routing
        +--> Plan/quota checks
        +--> Usage recording
        +--> Turso control plane
        +--> Turso tenant-data DBs
        +--> Upstash Vector
        +--> OpenAI/Voyage embeddings
        +--> R2 snapshots/exports
        +--> Queues indexing/webhooks
        +--> Durable Objects locks/rate buckets
```

---

## 4. Database strategy

Use two relational layers:

### Control-plane DB

One shared Turso DB for:

- tenants
- users
- memberships
- subscriptions
- API keys
- project registry
- tenant database routing
- usage counters
- billing linkage

### Tenant-data DBs

One or more Turso DBs for product data:

- projects
- memory documents
- notes
- conversations
- chunks
- recall jobs
- restore points
- project activity
- audit events

### Pooled vs dedicated

Early tiers use pooled tenant-data DBs.

Higher tiers can move to dedicated tenant-data DBs.

Important rule:

> Keep `tenant_id` and `project_id` in tenant-data tables even for dedicated DBs.

This keeps code paths consistent.

---

## 5. Cloudflare responsibility boundaries

### Workers

Use for:

- marketing pages
- dashboard
- API routes
- auth resolution
- API key validation
- quota enforcement
- request context

### Queues

Use for:

- indexing jobs
- re-indexing
- webhook delivery
- usage aggregation
- snapshot generation
- cleanup

### R2

Use for:

- snapshots
- exports
- restore bundles
- large file objects later
- audit exports later

### Durable Objects

Use only for coordination:

- distributed locks
- per-tenant rate buckets
- idempotency keys
- single-writer guards

Do not use Durable Objects as primary product database.

### KV

Use only for:

- feature flags
- cached plan metadata
- public config
- low-risk cache

Do not store primary product data in KV.

---

## 6. Backend folder structure

```txt
apps/tekmemo-cloud/
├─ app/
│  ├─ routes/
│  ├─ entry.server.tsx
│  ├─ root.tsx
│  ├─ styles/
│  └─ env.server.ts
│
├─ src/
│  ├─ core/
│  ├─ http/
│  ├─ auth/
│  ├─ tenants/
│  ├─ projects/
│  ├─ memory/
│  ├─ recall/
│  ├─ billing/
│  ├─ usage/
│  ├─ api-keys/
│  ├─ webhooks/
│  ├─ db/
│  ├─ storage/
│  ├─ queues/
│  ├─ integrations/
│  ├─ policies/
│  ├─ workers/
│  ├─ telemetry/
│  └─ utils/
│
├─ prisma/
│  ├─ control-plane/
│  └─ tenant-data/
│
├─ public/
├─ package.json
├─ tsconfig.json
└─ wrangler.jsonc
```

---

## 7. Dependency direction

```txt
routes
  -> services
    -> repositories
    -> adapters
    -> policies
```

Rules:

- route files should be thin
- repositories own DB access
- services own business logic
- adapters own external provider calls
- policies own authorization/quota decisions
- UI should not call repositories directly

---

## 8. Route structure

```txt
app/routes/
├─ _marketing._index.tsx
├─ _marketing.pricing.tsx
├─ _marketing.docs.tsx
├─ _marketing.changelog.tsx
├─ _marketing.blog.tsx
│
├─ _auth.sign-in.tsx
├─ _auth.sign-up.tsx
├─ _auth.verify.tsx
│
├─ _app.tsx
├─ _app._index.tsx
├─ _app.projects.tsx
├─ _app.projects.$projectId.tsx
├─ _app.memory.tsx
├─ _app.recall.tsx
├─ _app.usage.tsx
├─ _app.billing.tsx
├─ _app.api-keys.tsx
├─ _app.team.tsx
├─ _app.settings.tsx
│
├─ api.v1.health.ts
├─ api.v1.me.ts
├─ api.v1.projects.ts
├─ api.v1.projects.$projectId.ts
├─ api.v1.projects.$projectId.memory.core.ts
├─ api.v1.projects.$projectId.notes.ts
├─ api.v1.projects.$projectId.recall.query.ts
├─ api.v1.projects.$projectId.recall.index.ts
├─ api.v1.usage.current.ts
├─ api.v1.api-keys.ts
└─ internal.queue.indexing.ts
```

---

## 9. Build order

### Phase 1

- `core`
- `http`
- `db`
- `auth`
- `tenants`
- `projects`

### Phase 2

- `memory`
- `usage`
- `api-keys`

### Phase 3

- `recall`
- `queues`
- `storage`

### Phase 4

- `billing`
- `webhooks`
- `team`
- `advanced telemetry`

---

## 10. Cost-control rules

1. Keep one cloud app at launch.
2. Use pooled tenant-data DBs for free/low tiers.
3. Use one embedder provider in Cloud beta.
4. Keep BYO-provider option for power users.
5. Put indexing in queues.
6. Hard-cap free cloud usage.
7. Use R2 for large snapshots, not Turso.
8. Avoid enterprise-only infrastructure before revenue.

---

## 11. Operational rules

- Every request gets a request ID.
- Every API key request resolves tenant context.
- Every billable action records usage.
- Every indexing job is idempotent.
- Every external provider call maps errors cleanly.
- Every tenant-data query includes tenant/project filter.
- Every queue job can be retried safely.

---

## 12. Strategic recommendation

Cloudflare + Turso + Upstash is the correct early stack because it keeps cost low and lets you ship fast.

The risk is not the stack.

The risk is building too many advanced features before the core loop works.



---

<!-- Source: docs/architecture/08-database-schema-prisma.md -->

# TekMemo Cloud Database Schema Strategy — Prisma

_Last updated: 2026-05-03_

## 1. Database principle

TekMemo Cloud should use two Prisma schemas:

```txt
prisma/
├─ control-plane/
│  └─ schema.prisma
└─ tenant-data/
   └─ schema.prisma
```

This mirrors the architecture:

- control-plane database for SaaS/account/billing/routing data
- tenant-data database for actual memory/product data

---

## 2. Control-plane DB owns

- tenants
- users
- tenant memberships
- project registry
- project memberships
- subscriptions
- subscription add-ons
- API keys
- webhooks
- webhook delivery logs
- tenant database registry
- usage events/counters if globally aggregated

---

## 3. Tenant-data DB owns

- projects
- memory documents
- memory records
- notes
- conversations
- memory events
- chunk registry
- recall jobs
- restore points
- project activity
- graph nodes later
- graph edges later
- conflict records later
- sync operations later

---

## 4. Control-plane schema outline

```prisma
model Tenant {
  id                      String @id
  slug                    String @unique
  name                    String
  status                  String
  plan                    String
  billing_customer_id     String?
  billing_subscription_id String?
  created_at              String
  updated_at              String

  tenant_memberships      TenantMembership[]
  projects_registry       ProjectRegistry[]
  subscriptions           Subscription[]
  subscription_addons     SubscriptionAddon[]
  api_keys                ApiKey[]
  webhooks                Webhook[]
  tenant_database_routes  TenantDatabaseRegistry[]

  @@map("tenants")
  @@index([plan])
  @@index([status])
}

model User {
  id                    String @id
  email                 String @unique
  name                  String?
  avatar_url            String?
  auth_provider         String
  auth_provider_user_id String?
  last_login_at         String?
  created_at            String
  updated_at            String

  tenant_memberships    TenantMembership[]
  project_memberships   ProjectMembership[]
  api_keys              ApiKey[]

  @@map("users")
  @@index([auth_provider, auth_provider_user_id])
}

model TenantMembership {
  id         String @id
  tenant_id  String
  user_id    String
  role       String
  status     String
  created_at String
  updated_at String

  tenant     Tenant @relation(fields: [tenant_id], references: [id])
  user       User   @relation(fields: [user_id], references: [id])

  @@map("tenant_memberships")
  @@unique([tenant_id, user_id])
  @@index([tenant_id])
  @@index([user_id])
}

model ProjectRegistry {
  id                 String @id
  tenant_id          String
  name               String
  slug               String
  environment        String?
  status             String
  data_db_id         String
  created_by_user_id String?
  created_at         String
  updated_at         String

  tenant             Tenant @relation(fields: [tenant_id], references: [id])

  @@map("projects_registry")
  @@unique([tenant_id, slug])
  @@index([tenant_id])
  @@index([data_db_id])
}

model ApiKey {
  id                  String @id
  tenant_id           String
  user_id             String?
  project_id          String?
  name                String
  type                String
  prefix              String @unique
  hash                String
  scopes_json         String
  status              String
  last_used_at        String?
  created_at          String
  revoked_at          String?

  tenant              Tenant @relation(fields: [tenant_id], references: [id])

  @@map("api_keys")
  @@index([tenant_id])
  @@index([project_id])
  @@index([status])
}
```

---

## 5. Tenant-data schema outline

```prisma
model Project {
  id          String @id
  tenant_id   String
  name        String
  slug        String
  environment String?
  status      String
  created_at  String
  updated_at  String

  memory_documents MemoryDocument[]
  memory_records   MemoryRecord[]
  memory_notes     MemoryNote[]
  conversations    MemoryConversation[]
  memory_events    MemoryEvent[]
  chunks           ChunkRegistry[]
  recall_jobs      RecallJob[]
  restore_points   RestorePoint[]

  @@map("projects")
  @@unique([tenant_id, slug])
  @@index([tenant_id])
}

model MemoryDocument {
  id          String @id
  tenant_id   String
  project_id  String
  kind        String
  path        String?
  title       String?
  content     String
  content_hash String?
  status      String
  created_at  String
  updated_at  String

  project     Project @relation(fields: [project_id], references: [id])

  @@map("memory_documents")
  @@index([tenant_id, project_id])
  @@index([kind])
  @@index([status])
}

model MemoryRecord {
  id            String @id
  tenant_id     String
  project_id    String
  scope         String
  layer         String
  type          String
  content       String
  tags_json     String?
  source_json   String?
  confidence    Float?
  importance    String?
  status        String
  created_at    String
  updated_at    String
  last_used_at  String?
  expires_at    String?

  project       Project @relation(fields: [project_id], references: [id])

  @@map("memory_records")
  @@index([tenant_id, project_id])
  @@index([scope, layer, type])
  @@index([status])
}

model MemoryNote {
  id          String @id
  tenant_id   String
  project_id  String
  title       String?
  content     String
  kind        String?
  tags_json   String?
  source_json String?
  status      String
  created_at  String
  updated_at  String

  project     Project @relation(fields: [project_id], references: [id])

  @@map("memory_notes")
  @@index([tenant_id, project_id])
  @@index([kind])
  @@index([status])
}

model MemoryEvent {
  id          String @id
  tenant_id   String
  project_id  String
  memory_id   String?
  type        String
  actor_json  String?
  source_json String?
  data_json   String?
  created_at  String

  project     Project @relation(fields: [project_id], references: [id])

  @@map("memory_events")
  @@index([tenant_id, project_id])
  @@index([type])
  @@index([created_at])
}
```

---

## 6. Recall schema

```prisma
model ChunkRegistry {
  id              String @id
  tenant_id       String
  project_id      String
  source_type     String
  source_id       String
  content         String
  content_hash    String
  index_status    String
  vector_id       String?
  vector_provider String?
  embedder        String?
  metadata_json   String?
  created_at      String
  updated_at      String
  stale_at        String?

  project         Project @relation(fields: [project_id], references: [id])

  @@map("chunk_registry")
  @@index([tenant_id, project_id])
  @@index([source_type, source_id])
  @@index([index_status])
}

model RecallJob {
  id          String @id
  tenant_id   String
  project_id  String
  type        String
  status      String
  error_json  String?
  stats_json  String?
  created_at  String
  updated_at  String
  started_at  String?
  finished_at String?

  project     Project @relation(fields: [project_id], references: [id])

  @@map("recall_jobs")
  @@index([tenant_id, project_id])
  @@index([status])
}
```

---

## 7. Future schema extensions

### Conflict detection

```prisma
model MemoryConflict {
  id             String @id
  tenant_id      String
  project_id     String
  left_memory_id String
  right_memory_id String
  status         String
  reason         String?
  resolution     String?
  created_at     String
  resolved_at    String?

  @@map("memory_conflicts")
  @@index([tenant_id, project_id])
  @@index([status])
}
```

### Graph memory

```prisma
model GraphNode {
  id          String @id
  tenant_id   String
  project_id  String
  type        String
  label       String
  properties_json String?
  source_json String?
  created_at  String
  updated_at  String

  @@map("graph_nodes")
  @@index([tenant_id, project_id])
  @@index([type])
}

model GraphEdge {
  id          String @id
  tenant_id   String
  project_id  String
  from_node_id String
  to_node_id   String
  type        String
  properties_json String?
  valid_at    String?
  invalid_at  String?
  source_json String?
  created_at  String
  updated_at  String

  @@map("graph_edges")
  @@index([tenant_id, project_id])
  @@index([from_node_id])
  @@index([to_node_id])
  @@index([type])
}
```

### Sync operations

```prisma
model SyncOperation {
  id          String @id
  tenant_id   String
  project_id  String
  operation_type String
  operation_key  String
  status      String
  payload_json String
  created_at  String
  applied_at  String?

  @@map("sync_operations")
  @@unique([tenant_id, project_id, operation_key])
  @@index([tenant_id, project_id])
  @@index([status])
}
```

---

## 8. Data rules

1. Store JSON as `String` initially if SQLite/Turso limitations make this simpler.
2. Use explicit indexes for tenant/project filters.
3. Never query tenant-data tables without tenant/project constraints.
4. Keep same tenant-data schema for pooled and dedicated DBs.
5. Use IDs generated in app code.
6. Store API key hashes, never raw keys.
7. Use event rows for auditability.
8. Use R2 for large snapshots and exports.

---

## 9. Build order

### Week 1 minimum

- Tenant
- User
- TenantMembership
- ProjectRegistry
- TenantDatabaseRegistry
- Project
- MemoryDocument
- MemoryNote
- MemoryConversation

### Week 2 minimum

- ApiKey
- UsageEvent
- UsageCounterPeriodic
- ChunkRegistry
- RecallJob

### After beta

- RestorePoint
- MemoryEvent depth
- Webhook
- WebhookDeliveryLog
- MemoryConflict
- GraphNode
- GraphEdge
- SyncOperation

---

## 10. Strategic warning

Do not over-model every future feature before launch.

Prisma schema should support the core launch loop first:

```txt
tenant -> project -> memory -> notes -> api key -> index -> recall -> usage
```

Then extend.



---

<!-- Source: docs/roadmap/09-execution-roadmap.md -->

# TekMemo Execution Roadmap

_Last updated: 2026-05-03_

## 1. Purpose

This combines the previous 4-week survival plan, weekly checklists, canonical roadmap, and 90-day plan into one execution structure.

The plan is split into:

1. **4-week survival launch** — ship OSS, Cloud beta, and revenue path.
2. **90-day credibility roadmap** — improve product, docs, adoption, and revenue.
3. **Strategic moat roadmap** — add the features needed to beat competitors long-term.

---

## 2. Build order principle

Build in this order:

1. core runtime
2. local file adapter
3. cloud app shell
4. tenant/project model
5. core memory loop
6. notes
7. API keys
8. basic recall
9. usage visibility
10. pricing/revenue path
11. docs and launch
12. advanced memory features

Do not build enterprise before the core loop works.

---

# Part A — 4-week survival launch

## 3. Week 1 — Foundation and first memory loop

### Goal

By the end of Week 1, TekMemo should run locally and the cloud app should support the first project/core memory loop.

### Non-negotiable outcome

- monorepo boots
- docs app boots
- cloud app boots
- `@tekbreed/tekmemo` package works
- `@tekbreed/tekmemo/fs` works
- create tenant works
- create project works
- read/update core memory works
- one staging deploy exists

### Day split

| Day | Focus |
|---:|---|
| 1 | Scaffold monorepo, cloud app, docs app, packages. |
| 2 | Implement `@tekbreed/tekmemo` core and `@tekbreed/tekmemo/fs`. |
| 3 | Scaffold cloud backend folders and DB clients. |
| 4 | Implement minimal control-plane and tenant/project repositories. |
| 5 | Implement core memory read/update in cloud. |
| 6 | Add request context, errors, basic auth/session. |
| 7 | Stabilize, no new features, document blockers. |

---

## 4. Week 2 — Developer-facing beta core

### Goal

By the end of Week 2, TekMemo should be demoable to developers.

### Non-negotiable outcome

- API keys work
- notes work
- basic recall works
- minimal usage tracking works
- docs app usable
- OSS repo ready for public release

### Day split

| Day | Focus |
|---:|---|
| 8 | API key schema, services, bearer auth. |
| 9 | Notes CRUD and notes page. |
| 10 | Upstash adapter and one embedder provider. |
| 11 | Recall endpoint, tester UI, explicit index trigger. |
| 12 | Usage counters and overview cards. |
| 13 | OSS README, docs, examples. |
| 14 | Stabilize, screenshots, public launch prep. |

---

## 5. Week 3 — Public launch and commercial clarity

### Goal

Make TekMemo public and commercially understandable.

### Non-negotiable outcome

- OSS repo public
- docs public
- pricing page live
- cloud beta path live
- API docs minimum live
- revenue path live

### Day split

| Day | Focus |
|---:|---|
| 15 | Public OSS repo finalization. |
| 16 | Pricing page and OSS vs Cloud page. |
| 17 | Cloud onboarding polish. |
| 18 | Billing page v1 and service offer. |
| 19 | API docs and quickstart. |
| 20 | Screenshots, demo script, outreach list. |
| 21 | Public OSS launch and Cloud beta opening. |

---

## 6. Week 4 — Onboarding, reliability, revenue

### Goal

Make beta usable enough for real onboarding and actively push for income.

### Non-negotiable outcome

- onboarding works
- API keys and recall are reliable enough
- pricing is understandable
- users can contact or pay you
- founder outreach is active

### Day split

| Day | Focus |
|---:|---|
| 22 | Fix auth/API key/project onboarding blockers. |
| 23 | Fix recall and indexing reliability. |
| 24 | Improve usage/quota clarity. |
| 25 | Improve docs and onboarding guide. |
| 26 | Founder outreach and beta onboarding. |
| 27 | Revenue follow-up and service offers. |
| 28 | Stabilize, retrospective, next roadmap. |

---

# Part B — 90-day credibility roadmap

## 7. Days 1–30 — Launch foundation

Outcomes:

- public OSS repo
- local-first examples
- cloud beta
- pricing page
- API keys
- project memory
- notes
- basic recall
- usage page
- launch announcement
- first beta users
- first revenue path

---

## 8. Days 31–60 — Product trust and memory depth

Build:

- memory event log UI
- better memory inspector
- restore points v1
- improved recall quality
- source/provenance display
- conflict detection v1
- local/cloud sync v1
- better docs and examples
- onboarding templates
- first case study or demo

Commercial:

- convert beta users to Pro/Team
- push setup package
- publish comparison pages
- collect testimonials

---

## 9. Days 61–90 — Differentiation and growth

Build:

- MCP server v1
- repo-aware memory v1
- benchmark suite v1
- graph memory prototype
- connector framework prototype
- webhook delivery
- audit/activity improvements
- better billing and add-ons

Commercial:

- launch public benchmark page
- publish “TekMemo vs Mem0/Zep/Supermemory/Cognee” pages
- onboard 2–3 serious design partners
- close at least one paid integration project

---

# Part C — Strategic moat roadmap

## 10. Phase 1 — Core product moat

Features:

- file-first memory standard
- local-first developer workflow
- memory event log
- memory inspector
- source/provenance
- snapshots
- import/export
- BYO-provider mode

Goal:

> Make TekMemo the easiest memory system to trust and debug.

---

## 11. Phase 2 — Retrieval moat

Features:

- hybrid retrieval
- keyword + vector search
- reranking
- temporal filtering
- context compiler
- retrieval evaluation dashboard

Goal:

> Make TekMemo recall more predictable and explainable.

---

## 12. Phase 3 — Graph and temporal memory moat

Features:

- graph nodes/edges
- temporal validity
- relationship-aware recall
- graph view
- conflict resolution
- fact invalidation

Goal:

> Compete directly with graph-memory competitors.

---

## 13. Phase 4 — Developer-agent moat

Features:

- MCP server
- repo-aware memory
- coding-agent memory packs
- CLI sync
- local editor integrations later
- OpenCode/Cursor/Claude Code workflows

Goal:

> Become the memory layer developers use for coding agents.

---

## 14. Phase 5 — Connector and team moat

Features:

- GitHub connector
- Notion connector
- Slack/Discord connector
- Google Drive connector
- Linear/Jira connector
- webhook system
- team roles
- activity feeds

Goal:

> Help teams turn existing work into agent memory.

---

## 15. Phase 6 — Enterprise moat

Features:

- SSO/SAML
- audit exports
- retention policies
- tenant isolation reports
- regional/data residency options
- custom contracts
- private deployment guidance

Goal:

> Serve serious production teams without distracting the launch.

---

## 16. Scope discipline

### Build now

- OSS core
- local file memory
- cloud beta
- API keys
- basic recall
- usage
- pricing
- docs
- onboarding
- service revenue path

### Do not build now

- SSO
- advanced graph memory
- deep connector platform
- enterprise analytics
- complex billing automation
- perfect UI polish
- full self-serve add-ons
- every provider
- every framework integration

---

## 17. Success metrics

### OSS

- GitHub stars
- installs
- docs traffic
- examples cloned
- issues/discussions
- external demos

### Cloud

- beta signups
- activated projects
- API keys created
- recall queries
- active users
- paid conversions

### Revenue

- setup package sales
- architecture reviews
- paid beta users
- Pro/Team upgrades
- design partner contracts

---

## 18. Final execution rule

Every week must push one of these forward:

- ship OSS
- ship Cloud beta
- improve onboarding
- improve trust
- improve recall
- create revenue

Everything else can wait.



---

<!-- Source: docs/operations/10-launch-and-revenue-plan.md -->

# TekMemo Launch and Revenue Plan

_Last updated: 2026-05-03_

## 1. Launch goal

Within the first month, TekMemo should achieve:

1. OSS public
2. docs public
3. Cloud beta live
4. pricing public
5. demo path available
6. first revenue path active

Do not wait for a perfect SaaS product before trying to earn.

---

## 2. Launch positioning

### Short pitch

TekMemo is the file-first memory runtime for AI apps and agents.

### Medium pitch

TekMemo lets developers start locally with inspectable `.tekmemo/` memory files, then sync to TekMemo Cloud when they need hosted APIs, recall, restore history, teams, usage controls, and production memory infrastructure.

### Long pitch

Most AI memory tools hide memory behind an API. TekMemo makes memory visible, portable, versionable, and inspectable. You can test locally for free, use your own providers when needed, and upgrade to Cloud only when your app needs hosted sync, API keys, recall infrastructure, restore history, and team controls.

---

## 3. Launch assets

Required:

- home page
- pricing page
- OSS README
- docs quickstart
- local file memory example
- AI SDK example
- Cloud beta signup/onboarding page
- screenshots
- short demo script
- founder outreach messages
- service/integration offer page

---

## 4. Demo script

The public demo should show:

1. install TekMemo OSS
2. initialize `.tekmemo/`
3. write memory locally
4. inspect local memory files
5. connect an AI SDK agent
6. create a Cloud project
7. create API key
8. update cloud memory
9. run recall query
10. view usage

---

## 5. Revenue tracks

Use multiple revenue paths early.

### Track A — SaaS subscriptions

Plans:

- Pro
- Team
- Business

Best for self-serve users, but may take time.

### Track B — Setup package

Offer:

> We help wire TekMemo into your app.

Suggested price:

- $149 starter
- $299 standard
- $499 advanced

Deliverables:

- 1 app integration
- API key setup
- memory schema setup
- recall query setup
- basic docs
- handoff call

### Track C — Architecture review

Offer:

> Get a memory architecture review for your AI app.

Suggested price:

- $49 early
- $99 standard

Deliverables:

- 60–90 minute call
- architecture notes
- recommended memory layers
- integration plan

### Track D — Founding beta

Offer:

- discounted early Cloud access
- direct founder support
- priority feature input

Price:

- Founding Pro: $9/month for 6 months
- Founding Team: $39/month for 6 months

---

## 6. Outreach targets

Start with people most likely to care:

- AI app builders
- indie hackers
- coding-agent builders
- founders building AI tools
- devtool communities
- TypeScript communities
- AI SDK users
- open-source maintainers building agents
- consultants building AI automations

---

## 7. Launch post structure

Title options:

- “I built a file-first memory runtime for AI apps and agents”
- “TekMemo: local-first memory for AI apps, with cloud sync when you need it”
- “Your agent memory should not be trapped in a black-box API”

Post outline:

1. Problem: AI apps forget or hide memory in opaque systems.
2. Solution: file-first memory runtime.
3. Demo: local `.tekmemo/` memory.
4. Cloud: hosted sync/API/recall when needed.
5. Free: local testing and Developer Cloud.
6. Ask: try it, break it, give feedback, join beta.

---

## 8. Service offer page copy

### Headline

**Add durable memory to your AI app without rebuilding your backend**

### Copy

We help you integrate TekMemo into your AI app, agent, or developer tool. Start with local memory, add recall, then move to hosted TekMemo Cloud when you need API keys, sync, and production controls.

### Packages

| Package | Price | Includes |
|---|---:|---|
| Starter | $149 | 1 call, memory plan, local setup. |
| Integration | $299 | Local + Cloud integration support. |
| Advanced | $499 | Architecture review, integration, recall, handoff. |

---

## 9. Conversion path

Recommended flow:

```txt
Landing page
  -> OSS quickstart
  -> Cloud free signup
  -> create project
  -> create API key
  -> recall query
  -> usage/pricing visible
  -> upgrade or book integration help
```

---

## 10. What not to do before launch

Do not delay launch for:

- perfect UI
- full billing automation
- all connectors
- enterprise roles
- SSO
- every provider
- advanced graph memory
- perfect docs
- blog perfection

Launch when the product is honest, usable, and valuable.

---

## 11. Weekly revenue actions

### Week 1

- create a list of 50 prospects
- draft outreach messages
- define service offer

### Week 2

- message 10–20 prospects privately
- show local demo
- ask for design partner calls

### Week 3

- public launch
- offer setup package
- ask for beta users
- publish pricing

### Week 4

- onboard users manually
- close setup packages
- follow up hard
- collect feedback/testimonials

---

## 12. First income target

The fastest realistic first income is not SaaS MRR.

It is:

- setup/integration package
- architecture review
- paid beta onboarding

SaaS revenue can follow once the product is stable.

---

## 13. Final revenue rule

Do not hide behind building.

Every week must include outreach and monetization attempts, even if the product is still in beta.



---

<!-- Source: docs/operations/11-oss-governance-and-community.md -->

# TekMemo OSS Governance and Community Plan

_Last updated: 2026-05-03_

## 1. OSS strategy

TekMemo OSS should be genuinely useful without TekMemo Cloud.

This builds trust and adoption.

Open-source:

- core runtime
- local filesystem adapter
- AI SDK integration
- examples
- docs
- provider adapters
- CLI basics
- MCP server later if possible

Keep closed/commercial:

- hosted cloud dashboard
- multi-tenant billing system
- hosted sync service
- hosted usage controls
- managed team features
- enterprise controls
- commercial support systems

---

## 2. Recommended license

Use **Apache-2.0** for TekMemo OSS.

Reasons:

- permissive
- business-friendly
- includes patent grant
- common for infrastructure projects
- easier for companies to adopt than copyleft licenses

---

## 3. Public repo essentials

Required files:

```txt
README.md
LICENSE
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
CHANGELOG.md
.github/ISSUE_TEMPLATE/bug_report.md
.github/ISSUE_TEMPLATE/feature_request.md
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/ci.yml
```

---

## 4. README structure

```txt
# TekMemo
One-line pitch

## What is TekMemo?
## Why file-first memory?
## Quickstart
## Local file memory example
## AI SDK example
## Package overview
## Cloud vs OSS
## Roadmap
## Contributing
## License
```

---

## 5. Contribution policy

Accept contributions in these areas first:

- docs fixes
- examples
- adapters
- tests
- bug fixes
- issue reproductions

Be cautious with:

- large architecture rewrites
- new public APIs
- storage format changes
- provider-specific abstractions

---

## 6. Issue labels

Recommended labels:

```txt
bug
docs
example
good first issue
help wanted
adapter
memory-core
cloud-not-oss
question
needs-repro
roadmap
security
```

---

## 7. Security policy

Security issues should be reported privately.

Security-sensitive areas:

- API key generation
- API key hashing
- sync operations
- cloud auth examples
- filesystem path traversal
- secret leakage in examples
- unsafe logs

---

## 8. OSS/community rules

1. Do not promise free hosted infrastructure as OSS.
2. Be clear about what is open and what is commercial.
3. Keep the OSS runtime useful alone.
4. Keep examples easy to run.
5. Avoid cloud lock-in in core APIs.
6. Make migration from local to cloud easy.
7. Treat docs as a product.

---

## 9. OSS roadmap visible to public

Public roadmap sections:

### Now

- file memory
- local examples
- AI SDK integration
- provider adapters

### Next

- CLI improvements
- snapshots
- memory event log
- MCP server
- better recall adapters

### Later

- graph memory
- connectors
- repo-aware memory
- local/cloud sync

---

## 10. Community launch channels

Potential channels:

- GitHub
- X/Twitter
- LinkedIn
- Hacker News later
- Reddit AI/dev communities carefully
- dev.to
- Product Hunt later
- AI SDK communities
- TypeScript communities
- Discord/Slack groups where allowed

---

## 11. OSS success metrics

Track:

- stars
- forks
- issues
- PRs
- docs visits
- npm installs
- example clones
- Discord/community questions
- Cloud beta signups from OSS docs

---

## 12. Maintainer rule

The OSS project should increase trust in TekMemo Cloud, not replace the need for cloud.

Cloud sells convenience, sync, team controls, hosted recall, restore, usage, and support.

OSS sells adoption, trust, and developer love.



---

<!-- Source: docs/reference/12-competitor-and-benchmark-strategy.md -->

# TekMemo Competitor and Benchmark Strategy

_Last updated: 2026-05-03_

## 1. Competitive reality

Several competitors are open source or have major open-source components.

Therefore, TekMemo cannot win by saying only:

> “We are open source.”

TekMemo must win with a sharper wedge:

> **File-first, local-first, TypeScript-first, inspectable, developer-owned memory.**

---

## 2. Competitor categories

| Category | Examples | What they win on |
|---|---|---|
| Memory API | Mem0, Supermemory | easy hosted memory API, personalization. |
| Context graph | Zep/Graphiti | temporal graph, context assembly. |
| Graph/vector OSS | Cognee | graph + vector knowledge engine. |
| Agent runtime | Letta | stateful agent framework. |
| Framework memory | LangMem | LangGraph/LangChain integration. |
| Enterprise infra | Oracle AI Agent Memory | governance, database-backed enterprise memory. |

---

## 3. TekMemo differentiation

TekMemo must be different in these ways:

| TekMemo feature | Why it matters |
|---|---|
| `.tekmemo/` filesystem | Memory is visible and portable. |
| Local file memory | Developers can test at zero cost. |
| TypeScript-first SDK | Better fit for JS/TS AI app builders. |
| Memory-as-code | Teams can diff, version, export, restore. |
| Memory event log | Trust and debugging. |
| Memory inspector UI | Cloud becomes operationally useful. |
| BYO-provider mode | Deep testing without TekMemo cost. |
| Cloud sync | Upgrade path from local to hosted. |
| Repo-aware memory | Strong developer-agent use case. |
| MCP server | Works with coding agents and AI tools. |

---

## 4. Pricing comparison strategy

Do not claim “cheapest always” without benchmarks and exact workload comparisons.

Instead claim:

> **TekMemo gives developers the lowest-risk start: free local memory, free hosted sandbox, and paid cloud plans that are dramatically below enterprise memory platforms.**

---

## 5. Public comparison pages

Create pages:

```txt
TekMemo vs Mem0
TekMemo vs Zep
TekMemo vs Supermemory
TekMemo vs Cognee
TekMemo vs Letta
TekMemo vs LangMem
```

Each page should compare:

- OSS/self-host path
- local-first support
- file ownership
- TypeScript DX
- cloud pricing
- graph memory
- connectors
- MCP support
- inspection/debugging
- enterprise readiness

---

## 6. Benchmark strategy

TekMemo needs public benchmarks before making performance claims.

Benchmark dimensions:

- recall accuracy
- temporal reasoning
- conflict handling
- source attribution
- write latency
- recall latency
- indexing latency
- storage size
- token cost
- local startup time
- integration time

---

## 7. TekMemo Memory Benchmark Suite

Create `tekmemo-bench` later.

Test categories:

### 7.1 Preference recall

Can the system recall user preferences accurately?

### 7.2 Project decision recall

Can it recall technical decisions across time?

### 7.3 Conflict resolution

Can it detect old facts being replaced?

### 7.4 Temporal recall

Can it answer what was true at a previous date?

### 7.5 Source citation

Can it point to the source of a memory?

### 7.6 Multi-layer context

Can it combine user, project, and workspace memory correctly?

### 7.7 Developer-agent recall

Can it remember repo conventions, architecture, and previous bugs?

---

## 8. Benchmark outputs

Publish:

- dataset
- test runner
- methodology
- raw results
- cost estimates
- latency summaries
- reproducible scripts

Do not manipulate benchmarks to look good. Credibility matters more.

---

## 9. Competitive feature roadmap

| Feature | Required to compete with |
|---|---|
| Graph memory | Zep, Cognee, Supermemory |
| Hybrid retrieval | Zep, Mem0, Cognee |
| MCP server | Graphiti, Supermemory plugins |
| Connectors | Supermemory, Cognee |
| Benchmarks | Mem0, Zep |
| Enterprise governance | Oracle, Zep Enterprise |
| Memory inspector | operational dashboards |
| Local-first files | TekMemo-specific wedge |

---

## 10. Honest public language

Avoid:

```txt
Best memory system
Fastest memory
Most accurate memory
Better than all competitors
```

Use:

```txt
File-first memory runtime
Local-first by default
Inspectable memory files
Cloud sync when needed
Designed for developer-owned agent memory
```

---

## 11. Strategic conclusion

TekMemo should not chase every competitor feature first.

It should first dominate:

> **Developer-owned memory for AI apps and coding agents.**

Then add graph, connectors, MCP, and benchmarks to compete more directly with the larger players.



---

<!-- Source: docs/reference/13-implementation-checklists.md -->

# TekMemo Implementation Checklists

_Last updated: 2026-05-03_

## 1. Day 1 bootstrap checklist

### Repo

- [ ] create repo root
- [ ] initialize git
- [ ] add root `package.json`
- [ ] add `pnpm-workspace.yaml`
- [ ] add `turbo.json`
- [ ] add `tsconfig.base.json`
- [ ] add `.gitignore`

### Apps

- [ ] scaffold `apps/tekmemo-cloud`
- [ ] scaffold `apps/docs`
- [ ] confirm cloud app boots
- [ ] confirm docs app boots

### Packages

- [ ] create `packages/tekmemo`
- [ ] create `packages/ai-sdk`
- [ ] create `packages/fs`
- [ ] create `packages/agentfs`
- [ ] create `packages/upstash`
- [ ] create `packages/voyage`
- [ ] create `packages/openai`

---

## 2. Week 1 checklist

### Core OSS

- [ ] `MemoryStore` interface
- [ ] memory document types
- [ ] core memory helper
- [ ] notes helper
- [ ] conversations helper
- [ ] memory events helper
- [ ] local examples

### Cloud foundation

- [ ] route shell
- [ ] request context
- [ ] JSON response helpers
- [ ] error envelope
- [ ] DB clients
- [ ] auth/session stub
- [ ] tenant repository
- [ ] project repository

### First loop

- [ ] create tenant
- [ ] create project
- [ ] read core memory
- [ ] update core memory
- [ ] show project page

---

## 3. Week 2 checklist

### API keys

- [ ] generate key
- [ ] hash key
- [ ] store prefix/hash
- [ ] list keys
- [ ] revoke keys
- [ ] bearer auth middleware
- [ ] `/api/v1/me`

### Notes

- [ ] create note
- [ ] list notes
- [ ] notes UI
- [ ] notes indexing flag

### Recall

- [ ] chunk registry
- [ ] indexing job
- [ ] one embedder
- [ ] Upstash adapter
- [ ] recall endpoint
- [ ] recall tester UI

### Usage

- [ ] record indexing ops
- [ ] record recall queries
- [ ] usage summary cards

### Docs

- [ ] getting started
- [ ] local memory quickstart
- [ ] API key quickstart
- [ ] recall quickstart
- [ ] Cloud beta page

---

## 4. Week 3 checklist

### OSS launch

- [ ] public repo ready
- [ ] README ready
- [ ] LICENSE added
- [ ] examples tested
- [ ] docs links valid
- [ ] no private references

### Pricing

- [ ] pricing page
- [ ] OSS vs Cloud section
- [ ] plan cards
- [ ] comparison table
- [ ] FAQ
- [ ] CTA to start free
- [ ] CTA to self-host

### Cloud beta

- [ ] signup/beta path
- [ ] onboarding route
- [ ] create project flow
- [ ] API key flow
- [ ] memory editor
- [ ] recall tester
- [ ] usage page

### Revenue

- [ ] service offer page
- [ ] contact/booking CTA
- [ ] manual payment path
- [ ] outreach list
- [ ] launch post

---

## 5. Week 4 checklist

### Onboarding fixes

- [ ] identify top 5 blockers
- [ ] fix auth errors
- [ ] fix project creation confusion
- [ ] fix API key copy flow
- [ ] improve empty states
- [ ] improve error messages

### Recall reliability

- [ ] inspect failed indexing jobs
- [ ] fix retry/idempotency
- [ ] fix stale chunks
- [ ] improve recall errors
- [ ] show indexing status

### Revenue

- [ ] message prospects
- [ ] onboard beta users
- [ ] offer setup package
- [ ] follow up
- [ ] collect feedback

---

## 6. Advanced feature checklist

Do not build these before launch unless absolutely necessary.

### Memory inspector

- [ ] memory metadata panel
- [ ] source/provenance
- [ ] status
- [ ] last used
- [ ] confidence
- [ ] event history

### Event log

- [ ] event schema
- [ ] local JSONL event log
- [ ] cloud table
- [ ] UI feed

### Conflict detection

- [ ] deterministic conflict rules
- [ ] conflict table
- [ ] conflict UI
- [ ] resolution actions

### Graph memory

- [ ] node schema
- [ ] edge schema
- [ ] extraction pipeline
- [ ] graph retrieval
- [ ] graph UI

### MCP

- [ ] stdio server
- [ ] tools: remember, recall, inspect, forget
- [ ] local store support
- [ ] cloud key support

### Connectors

- [ ] connector interface
- [ ] GitHub connector
- [ ] Notion connector
- [ ] Slack/Discord connector
- [ ] Google Drive connector

### Benchmarks

- [ ] benchmark dataset
- [ ] benchmark runner
- [ ] local tests
- [ ] cloud tests
- [ ] public results page

---

## 7. Final launch checklist

TekMemo is launch-ready when a stranger can:

- [ ] understand the product on the landing page
- [ ] install OSS locally
- [ ] run an example
- [ ] inspect `.tekmemo/` files
- [ ] create a Cloud project
- [ ] create an API key
- [ ] run recall
- [ ] understand pricing
- [ ] contact or pay you



---

<!-- Source: docs/reference/14-document-merge-map.md -->

# TekMemo Document Merge Map

_Last updated: 2026-05-03_

## 1. Purpose

This file explains how the uploaded documents were reorganized and what changed.

No original context was deleted. The original uploads are preserved in:

```txt
archive/originals/
```

---

## 2. Uploaded source documents

The uploaded documents included:

- `90-day-plan.md`
- `design.md`
- `OSS-guide.md`
- `tekmemo-4-week-survival-plan(1).md`
- `tekmemo-canonical-execution-roadmap(1).md`
- `tekmemo-cloud-api-endpoint-map-and-contract-spec(1).md`
- `tekmemo-cloud-backend-folder-architecture(1).md`
- `tekmemo-cloud-infra-architecture(1).md`
- `tekmemo-cloud-pricing-billing-api-spec(1).md`
- `tekmemo-cloud-pricing-page-and-dashboard-ia(1).md`
- `tekmemo-cloud-turso-schema-design-prisma(1).md`
- `tekmemo-day-1-bootstrap-guide(1).md`
- `tekmemo-week-1-daily-checklist(1).md`
- `tekmemo-week-2-daily-checklist(1).md`
- `tekmemo-week-3-daily-checklist(1).md`
- `tekmemo-week-4-daily-checklist(1).md`

---

## 3. Merge decisions

### Product strategy

Created:

```txt
docs/product/01-product-strategy.md
```

Merged from:

- 90-day plan
- 4-week survival plan
- previous competitor analysis
- product positioning decisions

Added:

- file-first wedge
- local-first strategy
- developer-owned memory language
- product pillars

---

### OSS and free testing

Created:

```txt
docs/product/02-oss-core-and-free-testing.md
```

Merged from:

- OSS guide
- canonical roadmap package plan
- 4-week survival plan OSS scope

Added:

- four free testing modes
- BYO-provider mode
- `.tekmemo/` file structure
- CLI commands
- no-cost local capability list

---

### Cloud product and UI

Created:

```txt
docs/product/03-cloud-product-and-ui.md
```

Merged from:

- design brief
- pricing page/dashboard IA
- cloud product specs

Added:

- project creation dialog decision
- first-release vs post-launch navigation
- memory inspector future UI
- graph/conflict/dashboard roadmap

---

### Pricing and commercial strategy

Created:

```txt
docs/product/04-pricing-and-commercial-strategy.md
```

Merged from:

- pricing/billing/API spec
- pricing page IA
- 4-week survival revenue plan

Changed:

- prices kept the same
- quotas improved
- free cloud tier made more useful
- BYO-provider mode added
- founder discounts added without changing public pricing

---

### Memory architecture

Created:

```txt
docs/architecture/05-memory-architecture.md
```

Merged from:

- canonical roadmap
- API/memory specs
- earlier standout-feature recommendations

Added:

- memory event log
- conflict detection
- decay/forgetting
- hybrid retrieval
- memory compiler
- graph memory
- repo-aware memory
- sync operations

---

### API contract

Created:

```txt
docs/architecture/06-api-contract.md
```

Merged from:

- API endpoint map and contract spec
- pricing/API key spec

Simplified:

- kept launch-critical routes
- moved webhooks/sync/graph to later

---

### Infrastructure and backend

Created:

```txt
docs/architecture/07-infrastructure-and-backend.md
```

Merged from:

- backend folder architecture
- infrastructure architecture
- canonical roadmap

Preserved:

- one Cloudflare app
- thin routes
- service layer
- repository/adapters boundary
- Cloudflare/Turso/Upstash architecture

---

### Database schema

Created:

```txt
docs/architecture/08-database-schema-prisma.md
```

Merged from:

- Turso schema design Prisma document
- new future memory features

Added:

- memory records
- memory events
- conflicts
- graph nodes/edges
- sync operations

---

### Execution roadmap

Created:

```txt
docs/roadmap/09-execution-roadmap.md
```

Merged from:

- 4-week survival plan
- weekly checklists
- 90-day plan
- canonical roadmap

Changed:

- separated survival launch, 90-day credibility, and strategic moat roadmap

---

### Launch and revenue

Created:

```txt
docs/operations/10-launch-and-revenue-plan.md
```

Merged from:

- 4-week survival plan revenue sections
- Week 3/4 launch notes
- pricing strategy

Added:

- setup package
- architecture review
- founding beta
- outreach structure

---

### OSS governance

Created:

```txt
docs/operations/11-oss-governance-and-community.md
```

Merged from:

- OSS guide
- launch prep docs

Added:

- Apache-2.0 recommendation
- repo essentials
- security areas
- public roadmap rules

---

### Competitor and benchmark strategy

Created:

```txt
docs/reference/12-competitor-and-benchmark-strategy.md
```

Merged from:

- competitor analysis
- new standout features

Added:

- benchmark suite plan
- comparison page structure
- honest claims policy

---

### Implementation checklists

Created:

```txt
docs/reference/13-implementation-checklists.md
```

Merged from:

- Day 1 bootstrap guide
- Week 1 checklist
- Week 2 checklist
- Week 3 checklist
- Week 4 checklist

Simplified:

- removed repeated explanations
- kept executable checklists

---

## 4. Pricing changes summary

### Kept

- Pro: $14/month
- Team: $59/month
- Business: $169/month
- Enterprise: Custom

### Changed

- Developer Cloud became more useful
- paid plan quotas increased
- annual pricing made cleaner
- BYO-provider mode added
- founder offers added as temporary discounts

---

## 5. Future features added

Added to roadmap but not first 4-week build:

- graph memory
- temporal memory
- hybrid retrieval
- memory compiler
- conflict detection
- memory decay/forgetting
- memory inspector UI
- MCP server
- repo-aware memory
- connectors
- benchmark suite
- governance/audit controls
- local/cloud sync

---

## 6. Build-now vs build-later decision

### Build now

- OSS core
- local file memory
- Cloud beta
- API keys
- basic recall
- usage
- pricing
- docs
- revenue path

### Build later

- graph memory
- connectors
- MCP
- enterprise
- advanced audit
- advanced restore
- benchmark dashboard
- full billing automation

This protects the 4-week launch while keeping the long-term competitive plan intact.
