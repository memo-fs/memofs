// /**
//  * TekMemo Cloud Worker entry.
//  *
//  * One Cloudflare Worker serves the JSON API, Better Auth, hosted-memory helper
//  * code, and the React Router SSR dashboard. Hosted-memory reads run in-process
//  * through `src/server/runtime-client.ts`; there is no second runtime Worker.
//  */
// import * as build from "virtual:react-router/server-build";
// import { createRequestHandler } from "@react-router/cloudflare";
// import { createApiApp } from "../src/api";
// import { createDb } from "../src/db/index.server";
// import { createAuth } from "../src/server/auth";
// import { createMagicLinkMailer } from "../src/server/email";
// import type { CloudWorkerEnv } from "../src/server/env";

// const api = createApiApp();
// const handleSsr = createRequestHandler<CloudWorkerEnv>({
// 	build,
// 	getLoadContext: (args) => args.context as never,
// });

// export default {
// 	async fetch(
// 		request: Request,
// 		env: CloudWorkerEnv,
// 		ctx: ExecutionContext,
// 	): Promise<Response> {
// 		const { pathname } = new URL(request.url);
// 		if (pathname === "/v1" || pathname.startsWith("/v1/")) {
// 			return api.fetch(request, env, ctx);
// 		}
// 		if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
// 			const db = createDb(env);
// 			const auth = createAuth(env, db, createMagicLinkMailer(env));
// 			return auth.handler(request);
// 		}
// 		return handleSsr({ request, env, ctx } as never);
// 	},
// };

import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { createRequestHandler } from "react-router";

export interface Env {
	DB: D1Database;
}

const app = new Hono();

function _getDB(env: Env) {
	return drizzle(env.DB);
}

app.get("/", (c) => {
	console.log(c.env);
	return c.text("Hello, world!");
});

// Add more routes here

app.get("*", (c) => {
	const requestHandler = createRequestHandler(
		() => import("virtual:react-router/server-build"),
		import.meta.env.MODE,
	);

	return requestHandler(c.req.raw, {
		cf: { env: c.env, ctx: c.executionCtx },
	});
});

export default app;
