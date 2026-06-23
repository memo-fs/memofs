/**
 * Dev-only Vite plugin that mirrors the production Worker's request dispatch.
 *
 * PROBLEM: `react-router dev` runs the RR server-runtime as Vite middleware,
 * so EVERY request — including `/v1/*` — is handled by React Router. The
 * Worker `fetch` handler in `workers/app.ts` (which splits `/v1` → Hono API
 * vs everything else → SSR) never runs in dev; it only runs under
 * `wrangler dev`/deploy, where `workers/app.ts` is the entry.
 *
 * FIX: this plugin installs a `configureServer` hook that runs BEFORE RR's
 * middleware and routes `/v1/*` to the same Hono API the Worker uses, so dev
 * and prod routing stay identical. Non-`/v1` requests fall through to RR.
 *
 * SSOT: it loads `workers/dev-api.ts`, which builds the SAME `createApiApp()`
 * routing tree the production Worker builds. The routing tree itself lives in
 * `src/api/index.ts` and is imported by both entries.
 */
import type { Plugin } from "vite";

export function devApiPlugin(): Plugin {
	return {
		name: "tekmemo-cloud:dev-api",
		apply: "serve", // dev only — never injected into the build
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url ?? "/";
				if (url !== "/v1" && !url.startsWith("/v1/")) {
					return next(); // hand off to React Router
				}

				try {
					const { devApi } = await server.ssrLoadModule("/workers/dev-api.ts");

					// Collect the Node request body into a Uint8Array, then build a web
					// Request. (Health routes are GET-only today; the buffering cost
					// is negligible in dev and keeps streaming edge cases out of the
					// bridge.)
					const body =
						req.method === "GET" || req.method === "HEAD"
							? undefined
							: await readNodeRequestBody(req);
					// `body` is `Uint8Array | undefined`. We cast through `BodyInit`
					// because TS 5.7+ parameterises `Uint8Array<ArrayBufferLike>`,
					// whose union-membership in the `BodyInit` type widens in a way
					// tsc rejects even though a Uint8Array is a valid fetch body.
					const request = new Request(`http://localhost${url}`, {
						method: req.method,
						headers: req.headers as HeadersInit,
						body: body as BodyInit,
					});
					const response = await devApi.fetch(request);

					res.statusCode = response.status;
					response.headers.forEach((value: string, key: string) => {
						res.setHeader(key, value);
					});
					if (response.body) {
						const reader = response.body.getReader();
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							res.write(value);
						}
					}
					res.end();
				} catch (error) {
					console.error("[dev-api] error handling", req.url, error);
					next(error);
				}
			});
		},
	};
}

function readNodeRequestBody(
	req: import("http").IncomingMessage,
): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (c: Buffer) => chunks.push(c));
		// `Buffer extends Uint8Array`; upcast keeps the web-side `BodyInit` happy
		// (see the `as BodyInit` cast at the Request construction site).
		req.on("end", () =>
			resolve(Buffer.concat(chunks) as unknown as Uint8Array),
		);
		req.on("error", reject);
	});
}
