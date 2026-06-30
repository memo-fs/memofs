# Docs blueprint reprojection — amend ADR 0008's routing map

**Status:** accepted (2026-06-30). Amends [ADR 0008](./0008-docs-information-architecture.md)
— the routing blueprint only; ADR 0008's four IA **rules** stand unchanged.

ADR 0008's four rules (code-is-truth; one home per fact; decisions linked not
copied; DRY via includes) are correct and durable. What aged was its **routing
blueprint** — the concrete page map — written before S3-Q1..Q5 changed the
package surface. This ADR reprojects the blueprint onto the post-grilling
surface; it does not re-litigate the rules (doing so would itself violate Rule 3).

## Why amend (not reopen)

The drift is in the **content map**, not the **governance**. New packages
(`tekmemo-server`, `tekmemo-adapter-turso`/`-s3`/`-postgres`), a new role
(`LlmClient`), the store-axis decoupling (blob vs metadata), OpenAI gaining an
extractor, and the `"memory"`-mode + policy removals all have **no docs home**
in ADR 0008's blueprint. Reopening the rules would re-litigate a decision that
isn't the source of drift; amending the blueprint is what ADR 0008's "Accepted"
status anticipates. This mirrors how `screens-locked.md` SC5 handles the screen
IA — re-project, don't re-litigate.

## Shape — package-anchored sidebar + two task-oriented landing pages (B3)

Keep the package-anchored sidebar (honest to the code: Core / Server / CLI /
MCP / Adapters / Connectors / API). Add **landing pages that orient, never
re-state** — they explain a *conceptual structure* once and link to the provider
pages that own each fact. This absorbs the package explosion (9 adapter
packages) without a flat-list problem and without violating Rule 2.

The two landing pages exist because S3 grilling introduced **two new conceptual
structures** users must understand before they pick a provider:

- **Configure intelligence** — the **4-role model** (`MemoryEmbedder` /
  `Reranker` / `Extractor` / `LlmClient`). Explains the seam once ("deterministic
  default + adapter-enhanced"), links to each provider's role page.
- **Configure storage** — the **2-axis model** (`BlobClient` vs `MetadataStore`,
  picked independently). Explains replica-aware vs standalone once, links to each
  backend.

## The new sidebar map

```
Core Runtime          (existing, swept for mode/policy drift — Q6)
Self-hosting
  └ Server            (NEW — tekmemo-server, first-class deployable; own top-level
                       nav item parallel to CLI/MCP)
  └ Configure storage      (NEW landing — 2-axis model, links to backends)
  └ Configure intelligence (NEW landing — 4-role model, links to providers)
Adapters              (NEW collapsible section, grouped by axis)
  ├ Embedders         openai · voyage · transformers
  ├ Rerankers         voyage
  ├ Extractors        openai · workers-ai
  ├ LlmClient         openai
  ├ Blob stores       r2 · s3
  ├ Metadata stores   turso · postgres
  └ AI SDK            ai-sdk
CLI                   (existing)
MCP                   (existing)
Connectors            (existing)
API reference         (existing, regenerated)
```

## Landing-page discipline (Rule 2 enforcement)

The two landing pages are **indexes, not duplicates.** A landing page may:
- explain the *conceptual structure* (4 roles; 2 axes) — this fact has no other home;
- state the deterministic-default + adapter-enhanced seam — same;
- **link** to each provider/backend page.

A landing page may **not** re-state a provider's signature, defaults, or model
list — those live on the provider page (one home). A copy is a Rule-2 defect.

## Considered options

- **D1 — reopen ADR 0008, redesign the IA.** Rejected: re-litigates rules that
  aren't the drift source; violates Rule 3; the biggest legacy reversal in the
  S3 grilling, unwarranted.
- **B1 — one section per package, scaled.** Rejected: a 9-item flat "Adapters"
  list with no task-oriented entry point; users configuring embeddings must
  already know which adapter page to open.
- **B2 — task-oriented top level, packages nested.** Rejected: re-crosscuts
  package boundaries, risks the narrative-vs-API duplication Rule 2 forbids
  (a "configure intelligence" page re-stating each adapter page).
- **B3 — hybrid (chosen).** Package-anchored sidebar (honest to code) + two
  orienting landing pages (honest to the new conceptual structures), with no
  duplication.

## Sub-decisions

- **Server is its own top-level nav item** (parallel to CLI/MCP), not nested
  under "Self-hosting" — it is a first-class deployable artifact (S3-Q1).
- **Cloud content stays deferred to `memo.tekbreed.com`** (SC1). The docs link
  out; they do not host a cloud comparison page. OSS-vs-managed framing, if
  needed, lives on the Server landing page as a one-line orienting note that
  links out — not a dedicated page.

## Consequences

- ADR 0008 gains an "amended by 0015" note on its routing blueprint; the four
  rules are untouched.
- The S3-Q5 mode/policy sweep (Q6) lands as part of this reprojection: ~8 pages
  drop `"memory"` mode + policy tables; the `Tekmemo` constructor docs show
  `local | hybrid`.
- ADR 0008's own never-completed worklist (the 15 drifted + 8 missing pages,
  incl. `connectors.md` / `intelligence.md`) folds into this sweep — they are the
  same class of drift, now batched.
- Three new landing/orienting pages (`configure/intelligence`,
  `configure/storage`, the Server home) are authored under Rule 2 discipline.
