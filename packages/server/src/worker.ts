/**
 * Cloudflare Worker entry for `@memofs/server` — the runtime Worker.
 *
 * @remarks
 * This is the deployable Worker entry the cloud mounts as the **runtime
 * Worker** behind a Service Binding. The runtime is built lazily per
 * invocation via `createHostedRuntime` from env bindings.
 *
 * The default `createRuntime` throws — wire your own via
 * `createRuntimeFetchHandler` with a factory that reads your bindings
 * (R2, D1/Turso, AI, etc.). The Node bin (`bin/memofs-server.ts`) is the
 * zero-config alternative for self-hosters.
 */

import {
	createRuntimeFetchHandler,
	type RuntimeExecutionContext,
	type RuntimeWorkerEnv,
} from "./http/fetch-handler";

export { createRuntimeFetchHandler } from "./http/fetch-handler";
export type { RuntimeExecutionContext, RuntimeWorkerEnv };

/**
 * The Worker fetch handler. Wire `createRuntime` to your env-backed bundle
 * (R2 + Turso + Voyage + Workers AI, or your own adapters). The default
 * export only needs to be importable — construction is deferred to avoid
 * importing adapter packages into the runtime Worker's bundle before the
 * Service Binding is wired.
 */
export default {
	fetch: createRuntimeFetchHandler({
		// Placeholder: wire `createRuntime` to your env-backed bundle
		// (R2 + Turso + Voyage + Workers AI, or your own adapters).
		createRuntime: () => {
			throw new Error(
				"@memofs/server runtime Worker: wire createRuntime via createRuntimeFetchHandler. " +
					"Use the Node bin (packages/server/bin), or inject your adapter bundle.",
			);
		},
		requireAuth: false,
	}),
} satisfies {
	fetch: (
		request: Request,
		env: RuntimeWorkerEnv,
		ctx: RuntimeExecutionContext,
	) => Response | Promise<Response>;
};
