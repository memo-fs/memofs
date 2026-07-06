/**
 * The Hono API app — single source of truth for the cloud JSON API.
 *
 * Mounted at the `/v1` prefix. Today this wires the public health endpoints +
 * the request-wide middleware spine (requestId + envelope + error handling);
 * authenticated sync routes (`/v1/projects/:projectId/sync/*`) land in P2 and
 * compose in here as their own sub-apps.
 *
 * Consumed by one entrypoint: `workers/app.ts` — the single Cloud Worker
 * (`/v1` → this API app, `/api/auth/*` → Better Auth, else React Router SSR).
 * The same routing tree runs in dev (`react-router dev`) and prod.
 *
 * Middleware spine (order matters):
 *   1. `requestId`     — stamp + echo `x-request-id` + set `c.var.requestId`.
 *   2. route handlers   — health today; sync + auth compose in during P2.
 *   3. `notFound`       — 404 for unmatched `/v1/*` paths, envelope-shaped.
 *   4. `onError`        — catch every throw, serialize into `{ error, meta }`.
 *
 * The `Variables` type declares what middleware makes available on `c.var` so
 * handlers + helpers stay type-safe instead of reaching into `any`.
 */
import { type Context, Hono } from "hono";
import { routePath } from "hono/route";
import type { Database } from "../db";
import { connectorsApp } from "./connectors";
import { isApiError } from "./errors";
import { healthApp } from "./health";
import { json, jsonError } from "./json";
import type { AuthAccount } from "./middleware/auth";
import { requestIdMiddleware } from "./middleware/request-id";
import { syncApp } from "./sync";

/** Per-request values set by middleware and read by handlers/helpers. */
export interface ApiVariables {
	requestId: string;
	/** Authenticated account — set by `createAuthMiddleware` on protected routes. */
	account?: AuthAccount;
	/**
	 * Per-request drizzle client bound to `c.env`'s Turso config. Set by the
	 * sync router's `dbMiddleware` before any sync handler runs, so handlers
	 * read `c.get("db")` instead of constructing their own client. Health/
	 * readiness never touch the DB and don't pay the construction cost.
	 */
	db?: Database;
}

export type ApiEnv = { Bindings: Env; Variables: ApiVariables };

/**
 * Memoized billing sub-app (ADR 0006 / ADR 0011 Phase 2).
 *
 * `@polar-sh/sdk` + `@polar-sh/hono` hang under workerd's synchronous module-eval
 * (a hard stall, not a throw), so they cannot be imported eagerly at
 * `createApiApp()` eval time — doing so hangs the Worker on cold start. This
 * lazy loader `import()`s the billing sub-app on the first `/v1/billing/*`
 * request and memoizes it for the isolate's lifetime, so non-billing requests
 * (health, readiness, sync) never pay the Polar import cost. The first billing
 * request absorbs it once.
 */
let billingAppPromise: Promise<typeof import("./billing")> | undefined;

/** Lazily resolves the billing sub-app, importing it once per isolate. */
function loadBillingApp() {
	return (billingAppPromise ??= import("./billing"));
}

/**
 * Catch-all handler that mounts the lazily-imported billing sub-app on
 * `/v1/billing/*`. Forwards the request verbatim once the sub-app is resolved,
 * so the routing tree is identical to an eager `.route("/v1/billing", ...)`.
 */
const lazyBillingHandler = async (c: Context<ApiEnv>) => {
	const { billingApp } = await loadBillingApp();
	return billingApp.fetch(c.req.raw, c.env, c.executionCtx);
};

export function createApiApp() {
	return (
		new Hono<ApiEnv>()
			.use("*", requestIdMiddleware)
			.route("/v1", healthApp)
			// Sync routes carry their own auth + db middleware (both need `c.env`),
			// mounted under the project-scoped path the frozen client contract uses.
			.route("/v1/projects/:projectId/sync", syncApp)
			// Connectors routes: credentials resolution.
			.route("/v1/projects/:projectId/connectors", connectorsApp)
			// Billing routes (ADR 0006 / ADR 0011 Phase 2): Polar webhook
			// (signature-authenticated), checkout, and customer portal. Carry their
			// own db middleware; the webhook is NOT bearer-authenticated (Polar signs).
			//
			// LAZY-MOUNTED: the `@polar-sh/sdk` + `@polar-sh/hono` deps hang under
			// workerd's synchronous module-eval (a hard stall, not a throw), so
			// importing them eagerly in `createApiApp()` would hang the Worker on
			// cold start. The billing sub-app is dynamically `import()`-ed on the
			// first `/v1/billing/*` request and memoized — non-billing requests
			// (health, readiness, sync) never pay the Polar import cost, and the
			// routing tree is otherwise identical to an eager `.route()`.
			.all("/v1/billing/*", lazyBillingHandler)
			.notFound((c) => jsonError(c, 404, "not_found", "Unknown API route."))
			.onError((cause, c) => {
				// Our own `ApiError` carries a stable `code`, status, and optional
				// `details` — surface them verbatim. Anything else is an unexpected
				// throw; log the real message server-side, return a generic 500 to
				// the client (never leak internals/stacks).
				if (isApiError(cause)) {
					const message = cause.hideMessage
						? "Internal server error."
						: cause.message;
					return jsonError(
						c,
						cause.status,
						cause.code,
						message,
						cause.details,
						cause.headers,
					);
				}
				console.error(`[api] unhandled error on route ${routePath(c)}`, cause);
				return jsonError(c, 500, "internal_error", "Internal server error.");
			})
	);
}

// Re-exported so handlers can `import { json } from "../api"` without reaching
// into the helper module path — keeps the envelope SSOT obvious.
export { json, jsonError };
