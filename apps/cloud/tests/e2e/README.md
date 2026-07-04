# Cloud e2e tests

Playwright tests that drive the **live Worker** served by `wrangler dev`. This is the
broadest testing layer — see the app README's "Testing" section for how it relates to
the unit and workers-integration suites.

## Running

```bash
pnpm test:e2e
```

Playwright's `webServer` boots `pnpm preview` (`pnpm build && wrangler dev`) on
`127.0.0.1:8787`, waits for `/v1/health` to answer, then runs the specs in
`*.spec.ts`.

**Prerequisite:** copy `.dev.vars.example` to `.dev.vars` (`wrangler dev` reads it as
the local Worker bindings).

## ⚠️ Known blocker: production build (`pnpm build`)

The `webServer` cannot currently start because `pnpm build` fails with a
**pre-existing toolchain bug** (confirmed to fail identically on the committed state
before the testing-infra work):

```
[plugin react-router:virtual-modules]
Error: ENOENT: no such file or directory, open '.../build/client/.vite/manifest.json'
```

The file IS emitted, but `@react-router/dev@8.0.1`'s `generateReactRouterManifestsForBuild`
reads it from the **worker** build environment while the **client** environment (which
writes it) is still in flight — a build-environment ordering race between
`@react-router/dev`, `@cloudflare/vite-plugin`, and Vite 8's `buildApp` API.

Bumping `@cloudflare/vite-plugin` (1.42.1 → 1.42.4) + `wrangler` (4.103 → 4.106) does
**not** resolve it — the race is at the React Router × Cloudflare integration level.

### Until this is fixed, e2e cannot run

The e2e config (`playwright.config.ts`) and the smoke spec (`health.spec.ts`) are
correct and will pass once the build succeeds. To unblock:

1. Track upstream: React Router Cloudflare adapter manifest generation under Vite 8's
   parallel `buildApp` environments.
2. Candidate fixes to evaluate (each has blast radius — do NOT attempt blindly):
   - Pin `@react-router/dev` / `@react-router/cloudflare` to a version whose manifest
     generation is environment-order-independent.
   - Check whether a newer `@react-router/cloudflare@8.x` patch resolves the race.
   - If unresolved, temporarily gate `pnpm build` behind a known-good toolchain set.

The unit (`cloud-unit`) and workers-integration (`cloud-workers`) Vitest pools are
**unaffected** and green — they do not depend on the production client bundle.
