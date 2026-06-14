# Documentation Map

## Purpose

This map explains where every TekMemo decision should live.

Do not scatter decisions across random markdown files. Use this structure as the canonical source of truth.

---

# 1. Strategy docs

Use these for product definition, target users, positioning, and market story.

| File | Purpose |
|---|---|
| `01-product-strategy/product-strategy.md` | Product thesis, users, use cases, differentiation |
| `01-product-strategy/runbook.md` | Layman and professional explanation of TekMemo |
| `01-product-strategy/competitive-positioning.md` | Competitors, differentiation, public comparison strategy |

---

# 2. OSS/package docs

Use these for package ownership, package scope, release sequencing, and BYOK policy.

| File | Purpose |
|---|---|
| `02-oss-and-packages/package-map.md` | Complete package taxonomy |
| `02-oss-and-packages/package-boundaries.md` | What each package owns and must not own |
| `02-oss-and-packages/byok-and-oss-policy.md` | BYOK support and open-source boundary |
| `02-oss-and-packages/release-plan.md` | Package implementation order |

---

# 3. Package reference docs

Use these as the public docs for package users.

| Section | Purpose |
|---|---|
| `03-package-reference/core-runtime.md` | `@tekbreed/tekmemo`, memory records, bootstrap, operations |
| `03-package-reference/memory-stores.md` | `@tekbreed/tekmemo/fs`, `@tekbreed/tekmemo/agentfs` |
| `03-package-reference/embeddings.md` | Voyage/OpenAI adapters |
| `03-package-reference/vector-recall.md` | Recall interface and vector providers |
| `03-package-reference/reranking.md` | Rerank interface and providers |
| `03-package-reference/advanced-packages.md` | CLI, MCP, connectors, graph, evals, benchmarks |

---

# 4. Cloud product docs

Use these for hosted SaaS product design.

| File | Purpose |
|---|---|
| `04-cloud-product/cloud-product-spec.md` | Cloud product entities and first-release screens |
| `04-cloud-product/dashboard-ia.md` | Dashboard navigation and page IA |
| `04-cloud-product/figma-brief.md` | Figma-ready product design brief |

---

# 5. Architecture docs

Use these for engineering structure.

| File | Purpose |
|---|---|
| `05-architecture/infra-architecture.md` | Cloudflare, Turso, Upstash, queues, R2 responsibilities |
| `05-architecture/backend-folder-architecture.md` | React Router v7 + Workers backend structure |
| `05-architecture/memory-architecture.md` | File-first memory, chunk registry, compiler, graph memory |

---

# 6. API/database/billing docs

| File | Purpose |
|---|---|
| `06-api/api-contract.md` | Public API contract |
| `07-database/prisma-schema.md` | Control-plane and tenant-data Prisma schema |
| `07-database/multi-tenancy.md` | Pooled vs dedicated tenant DB rules |
| `08-pricing-billing/pricing-billing.md` | Plans, limits, add-ons, API keys, billing |
| `08-pricing-billing/pricing-page-copy.md` | Pricing page copy and UI content |

---

# 7. Testing/benchmark docs

| File | Purpose |
|---|---|
| `09-testing-benchmarks/benchmarking-strategy.md` | Production testing and retrieval benchmark strategy |
| `09-testing-benchmarks/package-test-plan.md` | Unit/contract tests required for packages |
| `09-testing-benchmarks/benchmark-kit-integration.md` | How to add benchmark kit to repo |

---

# 8. Launch docs

This is the immediate one-month operating plan.

| File | Purpose |
|---|---|
| `10-launch-survival/index.md` | Launch control center |
| `10-launch-survival/4-week-survival-plan.md` | Full 4-week plan |
| `10-launch-survival/week-1.md` | Week 1 day-by-day checklist |
| `10-launch-survival/week-2.md` | Week 2 day-by-day checklist |
| `10-launch-survival/week-3.md` | Week 3 day-by-day checklist |
| `10-launch-survival/week-4.md` | Week 4 day-by-day checklist |
| `10-launch-survival/revenue-actions.md` | First-income actions and offers |

---

# 9. Operations/governance/roadmap docs

| File | Purpose |
|---|---|
| `11-operations/operational-runbook.md` | Operational behavior and support rules |
| `11-operations/cloudflare-cost-saving-guide.md` | What Cloudflare services to use or ignore |
| `11-operations/release-gates.md` | Go/no-go release gates |
| `12-governance-community/oss-governance.md` | OSS governance and community standards |
| `13-roadmap/roadmap.md` | 90-day and longer-term roadmap |


---

# Current protocol update

The latest architecture centers all local OSS behavior around the canonical `.tekmemo/` protocol.

Start here:

- [Current Architecture Update](/00-start-here/current-architecture-update)
- [Local `.tekmemo/` Protocol](/05-architecture/local-tekmemo-protocol)
- [`@tekbreed/tekmemo` Package](/03-package-reference/tekmemo)
- [`@tekbreed/tekmemo/fs` Package](/03-package-reference/fs)


---

## AI runtime integrations

Use this section when documenting how TekMemo connects to AI runtimes:

```txt
docs/05-architecture/ai-runtime-integrations.md
docs/03-package-reference/tanstack-ai.md
docs/02-oss-and-packages/tanstack-ai-support.md
```
