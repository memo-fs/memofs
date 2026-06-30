/**
 * `@tekbreed/tekmemo-server` — the OSS-deployable hosted-memory server.
 *
 * @remarks
 * Runs the **same** TekMemo memory engine the cloud runs, over a caller-supplied
 * store + provider bundle, with **no provider hardcoding**. The provider-neutral
 * {@link createHostedRuntime} factory assembles a {@link Tekmemo} from injected
 * adapters; an OSS self-hoster deploys it as a single Node process, and the cloud
 * deploys it as the runtime Worker behind a Service Binding (ADR 0013). The two
 * run **identical** factory code — the only difference is the adapters injected.
 *
 * Slice 0 (this release) lands the factory + the `LlmClient` core contract. The
 * HTTP surface is slice 1. See
 * [s3-execution-plan.md](../../docs/architecture/s3-execution-plan.md).
 *
 * @public
 */

export {
	createHostedRuntime,
	type HostedRuntimeOptions,
} from "./hosted-runtime";
