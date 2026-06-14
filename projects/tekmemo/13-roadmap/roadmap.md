# TekMemo — Canonical Execution Roadmap

_Created: 2026-05-02_

## 1. Purpose

This document is the canonical execution roadmap for building:

- **TekMemo OSS**
- **TekMemo Cloud**

It sequences:

- package work
- cloud app work
- infrastructure work
- database work
- API work
- pricing and billing work
- design work
- launch work

This roadmap is designed to prevent building things in the wrong order.

It assumes:

- React Router v7
- Cloudflare Workers
- Turso
- Upstash Vector
- Voyage and OpenAI embeddings
- VitePress for docs
- one cloud app serving both UI and API

---

# 2. Core build principle

Build in this order:

1. **core runtime**
2. **local and hosted adapters**
3. **cloud app foundations**
4. **multi-tenant control plane**
5. **memory product flows**
6. **recall pipeline**
7. **usage, billing, and API productization**
8. **design polish and launch**

Do not start by polishing the dashboard before the memory runtime and data architecture are stable.

Do not start by building enterprise features before the Developer, Pro, and Team paths work.

Do not start by building too many integrations before the chunk registry and recall pipeline are solid.

---

# 3. Execution phases

The roadmap is split into 10 phases.

## Phase 0 — Foundation and repo structure
## Phase 1 — TekMemo OSS core packages
## Phase 2 — Cloud app shell and backend structure
## Phase 3 — Control-plane DB and auth
## Phase 4 — Project and memory product loop
## Phase 5 — Recall pipeline and chunk registry
## Phase 6 — Usage, quotas, pricing, and billing
## Phase 7 — API productization and API keys
## Phase 8 — Dashboard polish, docs, and design alignment
## Phase 9 — Beta launch and operational hardening

---

# 4. Phase 0 — Foundation and repo structure

## Goal
Create the repo structure and working boundaries before real feature work begins.

## Outcomes
- private monorepo is scaffolded
- package boundaries are fixed
- cloud app exists
- docs app exists
- shared tooling exists
- release boundaries are clear

## Deliverables
- monorepo root
- `apps/tekmemo-cloud`
- `apps/docs`
- `packages/tekmemo`
- `packages/ai-sdk`
- `packages/fs`
- `packages/agentfs`
- `packages/upstash`
- `packages/voyage`
- `packages/openai`
- shared tsconfig
- shared lint/build config
- basic CI

## Tasks
1. scaffold monorepo
2. add package manager and turbo config
3. set up root TypeScript config
4. set up root linting and formatting
5. create empty package folders
6. create cloud app shell
7. create docs app shell
8. create environment variable strategy
9. define internal package naming and import rules

## Exit criteria
- workspace boots
- cloud app boots
- docs app boots
- packages can build empty stubs
- import boundaries are working

---

# 5. Phase 1 — TekMemo OSS core packages

## Goal
Build the OSS runtime and adapter foundation before cloud-specific product logic.

## Outcomes
- `@tekbreed/tekmemo` works
- AI SDK integration works
- local filesystem backend works
- AgentFS backend works
- Upstash and embedding adapters exist
- package boundaries are stable

## Package order

### 1. `@tekbreed/tekmemo`
Build first.

Must provide:
- memory file conventions
- store abstraction
- bootstrap
- core/notes/conversations helpers
- structured memory commands
- chunk registry primitives later

### 2. `@tekbreed/tekmemo/ai-sdk`
Build second.

Must provide:
- tool definitions
- memory tool schemas
- prepare-call integration
- thin AI SDK binding

### 3. `@tekbreed/tekmemo/fs`
Build third.

Must provide:
- local filesystem-backed `MemoryStore`

### 4. `@tekbreed/tekmemo/agentfs`
Build fourth.

Must provide:
- AgentFS-backed `MemoryStore`
- sync helpers
- checkpoint hooks
- optional lock helpers

### 5. `@tekbreed/tekmemo-upstash`
Build fifth.

Must provide:
- vector upsert/query adapter
- metadata filtering
- namespace strategy

### 6. `@tekbreed/tekmemo-voyage`
Build sixth.

Must provide:
- Voyage embedder
- batching
- dimension validation

### 7. `@tekbreed/tekmemo/openai`
Build seventh.

Must provide:
- OpenAI embedder
- batching
- dimensions handling

## Deliverables
- package implementations
- tests
- examples
- docs drafts for each package

## Exit criteria
- local demo works with `tekmemo + fs`
- AI SDK demo works
- AgentFS demo works
- Upstash + Voyage/OpenAI pipeline works end-to-end
- package APIs feel stable enough for internal cloud use

---

# 6. Phase 2 — Cloud app shell and backend structure

## Goal
Create the real cloud app architecture before feature sprawl starts.

## Outcomes
- React Router v7 cloud app has canonical structure
- backend service map is in place
- routing structure is established
- request context and env binding model exist

## Deliverables
- route structure
- `src/core`
- `src/http`
- `src/db`
- `src/auth`
- `src/tenants`
- `src/projects`
- `src/memory`
- `src/recall`
- `src/usage`
- `src/api-keys`
- `src/webhooks`
- `src/billing`
- `src/queues`
- `src/storage`
- `src/integrations`
- `src/policies`
- `src/workers`
- `src/telemetry`

## Tasks
1. scaffold route groups
2. add request context builder
3. add response/error helpers
4. wire Cloudflare bindings typing
5. wire queue bindings
6. wire R2 bindings
7. wire Durable Objects registry
8. wire Turnstile verification adapter stub
9. wire control-plane DB client and tenant-data DB router stubs

## Exit criteria
- app can serve public pages
- app can serve dashboard shell
- `/api/v1/health` works
- request context resolves env and request ID
- internal service boundaries are respected

---

# 7. Phase 3 — Control-plane DB and auth

## Goal
Build the SaaS control plane first.

## Outcomes
- tenants exist
- users exist
- memberships exist
- projects registry exists
- DB routing exists
- auth and session resolution work
- API key model exists

## Deliverables
- control-plane Turso schema
- auth implementation
- tenant membership logic
- project registry implementation
- tenant DB routing implementation
- API key create/list/revoke/validate
- Turnstile on critical entry points

## Tasks
1. implement control-plane tables
2. build users repository
3. build tenants repository
4. build memberships repository
5. build projects registry repository
6. implement auth/session service
7. implement tenant resolver
8. implement project resolver
9. implement API key creation and hashing
10. implement API key validation service
11. implement DB routing via `tenant_database_registry`

## Exit criteria
- a tenant can be created
- a user can join a tenant
- a project can be created in the registry
- API keys can authenticate requests
- project requests resolve the correct tenant-data DB

---

# 8. Phase 4 — Project and memory product loop

## Goal
Ship the first real product loop:
create project -> edit memory -> see memory in dashboard -> create restore point.

## Outcomes
- projects work
- core memory works
- notes work
- conversation history works
- restore metadata works
- project activity is tracked

## Deliverables
- project list/details pages
- core memory read/update services
- note append/list services
- conversation append/list services
- restore point create/list flow
- memory dashboard UI
- project activity feed

## Tasks
1. implement tenant-data project schema
2. implement `memory_documents`
3. implement `memory_notes`
4. implement `memory_conversations`
5. implement `restore_points`
6. build project CRUD services
7. build memory read/write services
8. build notes UI and API
9. build conversations UI and API
10. build restore point create/list UI and API
11. emit project activity events
12. record basic usage around writes

## Exit criteria
- user can create a project
- user can update core memory
- user can append notes
- user can append conversation entries
- user can create and list restore points
- UI reflects current stored state

---

# 9. Phase 5 — Recall pipeline and chunk registry

## Goal
Make recall real and maintainable.

## Outcomes
- chunk registry exists
- indexing is async
- recall query works
- source reindex works
- vector storage is connected
- embedding provider is selectable

## Deliverables
- tenant-data `chunk_registry`
- `recall_jobs`
- indexing queue consumer
- recall query orchestrator
- source-based reindexing
- Upstash integration
- Voyage/OpenAI integration
- recall page and query tester

## Tasks
1. add `chunk_registry` table
2. add `recall_jobs` table
3. build indexing queue message contracts
4. build indexing consumer
5. build chunking service
6. build embedder interface selection
7. build Upstash query/upsert service
8. build recall query service
9. build explicit reindex endpoint/service
10. mark stale chunks and replace on reindex
11. connect memory writes to indexing enqueue
12. build recall page and jobs visibility

## Exit criteria
- core memory update triggers indexing enqueue
- notes update triggers indexing enqueue
- recall query returns results
- stale chunk lifecycle is handled
- source reindex works cleanly

---

# 10. Phase 6 — Usage, quotas, pricing, and billing

## Goal
Turn the product into a monetizable hosted service.

## Outcomes
- plans are enforced
- quotas are visible
- add-ons are modeled
- usage is recorded
- billing screens work
- warnings and caps work

## Deliverables
- usage events
- periodic usage counters
- quota check service
- grace buffer logic
- billing plan page
- add-ons UI
- usage dashboard
- warning banners
- billing integration stubs or real integration

## Tasks
1. implement `usage_events`
2. implement `usage_counters_periodic`
3. build usage recording service
4. build quota check service
5. build warning thresholds
6. build hard-cap handling for free
7. build soft-cap + grace handling for paid
8. build billing plan service
9. build add-ons data model and logic
10. build billing UI and usage UI
11. build upgrade recommendation logic

## Exit criteria
- plan limits are visible
- quota checks block or warn correctly
- free plan hard caps work
- paid plan grace buffer works
- usage dashboard matches backend truth

---

# 11. Phase 7 — API productization and API keys

## Goal
Make the hosted product accessible programmatically in a controlled way.

## Outcomes
- API routes are stable
- API keys are first-class
- API docs are usable
- project and memory APIs work
- recall APIs work
- webhooks exist

## Deliverables
- `/api/v1/*`
- API response envelope
- API error envelope
- project endpoints
- memory endpoints
- recall endpoints
- usage endpoints
- billing summary endpoint
- API keys endpoints
- webhooks endpoints
- API docs page

## Tasks
1. implement canonical API routing
2. implement `/api/v1/me`
3. implement project API
4. implement memory API
5. implement recall API
6. implement usage API
7. implement plan summary API
8. implement API keys API
9. implement webhooks API
10. add rate limiting
11. add request IDs and logging
12. add API docs in docs app and/or API page

## Exit criteria
- all key product functions are accessible via API
- API key scopes are enforced
- request/response shapes are stable
- rate limiting works
- API docs are usable by external users

---

# 12. Phase 8 — Dashboard polish, docs, and design alignment

## Goal
Align product, design, docs, and commercial positioning.

## Outcomes
- dashboard feels cohesive
- pricing page is consistent with plan logic
- docs app is aligned
- changelog/blog strategy is implemented
- design system is consistent

## Deliverables
- polished dashboard screens
- pricing page
- add-ons section
- FAQ
- public changelog in docs app
- blog in docs app
- in-app “what’s new” panel or feed
- docs for API and OSS usage
- light and dark mode polish

## Tasks
1. align dashboard nav to IA
2. build final pricing page
3. build final usage page
4. build final billing page
5. build API keys page
6. build webhooks page
7. build docs app sections
8. add changelog to VitePress docs app
9. add blog to docs app
10. add in-app release feed or notifications
11. align copy across pricing/docs/dashboard

## Exit criteria
- pricing page matches actual limits
- dashboard matches actual product
- docs explain real product behavior
- design files map to implemented pages

---

# 13. Phase 9 — Beta launch and operational hardening

## Goal
Launch a serious beta without getting buried by operational chaos.

## Outcomes
- onboarding works
- monitoring exists
- usage abuse is controlled
- data flows are recoverable
- pricing is enforceable
- beta users can self-serve most tasks

## Deliverables
- beta onboarding flow
- alerting and structured logs
- webhook retry visibility
- queue failure visibility
- restore flow confidence checks
- backup/export strategy
- abuse protection
- support workflows
- tenant migration tools (pooled -> dedicated)

## Tasks
1. add Turnstile where needed
2. add request and job logging
3. add job retry visibility
4. add webhook delivery logs UI
5. add tenant migration workflow
6. add pooled-to-dedicated DB migration procedure
7. add restore/reindex operational playbooks
8. add support/admin tooling
9. onboard first beta tenants
10. monitor actual usage against pricing assumptions

## Exit criteria
- first beta tenants can use the product end-to-end
- failures are visible and recoverable
- abuse is controlled
- migrations are possible
- support can diagnose issues without raw DB spelunking

---

# 14. Cross-cutting tracks

These tracks run across multiple phases.

## 14.1 Design track
Runs from Phase 2 onward.

Owns:
- landing page
- pricing page
- dashboard
- memory UI
- recall UI
- billing UI
- API keys UI
- webhooks UI

## 14.2 Docs track
Runs from Phase 1 onward.

Owns:
- OSS docs
- API docs
- cloud docs
- pricing help
- changelog
- blog

## 14.3 Billing track
Runs from Phase 5 onward.

Owns:
- plan enforcement
- add-ons
- annual pricing
- upgrade/downgrade UX
- invoice model
- overage/grace behavior

## 14.4 Ops track
Runs from Phase 3 onward.

Owns:
- logs
- alerting
- migrations
- restore workflows
- queue health
- webhook health
- abuse control

---

# 15. Suggested build sequence by month

## Month 1
- Phase 0
- Phase 1
- start Phase 2

## Month 2
- finish Phase 2
- Phase 3
- start Phase 4

## Month 3
- finish Phase 4
- Phase 5

## Month 4
- Phase 6
- start Phase 7

## Month 5
- finish Phase 7
- Phase 8

## Month 6
- Phase 9
- beta launch
- operational hardening
- pricing validation

This is a recommended pace, not a mandatory timeline.

---

# 16. Minimum viable release cut

If you need to cut scope aggressively, your first serious release should include:

## Required
- projects
- core memory
- notes
- conversations
- basic recall
- API keys
- Developer + Pro plans
- usage summary
- hard caps on free
- one embedding provider
- one vector provider
- pricing page
- docs app

## Can wait slightly
- Team roles depth
- webhooks
- advanced analytics
- enterprise features
- multiple embedding providers in UI
- advanced restore UX
- add-on self-serve automation

---

# 17. Things not to build too early

Do **not** prioritize these before the core loop works:

- enterprise-only auth
- marketplace integrations
- too many provider options in UI
- custom branding/white-labeling
- deep analytics dashboards
- excessive changelog/blog polish
- multiple cloud apps
- secondary database platforms

---

# 18. Canonical recommendation

The right execution order is:

1. monorepo and package boundaries
2. TekMemo OSS packages
3. cloud app structure
4. control-plane DB and auth
5. project + memory loop
6. recall + chunk registry
7. usage + pricing + billing
8. API productization
9. design/docs alignment
10. beta launch and hardening

This is the canonical roadmap for building TekMemo and TekMemo Cloud.
