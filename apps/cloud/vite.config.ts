import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { devApiPlugin } from "./vite/dev-api";

export default defineConfig({
	plugins: [
		tailwindcss(),
		reactRouter(),
		// Dev-only middleware: route `/v1/*` to the Hono API before React Router
		// sees it. This mirrors the production Worker's dispatch (in
		// `workers/app.ts`) so dev and prod serve identical API routes. No-op in
		// the build (`apply: "serve"`).
		devApiPlugin(),
		// Reads ./wrangler.jsonc so bindings (R2, vars, secrets) are available in
		// `wrangler dev` and as `context.cloudflare.env` inside loaders/actions.
		// `persistState: false` — sync state lives in Turso/D1, not the Worker's
		// local state; persisting wrangler's KV-backed state across dev runs would
		// only mask missing real bindings. (v1 API; the old `vitePluginConfig`
		// shape was removed in @cloudflare/vite-plugin 1.x.)
		cloudflare({ persistState: false }),
	],
	resolve: {
		tsconfigPaths: true,
	},
});
