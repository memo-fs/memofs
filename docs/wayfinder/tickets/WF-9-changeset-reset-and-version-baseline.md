# WF-9 — Changeset reset + 1.0.0-beta.1 version baseline + organized publish flow

`wayfinder:task` · status: open · claimed: no · blocked-by: WF-6, WF-7 (clean code before baselining)

## Question

Reset the changeset history to a clean baseline, align all OSS package versions
to **`1.0.0-beta.1`**, and establish an **organized publish flow** so a release
is easy to point to. "No backward compatibility" means the alpha history is
discarded — a fresh beta line.

Work:
1. **Version alignment** — set every package's `version` to `1.0.0-beta.1`.
   Current state: 12 packages at `1.0.0-alpha.0`, 2 (`core`-was-`client`, `tekmemo`)
   already at `1.0.0-beta.1`. Align all 14 (incl. apps if versioned).
2. **Changeset reset** — clear `.changeset/*.md` entries (the alpha-era
   changesets); decide whether `CHANGELOG.md` is reset or carries a "pre-1.0.0
   beta" cutover note. Use the `changesets` skill.
3. **Organized publish flow** — the goal: "easily point to" a release. Decide:
   - A changeset discipline (conventional, one changeset per meaningful change).
   - How `version-packages` + `release` surface a clean, linkable changelog.
   - Whether the `@tekmemo` npm org + provenance is set up (see MAP Fog →
     publishing logistics; this ticket graduates that fog).
   - The `.changeset/config.json` scope/update setting after the `@tekbreed→@tekmemo` flip.
4. **Dry-run validation** — `pnpm release:preflight` / `release:dry-run` green.

## Definition of done
All packages at `1.0.0-beta.1`; changeset history reset; publish flow documented
in a runbook; `release:preflight` passes.

## Blocks
WF-12 (OSS launch publishes a clean beta).
