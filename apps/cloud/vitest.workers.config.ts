import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/**
 * Workers-runtime integration pool (Vitest 4 API).
 *
 * Runs `tests/workers/**` inside Miniflare so the `cloudflare:workers`
 * `env`/`exports` imports resolve against REAL bindings (R2, AI). This is the
 * cross-check suite: the node pool's `createFakeR2Bucket` is proven to match
 * real R2 semantics here.
 *
 * Kept separate from the default `vitest.config.ts` (node pool) because the
 * Workers runtime and the node runtime are mutually exclusive in a single
 * Vitest invocation. Invoke via `pnpm test:workers`.
 *
 * The Workers entry is the health-only harness in `tests/workers/worker.ts`
 * (NOT the production `workers/app.ts`) — see that file's header comment for why
 * the full `createApiApp()` tree can't load inside the pool. Bindings (R2, AI)
 * are declared in `wrangler.workers-test.toml`.
 *
 * @see https://developers.cloudflare.com/workers/testing/vitest-integration/configuration/
 */
export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.workers-test.toml" },
		}),
	],
	test: {
		include: ["tests/workers/**/*.test.ts"],
	},
});
