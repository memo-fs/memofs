/**
 * `@memofs/server` — the OSS-deployable hosted-memory server.
 *
 * @remarks
 * Runs the **same** MemoFS memory engine the cloud runs, over a caller-supplied
 * store + provider bundle, with **no provider hardcoding**. The provider-neutral
 * {@link createHostedRuntime} factory assembles a {@link MemoFS} from injected
 * adapters; an OSS self-hoster deploys it as a single Node process, and the cloud
 * deploys it as the runtime Worker behind a Service Binding. The two
 * run **identical** factory code — the only difference is the adapters injected.
 *
 * Exports the JSON-RPC-over-HTTP runtime API (`recall` / `context` / `graph` /
 * `memory` over `dispatchRuntimeMessage`), the framework-free HTTP core
 * (`handleRuntimeRequest`), the Worker entry (`src/worker.ts`), and the Node
 * bin (`bin/memofs-server.ts`).
 *
 * The write surface is gated until the concurrency layer lands: mutating
 * methods return `503` until it merges.
 *
 * @public
 */

export {
	createHostedRuntime,
	type HostedRuntimeOptions,
} from "./hosted-runtime";
export {
	handleRuntimeRequest,
	type RuntimeHttpOptions,
} from "./http";
export {
	createRuntimeFetchHandler,
	type RuntimeExecutionContext,
	type RuntimeFetchHandler,
	type RuntimeFetchHandlerOptions,
	type RuntimeWorkerEnv,
} from "./http/fetch-handler";
export {
	GATED_METHODS,
	LIVE_METHODS,
	RUNTIME_METHOD,
} from "./protocol/methods";
export {
	CONCURRENCY_GATE_ERROR_CODE,
	CONCURRENCY_GATE_HTTP_STATUS,
	CONCURRENCY_GATE_MESSAGE,
	type ConcurrencyLayer,
	concurrencyGateFailure,
	type DispatchOptions,
	dispatchRuntimeMessage,
	dispatchRuntimeText,
} from "./runtime-api/dispatch";
