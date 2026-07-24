import { defineConfig } from "vitest/config";

/**
 * Real e2e vitest config — heavy, Node-only, local/manual, not in CI.
 *
 * - include: `src/e2e/** /*.e2e.test.ts` only
 * - timeout: 300s (Transformers model load, Turso file, MCP spawn)
 * - pool: forks, singleThread: true to avoid tmpDir races
 * - setupFiles: MSW server lifecycle (currently no-op placeholder, real in ticket 64)
 *
 * Run via:
 * - `pnpm --filter @memofs/testing test:e2e` (MSW by default)
 * - `MEMOFS_E2E_LIVE=1 pnpm --filter @memofs/testing test:e2e:live` (one live call)
 *
 * Excluded from turbo `test:run` (CI fast path) — see turbo.json.
 */
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/e2e/**/*.e2e.test.ts"],
		testTimeout: 300_000,
		hookTimeout: 300_000,
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		// Ensure single thread to avoid tmpDir race conditions
		sequence: {
			concurrent: false,
		},
		maxConcurrency: 1,
		// Future: MSW setup. For ticket 60, placeholder that does nothing.
		// Ticket 64 will implement `src/real/msw/setup.ts` with setupServer.
		setupFiles: ["src/real/msw/setup.ts"],
		// Don't run fast-path tests
		exclude: ["tests/**/*", "node_modules/**"],
	},
});
