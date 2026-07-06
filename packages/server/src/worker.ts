/**
 * Cloudflare Worker entry for `memofs-server` ( — the runtime Worker).
 *
 * @remarks
 * This is the deployable Worker entry the cloud mounts as the **runtime
 * Worker** behind a Service Binding. Slice 2 wires the commercial Worker to
 * call it and swaps in the real env-backed provider bundle (R2 + Turso +
 * Voyage + Workers AI); slice 1 ships the entry shape + the Miniflare test
 * that proves the runtime-API boundary end-to-end against injected fakes.
 *
 * The runtime is built lazily per invocation via `createHostedRuntime` from
 * env bindings. For the slice-1 smoke test the bundle is fakes — see
 * `tests/workers/worker.ts`, the test-only entry that mirrors this entry with
 * a fake bundle (the cloud's own `tests/workers/worker.ts` split).
 *
 * Slice-2 note: the real `createRuntimeFromEnv` reads `env.BLOBS`,
 * `env.AI`, `env.VOYAGE_API_KEY`, and the drizzle client (built from the
 * Turso binding) — exactly mirroring `apps/cloud/src/server/hosted-runtime.ts`,
 * which slice 2 deletes in favour of this shared factory.
 */

import {
	createRuntimeFetchHandler,
	type RuntimeExecutionContext,
	type RuntimeWorkerEnv,
} from "./http/fetch-handler";

export { createRuntimeFetchHandler } from "./http/fetch-handler";
export type { RuntimeExecutionContext, RuntimeWorkerEnv };

/**
 * The Worker fetch handler. Slice 2 wires `createRuntime` to the real
 * env-backed bundle; the slice-1 Miniflare test uses its own entry with
 * injected fakes, so this default export only needs to exist + be importable.
 *
 * Construction is deferred to slice 2 to avoid importing adapter packages
 * (`memofs-adapter-r2`, `memofs-adapter-voyage`, `memofs-adapter-workers-ai`)
 * into the runtime Worker's bundle before the Service Binding is wired —
 * which would bloat it past the 3 MB free-plan cap the split exists to solve.
 */
export default {
	fetch: createRuntimeFetchHandler({
		// Slice-1 placeholder: the cloud's runtime Worker (apps/cloud/workers/
		// runtime.ts) wires the real env-backed bundle (R2 + Turso + Voyage +
		// Workers AI) in slice 2. This entry only needs to be importable.
		createRuntime: () => {
			throw new Error(
				"memofs-server runtime Worker: createRuntimeFromEnv is wired in slice 2. " +
					"Use the Node bin (packages/memofs-server/bin), the cloud's runtime " +
					"Worker (apps/cloud/workers/runtime.ts), or the Miniflare test entry for a runnable runtime.",
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
