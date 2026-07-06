# ADR 0008: Docs information architecture — four rules + routing blueprint

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Christopher S. Aondona

## Context

`apps/docs/` is a VitePress site (currently `vitepress@2.0.0-alpha.17`).
The docs landed *before* the new-architecture refactor and were never re-aligned
to it, so today the site documents a runtime that no longer exists. Three classes
of drift, all verified in the working tree:

1. **Documents an API that no longer matches the code.** `packages/tekmemo/configuration.md`
   still shows `mode: "cloud"` + a `cloud: { baseUrl, apiKey }` constructor block,
   and several pages still list `cloud-only` / `cloud-first` in their read/write
   *policy tables*. D4 trimmed those **enum values** from the runtime API
   (`types.ts`, `config.ts`, the four CLI/MCP arg-parsers); the **docs** were
   never swept. **This is not a retraction of the cloud product** — TekMemo Cloud
   and the hosted MCP endpoint ship at v1 alongside the OSS (user directive,
   2026-06-20). The drift is narrower: the *constructor signature* and the
   *policy-enum table rows* changed, because the cloud is now reached via the
   sync client / hosted endpoints, not via a `mode: "cloud"` runtime flag.
   Statements that describe the hosted endpoint's *data source* as "cloud-only"
   (it backs onto TekMemo Cloud, can't read your local disk) are **true and stay**;
   only the stale enum/API claims are drift.
2. **Two truth sources for the same fact.** The same package is described in both
   `apps/docs/packages/tekmemo/*` (narrative docs) **and**
   `apps/docs/api/tekmemo/*.md` (generated API reference), and concepts like
   recall, modes, and the AI SDK contract are re-stated in prose on multiple
   pages. When the contract changes (it just did — S2-Q1/Q3), every copy drifts
   independently.
3. **Scope is mis-stated.** `apps/docs/README.md` line 14 claims the docs app
   "intentionally does not contain blog, changelog, pricing, billing, … Those
   belong in the TekMemo Cloud app CMS." But the **sidebar/nav already include**
   `/blog/`, `/changelog/`, `/faqs/`, and a Changelog nav entry — i.e. the site
   contradicts its own scope statement.

The risk is not cosmetic. AGENTS.md makes TekMemo memory the single source of
truth for project facts; docs that describe a phantom runtime poison that source
of truth the moment an agent ingests them.

## Decision

**Adopt four information-architecture rules for `apps/docs/`, and fix the site's
routing to match the current package surface. The rules govern *what* goes where
and *how* a fact is stated once; the routing blueprint is the concrete map.**

### Rule 1 — Code is the source of truth; docs are a projection

A doc claim is true only if it is **derivable from code, tests, or a linked
ADR/decision**. When code and docs disagree, code wins and the doc is the bug.
This makes the recurring "docs still show the old `mode: "cloud"` API" class of
drift a
definable defect, not a style issue.

- **Consequence:** the docs-drift triage (S2-Q3, [`docs-drift-triage.md`](../architecture/docs-drift-triage.md))
  is the immediate application of this rule — every stale page is traced to the
  decision/commit that changed the underlying code.

### Rule 2 — One home per fact (SSOT), projected two ways

Every fact has **exactly one authoritative location.** It may be *read* from
several places, but it is *authored* in one. The two projection layers are:

| Layer | Home | Authored how | Example |
|---|---|---|---|
| **Narrative docs** | `apps/docs/packages/**` | hand-written prose, guides, concepts | `packages/tekmemo/configuration.md` |
| **API reference** | `apps/docs/api/tekmemo/**` | generated from TSDoc / type exports | `api/tekmemo/tekmemo.md` |

- **Narrative ≠ API.** A narrative page explains *why/how*; the API page lists
  *what the signature is*. They must not re-derive each other. If the signature
  changes, only the API page (regenerated) should need to move; the narrative
  changes only if the *concept* changed.
- **Cross-page facts link, never re-state.** Recall scoring, mode semantics, the
  runtime contract, and the cloud's role each live on **one** page; every other
  page that needs them links to it. This is what makes S2-Q1's "the interface was
  renamed and moved" not require editing six copies.

### Rule 3 — A decision is recorded once, in the decisions/ADR system, then linked

`docs/architecture/decisions.md`, the `docs/adr/*` set, and `docs/CONTEXT.md`
together form the **decision layer.** A docs page may *reference* a decision
("connectors run locally — see ADR 0002") but must never re-litigate or
re-summarize it. Re-stating a decision on a docs page is the #1 cause of
"docs say X, the ADR says Y" — because when the decision is revised (e.g. ADR
0005's v7→v8 correction), the stale summary on the docs page survives.

- This rule is already followed for ADRs 0002–0007; ADR 0008 extends the same
  discipline to **content** decisions (what a page claims), not just
  architecture decisions.

### Rule 4 — Repeated prose is a shared include, not a copy (DRY via VitePress includes)

When the same prose genuinely must appear on multiple pages (install snippets,
the OSS-vs-Cloud framing, the canonical-files table, the connector secret model),
it is written **once** as an include file and pulled in with VitePress's
[markdown includes](https://vitepress.dev/guide/markdown#markdown-includes)
(`@[include]()` / `<!-- @include: ... -->`). A copy is a defect waiting to
desynchronize — exactly the failure mode Rule 2 is designed to prevent, applied
at the paragraph level rather than the page level.

- **One include root:** `apps/docs/includes/` (new). Shared blocks live here;
  page-specific content stays inline.
- **When NOT to use an include:** if the prose diverges even slightly between two
  pages (different mode, different audience), it is not "the same fact" — keep
  them separate. Includes are for *byte-identical* repeated content only.

### Routing blueprint (the concrete map)

The sidebar (`apps/docs/.vitepress/config/sidebar.mts`) and nav (`nav.mts`) must
describe the **current** package surface. Required changes, grounded in the
locked decisions:

1. **Mode/policy *API* tables match the code, without retracting the cloud product.**
   `packages/tekmemo/configuration.md`, `packages/tekmemo/concepts.md`,
   `packages/tekmemo/client.md`, `packages/mcp/runtime-modes.md` → the constructor
   `mode` union is `local | hybrid | memory` (D4), and the read/write *policy*
   tables drop the `cloud-only` / `cloud-first` rows that no longer exist in
   `RuntimeReadPolicy`/`WritePolicy`. **Cloud stays as a first-class shipping
   surface** — reached via the hosted MCP endpoint, the sync client, and the
   dashboard, not via a `mode: "cloud"` flag. The hosted-MCP pages
   (`packages/mcp/hosted.md` etc.) keep their "this endpoint backs onto TekMemo
   Cloud" framing; that is a product claim, not API drift.

2. **The AI SDK lives in its adapter, not core.**
   `packages/tekmemo/ai-sdk/*` and `api/tekmemo/ai-sdk.md` must point at
   `@memofs/adapter-ai-sdk` and the renamed `TekMemoMemoryRuntime`
   (was `TekMemoAiRuntime`) — S2-Q1 / ADR 0007. Core's API page stops
   re-exporting the Vercel tool schemas.

3. **Connectors get a section.** A new `packages/tekmemo/connectors.md`
   (local execution, `connectors.json` config, secret handling) reflects
   ADR 0002 + the Q1–Q3 decisions. No `tekmemo-connectors` API page until that
   package exists (avoid documenting vapor).

4. **Only genuinely-removed surfaces are removed from the nav.** `tekmemo-adapter-upstash`
   references (6a) are cut from sidebar/nav because the package is deleted. The
   hosted-MCP route **stays** (it ships at v1); the cloud-client route **stays**.

5. **Scope statement matches reality.** `apps/docs/README.md` is revised to state
   what the site **actually** contains (it does host `/blog/`, `/changelog/`,
   `/faqs/`), retracting the false "those belong in the Cloud CMS" claim — or, if
   that separation is still the intent, the blog/changelog routes are moved out.
   One or the other; not the current contradiction.

## Consequences

**Positive:**

- **Drift becomes a detectable defect.** Rule 1 + the triage register mean "docs
  describe removed `cloud` mode" has a clear owner and a clear fix path (update
  the API tables to match D4), instead
  of being ambient rot.
- **Refactors stop costing doc rewrites.** Because facts have one home (Rule 2)
  and decisions are linked not copied (Rule 3), the next extraction (a future
  LangChain adapter) touches one adapter page + one link, not six prose copies.
- **Two docs surfaces stay honest about the split.** Narrative and API reference
  stop re-deriving each other; a signature change is a regeneration, not a
  prose hunt.

**Negative:**

- **An include discipline has to be learned.** Authors must reach for
  `apps/docs/includes/` instead of copy-paste; until the habit sets, copy-paste
  will keep happening. Mitigated by `check:links` + a short note in
  `apps/docs/README.md`.
- **Initial sweep is non-trivial.** The 15 drifted `.md` files + 8 missing pages
  (per the triage) are a real editing pass. This ADR is the *rule set*; the
  triage register is the *worklist*.

## Alternatives considered

1. **Status quo (ad-hoc docs, no IA rules).** Rejected: is exactly what produced
   the bidirectional drift — docs show a `mode: "cloud"` constructor the code no
   longer exposes, and two truth sources for every concept. AGENTS.md's "TekMemo
   is the single source of truth" is undermined the moment an agent ingests a
   docs page whose API examples don't compile against the shipped types.
2. **Single mega-page per package instead of IA rules.** Rejected: doesn't solve
   the narrative-vs-API duplication, and a 4000-line page is harder to keep
   current than a set of small, single-purpose pages with includes.
3. **Generate everything from TSDoc, drop narrative docs.** Rejected: API
   reference answers "what's the signature," never "why would I use this / how do
   these modes interact." Both projections are needed (Rule 2); the fix is to
   stop them overlapping, not to delete one.
4. **Rules without the routing blueprint.** Rejected: abstract IA rules without a
   concrete "this page → this fact → this decision" map leave the 15 drifted
   files as someone else's problem. The blueprint binds the rules to the actual
   site.

## Validation

- Grounded in the working tree: `.md` files under `apps/docs/` still show the
  pre-D4 `mode: "cloud"` constructor and `cloud-only` / `cloud-first` policy
  *rows*, plus the removed `tekmemo-adapter-upstash` (verified via `rg`). The
  cloud product, the hosted MCP endpoint, and the cloud-client/sync surface
  are **not** drift — they ship at v1 (user directive). The drift is strictly
  the stale *API signatures* (D4 enum trim) + the deleted upstash package. The
  code-level trim (D4) is already landed and green (`types.ts`, `config.ts`,
  the four CLI/MCP arg-parsers); only the docs lag.
- Config in hand: `apps/docs/.vitepress/config.mts` (cleanUrls, ignoreDeadLinks:
  false — so dead links fail the build, which is what makes the routing blueprint
  enforceable via `check:links`), `config/sidebar.mts`, `config/nav.mts`.
- Scope contradiction in hand: `apps/docs/README.md` line 14 vs. the
  `/blog/`, `/changelog/`, `/faqs/` entries actually present in `sidebar.mts`.
- Decision layer already follows Rule 3: ADRs 0002–0007 + `decisions.md` +
  `CONTEXT.md` cross-link rather than duplicate.

## References

- Docs-drift worklist: [`docs/architecture/docs-drift-triage.md`](../architecture/docs-drift-triage.md)
  (16 stale + 8 missing pages, per-file verdict — the concrete application of
  Rule 1).
- Package review that surfaced the drift:
  [`docs/architecture/s2-q2-package-review.md`](../architecture/s2-q2-package-review.md)
  §"Cross-cutting" ("Docs drift is severe and bidirectional").
- Decisions log: [`docs/architecture/decisions.md`](../architecture/decisions.md)
  — Q1–Q8 + S2-Q1/S2-Q2; the decisions this IA must project, not re-derive.
- Locked decisions this IA enforces: D4 (mode/policy trim, ADR-adjacent),
  [ADR 0002](./0002-connectors-run-locally.md) (connectors),
  [ADR 0003](./0003-managed-runtime-tier.md) (managed-runtime tier framing),
  [ADR 0007](./0007-ai-sdk-extraction.md) (AI SDK extraction + rename).
- VitePress markdown includes (Rule 4 mechanism):
  https://vitepress.dev/guide/markdown#markdown-includes
