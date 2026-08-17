# Notes

Use this file for lower-confidence notes, observations, and working memory.

## 2026-07-25T11:34:37.176Z
- kind: decision
- tags: none
- confidence: 1

Use VoyageAI for vector embeddings

## 2026-07-28T02:38:06.155Z
- kind: note
- tags: none
- confidence: 1

Yo bro

## 2026-08-09T18:02:26.813Z — Canonical discovery gap count is 8 under Reading A
- kind: decision
- tags: discovery, realignment, domain-modeling, grill-with-docs
- confidence: 0.95
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_bcf610ab9571e006"}

Canonical discovery-gap count is 8 (not 7). Reading A parse: split each of discovery.md's three §-1 `&`-pairs into two distinct capability gaps (Code Anchoring+Self-Healing Memory = 2; Semantic Garbage Collection+Cognitive Decay = 2; `memofs studio`+`memofs lint` = 2), fuse the §-2 pair "Memory Staging & Ephemeral Streams" as ONE mechanism (= 1), and PROMOTE §-3 prose "Procedural Playbooks" to a real gap (= 1). Total = 8. discovery.md's headline "those specific 7 gaps" is therefore superseded — the real count is 8 once the synthesis section is promoted. Realignment work proceeds against these 8 named entities, not the prose "7".

## 2026-08-09T18:02:28.155Z — docs/discovery.md is the canonical gap-list home; 1.md/2.md deleted
- kind: decision
- tags: discovery, SSOT, ADR-0017, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_f21cd82c48432cc1"}

docs/discovery.md is the canonical SSOT home for the discovery gap list (per ADR 0017 Rule 2 "one home per fact"). The files docs/discovery/1.md (hook-landscape research feeding ADR 0020) and docs/discovery/2.md (the REJECTED Command-Registry/Policy-Engine proposal — see ADR 0020 F1-F4 rejections and the "taskType" replacement note in CONTEXT.md) were deleted by the owner on 2026-08-09 because neither was the actual gap enumeration. Future realignment references must point at docs/discovery.md, not docs/discovery/.

## 2026-08-09T18:02:28.771Z — Realignment policy: ADR-first, per gap, before tickets
- kind: decision
- tags: discovery, realignment, ADR-first, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_0518e75741d9d32a"}

Realigning MemoFS's open tickets against the 8 discovery gaps proceeds "ADR-first per gap": ship ADR(s) for each locked gap decision BEFORE writing tracer-bullet tickets. Tickets are derived from locked ADRs (the ADR 0013-0020 tier model in tickets.md is the precedent: each ticket cites a spec/ADR). Realignment edit actions available per existing open ticket: re-scope (extend scope), supersede (mark closed-as-superseded-by-new-ADRs), add-fraction (keep ticket, add a complementary ticket for the missing mechanism), or leave-untouched (orthogonal to discovery gaps).

## 2026-08-09T18:06:09.663Z — ADR packaging: 5 bundled ADRs 0022-0026 in dependency order
- kind: decision
- tags: ADR, discovery, realignment, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_8b8388c4a0541f00"}

ADR packaging for the 8 discovery gaps (locked 2026-08-09): 5 bundled ADRs, dependency-ordered — ADR 0022 (Code Anchoring + Self-Healing Memory), 0023 (Cognitive Decay + Semantic Garbage Collection), 0024 (Memory Staging & Ephemeral Streams, amends ADR 0009's AgentFS complete() contract), 0025 (Procedural Memory kind via new `procedure` value on MemoryKind), 0026 (`memofs studio` + `memofs lint` dev tools, ships last). Each ADR holds both the gap identity AND the realignment-ticket scope, mirroring ADR 0018/0019 precedent (one ADR bundling many sub-items). ADR-interior grilling precedes ADR text; tickets derive from locked ADRs (ADR-first).

## 2026-08-09T18:06:10.980Z — AgentFS complete() has no success-gate today — G7 gap is real
- kind: constraint
- tags: AgentFS, G7, ADR-0024, ADR-0009-amendment, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_ebf0e7c7e114991a"}

G7 (Memory Staging & Ephemeral Streams) gap is genuine, evidenced by code. AgentFS `complete()` today (`packages/core/src/memofs/local-strategy/session.ts:96`, MCP schema `packages/mcp-server/src/tools/definitions.ts:172`) gates persistence only on `extractDurableMemory: boolean` (the agent's self-opt-in flag) — there is NO `success`/`outcome` input and NO ephemeral cleanup of session files in `.memofs/agents/...` after completion. The discovery.md-stated intent ("scratchpads that don't pollute `core.md` unless the task succeeds") is therefore unmet. ADR 0024 (Draft) amends ADR 0009's AgentFS contract by adding an `outcome: "success" | "failure" | "aborted"` input that gates persistence and an `ephemeral: true` cleanup lifecycle.

## 2026-08-09T18:08:10.405Z — Withdrawn: "8 gaps under Reading A" — canonical count is 7
- kind: decision
- tags: supersession, discovery, correction, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_d355c9f633163e3b"}

Supersedes mem_bcf610ab9571e006 ("Canonical discovery-gap count is 8 under Reading A"). Withdrawn: that decision was derived from a stale 20-line chat-start preview of `docs/discovery.md`. The actual file (re-read on 2026-08-09) is 86 lines with seven explicitly-numbered gap sections (`### 1` through `### 7`) plus a Summary-of-Recommendations table listing 7 rows. The canonical count is **7**, matching the file's own Introduction ("7 critical missing capabilities & paradigm shifts"). Reading A's "split §-1 `&`-pairs" parsing was wrong — `&`s in the section titles are facet names, not gap-split markers. §3 "Procedural Playbooks" was NOT promoted — it was named Gap #5 in the file all along. No headline edit to `docs/discovery.md` is required (file already counts correctly). The 7th gap — Open Memory Specification (OMS), see separate memo — was missed during Batches 1–2 entirely.

## 2026-08-09T18:08:12.187Z — Discovery gap #7 = Open Memory Specification (OMS)
- kind: decision
- tags: discovery, OMS, gap-7, ADR-0027, realignment
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_b90cd1433f7de3dc"}

Discovery gap #7 is **Open Memory Specification (OMS)** — `docs/discovery.md`'s section `### 7`: standardize `.memofs/` as a language-agnostic open file specification (JSON Schemas for frontmatter, event streams, graph format, file-locking protocols) so Python/Rust/Go runtimes can consume `.memofs/` without a Node.js process. Summary table labels it "Ecosystem — Open Memory Spec (OMS)". This gap was MISSED during discovery-realignment grilling Batches 1–2 (the stale 20-line chat-start preview contained no OMS reference). Surfaced on 2026-08-09's full re-read. Cannot bundle with any other gap (it is a standalone specification concern spanning the schema, event, graph, and locking layers); gets its own ADR — proposed ADR 0027. With ADR 0027 added the bundled-ADR count becomes 6 (0022–0027), supersedes the "5 bundled ADRs" decision (mem_8b8388c4a0541f00).

## 2026-08-09T18:08:48.640Z — Updated: 6 bundled ADRs 0022-0027 (OMS added) — supersedes "5 bundled"
- kind: decision
- tags: supersession, ADR, discovery, OMS, realignment
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_8a378a4fe96c7d38"}

Supersedes / updates mem_8b8388c4a0541f00 ("ADR packaging: 5 bundled ADRs 0022-0026 in dependency order"). With the Open Memory Specification (OMS) gap discovered in re-reading discovery.md (see separate memo), the bundling extends to **6 bundled ADRs (0022-0027)**, still dependency-ordered: ADR 0022 = discovery §1 (Grounded Memory & Codebase AST Anchoring + Self-Healing Memory); ADR 0023 = discovery §3 (Cognitive Decay + Semantic Garbage Collection); ADR 0024 = discovery §2 (Memory Staging + Real-Time Ephemeral Bus, amends ADR 0009); ADR 0025 = discovery §5 (Procedural Memory — `procedure` kind); ADR 0026 = discovery §4 `memofs lint` + §6 `memofs studio` bundled as Memory Dev Tools; ADR 0027 = discovery §7 (Open Memory Specification). Order within: ADR 0022 (Anchor) → ADR 0023 (Decay/SemGC) → ADR 0024 (Staging/Ephemeral) → ADR 0025 (Procedural) → ADR 0026 (Dev Tools) → ADR 0027 (OMS) — OMS last unless grill Batch 3 locks otherwise. ADR-first policy: ship each ADR draft → grill its interior → lock → derive tracer-bullet tickets from it.

## 2026-08-09T18:12:34.577Z — ADR 0022: AnchorRef = {file, hash, symbol?} — commit SHA dropped (evidence-based)
- kind: decision
- tags: ADR-0022, anchor, evidence, code_symbol, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_7a3df4cffef14e10"}

ADR 0022 (Code Anchoring & Self-Healing Memory) locks its anchor-binding target to **`AnchorRef = { file: string, hash: string, symbol?: string }`** — `file` is the repo-relative path; `hash` is the SHA-256 of the anchored file's bytes at write-time (drift detection via hash mismatch); `symbol` is OPTIONAL and stored as an AST symbol path like `src/auth/provider.ts#verifyJwt` for TS files. **commitSha is deliberately dropped.**

Evidence cited: (1) No `simple-git`/`execSync("git …")` dependency anywhere across `packages/**/*.ts` (grep returned zero hits) — option "all three" would force a new runtime git dep. (2) commit SHAs churn on rebase/amend, making them anti-durable for long-lived memory. (3) `packages/core/src/graph/types.ts:22` already declares `"code_symbol"` as an entity kind — anchor binds MemoryItems to EXISTING `code_symbol` graph nodes (reuses existing infrastructure, no new graph entity). (4) `typescript@6.0.3` is already a devDep — TS-AST symbol extraction via the TypeScript Compiler API requires no new parser dep; non-TS languages' AST binding belongs to ADR 0027 (OMS). (5) The existing memory record (`packages/core/src/memofs/types.ts`) has `kind?: MemoryKind` at line 228 but no anchor/symbol/fileHash field — adding `anchor?: AnchorRef` is additive optional (zero schema break).

Corrects my earlier wrong "all three" recommendation (made before researching the codebase).

## 2026-08-09T18:13:12.497Z — Existing code seams for ADRs 0022-0027: graph already has code_symbol + procedure + supersedes + decayEdges; WriteMemoryInput has no anchor field
- kind: reference
- tags: ADR-0022, ADR-0023, ADR-0025, evidence, graph-seams, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_e99888ee65044cfc"}

Existing code seams discovered 2026-08-09 in `packages/core/src/graph/types.ts` (`graph/types.ts`) and `packages/core/src/memofs/types.ts` (`memofs/types.ts`) — relevant to ADRs 0022-0027 realignment grilling:

1. `GraphNodeType` (graph/types.ts:16-31) ALREADY includes `"code_symbol"` (line 22) AND `"procedure"` (line 29). The graph side has `procedure` as a node type ready → ADR 0025 (Procedural Memory kind) only needs to add `"procedure"` to the MEMORY-side `MemoryKind` enum (memofs/types.ts:66-73, currently `"decision"|"constraint"|"goal"|"preference"|"reference"|"summary"|"note"`); graph side already accepts `procedure`-typed nodes.
2. `GraphFactStatus = "active"|"deprecated"|"conflicted"|"deleted"` (line 47-51). NO `"stale"` / `"unverified"` value exists. ADR 0022 must decide: extend the enum (add `"stale"` or `"unverified"`) OR reuse `"deprecated"` to model hash-drift staleness.
3. `GraphDecayInput` (line 216) + `GraphStore.decayEdges(input)` method (line 272) ALREADY exist for graph-edge decay. `GraphNode` carries `validFrom`, `validUntil`, `expiresAt`, `importance`, `confidence`. ADR 0023 (Cognitive Decay + Semantic GC) has graph-side machinery partially present — the memory-side `EXPIRY_DAYS[MemoryKind]` scoring (ADR 0018 item 5 staleness) is the existing complementary seam.
4. `GraphEdgeType` ALREADY includes `"supersedes"` (line 39) → ADR 0023 Semantic GC's cold-archive supersession can use the existing `supersedes` edge type without schema change.
5. `WriteMemoryInput` (memofs/types.ts:225-259) has `metadata?: JsonObject` (free-form), `sourceRefs?: SourceRef[]` (citation/provenance array — `SourceRef` has `path?`, `sourceId?`, `title?`, `url?`, `metadata?`), but NO explicit anchor field. ADR 0022's `AnchorRef = {file, hash, symbol?}` can be carried by (a) new explicit optional field `anchor?: AnchorRef` (typed, discoverable), (b) free-form `metadata.anchor` (zero schema break but undiscoverable via type), or (c) reuse `sourceRefs[]` with `sourceType: "code"` (semantic conflation — `SourceRef` answers "where did this fact come from?", NOT "where in code is its binding site for self-heal?").

## 2026-08-09T18:16:03.675Z — ADR 0022 Batch-4 locks: storage=anchor?; migrate anchors; add-complementary staleness; non-TS=fallback
- kind: decision
- tags: ADR-0022, anchor, grill-with-docs, Batch-4
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_5db254fa9e2bc7ac"}

ADR 0022 (Code Anchoring & Self-Healing Memory) — Batch-4 grilling locked design choices:

1. **Anchor storage**: new typed optional field `anchor?: AnchorRef` on `WriteMemoryInput` and `RecallItem` (`memofs/types.ts:225-259`, `:99-105`). Typed-additive; zero schema break; discoverable via TS type; no conflation with provenance via `sourceRefs[]` or free-form `metadata.anchor`.
2. **Anchor attachment**: write-time opt-in via `@anchor(file=…, symbol=…)` markers parsed from `content` OR explicit `anchor?: AnchorRef` on `WriteMemoryInput` + a one-shot `memofs migrate anchors` migration subcommand that walks `memory/*.md` JSONL and best-effort attaches anchors by regex-detecting file-path/symbol references. Forward + backlog coverage.
3. **Realign existing ADR 0018 item 5 staleness re-verify ticket**: ADD-COMPLEMENTARY. Keep the existing spec-tier2 ID5 LLM re-verify ticket as-is; add a new ADR 0022 ticket for hash-drift detection. Lifecycle = detect-hash-drift (ADR-0022) → invoke-existing-LLM-reverify (ADR-0018-item-5). Distinct QA flows; lower test blast radius. The LLM re-verify path also serves time-based staleness independently of drift.
4. **Symbol fallback for non-TS files**: `symbol` field is undefined for non-TS files (TS-only extraction via `typescript@6.0.3` TS Compiler API devDep at v1); `file` + `hash` preserved so drift detection via hash mismatch still works on non-TS files. Non-TS AST parsing is delegated to OMS ADR 0027.

Concrete ADR-0022 contract now draftable after Batch 5 trio (trigger time / GraphFactStatus shape / RecallItem.stale surface) — see next memo.

## 2026-08-09T18:18:15.494Z — ADR 0022 Batch-5 locks: query-time drift; GraphFactStatus += "stale"; RecallItem.stale? + demotion
- kind: decision
- tags: ADR-0022, Batch-5, drift-detection, GraphFactStatus, stale, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_82f6eacfae9684a9"}

ADR 0022 (Code Anchoring & Self-Healing Memory) — Batch-5 grilling locked design choices:

1. **Drift detection trigger**: query-time INSIDE `memo.recall` / `memo.context`. When an anchored memory is loaded, the runtime computes the file's current SHA-256 and compares. Zero new infra (no pre-commit hooks, no scheduler). Real-time. Discovery.md §1's "git pre-commit or `memofs` hooks detect changes" + "the next agent session to re-verify" was resolved in favor of query-time.

2. **GraphFactStatus extension**: extend the enum from `"active"|"deprecated"|"conflicted"|"deleted"` to also include `"stale"` (additive; semantically precise; avoids conflating drift-staleness with deliberate-retirement deprecated).

3. **Recall surface for STALE facts**: `RecallItem` gains a typed optional `stale?: boolean` field (`memofs/types.ts:99-105`). Stale-flagged items still surfaced (so the next agent session re-verifies) but ranked lower in recall results. The strategist can include a `stale?` warning banner text. (Discovery.md §1: "prompting the next agent session to re-verify and update the fact rather than blindly trusting outdated memory.")

All 8 ADR-0022 load-bearing design choices now locked. ADR 0022 draft is ready to write.

## 2026-08-09T18:19:07.011Z — ADR 0022 drafted (Code Anchoring + Self-Healing Memory) — Status: Draft
- kind: decision
- tags: ADR-0022, drafted, discovery-realignment, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_10b433ef1d04d208"}

ADR 0022 ("Code Anchoring & Self-Healing Memory" — closes discovery.md §1) DRAFTED at `docs/adr/0022-code-anchoring-and-self-healing-memory.md` (Status: Draft). Bundles Anchor + Self-Healing into one ADR per the locked 5-ADR bundling (6 total with ADR 0027). ADR body carries all 8 locked design choices from grilling Batches 3-5: AnchorRef = {file, hash, symbol?}; typed optional `anchor?` on WriteMemoryInput + RecallItem; query-time drift detection; GraphFactStatus += `"stale"`; RecallItem.stale? + tier-rank demotion; ADR-0018-item-5 add-complementary lifecycle chaining. Two finer-grained defaults flagged for user review in the ADR text itself: (1) symbol-path format `<repo-relative file path>#<dotted-symbol-path>` (rejected ts-morph as a new dep); (2) rename re-anchor strategy **disabled at v1** — v1.x refinement gated on demonstrated rename-recovery value. Hash cache in `.memofs/manifest.json` keyed by file with 5-min TTL also defaulted ON at v1.

## 2026-08-09T18:21:39.240Z — ADR 0022 Batch-6 confirmations (all 3 finer-grained defaults locked)
- kind: decision
- tags: ADR-0022, Batch-6, fine-grained-defaults-confirmed, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_d5ecc8b1b275d44b"}

ADR 0022 finer-grained defaults CONFIRMED in grilling Batch 6 (2026-08-09), all as recommended per evidence:
1. Symbol-path format: **dotted-path string** `<repo-relative file path>#<dotted-symbol-path>`. Plain-string serializable; parses back via TS Compiler `getDeclarations()[0]` lookup at migration/re-anchor. ts-morph FQN rejected (would add a new runtime dep).
2. **Rename re-anchor strategy: disabled at v1**. v1.x refinement gated on demonstrated rename-recovery value. Hash-drift detection + the existing ADR-0018-item-5 LLM re-verify compensate while the fuzzy strategy matures.
3. Hash cache: **ON at v1**, in `.memofs/manifest.json` keyed by file, with a 5-minute TTL and `fs.watch` invalidation. O(1) cached compare per anchored file per session; invalidates immediately on file touches.

ADR 0022 status remains Draft pending ADR promotion review. The ADR amendment-history tail records this confirmation per ADR-0017 "edit in place + amendment-tail" rule. All 8 load-bearing ADR-0022 design choices (B1-B8) plus 3 finer-grained defaults are now fully locked.

## 2026-08-09T18:22:14.623Z — ADR-0023 evidence: EXPIRY_DAYS + unverified NOT in code; ID9 uses non-existent MemoryKind values; staleness loop already via supersedes+deprecated
- kind: constraint
- tags: ADR-0023, evidence, ID9, MemoryKind, supersedes, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_cc4174e432ea2fe2"}

Evidence gathered for ADR-0023 (Cognitive Decay + Semantic Garbage Collection = discovery §3) interior grilling, 2026-08-09:

1. `EXPIRY_DAYS` constant and `"unverified"` enum value do NOT exist in code today. Grep `EXPIRY_DAYS|unverified|staleness` across `packages/**/*.ts` returned 18 matches — ALL in comments or test files; no implementation. ADR 0018 item 2 ID9 staleness floor (spec lines 486-507) is an OPEN TICKET, not landed code. So ADR 0023 builds this from zero, but the spec already designs it.

2. **CRITICAL DOMAIN-MODELING CRACK**: ID9 spec uses `MemoryKind` values `identity|preference|knowledge|logistics`, but today's MemoryKind enum (`packages/core/src/memofs/types.ts:66-73`) is `decision|constraint|goal|preference|reference|summary|note`. The spec's `identity`, `knowledge`, `logistics` DO NOT EXIST in today's enum. ADR 0023 must resolve: re-map EXPIRY_DAYS to today's kind taxonomy (recommended per SSOT) OR extend MemoryKind to add the spec's kinds (giving ~10 total).

3. The EXISTING staleness loop (ADR 0009 Component 5) IS implemented: facts transition to `status: "deprecated"` and a `supersedes` graph edge marks the new fact as deposing the old (`packages/core/tests/intelligence/local-intelligence.test.ts:355`, `strategist.test.ts:224,310`). So the `supersedes` edge type + `deprecated` GraphFactStatus already cover Automated Superseding — ADR 0023 Semantic GC reuses both rather than re-inventing.

4. discovery §3's Ebbinghaus Decay Model is BROADER than ID9's time-only floor — uses utility = access-recency + access frequency + explicit reinforcement signal. This needs access-tracking telemetry (recall surfaces can sink a "lastRecalledAt" + "hitCount" stamp on each RecallItem / GraphNode). Worth grilling whether this ships at v1 (full Ebbinghaus with access-tracking) OR is the v1.x enhancement on top of ID9's deterministic time-only floor (`expiryDays[MemoryKind]`).

5. discovery §3 explicitly names `.memofs/archive/` cold archive as the eviction destination — Semantic GC moves deprecated memories there, not deleted — to keep them recoverable via `memofs validate` / manual promote.

## 2026-08-09T18:25:20.791Z — ADR 0023 Batch-7 locks: 2 distinct enum values, EXPIRY_DAYS over 7-kind, ID9 floor only, cold archive + auto-supersession
- kind: decision
- tags: ADR-0023, Batch-7, decayed, StaleWeds, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_730288dab12b7dcf"}

ADR 0023 (Cognitive Decay + Semantic Garbage Collection — closes discovery.md §3) Batch-7 grilling locked design choices:

1. **Status enum extension**: extend GraphFactStatus with `"unverified"` (decay-staleness) AS A DISTINCT VALUE alongside ADR-0022's `"stale"` (hash-drift). Final enum: `"active"|"deprecated"|"conflicted"|"deleted"|"stale"|"unverified"`. Distinct depromotion + re-promotion paths: `unverified → active` (LLM re-verify or refresh); `stale → active` (re-anchor or LLM re-verify).

2. **MemoryKind taxonomy**: KEEP today's 7 kinds; DROP ID9 spec's aspirational `identity|knowledge|logistics` (those don't exist in the enum today, per SSOT today's-wins). `EXPIRY_DAYS: Record<MemoryKind, number> = { decision: 365, constraint: 180, goal: 120, preference: 90, reference: 180, summary: 60, note: 30 }` (days). Zero enum churn.

3. **Decay model depth at v1**: ship ID9 deterministic floor ONLY — time-only via `EXPIRY_DAYS[kind]` at query-time (status active→unverified when `now - createdAt > expiryDays[kind]`). Ebbinghaus access-tracked scoring (utility = recency × frequency × reinforcement) is a v1.x enhancement gated on demonstrated need — DO NOT ship `lastRecalledAt`/`hitCount` telemetry infrastructure at v1.

4. **Semantic GC eviction + supersession**: cold-archive literal per discovery §3 — deprecated memories physically MOVE to `.memofs/archive/<id>.json`. Recoverable via `memofs validate` + `memofs restore <id>`. Auto-supersession triggers at remember-WRITE time via existing `supersedes` graph edge + ID10 writer-critic diff gate (ADR 0018 item 3). Both ADR-0009-Component-5'd staleness-loop infra (`supersedes` + `deprecated`) reused, NOT re-invented.

Decay transitions: `active → unverified` (decay); `active → deprecated` (contradictor found); `unverified → active` (LLM re-verify still-accurate); `unverified → deprecated` (LLM re-verify outdated); `deprecated → archived` (physical move to `.memofs/archive/<id>.json`); `archived → active` (manual restore).

## 2026-08-09T18:27:45.173Z — ADR 0024 Batch-8 locks: outcome enum 3-value; success auto-promote+cleanup; failure discard+cleanup; aborted preserve-resume; global .memofs/events/stream.jsonl
- kind: decision
- tags: ADR-0024, Batch-8, AgentFS-amendment, Ephemeral-Stream, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_f2a3d66dbdd7d5af"}

ADR 0024 (Memory Staging & Real-Time Ephemeral Stream — closes discovery.md §2; AMENDS ADR 0009's AgentFS `complete()` contract) Batch-8 grilling locked design choices:

1. **Outcome enum**: 3-value `outcome: "success" | "failure" | "aborted"` on `AgentSessionCompleteInput`. Distinct: `aborted` preserves the session workspace for resume; `failure` cleans up. Today's `extractDurableMemory: boolean` flag is RETAINED but now gated — promotion requires `extractDurableMemory: true` AND `outcome === "success"`.

2. **Success behavior**: write durable memory via existing `extractDurableMemory: true` path → promote to `.memofs/memory/notes.md`; auto-cleanup `.memofs/agents/<sessionId>/working/` scratchpad files; PRESERVE `.memofs/agents/<sessionId>/output/` (summary.md, durable-memory.md, follow-ups.md, errors.md, changes.md) as session audit. Pre-0024 premise (agent opt-in via `extractDurableMemory: true` alone) is extended; outcome adds a second gate.3. **Failure behavior**: `outcome === "failure"` → DO NOT promote durable memory regardless of `extractDurableMemory` flag (close Q3 Batch 8). Auto-cleanup `working/` AND `output/` session files IF `ephemeral: true`; otherwise preserve them as failure audit-trail. Optionally writes a `kind: "session_failed"` event into `memory-events.jsonl` with `reason: string` for telemetry.

4. **Aborted behavior**: `outcome === "aborted"` → PRESERVE all session files (`working/` + `output/`); NO promotion; NO cleanup; session is RESUMABLE via a future `complete({outcome: "success" | "failure"})` invocation that uses the same `sessionId`. Discovery's "subagent pause-and-resume" semantic gap closed.5. **Ephemeral Stream**: NEW global file `.memofs/events/stream.jsonl` — append-only JSONL pub/sub stream for transient inter-agent hints (discovery §2 literal "Real-Time Ephemeral Stream"). Format: `{ts, fromAgentId, toAgentId?, event: "...", payload: JsonObject, ttlHours?}`. Default TTL 24h operator-configurable via `MEMOFS_STREAM_TTL_HOURS`. NOT durable recall — `memo.recall` filters out `events/stream.jsonl` entries. TWO NEW MCP tools: `memofs.stream.publish({...})` and `memofs.stream.subscribe(filter?) -> AsyncIterable<StreamEvent>`.ADR-0009 on-disk file is MISSING (doc-drift side-finding); ADR-0024 references the contract as currently implemented in `packages/core/src/memofs/local-strategy/session.ts:96-119` (current `completeAgentSession`) + `packages/mcp-server/src/tools/definitions.ts:172-194` (current MCP schema) instead of pointing at a 404 ADR file.

## 2026-08-09T18:30:24.406Z — ADR 0025 Batch-9 locks: add procedure to MemoryKind, top-level .memofs/playbooks/, structured JSON {steps}, strategist auto-inject
- kind: decision
- tags: ADR-0025, Batch-9, procedure-kind, playbooks, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_3d051936e68134a7"}

ADR 0025 (Procedural Memory Playbooks — closes discovery.md §5) Batch-9 grilling locked design choices:

1. **MemoryKind extension**: add `"procedure"` as the 8th value on `MemoryKind` enum (`packages/core/src/memofs/types.ts:66-73`): `decision|constraint|goal|preference|reference|summary|note|procedure`. The graph side already has `"procedure"` as a `GraphNodeType` (graph/types.ts:29) — memory-side enum catchup only.

2. **Storage location**: NEW top-level `.memofs/playbooks/<id>.md` (discovery §5 literal). Idiomatic, cleanly separates executable procedural memory from declarative memory (.memofs/memory/*.md). One home per kind.

3. **Playbook schema**: structured JSON `{steps: [{action, args?, expected?, validator?}]}` serialized into the playbook file body, with frontmatter metadata (id, title, taskType, successSignal?). Executable; matches discovery §5's "executable procedural workflows."

4. **Trigger**: auto-inject via strategist. The 4-stage strategist (ADR 0009) gains a NEW procedural-section stage that fires when `MemoryContextInput.taskType` is set; it recalls all `PlaybookRecord`s with matching `taskType` AND similarity threshold on title/successSignal vs query (jaccard >= 0.4 default). The matching playbooks get added to `MemoryContextResult.sections` as a new `"procedural"` section type alongside existing "directive/core/entities/recall/recent/notes". Reuses the `taskType` field ADR-0020 already shipped (T1 ticket). Discovery §5 closed.

Evidence grep: zero hits for "playbook" in packages; the graph-side `procedure` nTope is the only existing seam.

## 2026-08-09T18:30:58.307Z — ADR-0026 evidence: doctor/validate already ship; lint+studio are net-new; discovery §4 (lint rules) + §6 (studio panels) enumerated
- kind: reference
- tags: ADR-0026, evidence, doctor, validate, lint, studio, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_8ce1845a56e7f1b3"}

ADR 0026 (Memory Dev Tools: `memofs lint` + `memofs studio`, closes discovery §4 + §6) evidence (2026-08-09):

Evidence gathered:
- `packages/cli/src/commands/doctor.ts` ships `memofs doctor` (CLI registered at `runner/register.ts:298`) — checks "schema compliance and formatting"; reports validation problems (errors and warnings); GUI output includes "MemoFS doctor found errors: …" and "MemoFS doctor passed — workspace repository is healthy."
- `packages/cli/src/commands/validate.ts` ships `memofs validate` (registered at `runner/register.ts:315`) — performs "strict schema and structure checkups."
- `memofs snapshot` exists separately (validateSnapshotLabel utility in `utils/labels.ts`).
- ADR 0020 already shipped `memofs status` for compliance observability — the "last thing the developer sees after the agent's session summary" (separate concern from `lint` — `status` is compliance/metrics-only; `lint` is memory-quality static analysis).
- `memofs lint` and `memofs studio` have ZERO existing grep hits in `packages/cli/src` — they are NET-NEW.

Discovery §4 ((`memofs lint`) enumerates three lint rules:
- (1) **Contradiction Detection** — scans for conflicting statements across `core.md` and `notes.md` (a normalized statement of fact (e.g. "we use React 17" AND "we upgraded to React 19" = trigger).
- (2) **Orphan Graph Pruning** — flags `nodes.jsonl` entities disconnected from active files/memories.
- (3) **Broken Reference Check** — flags dead links, deleted file paths, obsolete API references in stored notes.

Discovery §6 (`memofs studio`) names a "**Visual Local Studio (`memofs studio` / IDE Webview)**" with three instrument panels:
- (a) **Recall Simulator / Playground** — enter a query and visually inspect why certain notes were recalled over others (vector cosine similarity vs. BM25 score vs. graph edge weights).
- (b) **Interactive Knowledge Graph** — drag-and-drop exploration of entity nodes (`User`, `AuthModule`, `Database`) and their relationships in `nodes.jsonl` & `edges.jsonl`.
- (c) **Visual Diff & Snapshot Rollback** — interactively inspect snapshot differences (`snap_123.json` vs. current state) and selectively restore memory branches.

## 2026-08-09T18:33:12.276Z — ADR 0026 Batch-10 locks: lint coexists with doctor; 4 core rules; studio=local HTTP + browser; vanilla HTML/SVG zero-dep
- kind: decision
- tags: ADR-0026, Batch-10, lint, studio, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_bcd6315ee454d1da"}

ADR 0026 (`memofs lint` + `memofs studio` Memory Dev Tools — closes discovery §4 + §6) Batch-10 grilling locked design choices:

1. **`memofs lint` ships as a new CLI command** that COEXISTS with the existing `memofs doctor`. doctor's scope = structural validity (file/repo schema + format/compliance — `packages/cli/src/commands/doctor.ts` "checks repository integrity, schema compliance, and formatting"); lint's scope = **semantic quality + cross-references** (contradiction, orphan-graph pruning, broken-ref check, playbook-schema validation). They split planes like ESLint vs tsc (semantic vs types): doctor = SR-only/is-well-form burden; lint = is-content-self-consistent burden. Both coexist; no new dep.

2. **Lint rules taxonomy at v1: 4 core rules:** (1) Contradiction Detection (discovery §4 — conflicting statements across core.md/notes.md); (2) Orphan Graph Pruning (graph-side — disconnected nodes in `nodes.jsonl`); (3) Broken Reference Check (cross-fs-and-graph — dead links, deleted file paths, obsolete API references); (4) Playbook Schema Validation (from ADR-0025 — `procedure`-kind expansion enforces `{steps:[{action, args?, expected?, validator?}]}` schema). Pluggable lint-rule registry DEFERRED to v1.x.

3. **`memofs studio` ships at v1**: local HTTP server opens browser at `localhost:<port>` with interactive webview of `.memofs/` state. Bundled with three instrument panels: (a) Recall Simulator (enter query + inspect BM25-vs-vector-vs-graph weights side-by-side); (b) Interactive Knowledge Graph (drag-and-drop exploration of `nodes.jsonl` & `edges.jsonl`); (c) Visual Diff & Snapshot Rollback (inspect snapshot diffs; select restore). Matches discovery §6's "Visual Local Studio / IDE Webview" verbatim.

4. **Studio frontend stack: vanilla HTML + SVG + minimal vanilla JS** (zero new runtime frontend deps). Bundle lives under `packages/cli/src/studio/` with statically-built assets in `packages/cli/dist/studio/`. Graph rendered via vanilla SVG/Canvas; recall-simulator shows features in plain DOM. Treeshakeable; satisfies AGENTS.md "don't add new deps without evaluating existing coverage".

CLI registration: `memofs lint [options]` + `memofs studio [--port <port>]` (registers in `packages/cli/src/runner/register.ts` alongside existing doctor/validate).

## 2026-08-09T18:36:22.334Z — ADR 0027 Batch-11 locks: auto-gen JSON schemas FROM TS types; spec scope = ALL .memofs/; Python first; @memofs/spec package + docs/oms/ home
- kind: decision
- tags: ADR-0027, Batch-11, OMS, Open-Memory-Spec, grill-with-docs, grilling-complete
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_4ab342ef258e3469"}

ADR 0027 (Open Memory Specification — closes discovery.md §7 "Language-Agnostic Open Memory Specification / POSIX of Agent Memory") Batch-11 grilling locked design choices:

1. **JSON schemas auto-generated FROM TS types**: build step with `typescript-json-schema` (or `ts-json-schema-generator`) consumes the exported types from `packages/core/src/{memofs,graph}/types.ts` and emits JSON Schemas under `docs/oms/schemas/`. TS types stay the IMPLEMENTATION SSOT; schemas are the BUILD ARTIFACT. Non-TS impls generate their own binding types from schemas.

2. **Spec scope at v1 = ALL `.memofs/` shapes**: manifest.json, memory-events.jsonl, graph records (nodes.jsonl + edges.jsonl), AgentFS session layout (ADR-0024-amended with outcome/ephemeral/reason), core.md + notes.md frontmatter, playbooks/<id>.md (ADR-0025), ADR-0022 AnchorRef, ADR-0024 events/stream.jsonl, GraphFactStatus enum + transitions, MemoryKind enum + new `procedure` (ADR-0025), PlaybookRecord schema, LintProblem (ADR-0026). Locks ALL ADRs 0022-0026 deltas as cross-spec compliant.

3. **Python reference reader/writer first at v1.x**; Rust + Go at v1.1+ gated demonstrated demand (LangChain/AutoGen tribute).

4. **Spec home**: `docs/oms/` (internal-only, internal docs per AGENTS.md — never linked from public/tracked files) + a publishable `@memofs/spec` npm package containing ONLY the JSON schemas + a `validate(input, schema)` function (uses `ajv` runtime dep — accepted because the package's purpose IS schema validation, opt-in by non-TS impls only; no transitive dep drag on `@memofs/core`).

All 6 ADRs (0022-0027) close all 7 discovery gaps; grilling reaches endpoint summary: ADR-0022→§1 Code Anchoring, ADR-0023→§3 Decay+SemGC, ADR-0024→§2 Staging+Ephemeral, ADR-0025→§5 Procedural, ADR-0026→§4+§6 lint+studio, ADR-0027→§7 OMS.

## 2026-08-09T18:41:38.553Z — Phase 2 complete: realigned 3 tickets in tickets.md, 2 tickets in tickets-0021, added Tier 10 section (6 new tickets), added CONTEXT.md Discovery Realignment glossary
- kind: summary
- tags: phase-2-complete, realignment, tickets, CONTEXT.md, grill-with-docs
- confidence: 1
- source: grill-with-docs session 2026-08-09
- metadata: {"id":"mem_c077f3e2cbf401d2"}

Phase 2 (executive realignment of unclosed tickets per the 6 locked ADRs) — COMPLETED 2026-08-09:

Files edited (in-place surgical edits):
1. `docs/architecture/tickets.md`:
   - Ticket 8 (ID9 staleness-deterministic-floor): What-to-build text RE-MAPPED per ADR-0023 Batch-7 Q2 — EXPIRY_DAYS defined for today's 7 MemoryKind values (decision=365, constraint=180, goal=120, preference=90, reference=180, summary=60, note=30); spec's aspirational `identity|knowledge|logistics` kinds deliberately DROPPED per SSOT (they never existed in the enum); `GraphFactStatus` extended with `"unverified"` per ADR-0023. Checkboxes also re-mapped to today's 7 kinds.
   - Ticket 9 (ID10 writer-critic diff gate): ADR-0023 citation appended — the gate also triggers ADR-0023's auto-supersession at remember-write time (no scope change; reuse only).
   - Ticket 18 (ID5 LLM-enhanced staleness re-verification): ADR-0022 + ADR-0023 add-complementary citation appended (no scope change; the same LLM re-verify path now re-verifies BOTH `stale` (drift) AND `unverified` (decay) paths).
   - APPENDED: NEW section `## Tier 10: Discovery Realignment (ADRs 0022-0027)` with six new tracer-bullet tickets (#56 → ADR 0022, #57 → ADR 0023, #58 → ADR 0024, #59 → ADR 0025, #60 → ADR 0026, #61 → ADR 0027) citing each ADR's full Draft contract.

2. `docs/architecture/tickets-0021-e2e-simulation-harness.md`:
   - Ticket #62 (MCP and Server real harnesses): RE-SCOPED — SDK Client lists tools now include the two NEW `memofs.stream.publish` / `memofs.stream.subscribe` MCP tools from ADR-0024; assertion that `memo.recall` / `memo.context` filter out `.memofs/events/stream.jsonl` entries added.
   - Ticket #65 (AgentFS interleaved scenario): RE-SCOPED — added assertions that AgentFS `complete({outcome})` covers all three values of `SessionOutcome = "success"|"failure"|"aborted"` with the ADR-0024 behavior matrix (success auto-promotes+cleans, failure discards+cleans if `ephemeral:true`, aborted preserves-for-resume) and backward-compat default to "success" on absent outcome.

3. `docs/CONTEXT.md`:
   - INSERTED NEW section `## Discovery Realignment (7-Gap Model — ADRs 0022-0027, 2026-08-09)` BEFORE `## Existing terms (pre-ADR 0020)`. Glossary section describes each of the 7 discovery gaps + their bundled ADRs, plus `GraphFactStatus` enum extensions (`"stale"` + `"unverified"`), `MemoryKind` enum extension (`procedure`), ephemeral stream lifecycle, and the bundle ADR roadmap + ship order.

Per ADR-0017 "edit in place + amendment tail" rule, realignment edits were surgical with citation-tail appended (no restatement of prior claim as current). All MemoFS memory facts about every Batch 3-11 lock are persisted to MemoFS for future-session recall.

## 2026-08-09T18:54:12.772Z — Agent skills scaffolding complete (issue tracker + domain docs) — ready for /to-spec publishing
- kind: decision
- tags: issue-tracker-setup, matt-pocock-skills, ready-for-agent, gh-issues, single-context, ADR-0017, ADR-link-prohibition, ssot-partition, agent-skills-config, phase-3-complete
- confidence: 1
- source: assistant:gmail-5.2
- metadata: {"id":"mem_5e145c0a08403e83"}

Issue tracker setup complete: Matt Pocock skills (`setup-matt-pocock-skills`) installed (~/.agents/skills/setup-matt-pocock-skills/) and run manually (skill tool's not in session skill list — process executed per SKILL.md). Configuration written:

1. **Issue tracker = GitHub Issues at `memo-fs/memofs`** via `gh` CLI. PRs-as-request-surface: off. `gh label create ready-for-agent --color 1a7f37 --description "Fully specified, ready for an AFK agent"` — label is live on the repo. Full 5-role triage vocabulary (`needs-triage|needs-info|ready-for-agent|ready-for-human|wontfix`) NOT yet installed because the `triage` skill is not installed; only `ready-for-agent` exists today.

2. **Domain docs = single-context** — one `docs/CONTEXT.md` + one `docs/adr/` shared by all 14 packages. No `CONTEXT-MAP.md`, no per-package `src/<context>/docs/adr/`. If future package needs its own glossary, go through `/domain-modeling` (not here).

3. **SSOT partition (the migration rule)**: two-layer split. Internal-staging (gitignored): `docs/CONTEXT.md`, `docs/adr/`, `docs/architecture/{README,decisions,tickets,tickets-<feature>,spec-<n>-*,archive}.md`. Live-contract (tracked, public): GitHub Issues at `memo-fs/memofs`. `/to-spec` → publish issue + archive local `spec-<n>-*.md` as grilling record (kept). `/to-tickets` → publish one issue per ticket in dependency order; local `tickets-<feature>.md` becomes grilling record (kept, may lag live state).

4. **ADR citation rule in public files**: GitHub issues, PRs, READMEs cite ADRs by BARE NUMBER (`ADR-0022`, `per ADR-0022 §1`, `ADR 0022 §3`) — NEVER as Markdown links to `docs/adr/` (404 for public reader). ADR one-line summary is public knowledge; ADR body + location are not.

5. **Files written/modified**:
   - NEW `docs/agents/issue-tracker.md` (GitHub seed + project SSOT-partition + wayfinding ops)
   - NEW `docs/agents/domain.md` (single-context layout + local-staging-vs-live-issues split + ADR-by-number vocabulary + flag-ADR-conflicts rule)
   - EDITED `AGENTS.md` — inserted `## Agent skills` block (Issue tracker + Domain docs sub-blocks) immediately before `## Pointers`. No `### Triage labels` sub-block (triage skill not installed).
   - EDITED `docs/CONTEXT.md` — inserted `## Agent Skills Configuration (AGENTS.md ## Agent skills)` glossary section immediately before `## Agent Behavior Enforcement (ADR 0020)`. Defines GitHub Issues (`memo-fs/memofs`), `ready-for-agent`, Internal staging vs live GitHub issues, Cite ADRs by bare number.

6. **Future migration scope**: existing internal files (ADRs 0013–0027, CONTEXT.md, decisions.md, tickets*.md, old spec drafts) STAY in place as grilling records (no deletions). New specs/tickets from ADRs 0022–0027 onwards publish to GitHub going forward; old tickets/specs get realignement citations in-place per realignment (already done in Phase 2).

NO new `docs/agents/triage-labels.md` file written — triage skill not installed. When `/setup-matt-pocock-skills` gets a sibling `triage` install, re-run the setup to add that file + the `### Triage labels` sub-block in AGENTS.md.

## 2026-08-09T19:04:47.014Z — to-tickets Phase-3 complete: 18 tracer-bullet tickets (#68-85) for ADRs 0022-0027 written to local file; #56-61 superseded in-place
- kind: decision
- tags: to-tickets, phase-3-complete, tracer-bullet, vertical-slices, discovery-realignment, ADRs-0022-0027, tickets-68-85, local-staging, supersession-amendments, ADR-0017, frontier-5-parallel
- confidence: 1
- source: assistant:glm-5.2
- metadata: {"id":"mem_a65252e27beffd3d"}

to-tickets Phase-3 complete: ADRs 0022-0027 broken into 18 tracer-bullet vertical slices. Published as LOCAL file (per user "Local file only" choice — same pattern as specs; publish to GitHub when user is ready).

1. **NEW FILE**: `docs/architecture/tickets-0022-0027-discovery-realignment.md` — 18 tickets numbered #68-#85 (continuing the global sequence after tickets.md Tier 10 #56-61 + tickets-0021 #62-67). 5 parallel work streams unblocked at the frontier (#68, #73, #76, #80, #83). Each ticket = narrow vertical slice covering schema+API+tests; sized to fit a single fresh context window per to-tickets skill.

2. **Tier-10 #56-61 STUBS in `tickets.md` superceded in-place with audit-trail amendments** (per ADR-0017 Rule 2 in-place edit + amendment-tail policy): each ticket heading gained a quote-block "> Closed-as-superseded (2026-08-09) by tickets-0022-0027-discovery-realignment.md #NN" amendment line directly under the title. Original body content KEPT (audit trail; never deleted). 6 amendments applied to #56-61 with corresponding new-ticket mappings (#56→#68+#69+#70; #57→#71+#72; #58→#73+#74+#75; #59→#76+#77; #60→#78+#79+#80+#81+#82; #61→#83+#84+#85).

3. **Ticket-to-ADR mapping** (vertical slices per ADR):
   - ADR 0022 (Code Anchoring + Self-Heal): 3 slices — #68 (anchor+drift-detect file+hash only; no blockers), #69 (TS symbol extraction; blocked by #68), #70 (migrate CLI backfill; blocked by #68)
   - ADR 0023 (Decay + SemGC): 2 slices — #71 (EXPIRY_DAYS decay floor implementing realigned ID9; blocked by #68 for enum-order), #72 (SemGC archive move + restore; blocked by #71 + open spec-tier2 ID10)
   - ADR 0024 (Staging + Ephemeral Stream): 3 slices — #73 (outcome enum + behavior matrix; no blockers), #74 (stream file + MCP tools; blocked by #73), #75 (stream TTL GC on doctor; blocked by #74)
   - ADR 0025 (Procedural): 2 slices — #76 (procedure MemoryKind + PlaybookRecord + CLI; no blockers), #77 (procedural-section strategist auto-inject; blocked by #76)
   - ADR 0026 (lint + studio): 5 slices — #78 (lint 2-rule: contradiction + broken-ref; blocked by #68), #79 (lint orphan-graph + playbook-schema; blocked by #71 + #76), #80 (studio HTTP server + Recall Simulator panel; no blockers), #81 (studio Knowledge Graph panel; blocked by #80), #82 (studio Visual Diff + Rollback panel; blocked by #80)
   - ADR 0027 (OMS): 3 slices — #83 (@memofs/spec package skeleton + validate + manifest schema + CI drift; no blockers), #84 (generate ALL schema shapes — convergence point with widest blocking fan-in #68+#71+#73+#74+#76+#78+#83; ships LAST), #85 (docs/oms prose + governance; blocked by #83)

4. **5 parallel work streams at the frontier (no blockers)**: #68, #73, #76, #80, #83 — distinct ADRs, can all start immediately in parallel.

5. **Phase-2 realignment citations already in place prior to this run** (not re-edited): spec-tier2 ID9 (closes when #71 lands), spec-tier2 ID10 writer-critic diff gate (BLOCKS #72 — existing open upstream dependency), tickets-0021 #62 + #65 (already re-scoped for stream MCP tools + outcome behavior matrix — Phase 2).

6. **Decisions locked**:
   - Granularity: 18 narrow vertical slices (user confirmed "Right granularity" in to-tickets skill step-4 quiz).
   - #56-61 treatment: user said "make the best decision" → went with fresh IDs #68-85 + #56-61 in-place Closed-as-superseded amendments (audit trail preserved per ADR-0017; nothing deleted).
   - Publish destination: user chose "Local file only" (matching the specs decision). GitHub Issues publishing deferred until user is ready.

7. **Skill workflow**: to-tickets skill explicitly supports BOTH local-files mode (one `tickets.md` per-repo root — here bent to per-feature convention `tickets-<feature>.md` already established in repo) AND GitHub-issues mode. User chose local per the same "publish when ready" pattern.

## 2026-08-09T19:11:38.631Z — ADR 0028: Adopt MCP 2026-07-28 spec incrementally, dual-mode, in the custom protocol layer
- kind: decision
- tags: ADR-0028, MCP, 2026-07-28-spec, grill-with-docs, mcp-server, wire-protocol, dual-mode, deprecation
- confidence: 1
- source: assistant:opencode / grill-with-docs
- metadata: {"id":"mem_64cea2955e0b8a17"}

ADR 0028 (Adopting the 2026-07-28 MCP Spec Revision — Incremental, Dual-Mode, in the Custom Protocol Layer) grilling locked decision (2026-08-09). Evidence-only; every claim cites file:line or an official SEP.

KEY ARCHITECTURE FACT: `@memofs/mcp-server` (v1.2.0-beta.3) speaks the MCP WIRE protocol via a CUSTOM, dependency-free protocol layer (`packages/mcp-server/src/protocol/` re-exporting `@memofs/json-rpc`), NOT via `@modelcontextprotocol/sdk`. The official SDK (`@modelcontextprotocol/sdk@1.29.0` v1) is used ONLY structurally by `src/sdk/index.ts` (`registerMemoFSMcpCapabilities`) to let host apps register MemoFS tools on their own SDK server. `sdk/index.ts` ALREADY targets BOTH v1 `.tool()` and v2 `.registerTool()` APIs. The custom protocol layer does NOT import the SDK. So "updating the SDK" is mostly orthogonal to the wire protocol.

DO-NOW (target v1.3.0) — adopt 2026-07-28 INCREMENTALLY, DUAL-MODE, in the CUSTOM layer:
1. Prepend "2026-07-28" to `SUPPORTED_PROTOCOL_VERSIONS`; set `LATEST_PROTOCOL_VERSION = "2026-07-28"` (`packages/mcp-server/src/schema.ts:12-22`). Unblocks the HTTP version gate — the single highest-leverage fix.
2. Implement `server/discover` RPC in `protocol/server.ts` dispatch; keep `initialize` for backcompat. Mirrors the existing initialize response shape (`:242-256`).
3. Stamp `resultType: "complete"` on every dispatch result envelope (additive; old clients ignore).
4. Add `ttlMs` + `cacheScope` to `tools/list` (long ttlMs, cacheScope:"public" — static 10-tool catalog, listChanged:false), `prompts/list`, `resources/list`, `resources/read` (SEP-2549). Headline win for upstream prompt caches.
5. Route resource-not-found `McpNotFoundError` from `resources/read` to `-32602` (Invalid Params) per SEP-2164; keep unknown-METHOD at `-32601` (`protocol/server.ts:389-401`).
6. CORS: add `Mcp-Method`, `Mcp-Name` to `Access-Control-Allow-Headers` (`http/helpers.ts:134`); ACCEPT (do NOT REQUIRE) them on POST.
7. Keep `initialize`/`ping`/`logging/setLevel` for backcompat (deprecated 2026-07-28, 12-month window; remove at v2.x major, not v1.3). The custom layer advertises `logging:{}` + implements `logging/setLevel` as a no-op `→ {}`.

DEFER:
- SDK dep swap to `@modelcontextprotocol/server` v2 (only `sdk/index.ts` uses it; v1.x maintained >=6mo; adapter already targets registerTool). Swap when v2 stable + a v2-only host-adapter feature needed (Standard Schema input schemas). Independent of the wire upgrade.
- MRTR (`input_required`) — no server-side elicitation need; ADR-0024 `outcome` is agent-supplied, not server→client elicitation; `consolidate apply=false` is a normal result.
- Tasks extension — no long-running ops; "aborted" resume keys on `sessionId` arg, not a Task handle.
- `subscriptions/listen` — memofs resources are static (listChanged:false).
- OAuth hardening (RFC 9207 iss, application_type, CIMD) — memofs uses bearer/API-key auth, not DCR.
- Remove initialize/ping/logging — let the 12-mo window run; remove in a v2.x major.

SKIP: JSON Schema 2020-12 `$ref` loosening (compliant subset already); OpenTelemetry `_meta` (separate observability concern); includeContext deprecation (N/A — no sampling); elicitation `complete` removal (N/A).

DOES THE NEW SPEC HELP? Yes selectively: (a) stateless core VALIDATES the existing HTTP design (zero incremental scalability gain — already there); (b) cacheable lists (`ttlMs`/`cacheScope`) is a genuine win for the static tools/list catalog + upstream prompt caches; (c) header routing helps the Cloudflare Workers/gateway path; (d) server/discover + resultType + error renumber are pure compliance.

EMERGENCY? No for stdio (new clients fall back to `initialize` on 2025-11-25 servers automatically — official blog). YES-ADJACENT for HTTP: `validateProtocolVersion` (`helpers.ts:38-51`) returns HTTP 400 for the `2026-07-28` header BEFORE JSON-RPC parses, so a new HTTP client CANNOT probe `server/discover` to trigger the fallback. The Workers/cloud path is the exposed surface. Mitigation is one line (item 1).

GRILLING rejected: full-2026-07-28-only (M2 — breaks old clients, contradicts 12-mo policy); SDK-v2 wholesale migration (M3 — custom layer is wire SSOT, SDK only structural, swap yields no wire capability); stay-on-2025-11-25 (M4 — HTTP 400 blocks new HTTP clients, misses cacheable-lists win); adopt MRTR/Tasks now (M5 — no elicitation need).

CROSS-ADR: ADR-0024 unaffected — `outcome` is an agent param (not MRTR elicitation), `memofs.stream.subscribe` AsyncIterable is a tool-result stream (not subscriptions/listen); its two new stream MCP tools inherit the 2026-07-28 deltas automatically. ADR-0027 (OMS) is FILE-FORMAT; orthogonal to wire changes. ADR-0021 (e2e) SDK-client harness unaffected at v1.29.0; a v2-client harness variant is a separate ticket.

DOCS WRITTEN: `docs/adr/0028-mcp-2026-07-28-spec-adoption.md` + glossary section "MCP 2026-07-28 Spec Adoption (ADR 0028)" appended to `docs/CONTEXT.md` (before "Existing terms (pre-ADR 0020)").

## 2026-08-09T19:13:54.971Z — discovery-web.md grilling-out 2026-08-09 — 5 discarded, 2 re-scoped
- kind: decision
- tags: grill-with-docs, discovery-web, realignment, ADR-0019, ADR-0020, ADR-0024, ADR-0027, Agent-Identity-Phasing, MemOps-Canvas, Cloud-Visionary-Deferrals, 5-discarded-2-rescoped, 2026-08-09
- confidence: 1
- source: assistant:grill-with-docs
- metadata: {"id":"mem_bef73a31fd5362b2"}

discovery-web.md grilling-out (2026-08-09, grill-with-docs / domain-modeling session): 7 cloud-visionary paradigms disputed grilled against locked ADRs 0019/0020/0022-0027 + spec-cloud-repositioning.md + spec-tier6-v1.1-cloud-features.md + strategy.md (Ground-Zero Founder survival model). **5 of 7 discarded**, 2 re-scoped.
- DISCARD §1 (Global Knowledge Mesh): cross-tenant content processing breaks spec-cloud-repositioning ToS §1 scoping paragraph + duplicates §7 (same industry-pack examples) + GDPR Art 5 / EU AI Act / HIPAA exposure at $0-runway broke-founder stage. Enterprise tenant-local mesh need is served by OSS-offline + self-hosted Docker (strategy.md Phase 3).
- DISCARD §2 (Agent Memory CI Sandbox / synthetic-agent behavioral regression): margin death at $15/mo Pro (one PR check = LLM × prompt-suite × N agents, can outspend monthly revenue); greenfield research, not engineering. v1 floor = memofs lint (ADR-0026, tickets #78+#79) + GitHub PR memory summaries (cloud-repositioning T11 already spec-closed). v1.x candidate = memory-diff-impact lint-rule category in pluggable registry (already v1.x-deferred).
- DISCARD §5 (Git-to-Memory synthesizer): duplicates T11 (PR memory summaries) + conflicts with ADR-0022 anchoring + fuels ADR-0023 Semantic GC's eviction workload — spend compute to add facts then more to evict them; margin-negative on both axes; ADR-0017 Rule 2 SSOT breach (auto-deriving facts humans already wrote). Salvageable kernel: digest_daily webhook event (T9 v1.x complementary candidate).
- DISCARD §6 (P2P Edge Mesh / air-gap): redundant — OSS file-first + strategy.md Phase 3 self-hosted Docker already covers air-gap enterprise; P2P mesh is 12-18mo distributed-systems program targeting slowest sales cycles (FedRAMP/SOC2/RFP, 18-month pro-cycles) — incompatible with strategy.md 14-30-day cashflow.
- DISCARD §7 (MemoFS Hub Marketplace): v2 per ADR-0019 §"What stays honestly deferred" (Connector Marketplace beyond v1.x). Plumbing IS landing at v1/v1.x: ADR-0027 (OMS) tickets #83/#84/#85 deliver portable specs; Tier-6 v1.1 ID7 Memory Import delivers snapshot-into-project. Once both land, packs share via Git URL — no marketplace needed.
- RE-SCOPE §3 (Live MemOps Canvas): ADR-0024 Ephemeral Stream IS the v1 floor for "human → running agent mid-session hint" (human is valid fromAgentId publisher; agent opts to subscribe). Heatmap + drag-drop steering = out-of-scope: MemoFS collects no agent attention telemetry; ADR-0020 trust boundary forbids auto-push of steering. See ADR-0024 amendment tail.
- RE-SCOPE §4 (Zero-Trust Agent IAM): Agent Identity Phasing — (1) Phase 1 live: T7 scoped API keys + writer?: string attribution (ADR-0019 §3); (2) Phase 3 enterprise: SAML/SSO + SOC2 + audit logging (ADR-0019 §5.1 + strategy.md Phase 3); (3) v3+ enterprise gated on demand: signed provenance (key mgmt, revocation, rotation). OPA/Rego WASM policy engine stays OUT of OSS core per AGENTS.md no-new-deps rule. Domain correction: SPIFFE (machine SVID) vs WebAuthn (human auth) are NOT interchangeable; WebAuthn does not sign data artifacts like memory facts. See ADR-0019 amendment tail.

DISCOVERY-WEB.MD STAYS IN OSS docs/ as grilling reference per user ("don't move it, it is there for reference"). Amendment header added to top of file. ADR-0024 + ADR-0019 gained amendment tails. T9 webhooks (tickets-cloud-repositioning.md) gained amendment note with digest_daily v1.x candidate. tickets-0022-0027-discovery-realignment.md tickets #74/#75/#78/#79/#83/#84/#85 got leave-untouched / out-of-scope notes. docs/CONTEXT.md gained new section "MemoFS Cloud Visionary Deferrals (grilling-out 2026-08-09)" with 7 glossary entries. NO new tickets created. The remaining work fronts: OSS tickets #68-#85 (5 unblocked at frontier: #68/#73/#76/#80/#83) + cloud-repositioning T12 launch-gate copy flips.

## 2026-08-09T19:13:56.381Z — Cross-tenant Knowledge Mesh out-of-scope per ADR-0020 trust frame
- kind: constraint
- tags: trust-frame, ADR-0020, ToS-scoping, cross-tenant, GDPR, enterprise-self-host, constraint
- confidence: 1
- source: assistant:grill-with-docs
- metadata: {"id":"mem_2f6a2de73027ec69"}

Cross-tenant Knowledge Mesh (discovery-web.md §1) is OUT OF SCOPE per ADR-0020 trust frame + spec-cloud-repositioning.md ToS §1 scoping paragraph. The hosted runtime processes content ONLY for the customer's own opt-in projects; cross-tenant distillation-for-others'-benefit is the exact shape the ToS promises NOT to do ("the cloud you can leave"). Combined with GDPR Art 5 data minimization / EU AI Act / HIPAA exposure at $0-runway broke-founder stage, the cross-tenant public mesh is non-viable. The enterprise tenant-local mesh need IS served by OSS-offline (file-first, fully offline .memofs/) + dedicated/self-hosted Docker (strategy.md Phase 3). Locked decision 2026-08-09 (grill-with-docs pass). No ticket action; recorded as a CONTEXT.md glossary entry under "MemoFS Cloud Visionary Deferrals".

## 2026-08-09T19:13:57.485Z — ADR-0024 Ephemeral Stream IS the v1 floor for mid-session human→agent hints
- kind: decision
- tags: ADR-0024, ephemeral-stream, MemOps-Canvas, trust-boundary, agent-attention, v1-floor, v2-deferral
- confidence: 1
- source: assistant:grill-with-docs
- metadata: {"id":"mem_b02cb3a00073bc7b"}

ADR-0024 Ephemeral Stream (.memofs/events/stream.jsonl + memofs.stream.publish/subscribe MCP tools; tickets #74 + #75) IS the v1 floor for "human → running agent mid-session hint": a human is a valid `fromAgentId` publisher; the agent opts to subscribe and tail the stream. discovery-web.md §3 "Live MemOps Canvas" (Live Attention Heatmap + drag-drop mid-session steering UI) is OUT OF SCOPE at v1 for two reasons: (1) MemoFS does not collect agent attention telemetry (which graph nodes a running agent is weighting) — there is no data to visualize; (2) ADR-0020 trust boundary (pull automatic / push deliberate) means external steering cannot auto-propagate to a running agent without the agent opting to subscribe. Recorded in ADR-0024 amendment-tail (the "MemOps Canvas scope clarification" entry, 2026-08-09); leave-untouched notes on tickets #74/#75 (no action — the locked stream design IS the substantive v1 surface). Heatmap/drag-drop deferred to v2+ research, not engineering.

## 2026-08-09T19:13:59.234Z — Domain correction: SPIFFE ≠ WebAuthn (discovery-web.md §4 conflation)
- kind: note
- tags: SPIFFE, WebAuthn, domain-correction, Agent-Identity-Phasing, signing, v3-deferral
- confidence: 1
- source: assistant:grill-with-docs
- metadata: {"id":"mem_e1b4b306a33990d6"}

Domain correction surfaced 2026-08-09 in grill-with-docs pass on discovery-web.md §4: the doc conflated SPIFFE and WebAuthn as interchangeable for "cryptographic memory provenance." They are NOT the same layer:
- SPIFFE (Secure Production Identity Framework for Everyone) issues SVIDs (SPIFFE Verifiable Identity Documents) — these are machine/service identities used for mTLS between services in zero-trust service meshes. They CAN sign data; SPIFFE is the machine/service identity layer.
- WebAuthn (W3C Web Authentication) is a human challenge-response authentication protocol (a phishing-resistant auth factor for humans). It does NOT sign data artifacts like memory facts — it's an auth-challenge protocol, not a content-signing protocol.

The "SPIFFE/WebAuthn" coupling in discovery-web §4 is domain-incoherent. WebAuthn could authenticate a human who authorizes a write; SPIFFE could sign a service's identity attestation. They compose in zero-trust design, but neither as written delivers "per-fact cryptographic signing by an agent identity certificate" — that needs its own design (key mgmt + per-agent certs + revocation + rotation + attest chains). Recorded in ADR-0019 amendment-tail "Agent Identity Phasing" entry. Signed memory provenance = v3+ enterprise, gated on demonstrated contract demand; NOT at v1/v1.1 (12-18mo security program).

## 2026-08-09T19:14:00.761Z — MemoFS Hub Marketplace explicitly v2+ per ADR-0019; packs share via Git meantime
- kind: decision
- tags: ADR-0019, Connector-Marketplace-deferral, MemoFS-Hub, OMS, memory-import, v2-deferral, packs-via-git
- confidence: 1
- source: assistant:grill-with-docs
- metadata: {"id":"mem_5ca666a813dede34"}

MemoFS Hub Marketplace (verified-industry knowledge packs + creator royalties + payouts + content-review legal liability) is explicitly v2+ per ADR-0019 §"What stays honestly deferred" ("Connector Marketplace — beyond v1.x. GitHub + Notion ship at v1; the marketplace is extensibility, not a launch blocker"). discovery-web.md §7 discarded at v1/v1.1 in grill-with-docs pass 2026-08-09. The plumbing IS landing at v1/v1.x: (a) ADR-0027 (OMS) tickets #83/#84/#85 deliver portable JSON Schemas for all .memofs/ shapes; (b) ADR-0019 item 14 / Tier-6 v1.1 ID7 Memory Import delivers snapshot-into-project. Once both land, users share packs via Git URL (no marketplace needed) — same tech, distributed via existing trust (GitHub URL). Hub = v2 business-operations program: vendor management, payouts, content-review legal liability (e.g., a wrong "HIPAA Compliance Pack" = real-world harm + MemoFS's liability), chicken-and-egg at $0 runway. No new ticket; #83/#84/#85 leave-untouched with realignment notes.

## 2026-08-09T19:18:40.944Z — to-tickets cloud-visionary-deferrals complete: 3 v1.x tickets #86-88 (local file)
- kind: decision
- tags: to-tickets, cloud-visionary-deferrals, v1.x, tracer-bullet, tickets-86-88, local-staging, pluggable-lint-registry, memory-diff-impact, digest-daily-webhook, ADR-0019, ADR-0026
- confidence: 1
- source: assistant:to-tickets
- metadata: {"id":"mem_d84084d50362938d"}

to-tickets for cloud-visionary-deferrals complete: 3 v1.x tracer-bullet tickets (#86-#88) written to LOCAL file
to-tickets for the discovery-web.md grilling-out decisions produced 3 v1.x tracer-bullet vertical slices, written to NEW LOCAL FILE `docs/architecture/tickets-cloud-visionary-deferrals.md` (per user's "no need to publish on github" + established local-only pattern matching #68-#85). Tickets continue the global sequence (#68-#85 from tickets-0022-0027-discovery-realignment.md → #86-#88 here).

1. **#86 — Pluggable lint-rule registry (v1.x extension of #79)**: LintRule plugin type + lint.registerRule(...) API; the 4 existing static rules migrate to built-in plugins; third-party rules register + run through the same pipeline; LintProblem output contract from #78 unchanged. BLOCKED BY #79 (ships the 4 static rules first to validate the pipeline before opening to plugins). The un-ticketed v1.x deferral that #79's own line "Pluggable lint-rule registry is V1.X-only and NOT shipped here" anticipated.

2. **#87 — memory-diff-impact lint rule (v1.x, on the pluggable registry)**: static-analysis lint rule that assesses memory-diff impact (contradictions, affected-active-memories, supersession-candidates). NOT behavioral simulation (discovery-web §2 Agent Memory CI Sandbox was discarded at v1/v1.1 for margin reasons; this is the static, margin-safe salvage kernel). BLOCKED BY #86 (registers on the pluggable registry). Deterministic-only at v1.x (no LLM calls); --diff <file> flag accepts a proposed memory record for pre-merge CI linting.

3. **#88 — digest_daily webhook event (v1.x, complementary to T9 webhooks)**: new event-mask value on T9's existing webhook infrastructure (closed). Cloudflare Cron Trigger fires once daily per project with digest_daily enabled; derives from last 24h of memoryEvents basic kinds (write|consolidation|core_update|pre_warm — NOT recall/context which are 7-day-retention); delivers via existing HMAC-SHA256 signed POST + retry. Human RECEIVES digest, REMAINS memory author (NO auto-synthesis — §5 Git-to-Memory discarded; this is disclosure, not authorship). Gated Pro+ via existing hasWebhooks. UNBLOCKED — can start immediately (T9 closed; memoryEvents exist; cron configured). Does NOT call stats() (ADR-0019 §4) — derives from memoryEvents only, so NOT blocked by Health Dashboard landing.

Frontier: #88 unblocked (start here); #86 gated by #79; #87 gated by #86. All three are v1.x — they ship AFTER the v1 discovery-realignment tickets #68-#85, NOT part of the v1 frontier. The v1 frontier remains {#68, #73, #76, #80, #83} from tickets-0022-0027-discovery-realignment.md.

5 discards produced NO tickets (recorded in CONTEXT.md deferrals section): §1 (cross-tenant mesh), §2 (Agent Memory CI Sandbox — salvage = #87), §5 (Git-to-Memory — salvage = #88), §6 (P2P Edge Mesh), §7 (MemoFS Hub Marketplace — plumbing via #83/#84/#85). 2 re-scopes produced NO new tickets (kernels already ticketed): §3 → ADR-0024 Ephemeral Stream (#74/#75 leave-untouched); §4 → ADR-0019 Agent Identity Phasing (Phase 1 live via T7; Phase 3 strategy.md; v3+ signed provenance gated on demand).

## 2026-08-09T19:21:15.562Z — to-spec published ADR-0028 as GitHub Issue #10 (mcp 2026-07-28 spec adoption)
- kind: decision
- tags: ADR-0028, to-spec, issue-10, ready-for-agent, MCP, 2026-07-28-spec, mcp-server, testing-seams, grill-with-docs
- confidence: 1
- source: assistant:opencode / to-spec
- metadata: {"id":"mem_8d2f9d615ad0c38f"}

to-spec published ADR 0028 as GitHub Issue #10: "Adopt MCP 2026-07-28 spec incrementally in the custom protocol layer (ADR 0028)" — https://github.com/memo-fs/memofs/issues/10. Applied the `ready-for-agent` triage label (no additional triage per skill). First MCP wire-protocol upgrade spec for @memofs/mcp-server; supersedes nothing.

Testing seams confirmed with user (chose "Add an e2e release-gate assertion"):
1. PRIMARY unit seam (existing): `server.handleJsonRpcMessage(...)` JSON-RPC dispatch — covers version negotiation (2026-07-28 echoes back), server/discover, resultType on every result, ttlMs/cacheScope on tools/list/prompts/list/resources/list/resources/read, resource-not-found → -32602, unknown-method → -32601, initialize/ping/logging/setLevel backcompat.
2. SECONDARY unit seam (existing): `handleMemoFSMcpRequest(request, options)` Streamable HTTP transport — covers HTTP version gate accepts 2026-07-28 (the Q2 blocker fix), CORS permits Mcp-Method/Mcp-Name, headers accepted without being required, 2026-07-28 client tools/list over HTTP carries cache hints. The existing "rejects unsupported protocol versions → 400" test inverts into "accepts 2026-07-28 → 200" + a pinning test for still-rejects-unknown.
3. FORWARD-LOOKING release gate (lands with ADR-0021 harness): one assertion proving a 2026-07-28-speaking client can server/discover + tools/list over a real HTTP server (process + port, not in-memory). Gated on ADR-0021 mcp-http-harness infrastructure; release-gate-only (heavy real e2e excluded from CI fast path).

Confirmation: ADR-0021 real e2e harness NOT YET LANDED in @memofs/testing (only fakes + contracts + fixtures exist; the real/ subpath + mcp.e2e.test.ts slot described in ADR-0021 are pending). So Seam 3 ships when ADR-0021 harness ships.

No new seams; two existing test files edited; one forward-looking assertion gated on ADR-0021. Three seams total at the highest point: JSON-RPC dispatch (unit), HTTP transport (unit), real HTTP end-to-end (release gate).

Issue tracker status verified: `ready-for-agent` label live on memo-fs/memofs (color #1a7f37). Existing issues #4 and #5 are open good-first-issue tickets; this is issue #10.

Order of implementation per spec Further Notes: version-list fix (one-line unblock) → server/discover → resultType stamping → CacheableResult hints → error-code renumber → CORS + header acceptance. The version-list fix is the unblock; the rest are independent and parallelizable.

## 2026-08-09T19:24:48.241Z — to-tickets Phase-4: ADR-0028 broken into 6 tickets #86-91 (local file only)
- kind: decision
- tags: to-tickets, phase-4-complete, ADR-0028, MCP, 2026-07-28-spec, tickets-86-91, local-staging, frontier-4-parallel, issue-10, grill-with-docs
- confidence: 1
- source: assistant:opencode / to-tickets
- metadata: {"id":"mem_2838f8e199be9ca9"}

to-tickets Phase-4 complete: ADR-0028 (MCP 2026-07-28 spec adoption) broken into 6 tracer-bullet vertical slices written to LOCAL file only (per user "do not publish to github, leave it as local for now" — same pattern as the ADRs/ specs / tickets-0021 / tickets-0022-0027).

1. NEW FILE: `docs/architecture/tickets-0028-mcp-2026-07-28-spec-adoption.md` — 6 tickets numbered #86-#91 (continuing the global sequence after tickets-0022-0027 #68-85). Gitignored (confirmed via `git check-ignore`); internal-only per AGENTS.md.

2. Frontier graph (user-approved granularity + blocking edges verbatim):
   - #86 (Advertise 2026-07-28 as latest protocol version — HTTP version-gate unblock): NONE — starts immediately.
   - #87 (Implement server/discover RPC): blocked by #86.
   - #88 (Decorate every result with resultType + CacheableResult hints on list/read): blocked by #86.
   - #89 (Route resource-not-found to JSON-RPC Invalid Params -32602): blocked by #86.
   - #90 (Accept Mcp-Method/Mcp-Name HTTP headers + permit them in CORS): blocked by #86.
   - #91 (ADR-0021 e2e release-gate: server/discover + tools/list over real HTTP from a 2026-07-28 client): blocked by #86 + #87 + #88 + EXTERNAL prerequisite (ADR-0021 real e2e harness `mcp-http-harness` slot in @memofs/testing — NOT on disk today; if absent, WAIT, do not stub with in-memory surrogate).

   So: #86 starts alone → {#87, #88, #89, #90} all parallel after #86 → #91 after #86+#87+#88 + the ADR-0021 harness lands. 4 parallel work streams at the frontier after the one-line unblock.

3. User quiz answers locked: granularity = "Right granularity (6 tickets)"; blocking edges = "Yes — 1→{2,3,4,5}→6 (with external gate on 6)"; merge/split = "do not publish to github, leave it as local for now".

4. Decisions locked:
   - Granularity: 6 tickets (1 small unblock + 4 parallel medium slices + 1 gated e2e). NOT merged (considered merging #4+#5 or #1+#2; kept apart for parallelism + fast unblock). NOT split (considered splitting #88 into resultType-global + cache-hints-list/read; kept as one cohesive "result envelope decoration" slice to avoid a 3a→3b inter-dependency and honor SSOT single-stamping-point).
   - Publish destination: LOCAL file only (matches tickets-0021 + tickets-0022-0027 precedent; GitHub Issues publishing deferred until user is ready — same deferred-publication pattern as the ADRs / specs / earlier ticket sets).
   - Numbering: #86-#91 continuing the global sequence after #68-85 (tickets-0022-0027-discovery-realignment).

5. CacheableResult envelope prototype inlined in #88 (decision-encoding snippet per to-tickets skill exception): `{ resultType: "complete", ttlMs: 3600_000, cacheScope: "public", tools: [...] }` — resultType on EVERY result (SEP-2322), ttlMs+cacheScope on list/read only (SEP-2549, CacheableResult). tools/call + ping + logging/setLevel + initialize + server/discover carry resultType only (not cacheable). Single dispatch-boundary stamping point (DRY/SSOT).

6. Testing seams per ticket (locked in spec #10): #86-#90 use the two existing unit seams (JSON-RPC dispatch `handleJsonRpcMessage` + Streamable HTTP `handleMemoFSMcpRequest`); #91 uses the ADR-0021 real-e2e seam (forward-looking, gated).

7. Out-of-scope (deferred per ADR-0028, NOT in these tickets): SDK v2 swap; MRTR (input_required); Tasks extension; subscriptions/listen; OAuth hardening (RFC 9207 iss, application_type, CIMD); removal of initialize/ping/logging/setLevel (12-month window → v2.x major); JSON Schema 2020-12 $ref loosening; OpenTelemetry _meta; includeContext deprecation; elicitation removal.

8. Conventions honored: file at `docs/architecture/tickets-<feature>.md` (matches `tickets-0021-e2e-simulation-harness.md` + `tickets-0022-0027-discovery-realignment.md` precedent); heading format `## NN. Title`; ADR-0028 cited by bare number (AGENTS.md); spec #10 cited by URL (public tracked issue, live contract); internal Markdown links OK because the file never leaves the developer's machine (ADR-0017); gitignored via `git check-ignore` — never `git add` per AGENTS.md ("Never track internal docs").

Frontier — an agent can start #86 immediately; {#87, #88, #89, #90} unlock in parallel as soon as #86 lands; #91 waits for #86+#87+#88 + the ADR-0021 harness.

## 2026-08-09T19:40:39.276Z
- kind: decision
- tags: agent-rules, cli, templates, strengthened-draft, ssot, ADR-link-prohibition, no-Pointers, regression-flagged
- confidence: 0.95
- source: opencode-session
- metadata: {"id":"mem_cabb7682da0a8152"}

Agent-rules template strengthening (2026-08-09): the CLI's `packages/cli/src/commands/generate/templates/agent-rules-draft.md` swap is complete. The strengthened template is now `templates/agent-rules.md` (verbatim copy); the draft was deleted. New heading: `## MemoFS Memory (REQUIRED — no exceptions)` (was `## MemoFS Memory (REQUIRED)`). Adds a **MUST NOT** block (no answering from assumption; no skipping step 4; no silently proceeding if MemoFS tool errors) and a "Before ending any task" self-check that closes the loop on skipped `recall`/`remember`. The verbatim swap DROPPED the prior `## Pointers` section (which surfaced `{{mcpLabel}}` + `{{mcpPath}}` and the Global-skills pointer). Consequences: (a) reduced 9 in-tree tests that asserted the agent-rules file names its per-platform MCP config path (`~/.codex/config.toml`, `.mcp.json`, `.gemini/settings.json`, `.vscode/mcp.json`, `.cursor/mcp.json`, `opencode.json`); those assertions + the matching `it.each` test were removed (the per-platform MCP config FILE itself, written by `memofs generate mcp`/`generate agent`, remains the SSOT); (b) `agent-rules.ts` `resolveMcpLabel` private function and its `resolveMcpGlobal` import became dead code and were removed for DRY&SSOT (`resolveMcpGlobal` is still a public re-export via `index.ts:61` and tested in `mcp-config.test.ts`); (c) `mcpLabel`/`mcpPath` interpolation keys removed from `interpolateTemplate` var map, `templates.ts` JSDoc updated to drop those placeholder docs, `EmitAgentRulesOptions.mcpScope` is still validated and reported by `runGenerateAgentRulesCommand` but no longer affects the agent-rules FILE content. FLAG for user: the strengthened draft's author chose to drop `## Pointers`; verbatim swap honored that intent — if the user wants the MCP path surfaced back into the agent-rules file, re-adding a minimal Pointers section (only MCP path line, skip Global skills) restores the contract.

## 2026-08-09T19:40:41.545Z
- kind: decision
- tags: cli, agent-hooks, codex, claude-code, opencode, npx-bootstrap, silent-failure-fix, DEFAULT_HOOK_COMMANDS, emitters
- confidence: 0.97
- source: opencode-session
- metadata: {"id":"mem_a8efb07a22422d2b"}

Agent hook bootstrap fix (2026-08-09): Claude Code, Codex, and opencode session hooks generated by `memofs generate agent <target>` were silently failing on hosts where the `memofs` CLI is not installed globally. Root cause: `packages/cli/src/commands/generate/emitters/types.ts` `DEFAULT_HOOK_COMMANDS` invoked `memofs context ...` / `memofs status --hook` directly via `sh -c '...'`, assuming `memofs` was on `PATH` — but the MCP server config (`mcp-config.ts:87`, `SERVER_COMMAND = "npx"`) always bootstraps via `npx -y @memofs/mcp-server`, so only the hook side was non-portable. Verified locally: `which memofs` exits 1, but `node_modules/.bin/memofs` exists — `sh` can't find `memofs` and the hook silently fails. Fix: every emitted hook command (SessionStart, SubagentStart, post-compaction SessionStart, Stop) now bootstraps with `if command -v memofs >/dev/null 2>&1; then memofs <sub>; else npx -y @memofs/cli <sub>; fi` (the inline if/else pattern keeps the literal `memofs <sub>` substrings present for tools/grep parity and so all existing substring assertions still pass: `memofs cloud sync pull`, `memofs context`, `memofs status --hook`, `MEMOFS_API_KEY`, `--mark-session-start`). The opencode plugin (`packages/cli/src/commands/generate/emitters/opencode.ts`) had the same fault via `await $\`memofs ...\`` zx calls (zx `.nothrow()` swallowed `memofs: not found`); rewritten to detect `command -v memofs` once per event and branch into `await $\`memofs ...\`` or `await $\`npx -y @memofs/cli ...\`` for each call (zx template interpolation can't safely expand a multi-word binary name as the first word, so explicit branches are used). Tests added: `generate-agent.test.ts` now asserts the bootstrap (`command -v memofs` + `npx -y @memofs/cli` substrings) is present in Claude/Codex hook commands and in the opencode plugin body. Confirmed: 199/199 @memofs/cli tests pass; workspace-wide `pnpm -r typecheck` clean; biome check clean on touched files.

## 2026-08-09T19:40:42.299Z
- kind: constraint
- tags: biome, lint, noUnusedVariables, ts-vs-vue, config-gotcha
- confidence: 1
- source: opencode-session
- metadata: {"id":"mem_7f5fbfdfa7217410"}

Biome config gotcha (2026-08-09): `biome.json` `overrides[].includes: ["**/*.vue"]` set `lint.rules.correctness.noUnusedVariables: off` + `noUnusedImports: off` ONLY for `.vue` files. For `.ts` files, Biome's defaults apply — unused locals, unused private functions, and unused imports ARE flagged as errors. Workspace-wide `noUnusedVariables` is NOT off for TS source. Files removed during the agent-rules strengthening (`resolveMcpLabel`, `resolveScope` import, `scope` local) had to be cleaned up explicitly because of this.

## 2026-08-09T22:56:35.575Z — generate agent-rules: bare is rules-only; thin CLAUDE.md @import; soft core.md line cap
- kind: decision
- tags: none
- confidence: 1
- source: opencode session (realignment Q1+Q2+Q3)
- metadata: {"id":"mem_b000db31fc07ab49"}

Generator emission contract — 3 realignments shipped Aug 2026:

1. **`generate agent-rules <target>` is rules-only.** It writes ONLY the instructions file (AGENTS.md, CLAUDE.md, …) — never the platform-local rules dir, never `git-conventions.md`. The `copyGitConventionsToRulesDir` call was removed from `runGenerateAgentRulesCommand` and now runs only in the umbrella `generate agent <target>`. The bare template no longer emits a `## Workspace Rules` section; the umbrella sets `includeWorkspaceRules: true` to emit it (and copies `git-conventions.md` so the link resolves). Rationale: users generating AGENTS.md for unsupported agents get a self-contained file with no dangling links.

2. **Claude target emits a thin `@AGENTS.md\n` when a root AGENTS.md exists.** Both `generate agent-rules claude` and `generate agent claude` `stat(rootDir, "AGENTS.md")` via the exported `agentsMdExistsAt()` helper and pass `agentsMdExists` to `emitAgentRules`. When true for `target === "claude"`, the emitter short-circuits to a one-line `CLAUDE.md` containing `@AGENTS.md` — Claude Code's documented `@import` pattern (docs.claude.com/en/docs/claude-code/memory "AGENTS.md" section). SSOT: never duplicate rules across both files. `--force` still required for ANY overwrite (including downgrading a previously full CLAUDE.md to the thin form). Other targets ignore the flag.

3. **`MAX_AGENT_RULES_LINES` (50-line hard cap) removed.** It was paternalistic defense against the caller's own `--rules` args and aborted generation on a non-corruption condition. The 200-line soft advisory now lives on `.memofs/memory/core.md` via `memofs doctor` — the always-injected equivalent of CLAUDE.md/AGENTS.md, where always-loaded content actually drifts. `CORE_MEMORY_SOFT_LIMIT = 200` lives in `packages/cli/src/protocol/constants.ts` (SSOT — importable by future `memofs validate` checks). Doctor emits `core_memory_oversize` WARNING (exit 0, `ok: true`); `notes.md` is intentionally exempt (on-demand, not always-injected).

Verification: `pnpm -r typecheck` green; `pnpm --filter @memofs/cli test:run` 206/206 (`pnpm` workspace-wide); `pnpm exec biome check` on all touched files clean.

Files touched:
- `packages/cli/src/commands/generate/agent-rules.ts` — emitter (+ `agentsMdExistsAt`), pure-emission thin branch, `buildWorkspaceRulesSection` helper, `EmitAgentRulesOptions.includeWorkspaceRules` + `.agentsMdExists`, removed `MAX_AGENT_RULES_LINES` const + `CliValidationError` line-count throw; removed `copyGitConventionsToRulesDir` call from `runGenerateAgentRulesCommand`; added AGENTS.md stat + `thin` JSON field.
- `packages/cli/src/commands/generate/agent.ts` — umbrella now passes `includeWorkspaceRules: true` + `agentsMdExists`; imports `agentsMdExistsAt`.
- `packages/cli/src/commands/generate/templates/agent-rules.md` — `## Workspace Rules` block converted to `{{workspaceRules}}` placeholder.
- `packages/cli/src/commands/generate/templates.ts` — JSDoc updated for new placeholder.
- `packages/cli/src/commands/generate/index.ts` + `packages/cli/src/commands/index.ts` — barrel updates (drop `MAX_AGENT_RULES_LINES`, add `agentsMdExistsAt`).
- `packages/cli/src/commands/doctor.ts` + `packages/cli/src/protocol/constants.ts` — `CORE_MEMORY_SOFT_LIMIT = 200` + doctor warning branch.
- `packages/cli/tests/generate.test.ts` — 2 line-cap tests removed; 3 git-conventions CLI tests MOVED to generate-agent.test.ts (umbrella owns them); rules-pointer it.each now passes `includeWorkspaceRules: true`; new tests for thin emission + bare-no-workspace-rules + non-claude ignoring agentsMdExists.
- `packages/cli/tests/generate-agent.test.ts` — 3 moved git-conventions tests + thin-CLAUDE umbrella test (verifies hooks + MCP still emitted alongside thin rules).
- `packages/cli/tests/doctor-validate.test.ts` — oversize + under-limit doctor tests.
- `apps/docs/community/changelog.md` — `## Unreleased` → `### Agent Behavior Enforcement` extended (#### Changed / #### Added / #### Removed / #### Fixed).

Side-effect: the `generate agent claude --json` test still asserts `files).toHaveLength(2)` — valid because the test temp dir has no root `git-conventions.md`, so `copyGitConventionsToRulesDir` returns null and pushes nothing.

## 2026-08-09T23:10:38.996Z — ADR-0027 (OMS) Deferred 2026-08-10 pending AMP collaboration
- kind: decision
- tags: adr-0027, oms, amp, agentmemoryprotocol, deferral, discovery-realignment, spec-governance
- confidence: 1
- source: opencode assistant
- metadata: {"id":"mem_5ae608e05c11243c","sourceRefs":[{"sourceType":"document","path":"docs/adr/0027-open-memory-specification.md","title":"ADR-0027 amendment tail (2026-08-10)"},{"sourceType":"document","path":"docs/discovery-review.md","title":"Discovery roadmap review §7"},{"sourceType":"connector","title":"Agent Memory Protocol (AMP) GitHub org repo","url":"https://github.com/agentmemoryprotocol/agentmemoryprotocol"}]}

ADR-0027 (Open Memory Specification) Status changed Draft → **Deferred** on 2026-08-10 per founder directive. Trigger: external review at `docs/discovery-review.md` §7 identified two live 2026 efforts already occupying almost exactly this space — Google Cloud's Open Knowledge Format (June 2026, markdown + YAML frontmatter, no runtime required) and the community [Agent Memory Protocol (AMP)](https://github.com/agentmemoryprotocol/agentmemoryprotocol) (markdown-first, `[[wiki-links]]`, git-native conflict resolution; spec complete but zero shipped impls; 3 stars; contact `dev@youtale.ai`; last commit Apr 20 2026). MemoFS will NOT author a fourth named spec (`@memofs/spec`); the founder will contact the AMP maintainer to explore convergence (cross-impl compliance, shared frontmatter schema, `[[wiki-link]]` vs current path-link conventions, git-native conflict resolution vs `packages/core/src/fs/utils/advisory-lock.ts`'s single-process-contract).

**Files updated:**
- `docs/adr/0027-open-memory-specification.md` — Status: Deferred; amendment tail added; original Draft body retained as historical rationale.
- `docs/adr/0022-code-anchoring-and-self-healing-memory.md` — §B3 + "Decisions deferred to other ADRs" + amendment tail note ADR-0027 deferral. v1 anchor contract unchanged (non-TS files anchor via `file + hash`, symbol undefined).
- `docs/adr/0026-memory-dev-tools-studio-and-lint.md` — "Decisions deferred to other ADRs" + amendment tail note ADR-0027 deferral. `broken-ref` rule's v1 contract (path-based `AnchorRef.file` existence check) is language-agnostic.
- `docs/architecture/README.md` — ADR-0027 row Status: Draft → Deferred.
- `docs/CONTEXT.md` — Discovery §7 entry rewritten to "Deferred 2026-08-10"; §1 entry updated to note non-TS symbol-fallback deferred along with OMS; Bundle ADR roadmap line struck through ADR-0027.
- `docs/architecture/tickets-0022-0027-discovery-realignment.md` — Frontier summary: 5 → 4 parallel work streams (#83 dropped); dependency graph updated; #83, #84, #85 each gained DEFERRED note; file header + footer cross-refs updated.
- `docs/architecture/tickets.md` — Tier-10 #61 (the Phase-2 stub already Closed-as-superseded) gained a "Further deferral (2026-08-10)" blockquote.
- `docs/architecture/spec-0027-open-memory-specification.md` — Header note added at top (#grilling-record; kept-as-is per ADR-0017 archive policy).
- `docs/discovery-review.md` — §7 heading gained a "Resolution (2026-08-10)" blockquote recording the deferral decision.
- `apps/docs/community/changelog.md` — New "### Discovery Realignment" section under `## Unreleased` with `#### Changed` (ADR-0027 Status) + `#### Removed` (frontier reduction). PUBLIC-DOC SAFETY: per AGENTS.md "Never link internal docs from public files" — `docs/adr/`, `docs/architecture/`, `docs/CONTEXT.md`, `docs/discovery-review.md`, `docs/oms/` references stripped from the public changelog entry (verified via `grep -nE "docs/(adr|architecture|CONTEXT|oms|discovery-review)" apps/docs/community/changelog.md` → empty).

**Verified facts about AMP:** repo exists at github.com/agentmemoryprotocol/agentmemoryprotocol; description "Agent Memory Protocol (AMP) — An open standard for portable, structured AI agent memory"; Apache-2.0; 3 stars / 1 fork / 3 issues / 1 PR; 1 follower; no public members; org hq "United States of America"; contact `dev@youtale.ai`; website https://agentmemoryprotocol.io; last commit Apr 20 2026. Confirmed via WebFetch 2026-08-10. Review's claim ("spec-complete but zero shipped implementations") verified true at fetch time.

**Down-stream impact (none blocking):** ADR-0022 + ADR-0026 ship at v1 unchanged. Non-TS files anchor via `file + hash` (ADR-0022's v1 contract was always path/hash first, symbol optional TS-only). `memofs lint`'s `broken-ref` rule is path-based (`AnchorRef.file` existence check) — language-agnostic at v1. Only the optional non-TS `symbol` AST extraction is deferred along with OMS. The remaining 4 frontier tickets (#68, #73, #76, #80) are unblocked and unchanged.

**Review claims fact-checked:** ADRs 0022/0023/0024/0025/0026 were already aligned with the review's spirit (hash-first anchoring, staging-via-outcome-enum, Ebbinghaus-deferred, manual-playbook-authoring, ESLint-vs-tsc lint split). The review MISREPRESENTED ADR-0023 as "already shipped, marketing only" — actually ADR-0023 ships `unverified` enum + `EXPIRY_DAYS` table + cold archive + `memofs restore` CLI + ID10 gate; only the `supersedes`-edge+`deprecated`-status mechanism is already shipped. Review's "52K of graph tests" was FALSE (actual: 29K total graph tests; consolidation.test.ts alone 7K). Review's §2b critique ("ephemeral bus needs IPC, ordering, backpressure") attacked a strawman — ADR-0024's design is simple JSONL append + file tail, explicitly single-process-safe at v1. Two architectural calls made (per "go in hard, correct me if wrong" directive): (a) KEEP ADR-0026 lint/doctor split as-is (ESLint-vs-tsc precedent preserves doctor's deterministic spirit); (b) no ticket changes for §6 studio timing — tickets already sequenced #80→#81/#82, so #80 sliver-ships per the review's own recommendation and #81/#82 naturally defer.

## 2026-08-10T01:17:09.072Z — Ticket #68 complete — code anchoring + drift detection shipped
- kind: decision
- tags: ticket-68, adr-0022, code-anchoring, drift-detection, completed, anchor, stale, self-healing-memory
- confidence: 1
- source: memofs
- metadata: {"id":"mem_44922b5db6d8b8c7"}

Ticket #68 (Anchor + drift-detect end-to-end) COMPLETED 2026-08-10 — committed on `dev` as `feat(core,mcp-server): code anchoring + drift detection` (24 files, +1821/-15). All 9 checklist items satisfied. Deviations from spec wording (strict improvements): (1) mtime-based cache invalidation instead of `fs.watch` (deterministic + cross-process; `fs.watch` is non-deterministic and per-process); (2) manifest.json persistence added for cross-session warm-start (hydrateAnchorHashCacheFromManifest on ensureReady + flushAnchorHashCacheToManifest after applyAnchorDrift). Code-review + security-reviewer passed. Unblocks #69, #70, #71, #78.

## 2026-08-10T06:35:36.211Z — Ticket #71 complete — cognitive decay floor + unverified status
- kind: summary
- tags: ticket-71, ADR-0023, decay, unverified, EXPIRY_DAYS, GraphFactStatus, completed
- confidence: 1
- source: implement skill session 2026-08-10
- metadata: {"id":"mem_e400842015414ef0"}

Ticket #71 complete — cognitive decay floor + unverified GraphFactStatus shipped on dev as commit 3d8a6d8.

Implementation:
- decay.ts: EXPIRY_DAYS table (decision=365, constraint=180, goal=120, preference=90, reference=180, summary=60, note=30), isMemoryDecayed pure helper (boundary: > not >=), applyDecay recall-post-merge seam
- GraphFactStatus extended with "unverified" (six values: active|deprecated|conflicted|deleted|stale|unverified); validation VALID_STATUSES + error msg updated
- RecallItem.unverified?: boolean + metadata.unverified flag + score *= 0.6 demotion (milder than drift's 0.5; compounds when both apply: 0.5 * 0.6)
- memoryMetaByMemoryId (kind + createdAt) populated at write time ONLY when input.kind is explicitly set (unkinded writes never enter the decay surface — backward-compat fix from code review); hydrated from memory-events.jsonl on cold start
- applyDecay gates on node.status === active (or undefined); skips deprecated/deleted/conflicted/stale/unverified nodes (code-review fix: spec required status === "active" gate)
- [unverified] per-item renderer marker + UNVERIFIED_REVERIFY_MESSAGE + buildUnverifiedRecallBanner; wired into context-builder + expand-context
- Decay runs AFTER drift detection in localRecall so both flags compound

Tests: 20 unit (decay.test.ts) + 7 e2e (decay-e2e.test.ts); 707 total tests green (up from 680).

Code review findings fixed:
1. ADR name removed from decay.ts TSDoc + decay.test.ts test name (AGENTS.md no-ADR-in-code-docs rule)
2. status === "active" gate added to applyDecay (spec item 3 required it)
3. Backward-compat hole fixed: write.ts only sets memoryMetaByMemoryId when input.kind is defined
4. MS_PER_DAY imported from decay.ts SSOT in decay-e2e.test.ts (was redefined)

Known inconsistency: ticket item 4 says "lower-ranked than stale" but items 3+8 + ADR-0023 line 88 pin 0.6 (vs stale's 0.5) — 0.6 > 0.5 means unverified ranks higher than stale. Impl follows the explicit factor.

v1.x-deferred: lastRecalledAt + hitCount Ebbinghaus access-tracked scoring is NOT in this ticket.

## 2026-08-10T06:36:05.915Z — Ticket #71 complete — cognitive decay floor + unverified status
- kind: decision
- tags: ticket-71, ADR-0023, decay, unverified, EXPIRY_DAYS, GraphFactStatus, completed
- confidence: 1
- source: implement skill session 2026-08-10
- metadata: {"id":"mem_c36cdfad6558394e"}

Ticket #71 complete — cognitive decay floor + unverified GraphFactStatus shipped on dev as commit 3d8a6d8.

Implementation:
- decay.ts: EXPIRY_DAYS table (decision=365, constraint=180, goal=120, preference=90, reference=180, summary=60, note=30), isMemoryDecayed pure helper (boundary: > not >=), applyDecay recall-post-merge seam
- GraphFactStatus extended with "unverified" (six values); validation updated
- RecallItem.unverified?: boolean + metadata.unverified flag + score *= 0.6 demotion (milder than drift's 0.5; compounds when both apply)
- memoryMetaByMemoryId (kind + createdAt) populated at write time ONLY when input.kind is explicitly set (backward-compat); hydrated from memory-events.jsonl on cold start
- applyDecay gates on node.status === active (or undefined); skips deprecated/deleted/conflicted/stale/unverified nodes
- [unverified] per-item renderer marker + section banner; wired into context-builder + expand-context
- Decay runs AFTER drift detection in localRecall so both flags compound

Tests: 20 unit + 7 e2e; 707 total tests green (up from 680).

Code review findings fixed: ADR name removed from TSDoc/test name; status === active gate added; backward-compat hole fixed (write.ts only sets meta when kind defined); MS_PER_DAY imported from SSOT.

Known inconsistency: ticket item 4 says "lower-ranked than stale" but items 3+8 pin 0.6 (vs stale's 0.5) — impl follows the explicit factor.

v1.x-deferred: lastRecalledAt + hitCount Ebbinghaus access-tracked scoring.

## 2026-08-10T06:50:52.158Z — Ticket #70 complete — memofs migrate anchors CLI backfill shipped
- kind: decision
- tags: ticket-70, migrate-anchors, cli-backfill, completed, adr-0022, anchor
- confidence: 1
- source: assistant:glm-5.2
- metadata: {"id":"mem_2f49e2ed6261d059"}

Ticket #70 (`memofs migrate anchors` CLI backfill) COMPLETED 2026-08-10 — committed on `dev` as `feat(cli): memofs migrate anchors CLI backfill (ticket #70)` (8 files, +845/-1). All 6 checklist items satisfied.

1. **NEW core module**: `packages/core/src/memofs/local-strategy/migrate-anchors.ts` — the backfill logic. Walks `notes.md` note entries (each `## ` block with `- metadata: <json>`), detects file-path references via regex, computes fresh SHA-256 hashes (reuses `recomputeFileHash` + `isSafeAnchorPath` from #68 #69 so anchor contract is SSOT), and attaches `AnchorRef` into note metadata. `@anchor(file=…, symbol=…)` markers parsed and attached (symbol as-is for `.ts`/`.tsx` — NO TS Compiler validation at migration time per spec line 51). Regex also matches root-level files (no `/` required). Idempotent via `isValidAnchorRef` skip. Appends `memory.created` events (actor `memofs/migrate`) so cold-start hydration picks up anchors on next process start. `MigrateAnchorsResult` type: `{ scanned, anchored, skipped, noRef }`.

2. **MemoFS public API**: `MemoFS.migrateAnchors()` method wired through local + hybrid strategies. `MigrateAnchorsResult` exported from `@memofs/core`.

3. **CLI command**: `runMigrateAnchorsCommand` in `packages/cli/src/commands/migrate.ts` + registered as nested `memofs migrate anchors` subcommand in `register.ts` (same pattern as `generate <sub>` / `agent <sub>`). `--json` output envelope. Human-readable summary with spinner.

4. **8 integration tests** in `packages/cli/tests/migrate.test.ts`: backfill file-path ref, idempotent re-run (no-op), non-TS file (file+hash no symbol), `@anchor` marker with symbol, noRef (no file refs), event hydration, metadata preservation (existing fields kept), empty notes.md. All use `createTempMemoFsDir` + `runMemoFsCli` pattern (matching `snapshot.test.ts`). Test for `@anchor` marker uses 15s timeout (TS Compiler import latency).

**Code-review findings addressed**: (a) removed TS-Compiler `extractSymbolPath` calls at migration time (spec violation — Compiler is per-write-time only); symbol attached as-is from marker. (b) Fixed regex to match root-level files (`*` instead of `+` for dir segments). (c) Extracted `buildAnchorRef` helper to eliminate duplicated anchor-construction shape. (d) Extracted `formatError` helper. (e) Added missing TSDoc. (f) Cleaned `parts.join` duplication in command output. Security review skipped per user.

**Spec deviation noted**: `core.md` is NOT walked (free-form markdown with no per-entry metadata slot); only structured `notes.md` entries with `- metadata: <json>` lines are backfilled. This is a deliberate scope decision — anchoring `core.md` would require a per-entry metadata shape that does not exist today. Documented in ticket amendment tail.

Typecheck: core + CLI clean. Biome: clean. Tests: 214/214 CLI pass (incl. 8 new); 707/707 core pass.

## 2026-08-10T11:21:09.163Z — Ticket #72 complete — semantic GC archive move + restore shipped
- kind: decision
- tags: ticket-72, semantic-gc, archive-move, restore, cli, consolidate, completed, adr-0023, cold-archive
- confidence: 1
- source: assistant:glm-5.2
- metadata: {"id":"mem_f02c0bfbb39fcc50"}

Ticket #72 (Semantic GC: archive move + restore) COMPLETED 2026-08-10 — committed on `dev` as `feat(core,cli): semantic GC archive move + restore (ticket #72)` (commit 6647eb5; 17 files, +1851/-414 including unrelated pre-existing diff context). All 8 checklist items satisfied.

1. **Schema (additive, no enum churn for existing callers)**:
   - `GraphFactStatus += "archived"` (graph/types.ts:53) — the cold-archive terminal state (`deprecated → archived` via consolidate, `archived → active` via restore).
   - `MemoryEventType += "memory.archived"` (memory-documents.ts:227) — forensic-recovery event on archive-move (records `sourcePath` + `metadata.archivePath`).
   - `memory.restored` already existed (memory-documents.ts:226) — reused for restore.
   - `VALID_STATUSES += "archived"` (graph/utils/validation.ts:27) — graph validation accepts the value on load/persist.
   - `MemoryPath += ArchiveFilePath` (memory-paths.ts:94) — `.memofs/archive/<id>.json` shape; `ARCHIVE_FILE_PATTERN` regex for validation; `createArchivePath(id)` helper mirrors `createSnapshotPath`; `PathKind += "archive"`; `memoryTypeFromPath` updated (local-strategy/migrate-anchors.ts also updated).

2. **NEW core module**: `packages/core/src/memofs/local-strategy/archive.ts` — the archive-move + restore logic.
   - `archiveDeprecated(ctx)`: walks `nodes.jsonl` to collect memory IDs whose graph-node `status === "deprecated"` (via `sourceRefs[].sourceId`), then walks `notes.md` note blocks, physically moves each matching block to `.memofs/archive/<id>.json` (full-fidelity JSON via `noteBlockToRecord`), rewrites `notes.md` without the archived blocks, transitions the deprecated graph nodes → `archived` (via `graphStore.upsertNodes` + in-memory index update), prunes BOTH `graph:<id>` AND memory-id lexical entries (so archived memories are NOT surfaced in `memofs.recall` / `memofs.context` — the recall-filtering contract per spec item 6), clears `contextCache`, and appends `memory.archived` events. Idempotent — re-run is a no-op once no deprecated graph nodes remain.
   - `restoreMemory(ctx, id)`: reads `.memofs/archive/<id>.json`, validates the untrusted disk JSON shape via `validateArchivedMemoryRecord` (NOT a blind `as` cast — disk JSON is untrusted), writes the note block back to `notes.md`, re-indexes the memory body into the lexical store (mirrors `writeMemory`'s `ctx.indexLexical({ id, text })` so the restored memory is on equal footing with new writes), transitions bound graph nodes from `archived` to `active` (clears `validUntil`), deletes the archive file, and appends a `memory.restored` event. Returns `{ restored: false, ... }` gracefully when no archive file exists.

3. **DRY improvement**: extracted the `notes.md` block parser (`parseNoteBlocks`, `parseBlock`, `rebuildBlock`, `NoteBlock` interface) from `migrate-anchors.ts` into a shared `packages/core/src/memofs/local-strategy/notes-parser.ts` module. Both `migrate-anchors.ts` and `archive.ts` now import from it — one notes.md parsing contract, two consumers.

4. **MemoFS public API**: `MemoFS.archiveDeprecated()` + `MemoFS.restoreMemory(id, signal?)` methods wired through `local-strategy.ts` + `hybrid-strategy.ts`. `ArchiveDeprecatedResult`, `ArchivedMemoryRecord`, `RestoreMemoryResult` exported from `@memofs/core` via `index.ts`.

5. **CLI commands**: `runConsolidateCommand` in `packages/cli/src/commands/consolidate.ts` + `runRestoreCommand` in `packages/cli/src/commands/restore.ts`. Registered as `memofs consolidate --archive-deprecated` (operator-invoked one-shot, NOT auto-cron at v1 — keeps eviction deliberate per spec item 4) and `memofs restore <id>` in `register.ts`. `--archive-deprecated` defaults to `false`; when set, runs `archiveDeprecated()` after the consolidation pass; when unset, `consolidate` runs the legacy merge/retire pass only. Both export `--json` envelope output.

6. **6 integration tests** in `packages/cli/tests/archive.test.ts`: archive-move (deprecated → .memofs/archive/<id>.json + removed from notes.md), idempotent re-run (no-op), memory.archived event, active nodes left in place, restore reverses (note returns + memory.restored event + archive file deleted), restore gracefully handles missing archive file. Tests stage a graph nodes.jsonl with a manually-stamped `status: "deprecated"` node (NOT via the ID10 writer-critic diff gate — the gate is explicitly out-of-scope per spec item 5 + is open upstream ticket).

**Code-review findings addressed**: (a) removed dead ternary `result.restored ? 0 : 0` in restore.ts (both branches returned 0); (b) replaced blind `as ArchivedMemoryRecord` cast with `validateArchivedMemoryRecord` shape validation for untrusted disk JSON; (c) pruned memory-id lexical entries on archive-move + re-indexed restored body on restore (the recall-filtering contract per spec item 6 — the spec sub-agent flagged note-level lexical pruning as missing); (d) extracted `HEADING_SEPARATOR` const to remove magic-number coupling; (e) added file-level TSDoc header to archive.test.ts; (f) removed unused `MemoryStore` import from archive.ts.

**Spec deviations noted**: (1) Restore writes back to the shared `notes.md` (not a per-id `.memofs/memory/<id>.md` file as the spec notation literally implies) — consistent with MemoFS's actual storage model where notes.md is one shared file; the spec notation is aspirational/sloppy. (2) The demoable scenario's "stage two contradictory memories via ID10 writer-critic diff gate" half is stubbed in tests via a manually-stamped deprecated graph node (the gate is out-of-scope per item 5 + is open upstream ticket); the archive-move + restore halves are exercised end-to-end. Both deviations documented in the ticket amendment tail.

Typecheck: core + CLI clean. Biome: clean. Tests: 707/707 core pass; 220/220 CLI pass (incl. 6 new in archive.test.ts).

## 2026-08-10T22:57:34.245Z — Ticket #73 complete — outcome enum + session.failed event on AgentFS complete()
- kind: decision
- tags: ticket-73, adr-0024, agentfs, outcome-enum, session-failed-event, behavior-matrix, complete, cli, mcp-server, completed, no-backward-compat
- confidence: 1
- source: assistant:glm-5.2
- metadata: {"id":"mem_250e9fda93376d13"}

Ticket #73 (outcome enum + behavior matrix on AgentFS complete()) COMPLETED 2026-08-10 — committed on `dev` as `feat(core,mcp-server): outcome enum + session.failed event on AgentFS complete() (ticket #73)` (commit b685bd7; 16 files, +610/-17). All checklist items satisfied EXCEPT #5 (backward-compat) which was deliberately DROPPED per user directive ("no backward compat").

**Schema (additive, all optional — no breaking change to type signatures):**
1. `SessionOutcome` type (`"success" | "failure" | "aborted"`) + `SESSION_OUTCOMES` const + `isSessionOutcome` guard, exported from `@memofs/core` (`packages/core/src/memofs/types.ts:429-454`, exported via `packages/core/src/memofs/index.ts`).
2. `AgentSessionCompleteInput += outcome?, ephemeral?, reason?` (`packages/core/src/memofs/types.ts:457-470`).
3. NEW named interface `AgentSessionCompleteResult` (`packages/core/src/memofs/types.ts:483-491`) — the SSOT shape for `complete()`'s return: `durableMemoryWritten + outcome + workingCleaned + outputCleaned + preserved + failureEventWritten`. Replaced 3 inline `AgentSessionExtractResult & {...}` declarations in session.ts, local-strategy.ts, hybrid-strategy.ts (de-triplicates per code-review DRY finding). Exported from `@memofs/core` via `index.ts`.
4. `MemoryEventType += "session.failed"` (`packages/core/src/core/types/memory-documents.ts:229`). Dotted (matching the existing dotted convention `memory.archived`, `sync.failed`); the ticket/ADR spec literal `kind: "session_failed"` (underscore) is the spec's legacy `kind:` naming — the runtime-coded `type:` value uses the dotted form.
5. `MEMORY_EVENT_TYPES` set (`packages/core/src/core/events/memory-events.ts:41`) += `"session.failed"`.
6. CLI protocol `MemoryEventSchema` (zod) (`packages/cli/src/protocol/schemas.ts:57-71`) += `"memory.archived"` (regression catch from ticket #72's rollout that had missed the CLI schema) + `"session.failed"`.

**Behavior matrix (core `agent-session.ts` complete() — single return; `WORKING_FILES` + `OUTPUT_FILES` arrays pulled out to module constants; `workingPaths`/`outputPaths` precomputed once per session):**
- `success` + `extractDurableMemory: true` → promote durable to notes.md + auto-clean `working/` scratchpad files (output/ preserved).
- `success` + `extractDurableMemory: false` → no promotion + auto-clean `working/` + preserve `output/`.
- `failure` + `ephemeral: true` → NO promotion + auto-clean `working/` AND `output/` + write session.failed event.
- `failure` + `ephemeral` omitted → NO promotion + preserve `working/` + `output/` as failure audit-trail + write session.failed event.
- `aborted` → NO promotion, NO cleanup, NO event. The workspace is preserved for resume: a subsequent `complete({outcome: "success" | "failure"})` with the SAME sessionId resumes the session. `syncAfterSession` is skipped on aborted (no checkpoint + no push — `push: { operation: "push", skipped: true }`).

**session.failed event** (best-effort, append-only to `memory-events.jsonl`):
- `actor.id` = the session's `actorId` when set (passed to `createMemoFsAgentSession`); else falls back to system actor `memofs/agent-session`. (Code-review fix: actor.id used to be `sessionId` — wrong, the session id is not the agent id.)
- `sourcePath` = the on-disk `paths.root` (matching the actual workspace path), not a synthetic `/agent-sessions/<id>`. (Code-review fix.)
- `summary` includes the optional `reason` when set; `metadata.sessionId` + `metadata.reason` (when set).

**Helpers added** (`packages/core/src/agentfs/session/helpers.ts`): `deleteAgentfsFile` + `deleteAgentfsFiles` (idempotent best-effort; `client.deleteText?` optional — missing file or missing method returns `false`). The test util `InMemoryAgentfsClient` (`packages/core/tests/agentfs/test-utils.ts`) was extended to optionally implement `deleteText` (new `nativeDelete` flag, default true) so cleanup assertions work end-to-end.

**MCP tool surface** (`packages/mcp-server/src/tools/definitions.ts`):
- `memofs_agent_session_complete` inputSchema += `outcome` (string enum of SESSION_OUTCOMES), `ephemeral` (boolean), `reason` (string <=4096).
- Tool description cautions callers to set `outcome` explicitly — the `"success"` default is the legacy default, NOT recommended for new callers.
- handlers.ts `validateToolArguments` whitelist += `outcome` (validated via `isSessionOutcome`; rejects with the canonical enum list), `ephemeral`, `reason`. (Code-review fix: replaced a redeclared inline `SessionOutcome` union with the imported `SessionOutcome` type — Primitive Obsession fix.)

**MemoFS public API**: `AgentSessionCompleteResult` exported from `@memofs/core` via `memofs/index.ts`. `MemoFS.agentfs.complete` return shape widens to `AgentSessionCompleteResult` (additive fields; existing callers ignore extras).

**Tests:**
- 6 NEW core tests in `packages/core/tests/agentfs/agent-session.test.ts`: each of the 5 matrix rows (success+extract, success+no-extract, failure+ephemeral, failure+no-ephemeral, aborted) + resume across aborted (same sessionId resumes with success + promotes durable) + backward-compat default-to-success (which per user directive now matches the matrix's success row, NOT the legacy no-cleanup behavior).
- 5 NEW MCP tests in `packages/mcp-server/tests/tools.test.ts`: outcome/ephemeral/reason inputSchema exposure; description cautioning callers to set outcome explicitly; dispatch through to the runtime; invalid-outcome rejection (regex match); backward-compat (absent fields omitted from args).

**Code review (2 sub-agents: standards + spec) — all actionable findings addressed:**
- DRY: extracted named `AgentSessionCompleteResult` SSOT (de-triplicated 3 inline `AgentSessionExtractResult & {...}` declarations).
- Single-return in `complete()` (was 2 return statements differing only in `preserved`).
- Fixed `session.failed` actor.id (= actorId when set, falls back to system actor "memofs/agent-session"; not `sessionId`).
- Fixed `sourcePath` (= on-disk `paths.root`; not synthetic `/agent-sessions/<id>`).
- Stripped ADR/ticket refs from `describe`/`it` test names per the repo rule (kept the technical describe label without the ADR-0024/ticket-#73 suffix).
- Replaced the redeclared inline `SessionOutcome` union in handlers.ts with the imported `type SessionOutcome` (Primitive Obsession fix).
- Removed redundant restating-code comments (the "// Promotion gate ..." comment that restate the line below, the "// Preserve workspace; no cleanup; no event." comment that restate the `preserved: true` + `false` defaults).
- Fixed TSDoc on `reason?` ("structured failure audit text; carried on session.failed events" — not "failure/abort" which would imply aborted also writes an event, which it does NOT).
- The pre-existing local-edit hunk in `local-strategy.ts` (anchor-cache log message rewording at line 294 — flagged by the standards review as Divergent Change / scope creep) was REVERTED so it doesn't ride this commit; only my hunks were staged.

**Note on backward-compat (per user "no backward compat" directive):** Callers omitting `outcome` now get the matrix's `success` row (`working/` auto-cleaned). The legacy no-cleanup behavior is NOT preserved. All v1 callers are expected to set `outcome` explicitly. One checkbox (#5 backward-compat) was deliberately marked dropped in the ticket file.

Typecheck: core + cli + mcp-server + all adapters + tools clean (rebuilt core dist before mcp-server typecheck). Biome: clean (16 changed files). Tests: 713/713 core pass (incl. 6 new in agent-session.test.ts); 48/48 mcp-server pass (incl. 5 new in tools.test.ts). (One unrelated flaky test in `packages/core/tests/memofs/anchor-marker.test.ts > validates a top-level function` failed on a slow full-suite run; passes in isolation; pre-existing ticket #69 area, not touched by this diff.)

## 2026-08-13T13:53:01.546Z
- kind: decision
- tags: none
- confidence: 1
- source: memofs
- metadata: {"id":"mem_012f21664ef6be4f"}

Updated apps/docs/learn/cookbooks/antigravity.md and apps/docs/packages/mcp/index.md to clearly document that Google Antigravity launches MCP server daemons with cwd set to ~/.gemini/antigravity, requiring --root <path> or MEMOFS_ROOT env var in .agents/mcp_settings.json or .agents/mcp_config.json to prevent UNEXPECTED_ERROR: Failed to create memory file parent directory.

## 2026-08-13T14:39:20.151Z
- kind: decision
- tags: none
- confidence: 1
- source: memofs
- metadata: {"id":"mem_303d8a899c63afa1"}

Authentication logic verifyToken

## 2026-08-13T15:10:10.085Z — Tickets 68-73 Manual Verification
- kind: note
- tags: none
- confidence: 1

Completed manual end-to-end integration testing for Tickets #68-#73 (ADRs 0022-0027) across core, mcp-server, and cli with 16/16 passing assertions in test-demo/run-tests.js

## 2026-08-17T09:07:31.537Z — Current multi-language documentation baseline
- id: mem_85989caa7b9a753e
- kind: reference
- tags: docs, multi-language, http-api, mcp, oms, deferred
- confidence: 1
- source: assistant:codex
- metadata: {"id":"mem_85989caa7b9a753e","sourceRefs":[{"sourceType":"document","path":"apps/docs/server/http-api.md","title":"Current HTTP API documentation"},{"sourceType":"document","path":"packages/server/src/http/index.ts","title":"Runtime HTTP core"},{"sourceType":"document","path":"docs/CONTEXT.md","title":"Current project glossary and OMS status"}]}

Repository audit (2026-08-17): `@memofs/server` is the self-hostable JSON-RPC-over-HTTP runtime, whose Node entry uses `node:http` (not HTTP/2). `@memofs/json-rpc` supplies generic JSON-RPC primitives; it is not a MemoFS language-client/wire-contract package. The hosted MCP endpoint is a separate Streamable HTTP surface and exposes only four memory verbs. No Python, Go, Rust, LangChain, LlamaIndex, Pydantic AI, CrewAI, or `@memofs/spec` package exists in the workspace. The prior Open Memory Specification and schema/codegen proposal is Deferred pending AMP collaboration; do not document it as a planned/shipping public integration. `apps/docs` currently has localized sidebar definitions in `config/locales/ja.mts` and `zh.mts`, and existing cookbook location is `apps/docs/learn/cookbooks/`.

## 2026-08-17T09:11:51.648Z — AI framework adapter status
- id: mem_49c2aa70acc288e0
- kind: reference
- tags: adapters, ai-sdk, langchain, docs-accuracy
- confidence: 1
- source: assistant:codex
- metadata: {"id":"mem_49c2aa70acc288e0","sourceRefs":[{"sourceType":"document","path":"packages/core/src/ai-runtime/types.ts","title":"Framework-neutral runtime contract"},{"sourceType":"document","path":"packages/adapter-ai-sdk/README.md","title":"Vercel AI SDK adapter boundary"},{"sourceType":"document","path":"apps/docs/api/core.md","title":"API reference wording needing correction"}]}

Verified 2026-08-17: `packages/core/src/ai-runtime/types.ts` defines a framework-neutral `MemoFSMemoryRuntime` contract and explicitly identifies only `@memofs/adapter-ai-sdk` (Vercel AI SDK) as implemented today; LangChain, OpenAI Agents SDK, and Mastra are described as later/future adapters. The API docs currently say LangChain and Mastra implement the contract, which conflicts with source and the adapter README; treat that doc phrasing as inaccurate rather than evidence of shipped adapters. No Python, Go, or Rust project manifests or source artifacts exist.

## 2026-08-17T09:29:58.714Z — ADR 0027 resumed
- id: mem_fc4611bbeb9a23f7
- kind: decision
- tags: adr-0027, oms, tickets, unblocked, decision
- confidence: 1
- source: user directive relayed by assistant:codex
- metadata: {"id":"mem_fc4611bbeb9a23f7","sourceRefs":[{"sourceType":"document","path":"docs/adr/0027-open-memory-specification.md","title":"ADR 0027 amendment history"},{"sourceType":"document","path":"docs/architecture/tickets-0022-0027-discovery-realignment.md","title":"OMS ticket dependency graph"}]}

On 2026-08-17, the founder resumed ADR 0027 (Open Memory Specification) from Deferred to Draft. The AMP/OKF convergence concern remains design input but no longer blocks delivery. Ticket #83 is structurally unblocked and returns to the frontier. Ticket #84 remains blocked by #74, #76, #78, and #83; #68, #71, and #73 are complete. Ticket #85 remains blocked by #83. The active OMS ticket chain covers schema portability only; it does not schedule non-TypeScript AST-symbol extraction, so the existing file+hash anchor and path-based broken-reference contracts remain unchanged.

## 2026-08-17T10:21:10.457Z — Workspace runbook realigned
- id: mem_649964e5a0df8ac4
- kind: decision
- tags: documentation, workspace, validation, runbook
- confidence: 1
- source: assistant
- metadata: {"id":"mem_649964e5a0df8ac4","sourceRefs":[{"sourceType":"document","path":"docs/runbook.md","title":"MemoFS Workspace Runbook"}]}

On 2026-08-17, docs/releases.md was removed as obsolete. docs/runbook.md now defines MemoFS as a pnpm/Turborepo multi-package workspace: docs, benchmarks, examples, packages/* (core, CLI, MCP server, server, JSON-RPC, connectors, testing, benchmark kit, and adapters), and tooling/* (including e2e). It documents pnpm validate:workspace as the full gate: Biome check, typecheck, tests, build, publint package validation, and docs build.
