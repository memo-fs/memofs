/**
 * TekMemo Cloud Worker entry.
 *
 * One Cloudflare Worker serves two concerns (ADR 0005):
 *   1. the JSON API at `/v1/*` (Hono) — health, readiness, sync;
 *   2. the React Router v8 SSR dashboard + static assets for everything else.
 *
 * Routing is decided in the fetch handler before any framework runs: requests
 * under `/v1` go to the Hono API app; everything else (HTML dashboard pages,
 * JS/CSS, favicons) goes to the React Router handler, which itself falls
 * through to the Static Assets (`ASSETS`) binding for built files. The
 * dashboard therefore owns the root URL space; the API owns only `/v1`.
 *
 * The Worker `env` (bindings declared in `wrangler.jsonc`) is threaded into
 * the React Router load context as `context.cloudflare.env`, so loaders and
 * actions read runtime config from bindings — never `process.env` (P0.5; see
 * `src/server/env.ts`).
 *
 * @see docs/adr/0005-cloud-tech-stack.md — one Worker (Hono API + RR v8 SSR).
 */

// The Vite-built server bundle. `@react-router/dev` generates this virtual
// module at build time; `react-router typegen` emits its type declaration.
import * as build from "virtual:react-router/server-build";
import { createRequestHandler } from "@react-router/cloudflare";
import { createApiApp } from "../src/api";
import type { CloudWorkerEnv } from "../src/server/env";

/**
 * The Hono API app (built once from the shared `createApiApp` SSOT in
 * `src/api/index.ts`). Mounted at `/v1`; everything else goes to SSR.
 */
const api = createApiApp();

/**
 * React Router SSR handler. The Cloudflare adapter already shapes the Worker
 * execution context into `args.context.cloudflare` (carrying `env`, `cf`,
 * `ctx.waitUntil`, `ctx.passThroughOnException`, `caches`), so we pass it
 * straight through as the load context. Dashboard loaders/actions read runtime
 * bindings from `context.cloudflare.env`.
 */
const handleSsr = createRequestHandler<CloudWorkerEnv>({
	build,
	// `mode` is intentionally omitted: the adapter derives it from the build,
	// which `@react-router/dev` sets from NODE_ENV at build time.
	//
	// `getLoadContext` returns the `{ cloudflare }` context the adapter already
	// shaped for us; loaders/actions read runtime bindings from
	// `context.cloudflare.env`. The cast bridges a known looseness in
	// `@react-router/cloudflare@8.x`: its `.d.ts` declares the return type as
	// `RouterContextProvider`, but its own implementation passes the value
	// straight through to `handleRequest(request, loadContext)` and only needs
	// it to be an `AppLoadContext`. (See adapter dist `createRequestHandler`.)
	getLoadContext: (args) => args.context as never,
});

export default {
	/**
	 * Fetch dispatcher: `/v1` → Hono API, everything else → React Router SSR
	 * (which itself serves built static assets via the `ASSETS` binding).
	 */
	async fetch(
		request: Request,
		env: CloudWorkerEnv,
		ctx: ExecutionContext,
	): Promise<Response> {
		const { pathname } = new URL(request.url);
		if (pathname === "/v1" || pathname.startsWith("/v1/")) {
			return api.fetch(request, env, ctx);
		}
		return handleSsr({ request, env, ctx } as never);
	},
};
