# Locked Screens & UI IA — Cloud app + Docs app

> **Status:** **LOCKED (IA level).** Both apps' screen inventories, nav shapes,
> and per-screen information architecture are frozen below. This is the output
> of the `grill-with-docs` session that locked every screen before
> `copywriting` + `frontend-design` refine them. Each decision below traces to a
> locked decision in `decisions.md` / an ADR, or is recorded as a new
> screen-level decision (numbered `SC-*`).
>
> **What "locked" means here:** the *information architecture* — which screens
> exist, what each is for, what lives on it, how nav is shaped — does not change
> after this point. `copywriting` refines per-page prose; `frontend-design`
> refines layout/pixels; neither re-opens an IA question. Re-open only via a new
> `SC-*` decision with ADR 0008 Rule 3 justification.
>
> **Scope:** the *information architecture* (what screens exist, what each is
> for, what lives on it) — NOT pixel-level design or copy. That is the job of
> the `copywriting` and `frontend-design` skills afterward.
>
> **Relationship to other docs:**
> - Projects the locked product/architecture decisions in
>   [`decisions.md`](./decisions.md) (Q1–Q14 + S2-Q1) and ADRs 0002–0008 into a
>   concrete screen map.
> - Does **not** re-litigate those decisions (ADR 0008 Rule 3); it links to them.
> - Governed by ADR 0008's IA rules (code is source of truth; one home per fact;
>   decisions recorded once; repeated prose is an include).

---

## SC1 — Two front doors (brand separation)

- **Decision:** Two distinct web front doors with a brand split:
  - **`docs.tekbreed.com` (the `apps/docs` VitePress site)** — owns **OSS
    marketing + documentation.** It is the front door for the open-source
    runtime.
  - **`memo.tekbreed.com` (the `apps/cloud` RRv8 Worker)** — owns **Cloud
    marketing + pricing + auth + the product dashboard.** It is the front door
    for TekMemo Cloud (the hosted SaaS).
- **Rationale:** Brand separation "TekMemo" (OSS) vs "TekMemo Cloud" (SaaS),
  the Supabase-style split. The cloud is a *different commercial product*
  (hosted sync, managed runtime later), so it earns its own marketing surface
  and its own home rather than being a section inside the docs site.
- **Consequence:** the duplicate marketing landing currently in
  `apps/cloud/src/routes/_home/index.tsx` is **not** deleted — it is elevated
  into the full Cloud front door (SC2). The docs `HomeLayout.vue` stays as the
  OSS front door; its announcement bar + cloud-client pages keep pointing at
  `memo.tekbreed.com`.

---

## Cloud app (`apps/cloud`) — marketing + legal pages

- **SC2 — Page inventory (marketing + legal):**

  | Route | Type | Purpose |
  |---|---|---|
  | `/` | Landing | The Cloud front door. Hero + preview sections (connectors, pricing, use-cases) each linking to its dedicated page; bottom CTA → `/signup`. |
  | `/pricing` | Dedicated | Full Free / Pro $9 / Teams $24-per-seat-coming-soon table (ADR 0006). Linked from the landing's pricing preview section. |
  | `/use-cases` | Dedicated | Concrete "what TekMemo Cloud is for" (multi-device sync, connector ingestion, team memory later). |
  | `/privacy` | Legal | Privacy policy (required for any auth + paid product). |
  | `/terms` | Legal | Terms of service (required for paid product + Polar MoR). |

  - **Preview sections on `/`:** connectors, pricing, and use-cases each appear
    as a *section* on the landing that links to its dedicated page (not a
    duplication of the page — a teaser). Honors ADR 0008 Rule 2.
  - **Auth + dashboard routes** are scoped separately under SC3/SC4.

### SC2.1 — Landing page (`/`) sections

The Cloud landing is **problem-first, mechanics-led**, sequenced like the
proven OSS `HomeLayout.vue` pattern but adapted to the Cloud positioning (your
`.tekmemo/` follows you everywhere; connectors feed it; managed tier is later).
Each preview section is a *teaser* that links to its dedicated page.

1. **Hero** — value prop + 2 CTAs (Get started → `/signup`, View docs →
   `docs.tekbreed.com`).
2. **Problem** — multi-device memory drift: same `.tekmemo/` edited on laptop +
   CI + workstation diverges; git is manual, Syncthing is fiddly, Dropbox
   conflicts silently.
3. **Solution** — the one-paragraph thesis: TekMemo Cloud mirrors your
   `.tekmemo/` files byte-for-byte; the engine stays local; the cloud is a dumb
   file replica. (Projects Q4 thesis directly.)
4. **How sync works** — 3-step mechanical demo (init → push → pull), echoing the
   OSS docs' "three commands" terminal mockup.
5. **Connectors preview** — GitHub + Notion at v1, Linear queued (Q10). This is
   a *landing section only* (no dedicated `/connectors` page — SC2 lists the
   pages). The "learn more" link goes to `docs.tekbreed.com` (the
   `packages/tekmemo/connectors.md` page the ADR 0008 triage already flags as
   missing-to-create), so connector detail has one home per ADR 0008 Rule 2.
6. **Pricing preview** → `/pricing` (Free / Pro $9 / Teams $24/seat-soon — ADR 0006).
7. **Use-cases preview** → `/use-cases`.
8. **Comparison** — TekMemo Cloud vs self-hosting (git / Syncthing / Dropbox):
   automatic pre-sync snapshots, content-addressed blobs, one-click rollback,
   zero-config connectors. The honest "when you'd use us vs DIY" framing.
9. **FAQ** — the v1 cloud FAQ inline (vs the OSS FAQ that lives in docs).
10. **Bottom CTA** → `/signup`.

## Cloud app (`apps/cloud`) — auth screens

> Auth is **Better Auth, pending capability check** (ADR 0005 / Q8). The screen
> set below is stable regardless of the check outcome; only the implementation
> (password vs magic-link, 2FA) depends on it.

- **SC4 — Auth screen set (originally 5 screens + 1 callback, password-based):**
  - `/login` — email + password, plus **[Continue with GitHub]** and
    **[Continue with Google]** OAuth buttons. (GitHub-as-**login-IdP** is
    distinct from GitHub-as-**data-connector** — a user logging in with Google
    can still add the GitHub connector.)
  - `/signup` — same surface, account-creation framing.
  - `/oauth/callback` — the redirect target for GitHub/Google login OAuth.
  - `/reset` — request password reset (email sent via Plunk).
  - `/reset/confirm` — set new password (token-gated landing).
  - `/verify` — post-signup email-verification landing.
- Post-auth: redirect to `/dashboard` (Overview, SC3.1), or to the
  `?next=` path if the user was bounced off an auth-gated route.

### SC4.1 — Passwordless (magic-link) auth — supersedes SC4's password flow

- **Decision (locked 2026-06-23):** TekMemo Cloud authenticates users via
  **email magic links** + OAuth (GitHub/Google), **not** passwords. Better
  Auth's `magicLink` plugin handles issuance/consumption; OAuth handles the
  two social providers already in SC4. SC4's framing ("only the implementation
  depends on the capability check") explicitly anticipated this — no ADR 0005
  re-litigation, only the screen-shape consequence below.
- **Screen-set change (6 → 4 screens):**
  - `/login` — email-entry only → sends magic link. Plus the two OAuth buttons
    (unchanged from SC4).
  - `/signup` — same surface, account-creation framing (same email → magic-link
    flow; no separate "password" field).
  - `/oauth/callback` — GitHub/Google OAuth redirect target (unchanged).
  - `/verify` — **repurposed**: the magic-link-consumed landing (the click *is*
    verification). Was "post-signup email-verification" under SC4; now the
    terminal step of both sign-in and sign-up.
  - **Removed:** `/reset` and `/reset/confirm` — there is no password to reset
    under passwordless. (If a user loses email access, recovery is account-
    support flows, not a self-serve reset page.)
- **Disposable-email defense (required, since email is the only factor):**
  1. **Static blocklist** — reject signup from known disposable/temporary
     domains via a vendored list (e.g. `disposable-email-domains`), refreshed
     periodically. Free, no API dependency.
  2. **MX-record check** at signup — reject addresses whose domain has no MX
     record (can't receive mail). `libSQL`-cached DNS lookups.
  3. **Rate-limit** the magic-link endpoint via Upstash (already in stack,
     ADR 0005) — per-IP + per-email throttling to blunt link-spam/abuse.
  - **No paid email-validation API** (Kickbox/Abstract) at v1 — the broke+ASAP
    posture; revisit if abuse warrants.
- **2FA:** N/A under passwordless. The magic link *is* the possession factor;
  email is the knowledge factor via the inbox. If a second factor is later
  required (e.g. for Teams admin actions), it's a TOTP/passkey add-on, not a
    password-based 2FA.
- **Counts (updated):** Cloud auth 6 → 4 screens; total cloud 18 → 16 screens.

## Cloud app (`apps/cloud`) — product / dashboard screens

- **SC3 — Dashboard shell + project scoping:**
  - **Top-level nav (5 items):** Overview · Projects · Connectors · API Keys ·
    Billing · Settings. (6 entries counting Overview as the dashboard home.)
  - **Global project switcher in the dashboard header** — a dropdown of the
    account's projects (+ "New project"). It scopes the **project-scoped**
    surfaces only:
    - **Project-scoped** (reflect the selected project): Overview's sync status
      cards, Projects detail, **Connectors** (because `connectors.json` is a
      per-project synced file).
    - **Account-wide** (same regardless of selected project): **API Keys**
      (`api_keys.account_id`), **Billing** (`accounts.plan` /
      `maxHostedStorageBytes`), **Settings** (identity/email).
  - Matches the locked data model exactly — no surface shows data that has no
    backing source, and the project/account split is visible to the user
    (not hidden in a tab).

### SC3.1 — Overview (dashboard home)

Scoped to the selected project (SC3). **4 cards**, each backed by a real data
source:

1. **Sync status** — `lastSyncAt`, `cursor`, file count (from `project_files`),
   and the project's `storageBytes`. From `GET /sync/status`.
2. **Storage usage** — a usage bar of `storageBytes` /
   `account.maxHostedStorageBytes`, with the plan name (Free/Pro/Teams) + an
   "Upgrade" link when `projectedStorageBytes` would approach the cap (the
   entitlement gate from ADR 0006, made visible).
3. **Connectors health** — `N / maxConnectors` active, last-run status per
   connector (from `connectors.json` + the connector run log). Q1/Q2 control
   plane.
4. **Quick start** — the exact `tekmemo sync` CLI command for the selected
   project, copyable. The empty-state version of this card (no project yet)
   is the onboarding nudge.

### SC3.2 — Projects (list + detail)

- **List view:** one row per project (id, name, storage, last sync, file
  count). "+ New project" opens a modal — but note Q13: projects are
  **auto-provisioned on first push**, so "New project" in the dashboard is
  really "register a name + get the CLI command to push to it" (the row appears
  in the table only once the first push lands). The modal should make this
  explicit (no server-side create form that pretends to make a project exist).
- **Detail view** (click a project → also sets it as the selected project in the
  header switcher): the full sync status — the file manifest (path → sha256 →
  size → `updatedAt`), the cursor history (`sync_cursors` rows), and
  `lastSyncAt`. This is the "what does the cloud hold for this project"
  inspector. Read-only at v1 (no inline file editing — files are authored
  locally and pushed; the cloud is a replica, D1).

### SC3.3 — Connectors (per selected project)

**Catalog grid + per-connector cards.** Scoped to the selected project
(`connectors.json` is a per-project synced file, Q2). The cap counter
(`N / maxConnectors`) is shown in the header.

- **Catalog row (top):** GitHub, Notion (available at v1); Linear shown greyed
  "Coming soon" (Q10 #3). The "+ Add" tile opens the picker when the cap allows;
  it's disabled with an upgrade prompt when `N >= maxConnectors` (ADR 0006
  numeric-cap enforcement, made visible — never a `plan === "Pro"` check).
- **Per-connector card** (each added connector): type, **enabled toggle**,
  **schedule selector** (e.g. "Every 1h"), **source mapping** (e.g.
  `repos: org/*`, `notion: workspace/db`), **last-run status** (success/fail/
  never + timestamp), **secret status** (a ✓ "stored" indicator — the token is
  never displayed, never in R2; only the opaque `secretRef` rides in
  `connectors.json`), and **Edit / Remove** actions.
- **Add flow:** pick from catalog → **OAuth** (preferred for GitHub/Notion) or
  token paste → schedule + source mapping → save. On save: the connector
  config writes to `.tekmemo/connectors.json` (the 11th canonical file, Q2);
  the token is stored server-side (Turso-encrypted column / Workers Secret)
  under the `secretRef` and fetched live by the local runtime at run time.
- **Trust affordance:** the card's secret-status indicator + a one-line note
  ("Tokens are encrypted server-side and never synced to your files") makes the
  Q2 security guarantee visible — this is the trust-building surface for a
  local-first product that asks users to paste credentials.

### SC3.4 — API Keys (account-wide)

The cloud authenticates sync requests by **Bearer token** (`Authorization:
Bearer tm_…`); the raw key is shown **ONCE at provisioning** and only a
salted sha256 (`key_hash`) is stored (schema `api_keys`, ADR 0006). The screen
reflects that contract:

- **List:** one row per key — `label` ("laptop", "ci", …), `lastFour`
  (`tm_…abcd`), created date, last-seen, revoked status. No raw key is
  ever displayed after creation.
- **Create flow:** label input → generate → **one-time-reveal modal** showing
  the full `tm_…` key with a copy button + a hard warning ("You won't see
  this again"). Closing the modal drops into the list with the new row.
- **Revoke:** soft-delete (`revoked_at`); subsequent sync with that key 401s.

### SC3.5 — Billing (account-wide)

**Plan + usage in-app; checkout/portal in Polar.** Polar is the Merchant of
Record (ADR 0006) — it owns checkout, tax, invoices, cancellation. We do not
build a billing engine.

- **Current plan card:** plan name (Free/Pro/Teams), storage used vs cap
  (`maxHostedStorageBytes`), connectors used vs cap (`maxConnectors`) — the
  entitlement snapshot, made visible.
- **Plan picker:** Free ($0) [Current], Pro ($9) [Upgrade → Polar checkout],
  Teams ($24) [Coming soon — notify me] (disabled button capturing email;
  implementation deferred, list price locked, ADR 0006).
- **Manage subscription →** deep-link to Polar's hosted customer portal
  (invoices, update payment, cancel). One link out; no in-app invoice list.

### SC3.6 — Settings (account-wide)

**Profile + Security + Danger zone.**

- **Profile:** name, email, avatar.
- **Security:** change password, active sessions, two-factor (slot — UI present,
  gated until the Better Auth capability check confirms 2FA support).
- **Danger zone:** delete account → purges R2 blobs + DB rows (GDPR / data-
  hygiene expectation for a service holding user files). Confirmation flow
  (re-auth + typed confirmation).

## Cloud app (`apps/cloud`) — admin (deferred)

- **SC6 — Admin panel: deferred to post-revenue, namespace reserved at v1.**
  - **Decision (locked 2026-06-23):** TekMemo Cloud ships **no admin/staff panel
    at v1**. Platform monitoring + control during the broke+ASAP launch phase is
    covered by the existing stack's dashboards: Polar (subscriptions/billing),
    Turso console (DB), Cloudflare dashboard (Workers/R2/observability), Sentry
    (errors). Building a bespoke admin panel duplicates all four and adds scope
    against "launch ASAP."
  - **Reserved at v1 (no surface, but no paint-into-corner):**
    - `/admin/*` route namespace — never registered as a public route, ready to
      claim later.
    - `accounts.is_staff` boolean flag on the accounts table (defaults false) —
      the gate a future admin plugin checks. Added now so we don't migrate auth
      later.
    - Better Auth `admin` plugin is available when needed; we don't wire it at v1.
  - **When it ships (post-revenue, gated like Teams on ADR 0003):** user
    impersonation, per-account storage/bandwidth/consumption views, connector-
    run logs, manual entitlement overrides, disposable-email/abuse dashboards,
    manual magic-link throttling. Not a customer-facing surface; staff-only.
  - **Scope discipline:** this decision does **not** add a screen to the locked
    inventory or the dashboard nav (SC3 stays 6 user-facing items). It is
    recorded so "no admin at v1" is an explicit, traceable decision rather than
    an omission.

## Cloud app (`apps/cloud`) — phase-gated screens (Teams + managed memory)

> **Scope note:** SC7–SC9 project the session-6 decisions
> ([`decisions.md`](./decisions.md) Q29–Q33; ADRs [0011](../adr/0011-managed-runtime-sequencing.md)
> / [0012](../adr/0012-r2-memory-store-adapter.md)) into the screen IA. They are
> **phase-gated additions**, not v1 screens — the same pattern as SC6 (reserved,
> not shipped at v1). The v1 inventory stays at 16 screens; these add routes
> only when their prerequisite phase (per ADR 0011) lands. They honor ADR 0008
> (one home per fact; no re-litigation of v1 IA) and the SC3 project-scoped vs
> account-wide split. Nav items are **conditional** (appear only when the
> account is eligible), so non-team / non-hosting users keep the locked 6-item
> nav.

- **SC7 — Teams tier (`/dashboard/team`) — phase 2, gated on ADR 0011 phase 1
  (concurrency layer).**
  - **Decision (locked 2026-06-24):** a single Teams screen, **account-wide**
    (not project-scoped — teams own projects, not the reverse), appearing as a
    **conditional nav item**: shown only when the account owns or belongs to a
    team; hidden otherwise. Non-team users keep the locked 6-item nav (SC3) — no
    phantom entry.
  - **Internal sections (one route, three sections — not separate routes):**
    1. **Members** — list (name / email / role / status), the locked role model
       **Owner / Admin / Member** (Owner: billing + delete + role mgmt; Admin:
       invite/remove members + manage shared projects; Member: read + write
       shared projects). **Invite-by-email** reuses the SC4.1 magic-link flow
       (an invite is a magic link to accept the seat). Remove member. **Seat
       usage counter** (N seats used vs N billed) → "Manage seats" links out to
       Polar (SC3.5), same as subscription management.
    2. **Shared projects** — the team's shared projects. This is the
       Teams-only concept that **requires ADR 0011 phase 1**: concurrent
       teammate writes are safe *because* of the concurrency layer, not D6.
       Members see these in their Projects list (SC3.2) with a **"shared" badge**
       alongside their personal projects. **Write access is the
       concurrency-gated surface** (read access is safe under D6 regardless);
       this is the precise scope where "Teams needs the concurrency layer"
       lives.
    3. **Settings** — team name, default member role, **delete team** (danger
       zone, re-auth required; does not delete members' personal accounts).
  - **Team member's view:** a *member* (not owner/admin) sees the Team nav item
    read-only (members/settings managed by admins) + the team's shared projects
    in their Projects list, alongside any personal projects. The Linear/Vercel
    model — joining a team augments your workspace, it doesn't replace it.
  - **Counts:** +1 phase-gated screen (`/dashboard/team`); +1 conditional nav
    item ("Team"). v1 inventory unchanged (16); this is a phase-2 addition.

- **SC8 — Managed runtime / hosted memory (`/dashboard/memory`) — phase 3,
  gated on ADR 0011 phase 3 + ADR 0012 (R2 store).**
  - **Decision (locked 2026-06-24):** a hosted-memory home screen,
    **project-scoped** (hosted memory is per-project: a user hosts some
    projects, not others), appearing as a **conditional nav item**: shown only
    when the managed tier is active for the selected project; hidden otherwise.
  - **Internal sections (one route, four sections — not separate routes):**
    1. **Runtime status** — "Hosted memory: Active / Inactive for this project."
       Pro+ can enable per project; Free sees the Q33 1/day-capped state
       (deterministic-floor-only).
    2. **Consolidation** — last run, **runs-today vs the account-wide cap
       `maxConsolidationRuns`** (Free 1 deterministic / Pro 24 frontier / Teams
       ∞ — Q33), next scheduled run, run log. This is cloud differentiator A1
       ("always-on consolidation") + A2 ("cross-device conflict resolution")
       made visible.
    3. **Pre-warming** — sessions pre-warmed today vs `maxPreWarmPerDay` (Free 0
       / Pro+ >0 — Q19 / C5). The cloud's home-turf attack on the cold-start
       token north star (Q16).
    4. **Memory explorer** — search/browse the hosted recall + graph ("see what
       your hosted memory knows"). **Phase-3.x candidate** to split to
       `/dashboard/memory/explore` if it grows; IA-locked as a section now so
       the nav shape is stable.
  - **Overview card (extends SC3.1):** when the tier is active, Overview gains
    a **5th project-scoped card "Hosted memory"** (mirrors how Connectors is
    both a nav item and an Overview card — SC3.1 §3 + SC3.3). Phase-gated; v1
    Overview stays 4 cards.
  - **Counts:** +1 phase-gated screen (`/dashboard/memory`); +1 conditional nav
    item ("Memory", project-scoped). v1 inventory unchanged (16); this is a
    phase-3 addition.

- **SC9 — Pricing & billing surface deltas — extend SC2 (`/pricing`) + SC3.5
  (`/dashboard/billing`). No new routes.**
  - **Decision (locked 2026-06-24):** the pricing/billing surfaces gain the
    Q33 intelligence-entitlement dimensions as **rows in existing tables / cards
    on existing screens**, not new pages. These are **deltas to locked screens**,
    recorded as SC9 so the IA stays one-home-per-fact (ADR 0008 Rule 2).
  - **`/pricing` table (SC2)** gains two entitlement rows in the plan table:
    - **Consolidation runs/day** — Free **1** *(deterministic)* · Pro **24**
      *(frontier)* · Teams **∞**. (Q33: Free's run is deterministic-floor-only;
      Pro+ runs frontier extraction.)
    - **Session pre-warming** — Free **—** · Pro **✓** · Teams **✓**.
    - Storage + connectors rows stay (ADR 0006). Honest copy: *"Free gets a
      nightly taste of hosted consolidation; Pro runs frontier extraction on
      your behalf."*
  - **`/dashboard/billing` current-plan card (SC3.5)** expands the entitlement
    snapshot from 2 → 4 dimensions: storage used/cap, connectors used/cap,
    **consolidation runs today/cap**, **pre-warm today/cap**. The numeric-cap
    enforcement (Q19, `count < cap`) made visible across all four — consistent
    with how SC3.5 already shows storage + connectors.
  - **`/` landing pricing preview (SC2.1 §6) + `/use-cases`** copy shifts
    "managed tier later" → active framing once phase 3 lands. **Copy, not IA** —
    deferred to `copywriting`; recorded here so the copywriter knows the
    managed tier is a phase-3 fact, not a hedge.
  - **Counts:** no new screens; two locked screens gain rows/cards. v1
    inventory unchanged (16).

## Docs app (`apps/docs`) — scope + screens

- **SC5 — Docs app scope (resolves ADR 0008 Rule 5):** docs **keeps** `/blog`,
  `/changelog`, `/faqs`. The `apps/docs/README.md` claim that those "belong in
  the Cloud CMS" is **retracted** — per SC1 the cloud app owns its own marketing
  surface separately; the docs blog/changelog/faqs are the **OSS project**
  surfaces (release notes, dev diaries, OSS FAQ), not cloud marketing. No
  content migration; fixes the contradiction; matches the live site.

- **SC5.1 — Top-level nav (7 items):** Get Started · TekMemo · CLI · MCP · API ·
  **Cloud →** · Blog.
  - **Cloud →** is a single **external link** to `memo.tekbreed.com` (SC1 —
    plans/pricing/dashboard live there, never duplicated here, ADR 0008 Rule 2).
  - **Changelog** stays as a sidebar entry under its own section (not top nav);
    the top-nav slot goes to Blog (more frequently updated, higher engagement).
  - **Get Started** remains the install/quickstart entry (the OSS funnel top).
  - **Delta vs current code** (verified `config/nav.mts` 2026-06-21): the live
    nav is **6 items** — Get Started · CLI · MCP Server · API · Changelog · Blog.
    To reach the locked 7-item nav: **rename** "Get Started" → keep as the OSS
    funnel entry (it already points at `/packages/tekmemo`, the core overview);
    **add** a **TekMemo** item pointing at `/packages/tekmemo` with
    `activeMatch: "/packages/tekmemo/"` (the core-runtime section, distinct from
    the Get Started quickstart); **add** a **Cloud →** external link to
    `https://memo.tekbreed.com`; **demote** Changelog from top nav to a sidebar
    entry under its own section (it is already a sidebar section in `sidebar.mts`
    — only the top-nav slot is removed). CLI/MCP/API items are unchanged. The two
    "TekMemo" vs "Get Started" entries are justified because Get Started stays the
    marketing-funnel entry while TekMemo is the evergreen core-runtime home; if
    that doublet reads as redundant in copy review, collapse to one "TekMemo"
    item (decision deferred to `copywriting` — IA-level either is valid).

### SC5.2 — Docs home (`/`) — the OSS marketing front door

**Keep the current 7-section structure; fix the drift inside it.** The
`HomeLayout.vue` pattern is proven (hero → credibility → problem → how-it-works
→ feature showcase → audience → comparison → bottom CTA). Two content fixes
required to align with locked decisions:

1. **The "One API, three modes" showcase (`HomeLayout.vue:285-313`) shows
   `mode: "cloud"`** — D4 removed that enum value. Reframe the toggle from
   "Local / Cloud / Hybrid" (a mode flag) to **"Local / Hybrid + sync / Hybrid
   + managed (later)"** — i.e. local-first by default, the sync client adds
   cloud replication, and the managed-runtime tier is future. The code snippet
   must match the shipped `Tekmemo` constructor (no `mode: "cloud"`).
2. **Cloud framing shifts from "a mode flag" to "a separate product →"** (SC1).
   The hero gets a **"Cloud →"** CTA alongside "Get Started", pointing at
   `memo.tekbreed.com`. The announcement bar already does this — keep it.

Everything else (credibility row, problem section, how-it-works 3-command demo,
audience cards, comparison table) stays — it's the OSS pitch, not cloud
marketing.

### SC5.3 — Docs sidebar structure

The sidebar already groups by package (`/packages/tekmemo/`, `/packages/cli/`,
`/packages/mcp/`, `/api/tekmemo/`, `/blog/`, `/changelog`). The ADR 0008 drift
triage + locked decisions require these **additions/fixes** (tracked in
`docs-drift-triage.md`, surfaced here so the screen IA is complete):

- **ADD** `packages/tekmemo/connectors.md` — the missing connectors home
  (ADR 0002 + Q1–Q3). The cloud landing's connectors preview links here (SC2.1).
- **ADD** `packages/tekmemo/intelligence.md` — the missing v1-intelligence home
  (Q5 / ADR 0004): hybrid recall + LLM extraction + consolidation.
- **FIX** the `mode: "cloud"` / `cloud-only` policy-row sweep across the ~12
  pages (D4, per the triage register).
- **FIX** the AI-SDK pages → repoint at `@tekbreed/tekmemo-adapter-ai-sdk` +
  `TekMemoMemoryRuntime` (S2-Q1 / ADR 0007).
- **REMOVE (already done)** the dead `/api/tekmemo/vector-adapters` sidebar
  entry — verified **already absent** from `config/sidebar.mts` (2026-06-21).
  The `tekmemo-adapter-upstash` package removal (Q6 6a) is tracked in the
  refactor doc; the docs side needs no further action. Kept here as a closed
  item so the triage register reconciles.
- **NO** `tekmemo-connectors` API page until that package exists (no vapor docs,
  ADR 0008).

### SC5.4 — Docs IA verification trail (2026-06-21)

Each locked item above was checked against the live code on this branch:

| Item | Claim | Verified against | Status |
|---|---|---|---|
| SC5.1 | Nav is 6 items today, lock to 7 | `config/nav.mts` (6 entries) | **Delta stated** |
| SC5.2 | HomeLayout shows `mode: "cloud"` | `HomeLayout.vue:50` | **Confirmed drift** |
| SC5.2 | Announcement bar + Cloud CTA present | `HomeLayout.vue:78-84` | **Already correct** |
| SC5.3 | `connectors.md` missing | `packages/tekmemo/` listing | **Confirmed missing** |
| SC5.3 | `intelligence.md` missing | `packages/tekmemo/` listing | **Confirmed missing** |
| SC5.3 | `mode: "cloud"` sweep needed | 8 pages incl. `configuration.md:40`, `cloud-client.md:21`, `concepts.md:52`, `faq.md`, `getting-started.md`, `cli/index.md:47` | **Confirmed** |
| SC5.3 | AI-SDK docs point at wrong package | `ai-sdk/index.md:3` says "built directly into `@tekbreed/tekmemo`"; adapter `@tekbreed/tekmemo-adapter-ai-sdk` exists separately | **Confirmed drift (S2-Q1)** |
| SC5.3 | `vector-adapters` sidebar dead | `config/sidebar.mts` | **Already removed** |

- **Status: Docs IA — LOCKED.** Ready for `copywriting` (per-page copy) and
  `frontend-design` (HomeLayout section styling). The structural decisions
  (what screens exist, what lives on each, nav shape) do not change after this
  point; subsequent skills refine content and pixels, not IA.

---

## Consolidated screen inventory (wireframe index)

The single map for `copywriting` + `frontend-design` to work from. Every row is
a screen; every screen points at the `SC-*` decision that locks it.

### Cloud app (`apps/cloud` → `memo.tekbreed.com`)

| # | Route | Type | One-line purpose | Scope | Lock |
|---|---|---|---|---|---|
| 1 | `/` | Landing | Cloud front door: 10 sections (hero→problem→solution→sync→connectors→pricing→use-cases→comparison→FAQ→CTA) | Public | SC2.1 |
| 2 | `/pricing` | Dedicated | Free/Pro $9/Teams $24-soon-per-seat table | Public | SC2 |
| 3 | `/use-cases` | Dedicated | What Cloud is for (sync, connectors, teams-later) | Public | SC2 |
| 4 | `/privacy` | Legal | Privacy policy | Public | SC2 |
| 5 | `/terms` | Legal | Terms of service (Polar MoR needs it) | Public | SC2 |
| 6 | `/login` | Auth | Email-entry → magic link + GitHub/Google OAuth buttons | Public | SC4.1 |
| 7 | `/signup` | Auth | Same surface, account-creation framing | Public | SC4.1 |
| 8 | `/oauth/callback` | Auth | GitHub/Google login redirect target | Public | SC4.1 |
| 9 | `/verify` | Auth | Magic-link-consumed landing (sign-in + sign-up terminal step) | Public | SC4.1 |
| 10 | `/dashboard` (Overview) | Product | 4 project-scoped cards (sync/storage/connectors/quick-start) | Auth | SC3.1 |
| 11 | `/dashboard/projects` | Product | Project list + "register name" modal (auto-provision on first push, Q13) | Auth | SC3.2 |
| 12 | `/dashboard/projects/:id` | Product | File manifest + cursor history for one project (read-only) | Auth | SC3.2 |
| 13 | `/dashboard/connectors` | Product | Per-project connector catalog + cards (cap visible) | Auth, project-scoped | SC3.3 |
| 14 | `/dashboard/api-keys` | Product | Key list + one-time-reveal create + soft-revoke | Auth, account-wide | SC3.4 |
| 15 | `/dashboard/billing` | Product | Plan/usage snapshot + Polar checkout/portal links out | Auth, account-wide | SC3.5 |
| 16 | `/dashboard/settings` | Product | Profile + security + danger-zone delete | Auth, account-wide | SC3.6 |
| — | `/dashboard/team` | Product *(phase 2)* | Team members, shared projects (concurrency-gated writes), team settings | Auth, account-wide, **conditional nav** | SC7 |
| — | `/dashboard/memory` | Product *(phase 3)* | Hosted memory: runtime status, consolidation, pre-warming, memory explorer | Auth, project-scoped, **conditional nav** | SC8 |

> Rows marked **(phase N)** are gated on [ADR 0011](../adr/0011-managed-runtime-sequencing.md)
> and are **not part of the v1 inventory** (the `#` column is `—` until they
> ship). SC9 adds **no new rows** — it extends `/pricing` (row 2) and
> `/dashboard/billing` (row 15) with Q33 entitlement dimensions.

**Cloud dashboard shell:** top-nav 6 entries (Overview · Projects · Connectors ·
API Keys · Billing · Settings) + global project switcher in header. The
switcher scopes only project-scoped surfaces (Overview cards, Projects detail,
Connectors); account-wide surfaces (API Keys, Billing, Settings) ignore it.
**Two conditional nav items** appear only when eligible (do not change the v1
6-item nav for ineligible users): **"Team"** (SC7, account-wide, when the
account owns/belongs to a team) and **"Memory"** (SC8, project-scoped, when the
managed tier is active for the selected project). Lock: SC3 (+ SC7/SC8 for the
conditional items).

### Docs app (`apps/docs` → `docs.tekbreed.com`)

| # | Route | Type | One-line purpose | Lock |
|---|---|---|---|---|
| 1 | `/` | Home | OSS marketing front door (7-section `HomeLayout.vue`, keep + fix drift) | SC5.2 |
| 2 | `/packages/tekmemo/*` | Section | Core runtime docs (overview→config→records→fs-layout→…). **ADD** `connectors.md`, `intelligence.md`; **FIX** `mode:"cloud"` sweep | SC5.3 |
| 3 | `/packages/cli/*` | Section | CLI docs (local + cloud commands, agent workflow) | SC5 |
| 4 | `/packages/mcp/*` | Section | MCP server docs (hosted/self-hosted/tools/prompts/security) | SC5 |
| 5 | `/api/tekmemo/*` | Section | API reference (class, modules, integrations) | SC5 |
| 6 | `/blog/*` | Blog | OSS dev diaries / release posts (kept here, not cloud CMS) | SC5 |
| 7 | `/changelog` | Changelog | Release notes (sidebar section, not top nav) | SC5.1 |
| 8 | `/faqs` | FAQ | OSS FAQ (kept here) | SC5 |
| 9 | **Cloud →** (external) | Nav link | Single external link to `memo.tekbreed.com`; no cloud content duplicated here | SC1/SC5.1 |

**Docs top-nav (locked 7):** Get Started · TekMemo · CLI · MCP · API · **Cloud →**
· Blog. Delta vs current 6-item nav stated in SC5.1.

### Counts

- **Cloud:** **16 v1 screens** (5 marketing/legal + 4 auth + 7 dashboard incl.
  shell). Auth dropped 6 → 4 under SC4.1 (passwordless: `/reset` +
  `/reset/confirm` removed, `/verify` repurposed). Admin is deferred +
  namespace-reserved (SC6) — not counted as a v1 screen.
  - **+2 phase-gated screens** (not in the v1 count): `/dashboard/team` (SC7,
    phase 2 — Teams, gated on ADR 0011 phase 1) and `/dashboard/memory` (SC8,
    phase 3 — managed runtime, gated on ADR 0011 phase 3 + ADR 0012). Both ship
    as conditional nav items; the v1 6-item nav is unchanged for ineligible
    users. SC9 adds no screens (extends `/pricing` + `/dashboard/billing`).
- **Docs:** 8 sections + 1 external link; top-nav locked at 7 items.
- **Cross-app rule (SC1):** cloud marketing/pricing/dashboard live **only** on
  `memo.tekbreed.com`; OSS docs/blog/changelog live **only** on
  `docs.tekbreed.com`. No content duplication (ADR 0008 Rule 2).
