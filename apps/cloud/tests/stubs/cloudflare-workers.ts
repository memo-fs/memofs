/**
 * Node-pool stub for the `cloudflare:workers` builtin.
 *
 * The real module is injected by the Workers runtime (and by
 * `@cloudflare/vitest-pool-workers` in the integration suite). Under the node
 * pool it does not exist, so this stub lets the ambient `env`-importing server
 * modules (`~/.server/db`, `~/.server/runtime-client`, `~/.server/context`)
 * load without crashing. Node-pool tests inject bindings via Hono's context
 * (`app.fetch(req, env)`, `c.set("db", db)`), so `env` here is never read.
 *
 * This file is referenced by the `alias` in `vitest.config.ts` ONLY; the workers
 * pool uses the real builtin.
 *
 * @see vitest.workers.config.ts for the real-binding integration suite.
 */
export const env = {} as Record<string, unknown>;
