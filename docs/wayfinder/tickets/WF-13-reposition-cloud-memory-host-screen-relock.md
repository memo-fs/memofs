# WF-13 — Reposition cloud as "file replica + hosted memory runtime" and re-lock screens

`wayfinder:grilling` · status: open · claimed: no · blocked-by: WF-1 (hosted-memory infra contract), WF-3 (single-Worker can run the runtime)

## Question

**Re-open and re-lock the cloud screen IA under a new positioning: the cloud is
"file replica + hosted memory runtime" from v1** — not "file replica, managed
memory later." The prior lock (`docs/architecture/screens-locked.md`) positioned
the cloud as a "dumb file replica" (SC2.1 §3, literal) and gated hosted memory
to **phase 3** (SC8). This ticket collapses that sequencing. It re-opens the
locked screens with **ADR 0008 Rule 3 justification** (the repositioning itself
is the justification the lock doc requires for any IA re-open).

**Terminology (SSOT — `CONTEXT.md` canonical nouns, locked Q15):** the canonical
term is **"memory runtime"** (the function layer: recall/extraction/
consolidation; explicitly "the ambition word for positioning"). **Do not** use
"memory host" — it drifts from the locked noun. The repositioning is: the cloud
runs the memory runtime (hosted), not merely "hosts memory."

Use `/grilling` + `/domain-modeling`. Decide and re-record (new `SC-*` deltas):

1. **Positioning sentence (SC2.1 §3).** The current literal line — *"the engine
   stays local; the cloud is a dumb file replica"* — is the keystone of the old
   positioning. Rewrite it for **"your `.tekmemo/` is mirrored byte-for-byte AND
   the memory runtime can run hosted for you."** Decide the one-paragraph thesis
   and the exact phrase ("file replica + hosted memory runtime", or a sharper
   positioning line — a `copywriting` candidate, but the IA-level fact — *the
   memory runtime is a v1 capability* — is locked here).

2. **SC8 (`/dashboard/memory`) → v1.** Currently phase-3-gated and excluded from
   the v1 16-screen count. Pull it into v1. Its four sections (runtime status,
   consolidation, pre-warming, memory explorer) become v1 surfaces — the hosted
   memory runtime running in the cloud. Confirm each is backed by real data now
   that the runtime is a v1 capability (WF-1's `RemoteBlobMemoryStore` + WF-3's
   single-Worker runtime wiring make this real, not vapor — hence the blocking
   deps).

3. **Dashboard nav: 6 → 7.** "Memory" was a *conditional* nav item (SC8, shown
   only when the managed tier was active). Decide: is it now a **permanent** 7th
   item for all users (with Free-tier gated content inside), or still conditional
   but defaulting-on? Lock the nav shape.

4. **SC3.1 Overview — 5th card → v1.** The "Hosted memory" Overview card was
   phase-gated. Promote to v1 (Overview goes 4 → 5 cards). Decide its content for
   the Free vs Pro delta (Free: the Q33 1/day-capped deterministic floor; Pro:
   frontier extraction) so the card is honest at both tiers.

5. **SC9 pricing/billing rows → v1.** The two intelligence-entitlement rows
   (consolidation runs/day, session pre-warming) on `/pricing` (SC2) and the
   `/dashboard/billing` card (SC3.5, 2 → 4 dimensions) were phase-gated. Pull
   them into v1 so the pricing page advertises hosted memory as a current, not
   future, capability.

6. **SC5.2 docs home framing.** "managed tier later" → active framing. (Copy
   refinement is `copywriting`'s job in WF-8, but the IA-level fact — the hosted
   memory runtime is v1, not future — is locked here so WF-8 writes to the right
   brief.)

7. **Counts.** Re-state the v1 cloud screen total (was 16; +1 for `/dashboard/
   memory` → **17**, minus any dedup). Update the consolidated inventory table +
   the "phase-gated" annotations that no longer apply.

8. **ADR consequence.** This repositioning **supersedes the phase-3 sequencing**
   in ADR 0011 (the hosted memory runtime was phase 3) and amends ADR 0003's
   "file-replica foundation first" thesis. Flag both for WF-5 to record — the IA
   re-lock is the product decision; WF-5 writes the ADR amendment.

## Definition of done
`screens-locked.md` re-locked under the new positioning: the hosted memory
runtime is a v1 capability; `/dashboard/memory` is a v1 screen; nav + Overview +
pricing reflect it; the phase-3/phase-gated annotations on SC8/SC9/SC3.1 are
removed; the
consolidated inventory + counts are updated. The "dumb file replica" language is
gone. New `SC-*` deltas trace to this ticket.

## Context pointers
- `docs/architecture/screens-locked.md` (the doc being re-locked — esp. SC2.1 §3,
  SC3.1, SC8, SC9, the consolidated inventory table)
- `docs/adr/0003-managed-runtime-tier.md`, `0011-managed-runtime-sequencing.md`
  (the phase sequencing being collapsed — amended in WF-5)
- `docs/adr/0008-docs-information-architecture.md` (Rule 3 = the re-open
  justification gate)
- WF-1 (proves the hosted-memory store is real), WF-3 (proves the runtime runs
  in the single Worker)

## Blocks
WF-8 (docs write to the repositioned brief), WF-12 (OSS launch/marketing uses the
new positioning), WF-11 (deploy ships the v1 memory-host surfaces).
