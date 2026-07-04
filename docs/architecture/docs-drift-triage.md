# Docs Drift Triage (S2-Q3)

> **Status:** Register, 2026-06-20. The worklist applying
> [ADR 0008](../adr/0008-docs-information-architecture.md) Rule 1 ("code is the
> source of truth; docs are a projection"). Every entry is grounded in the
> working tree.
>
> **Scope:** `apps/docs/**` only (the VitePress site). Root docs (`README.md`,
> `ROADMAP.md`) are S2-Q4; decision-layer (`docs/adr`, `docs/architecture`,
> `docs/CONTEXT.md`) is the source these pages must project.
>
> **Critical scoping note (user directive, 2026-06-20):** **TekMemo Cloud, the
> hosted MCP endpoint, and the cloud-client/sync surface ship at v1 alongside
> the OSS.** They are **not** drift and are **not** to be retracted, deferred,
> or reframed as "Later." The only legitimate drift here is:
> (a) **stale API signatures** — the D4 enum trim removed `mode: "cloud"` and the
> `cloud-only` / `cloud-first` *policy values* from the runtime API, so docs
> showing those constructor/table rows no longer match the shipped types;
> (b) the **deleted `tekmemo-adapter-upstash`** package; (c) genuine missing
> pages the sidebar promises or locked decisions require.
>
> A statement like "the hosted server is **cloud-only**" (meaning: it backs onto
> TekMemo Cloud and can't read your local disk) is a **true product claim — it
> stays.** Only the enum/API claims are drift. Do not conflate the two.

## How to read each entry

`path` — the drifted file. `verdict` — what's wrong and the one-line fix, traced
to the decision that changed the underlying code. `rule` — the ADR 0008 rule the
fix enforces.

---

## Stale pages (claim API/code that no longer exists)

### D4 — `mode: "cloud"` flag + `cloud-only` / `cloud-first` policy values removed from the runtime API

Code reality: `packages/tekmemo/src/tekmemo/types.ts` (the constructor `mode`
union is now `"local" | "hybrid" | "memory"`); `RuntimeReadPolicy` /
`WritePolicy` no longer include `"cloud-only"` (or `"cloud-first"` — verify
against `types.ts` at edit time); `config.ts` `resolveMode` / `isRuntimeMode` /
`isReadPolicy` / `isWritePolicy` trimmed. **The cloud product is unchanged — it
is now reached via the sync client / hosted endpoints / dashboard, not via a
`mode: "cloud"` constructor flag.** These docs still show the old flag/rows.

| path | verdict | rule |
|---|---|---|
| `api/tekmemo/tekmemo.md:23` | mode union still lists `"cloud"`. → drop it; union becomes `local \| hybrid \| memory`. | R1 |
| `api/tekmemo/tekmemo.md:26-27` | `readPolicy`/`writePolicy` still list `"cloud-only"` (and `"cloud-first"` if removed). → drop the removed rows. | R1 |
| `api/tekmemo/tekmemo.md:221` | example uses `mode: "cloud"`. → replace with a `hybrid` example or a sync-client example. | R1 |
| `packages/tekmemo/configuration.md:30-46` | "## Cloud" section with `mode: "cloud"` + `cloud: { baseUrl, apiKey }`. → replace the *constructor* example with the sync-client / hosted-endpoint path; keep the cloud as a shipping surface. | R1 |
| `packages/tekmemo/configuration.md:82` | config table still enumerates `"cloud"` under `runtime`. → drop. | R1 |
| `packages/tekmemo/configuration.md:91-92` | `hybrid.readPolicy` / `writePolicy` still list `"cloud-only"` (+ `"cloud-first"`). → drop removed rows. | R1 |
| `packages/tekmemo/configuration.md:171` | config.json example has a `"cloud": {}` block keyed off the old mode. → update to match the sync-client config shape. | R1 |
| `packages/tekmemo/client.md:45` | constructor example `mode: "cloud"`. → replace with sync-client / hosted framing. | R1 |
| `packages/tekmemo/client.md:109` | policy table row `cloud-only`. → drop the row. | R1 |
| `packages/tekmemo/cloud-client.md:15,21,177` | "Set `mode: "cloud"`" framing. → reframe around the cloud client as the **sync transport** (`health`/`readiness`/`sync`), not a runtime mode. Cloud client stays; the *mode flag* goes. | R1 |
| `packages/tekmemo/concepts.md:52` | "Hybrid runtime" gloss lists `cloud-only` in the policy set. → drop the removed value. | R1 |
| `packages/mcp/runtime-modes.md:36,45` | read/write policy tables list `cloud-only`. → drop the rows. | R1 |

> **Not drift — keep as-is:** every statement on these same pages that describes
> the **hosted MCP endpoint's data source** as "cloud-only" (it backs onto
> TekMemo Cloud, can't read local disk) is a true product claim and stays.
> Specifically `packages/mcp/runtime-modes.md:3,47`, `client-setup.md:3,186,199`,
> `index.md:14,18`, `hosted.md:5`, `concepts.md:53`, `getting-started.md:37`,
> `installation.md:3,25`, `faq.md:57`, `faqs/index.md:57`, `public/llms.txt:62`.
> These describe the hosted endpoint, not the removed `mode`/`policy` enum.

### S2-Q1 / ADR 0007 — AI SDK extracted; `TekMemoAiRuntime` renamed

Code reality: the 14 `src/ai-sdk/*` files moved to
`packages/tekmemo-adapter-ai-sdk/`; the interface renamed
`TekMemoAiRuntime` → `TekMemoMemoryRuntime` (now in
`packages/tekmemo/src/ai-runtime/`); the `ai` peer dep dropped from core.
**These docs still name the old interface and/or place the integration in core.**

| path | verdict | rule |
|---|---|---|
| `packages/tekmemo/ai-sdk/index.md:80,83` | names `TekMemoAiRuntime`; references `mode: "cloud"`. → `TekMemoMemoryRuntime`; integration now in `@tekmemo/adapter-ai-sdk` — import from there. | R1/R2 |
| `packages/tekmemo/ai-sdk/tools.md:9,20,51` | names `TekMemoAiRuntime` (×3). → `TekMemoMemoryRuntime`; update imports to the adapter package. | R1/R2 |
| `api/tekmemo/ai-sdk.md:93` | example `mode: "cloud"` (D4). → remove/replace; confirm this API page is generated from the **adapter's** exports, not core's (core no longer exports these). | R1/R2 |

### Q6 6a — `tekmemo-adapter-upstash` deleted

Code reality: package deleted; lockfile + 9 ref files pruned.

| path | verdict | rule |
|---|---|---|
| `api/tekmemo/recall.md:28` | links to `[Upstash Vector adapter](./vector-adapters)` — also a **dead link** to a page that doesn't exist (see Missing #1). → drop the upstash mention. | R1 |
| `packages/tekmemo/installation.md:42` | "Upstash Vector recall" install row for `@upstash/vector`. → remove the row. | R1 |

---

## Missing pages (sidebar/nav promises them, or a decision lacks a docs home)

| path | why missing | verdict | rule |
|---|---|---|---|
| `api/tekmemo/vector-adapters.md` | **sidebar links to it (`config/sidebar.mts:103`); file does not exist.** `ignoreDeadLinks: false` → this is a build-breaking dead link. | Either restore the page (scoped to the *surviving* vector stores, since upstash is gone) or remove the sidebar entry. Likely **remove the entry** unless other vector adapters still ship — confirm at edit time. | R2 |
| `packages/tekmemo/connectors.md` | ADR 0002 + Q1–Q3 lock connectors (local execution, `connectors.json` 11th canonical file, secret handling) but **no docs page exists.** | **Create** — local execution model, config sync, `secretRef` (never the token), connector-write determinism. Single home; link from sidebar. Do NOT add an `api/tekmemo/connectors` page until `@tekmemo/connectors` package exists (no vapor docs). | R2/R3 |
| `packages/tekmemo/intelligence.md` | Q5 / ADR 0004 lock v1 intelligence (hybrid recall + LLM extraction + consolidation) but the "how smart is TekMemo" story is scattered/absent. | **Create** — projects the Q5 decision table (strong retrieval, rule-based+LLM graph, consolidation). | R3 |
| `packages/tekmemo/ai-sdk/*` adapter pointer | the AI SDK guide pages still live under `packages/tekmemo/ai-sdk/` but the code moved to an adapter package. | **Resolve routing:** keep the guide URL (don't break inbound links) but repoint all imports/exports at `@tekmemo/adapter-ai-sdk`. | R2 |
| `apps/docs/includes/` (dir) | ADR 0008 Rule 4 needs a shared-include root; it does not exist. | **Create** the dir + migrate the duplicated hybrid-mode paragraph (`faq.md` / `faqs/index.md`) and any byte-identical OSS-vs-Cloud block into includes. | R4 |

---

## Count

- **Stale:** 18 entries across ~13 files (D4 API drift ×12, AI-SDK rename ×3,
  upstash ×2; several files carry more than one). One file's drift may span two
  categories.
- **Missing:** 5 (2 build-relevant — `vector-adapters` dead link, `connectors.md`
  gap; 3 content — `intelligence.md`, ai-sdk routing, `includes/`).
- The pre-audit estimate ("16 stale + 8 missing") was directionally right; this
  verified register is authoritative.

## Execution order (binds the register to the ADR's blueprint)

1. **Build-breaking first:** fix the `vector-adapters` dead link (Missing #1) so
   `check:links` runs green and gates the rest.
2. **D4 API sweep:** the ~12 mode/policy signature fixes — one coherent edit,
   same shape as the code-side D4 trim. **Cloud product pages untouched** except
   where they literally show the removed `mode`/`policy` values.
3. **S2-Q1 sweep:** rename + repoint the 3 ai-sdk pages to the adapter package.
4. **Q6 sweep:** drop the 2 upstash references.
5. **Missing content:** create `connectors.md` + `intelligence.md`; resolve
   ai-sdk routing; stand up `includes/` and dedupe the hybrid-mode paragraph.
6. **Verify:** `check:links` green end-to-end.

## Validation

- Every "stale" claim cross-checked against landed code (D4 types in
  `types.ts`/`config.ts`; S2-Q1 extraction in `packages/tekmemo-adapter-ai-sdk/`;
  upstash deletion). These are code-vs-doc deltas, not opinions.
- Dead-link detection run against `sidebar.mts` / `nav.mts` → the only genuine
  dead internal link is `/api/tekmemo/vector-adapters` (`/changelog/` is a
  clean-URL resolving to `changelog.md`; `check:links` will confirm).
- `ignoreDeadLinks: false` in `.vitepress/config.mts:15` means the build enforces
  this register — fixing #1 makes the rest CI-gated.
- **Product-claim preservation verified:** no entry in this register retracts,
  defers, or reframes TekMemo Cloud, the hosted MCP endpoint, or the
  cloud-client/sync surface. Per user directive, all three ship at v1.
