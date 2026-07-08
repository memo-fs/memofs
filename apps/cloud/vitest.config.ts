import { defineConfig } from "vitest/config";

/**
 * Node-pool unit/integration config.
 *
 * The cloud app's server modules (`~/.server/db`, `~/.server/runtime-client`,
 * `~/.server/context`) import `cloudflare:workers` to read the ambient `env`
 * binding at runtime inside the Worker. That builtin does NOT exist under the
 * node Vitest pool, so a bare `import { env } from "cloudflare:workers"` crashes
 * on module load — even though these node tests inject `env`/`db` via Hono's
 * context (`app.fetch(req, env)`, `c.set("db", db)`) and never read the
 * module-level `env`. The `cloudflare:workers` alias below stubs it to an empty
 * object so those modules import cleanly; real bindings come from the test
 * harness (`tests/utils/env.ts`, `tests/utils/db.ts`).
 *
 * The workers-runtime integration suite (which NEEDS the real `cloudflare:workers`)
 * runs under a separate config — see `vitest.workers.config.ts`.
 */
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/__tests__/**/*.test.ts"],
		server: {
			deps: {
				inline: [/cloudflare:workers/],
			},
		},
		alias: [
			{
				find: "cloudflare:workers",
				replacement: "/tests/stubs/cloudflare-workers.ts",
			},
		],
	},
});
