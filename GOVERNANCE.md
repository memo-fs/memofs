# Governance

MemoFS is an independent open-source project. This document describes how
decisions are made and how the project can grow maintainers over time. It is
deliberately short — it reflects the project's current reality, not an aspirational
structure it hasn't earned yet.

## Maintainer

**Christopher Sesugh** ([@christophersesugh](https://github.com/christophersesugh))
is the founder and lead maintainer. Today, Christopher is the sole committer and
decision-maker.

## How decisions are made

- **Small changes** — PRs reviewed and merged by the maintainer.
- **Significant changes** (architecture, public API, package boundaries) are
  recorded as an **ADR** in [`docs/adr/`](./docs/adr/) before they land. An ADR
  captures the decision, the alternatives considered, and the rationale, so the
  reasoning survives the people who made it.
- **Direction** lives in [`ROADMAP.md`](./ROADMAP.md). Priorities shift as we
  learn from users; the roadmap communicates direction, not deadlines.

## How to contribute

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for repository setup, commit style,
the PR checklist, and package-boundary rules. [`GOOD_FIRST_ISSUES.md`](./GOOD_FIRST_ISSUES.md)
lists approachable issues for new contributors.

## Becoming a maintainer

MemoFS starts with one maintainer and intends to grow. The path is:

1. **Sustained, high-quality contributions** — multiple merged PRs that show
   judgment about the codebase and the project's constraints (package
   boundaries, the public-API rule, file-first principles).
2. **Reliability** — responsiveness on review threads and issues you own.
3. **Nomination** — the maintainer invites contributors who meet the above to
   gain commit access, starting with a focused area of the codebase.

There is no fixed count or timeline. The goal is maintainers whose judgment the
project can trust, not titles.

## Code of Conduct

Everyone participating in MemoFS agrees to abide by the
[Code of Conduct](./CODE_OF_CONDUCT.md). Reports of conduct violations go to
**christopher@memofs.dev** and are handled confidentially by the maintainer.

## License

MemoFS is [MIT licensed](./LICENSE). Contributions are accepted under the same
license.
