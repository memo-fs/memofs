## Changelog & Comment Hygiene

### CHANGELOG.md is hand-maintained — update it in the same commit

- This repo hand-writes changelogs; there is no generator. Every user-facing
  change (feature, fix, breaking change, deprecation, behavior change) MUST
  append an entry to the affected package's `packages/*/CHANGELOG.md` under
  `## Unreleased`, in the same commit as the code change (prior art:
  feature commits carry their `CHANGELOG.md` hunk alongside `src/`).
- Use the existing headings: `### Minor Changes` for new features,
  `### Patch Changes` for fixes and small improvements, `### Major Changes`
  for breaking changes. One bullet per user-visible change, written for the
  reader of the published package (what changed + why it matters), not
  provenance — the comment-hygiene ban below applies to changelog bullets
  too (no ADR / spec / ticket references).
- Pure refactors, comment/whitespace-only cleanups, and test-only changes
  need no entry — they are not user-facing. When in doubt, add the bullet;
  a spare line is cheaper than a silent behavior change.
- One package's changelog per change — touch only the `CHANGELOG.md` of
  packages whose published behavior actually changed.
- Self-check before opening a PR: `git status` shows the package's
  `CHANGELOG.md` modified next to the `src` change whenever the change is
  user-facing.

### No planning IDs in code comments

Code comments (TSDoc blocks, `//` comments, test `describe`/`it` names) MUST
describe behavior, never cite planning artifacts:

- Forbidden: ADR numbers (`ADR 0004`), spec IDs (`spec-0038`), ticket numbers
  (`ticket 1`), stage IDs (`Component 6`, `Q28`, `ID5`, `slice 3`), and
  ticket-era names. This includes `@see ADR …` links.
- Why: planning IDs rename, get superseded, and archive; code outlives them.
  A comment citing a dead ticket or a renumbered question actively misleads
  the next reader.
- `@see` links point to modules and symbols (`{@link ./sibling}`, `{@link
  MemoFS}`), never to `docs/adr/*`, `docs/architecture/*`, or ticket sheets.
  Decision context belongs in the ADR / spec / ticket itself — or in a
  package README — not in the code.
- When behavior needs a rationale, state the reason inline ("two live writers
  on one root would interleave appends, so writes serialize") instead of
  citing the decision that chose it.
- Scope: all code under `packages/*/src` and `packages/*/tests` (including
  test headers and `describe`/`it` strings). Markdown docs (`docs/`,
  `apps/docs`, READMEs, changesets) MAY reference ADRs/specs/tickets — that
  is where provenance lives.
