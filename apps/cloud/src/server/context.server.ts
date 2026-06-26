/**
 * Typed accessor for the Cloudflare load context (DRY seam).
 *
 * The `@react-router/cloudflare` adapter threads the Worker execution context
 * into every loader/action as `context.cloudflare` (carrying `env`, `cf`,
 * `ctx`, `caches`). `workers/app.ts` passes it straight through via
 * `getLoadContext`. React Router v8, however, types `context` as
 * `RouterContextProvider` — it doesn't reflect the adapter's `{ cloudflare }`
 * shape — so reaching into `context.cloudflare.env` directly won't typecheck.
 *
 * This helper bridges that gap with a single contained cast. Loaders/actions
 * call `getEnv(context)` instead of `context.cloudflare.env`, keeping the
 * looseness in one place (mirrors the `as never` bridge already in `app.ts`).
 *
 * @see {@link ./env} for the `CloudWorkerEnv` binding type.
 * @see {@link ../../workers/app.ts} `getLoadContext` — the runtime seam.
 */
import type { CloudWorkerEnv } from "./env";

/** The adapter-shaped context available in every loader/action at runtime. */
export interface CloudflareLoadContext {
	cloudflare: {
		/** Worker bindings declared in `wrangler.jsonc`. */
		env: CloudWorkerEnv;
		/** Cloudflare request properties (geo, colo, etc.). */
		cf: Request["cf"];
		/** Worker execution context (`waitUntil`, `passThroughOnException`). */
		ctx: ExecutionContext;
		/** Cache API. */
		caches: CacheStorage;
	};
}

/**
 * Extract the typed Worker bindings from a loader/action `context`.
 *
 * Use this in every server-side `loader`/`action` instead of
 * `context.cloudflare.env`:
 *
 * ```ts
 * export async function loader({ context }: Route.LoaderArgs) {
 *   const env = getEnv(context);
 *   // ...
 * }
 * ```
 */
export function getEnv(context: unknown): CloudWorkerEnv {
	return (context as CloudflareLoadContext).cloudflare.env;
}

/**
 * Extract the Worker execution context from a loader/action `context`.
 *
 * Needed to drain background work via `ctx.waitUntil` (e.g. the Upstash
 * rate-limiter's `pending` promise — see {@link ./rate-limit}). Sibling to
 * {@link getEnv}; same contained-cast rationale.
 */
export function getCtx(context: unknown): ExecutionContext {
	return (context as CloudflareLoadContext).cloudflare.ctx;
}
