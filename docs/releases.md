# Release Process

TekBreed OSS uses Changesets for package versioning and publishing. TekMemo is published as one public package, `@tekbreed/tekmemo`, with all public APIs exported from the single root entrypoint.

## Validation

Before publishing packages, run:

```bash
pnpm release:check
```

The release check runs formatting/linting, type checks, unit tests, package builds, `publint`, and release benchmarks. The GitHub release workflow runs the same check before both preparing a version PR and publishing packages.

Smoke benchmarks are part of normal CI. Full benchmarks run from the Benchmarks workflow manually or on the weekly schedule and upload `benchmark-results/` as an artifact for review.

## Local checklist

Before a release, verify:

- `pnpm release:check` passes.
- `pnpm-lock.yaml` is current.
- `benchmark-results/` contains only ignored generated output.
- Public README examples use exported APIs.
- Package `README.md`, `LICENSE`, `bin`, and `exports` are included in package contents.
- No secrets, private cloud implementation details, or local-only docs are committed.

## Changesets

For the first publish of packages already versioned at the intended npm version, a changeset file is not required.

For every release after the initial publish, add a changeset for public package changes:

```bash
pnpm changeset
```

Use patch/minor/major according to the public API impact:

- Patch: bug fixes, docs corrections inside packages, test-only hardening.
- Minor: new backwards-compatible public APIs or package capabilities.
- Major: breaking public API, behavior, or export changes.

Internal-only packages under `@repo/*` and private workspaces such as docs or benchmarks should not be published externally.

## Workflow modes

The release workflow has two manual modes:

- `prepare`: runs `pnpm release:check`, then opens a version PR through Changesets.
- `publish`: runs `pnpm release:check`, then publishes public packages with `pnpm release`.

Use `prepare` when changesets need to update versions and changelogs. Use `publish` when the current committed package versions are ready to publish.

## Publishing

Publish from GitHub Actions when possible. The publish workflow expects:

- `NPM_TOKEN` configured in repository secrets.
- npm publishing permission for `@tekbreed/tekmemo`.
- release branch contents already reviewed and merged.

For local emergency publishing, verify npm auth first:

```bash
npm whoami
pnpm release:check
pnpm release
```

## Package inspection

Before a major or first public release, inspect the TekMemo package contents:

```bash
pnpm --filter @tekbreed/tekmemo pack:dry-run
```

The tarball should contain `dist`, `README.md`, and `LICENSE`, and should not contain source-only tests, local docs, credentials, or generated benchmark results.

## Rollback

npm package versions are immutable. If a bad version is published:

- publish a fixed patch version as soon as possible.
- deprecate the bad version with a clear message if needed.
- open a security advisory if the issue is security-sensitive.
- document the issue in the changelog or release notes.
