/**
 * TekMemo Cloud Worker entry.
 *
 * One Cloudflare Worker serves three concerns (ADR 0005):
 *   1. the JSON API at `/v1/*` (Hono) — health, readiness, sync;
 *   2. Better Auth at `/api/auth/*` — passwordless sign-in/session endpoints;
 *   3. the React Router v8 SSR dashboard + static assets for everything else.
 *
 * Routing is decided in this single Hono application: requests under `/v1` go
 * to the Hono API app; requests under `/api/auth` go to the Better Auth handler;
 * everything else goes to the React Router handler, which falls through to the
 * Static Assets (`ASSETS`) binding for built files.
 */

import { createRequestHandler } from "@react-router/cloudflare";
import { Hono } from "hono";
import { RouterContextProvider } from "react-router";
import { createApiApp } from "../src/.server/api";
import { createAuth } from "../src/.server/auth";

const app = new Hono<{ Bindings: Env }>();

// 1. Mount the Hono API sub-app
const api = createApiApp();
app.route("/", api);

// 2. Mount the Better Auth sub-app
app.all("/api/auth/*", (c) => {
	const auth = createAuth(c.executionCtx.waitUntil.bind(c.executionCtx));
	return auth.handler(c.req.raw);
});

// 3. Mount React Router SSR handler fallback
// Instantiate the request handler once outside the request path for efficiency.
const requestHandler = createRequestHandler({
	build: () => import("virtual:react-router/server-build"),
	mode: import.meta.env.MODE,
	getLoadContext(args) {
		const context = new RouterContextProvider();
		Object.assign(context, args.context);
		return context;
	},
});

app.all("*", (c) => {
	return requestHandler({
		request: c.req.raw,
		env: c.env,
		waitUntil: c.executionCtx.waitUntil.bind(c.executionCtx),
		passThroughOnException: c.executionCtx.passThroughOnException
			? c.executionCtx.passThroughOnException.bind(c.executionCtx)
			: () => {},
	} as Parameters<typeof requestHandler>[0]);
});

export default app;
