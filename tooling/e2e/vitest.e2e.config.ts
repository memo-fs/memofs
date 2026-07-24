import { defineConfig } from "vitest/config";

/**
 * Real e2e vitest config — heavy, Node-only, local/manual, not in CI.
 *
 * - include: src/e2e glob (dot-e2e-dot-test-dot-ts) only
 * - timeout: 300s (Transformers model load, Turso file, MCP spawn)
 * - pool: forks, singleThread: true to avoid tmpDir races
 * - setupFiles: MSW server lifecycle (currently no-op placeholder, real in ticket 64)
 *
 * Run via:
 * - `pnpm --filter @repo/e2e test:e2e` (MSW by default)
 * - `MEMOFS_E2E_LIVE=1 pnpm --filter @repo/e2e test:e2e:live` (one live call)
 *
 * Excluded from turbo test:run (CI fast path).
 */
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/e2e/**/*.e2e.test.ts"],
		testTimeout: 300_000,
		hookTimeout: 300_000,
		pool: "forks",
		maxWorkers: 1,
		isolate: false,
		// Ensure single thread to avoid tmpDir race conditions
		sequence: {
			concurrent: false,
		},
		maxConcurrency: 1,
		setupFiles: ["src/msw/setup.ts"],
		// Don't run fast-path tests
		exclude: ["tests/**/*", "node_modules/**"],
	},
});
