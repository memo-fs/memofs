import { defineConfig } from "vitest/config";

/**
 * Standalone vitest config for the cloud app.
 *
 * Vitest loads this file INSTEAD of `vite.config.ts` when present, which is
 * essential here: `vite.config.ts` composes `@cloudflare/vite-plugin`, and that
 * plugin mutates Vite's `resolve.external` in a way that is incompatible with
 * vitest's Node test runner (errors at `configResolved`). The cloud Worker
 * bindings are not needed for unit tests — pure helpers (presign, manifest diff,
 * envelope shaping) run on Web Crypto/stdlib alone.
 *
 * For tests that DO need a Worker runtime (R2 binding, `c.env`), use the
 * Playwright e2e suite (`playwright.config.ts`) or `unstable_devEnv` from
 * wrangler in a dedicated integration test — not vitest.
 */
export default defineConfig({
	resolve: {
		// Vitest/Node can't resolve the `~/*` Vite alias the app uses; tests that
		// import app modules use relative paths instead, so no alias is needed.
	},
	test: {
		environment: "node",
		include: ["src/**/__tests__/**/*.test.ts"],
	},
});
