import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/**
 * Two-pool Vitest 4 config for `tekmemo-server`.
 *
 * Mirrors `apps/cloud/vitest.config.ts`'s split (Vitest 4 inline `test.projects`):
 *
 *   1. `server-unit` — Node pool. The dispatcher, handlers, HTTP-layer, and
 *      factory unit tests. Driven against `InMemoryMemoryStore` + fakes; no
 *      Worker bindings. The fast feedback loop.
 *   2. `server-workers` — Miniflare pool. Proves the runtime-API boundary
 *      end-to-end against the Worker target (the s3-execution-plan slice-1
 *      "Miniflare where the target is a Worker" bar) via `SELF.fetch` against
 *      the test entry in `tests/workers/worker.ts`.
 *   3. `server-bin` — Node pool. Boots the Node bin on an ephemeral port and
 *      exercises the same HTTP surface over real sockets (the "Node process"
 *      bar).
 */
export default defineConfig({
	test: {
		projects: [
			// --- 1. Node unit pool (dispatcher + handlers + http + factory) ----
			{
				test: {
					name: "server-unit",
					environment: "node",
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/workers/**", "tests/bin/**"],
					coverage: {
						reporter: ["text", "json", "html"],
					},
				},
			},
			// --- 2. Workers integration pool (Miniflare) -----------------------
			{
				plugins: [
					cloudflareTest({
						wrangler: { configPath: "./wrangler.test.jsonc" },
						// Fully offline — never reach real Cloudflare resources.
						remoteBindings: false,
					}),
				],
				test: {
					name: "server-workers",
					include: ["tests/workers/**/*.test.ts"],
				},
			},
			// --- 3. Node bin pool (real sockets) -------------------------------
			{
				test: {
					name: "server-bin",
					environment: "node",
					include: ["tests/bin/**/*.test.ts"],
				},
			},
		],
	},
});
