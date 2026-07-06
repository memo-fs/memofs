/**
 * Worker fetch-handler factory for the `memofs-server` runtime API.
 *
 * @remarks
 * Returns a `(request, env, ctx) => Response` — the Cloudflare Worker `fetch`
 * signature (: the cloud deploys `memofs-server` as the **runtime
 * Worker** behind a Service Binding). Mirrors `memofs-mcp-server`'s
 * `createMemoFSMcpFetchHandler`.
 *
 * The runtime is supplied as a factory (`createRuntime`) rather than a single
 * instance so each Worker invocation can assemble it lazily from `env`
 * bindings. At slice 1 the cloud has not wired the Service Binding yet
 * (that's slice 2); the handler is proven against an injected fake runtime in
 * the Miniflare test, and the OSS self-hoster uses the Node bin (no Worker).
 */

import type { MemoFS } from "@memofs/core";
import { handleRuntimeRequest, type RuntimeHttpOptions } from "./index";

/**
 * Minimal Worker environment shape. The runtime Worker's real bindings (R2,
 * AI, vars) arrive in slice 2; slice 1 only needs the optional auth token.
 */
export interface RuntimeWorkerEnv {
	/** Optional bearer token for the runtime API (when exposed publicly). */
	MEMOFS_SERVER_TOKEN?: string;
	[key: string]: unknown;
}

/** Minimal Worker execution context (only `waitUntil` is ever used). */
export interface RuntimeExecutionContext {
	waitUntil?(promise: Promise<unknown>): void;
	passThroughOnException?(): void;
}

/**
 * Options for {@link createRuntimeFetchHandler}. The `createRuntime` factory
 * receives the request + env so it can read bindings AND route per-project
 * (slice 2's instance-map concern): the cloud's runtime Worker scopes each call
 * to a `MemoFS` instance keyed by a request header.
 */
export interface RuntimeFetchHandlerOptions {
	/**
	 * Builds the {@link MemoFS} runtime for a request. Called per invocation
	 * with the request + env so it can read a project-id header (the cloud's
	 * per-project instance map) and env bindings. Implementations may cache
	 * instances per project.
	 */
	createRuntime: (
		request: Request,
		env: RuntimeWorkerEnv,
	) => MemoFS | Promise<MemoFS>;
	/** Whether to require a bearer token (default: from `env`, else `false`). */
	requireAuth?: boolean;
	/** Allowed browser origins for CORS (default: none). */
	allowedOrigins?: readonly string[];
}

/** A Cloudflare Worker fetch handler for the runtime API. */
export type RuntimeFetchHandler = (
	request: Request,
	env: RuntimeWorkerEnv,
	ctx: RuntimeExecutionContext,
) => Response | Promise<Response>;

/**
 * Creates a Cloudflare Worker fetch handler for the runtime API.
 *
 * @param options - The runtime factory + auth/CORS options.
 * @returns A `(request, env, ctx) => Response` Worker fetch handler.
 */
export function createRuntimeFetchHandler(
	options: RuntimeFetchHandlerOptions,
): RuntimeFetchHandler {
	return async (request, env, _ctx) => {
		const runtime = await options.createRuntime(request, env);
		const httpOptions: RuntimeHttpOptions = {
			runtime,
			...(options.requireAuth === undefined
				? {}
				: { requireAuth: options.requireAuth }),
			...(env.MEMOFS_SERVER_TOKEN === undefined
				? {}
				: { bearerToken: env.MEMOFS_SERVER_TOKEN }),
			...(options.allowedOrigins === undefined
				? {}
				: { allowedOrigins: options.allowedOrigins }),
		};
		return handleRuntimeRequest(request, httpOptions);
	};
}
