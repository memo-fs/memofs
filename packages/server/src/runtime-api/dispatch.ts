/**
 * Runtime-API JSON-RPC dispatcher — the core that turns a parsed JSON-RPC
 * payload into a JSON-RPC response over a {@link MemoFS} runtime.
 *
 * @remarks
 * This is the heart of the `memofs-server` HTTP surface (s3-execution-plan
 * slice 1). It mirrors the dispatch shape in `memofs-mcp-server`'s protocol
 * server (parse → validate → batch/single → route → envelope) but routes over
 * the frozen `MemoFS` client API instead of MCP tools/resources.
 *
 * ## The write-gate (Hard ordering rule)
 *
 * The dispatcher refuses every mutating method (the {@link GATED_METHODS} set)
 * with a `503` JSON-RPC error **until a `concurrencyLayer` is injected**
 * (slice 3). This is the load-bearing safety invariant: no concurrent-write
 * surface is reachable before its serialization. The gate is
 * "method rejects," never "method present unsafely." Slice 3 flips it by
 * injecting the lock + delegating the mutating handlers to run inside it.
 *
 * The `503` carries a `data.httpStatus` field so the HTTP layer maps it to the
 * right status code without sniffing message text.
 *
 * @module dispatch
 */

import type { MemoFS } from "@memofs/core";
import {
	failure,
	isNotification,
	JSON_RPC_ERRORS,
	type JsonRpcId,
	type JsonRpcResponse,
	type JsonValue,
	parseJsonRpcPayload,
	success,
	validateJsonRpcRequest,
} from "@memofs/json-rpc";
import { GATED_METHODS, RUNTIME_METHOD } from "../protocol/methods";
import { RUNTIME_HANDLERS } from "./handlers";

/**
 * The concurrency-layer seam. Slice 1 leaves this `undefined`; slice 3
 * injects the lock + manifest validation so mutating handlers can
 * run safely under concurrent writers.
 *
 * Kept as an option type (not implemented today) so the dispatcher's signature
 * is stable across the slice boundary — slice 3 only adds the impl, not a new
 * surface.
 */
export interface ConcurrencyLayer {
	/** The project lock primitive (slice 3). Implemented then. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly acquire: (projectId: string, fn: () => Promise<any>) => Promise<any>;
}

/** Options for {@link dispatch} and {@link handleRuntimeMessage}. */
export interface DispatchOptions {
	/**
	 * The concurrency layer. When absent (slice 1), mutating methods are
	 * refused with `503`. When present (slice 3+), mutating handlers run inside
	 * `acquire` so concurrent writers serialize.
	 */
	concurrencyLayer?: ConcurrencyLayer;
}

/** The HTTP status carried in a gated-write `503` failure's `data`. */
export const CONCURRENCY_GATE_HTTP_STATUS = 503;

/** The JSON-RPC error code used for the concurrency gate (server-error band). */
export const CONCURRENCY_GATE_ERROR_CODE = -32000;

/** The canonical gated-write failure message. */
export const CONCURRENCY_GATE_MESSAGE =
	"Concurrent writes require the concurrency layer (slice 3). This method is read-only until it merges.";

/**
 * Builds the `503` concurrency-gate failure response for a request id.
 *
 * Centralized so the HTTP layer + tests reference one shape. `data.httpStatus`
 * lets the HTTP adapter map it to `503` without parsing the message.
 */
export function concurrencyGateFailure(id: JsonRpcId): JsonRpcResponse {
	return failure(id, CONCURRENCY_GATE_ERROR_CODE, CONCURRENCY_GATE_MESSAGE, {
		httpStatus: CONCURRENCY_GATE_HTTP_STATUS,
		reason: "concurrency_layer_required",
	} as JsonValue);
}

/**
 * Parses a raw JSON-RPC text payload and dispatches it.
 *
 * Used by the HTTP layer's `POST` path. Returns the stringified JSON-RPC
 * response (or `undefined` for a notification — though the HTTP path always
 * awaits a response, so notifications still produce no response body).
 *
 * @param tek - The assembled runtime.
 * @param text - The raw request body.
 * @param options - Dispatch options (the concurrency-layer seam).
 * @returns The stringified response, or `undefined` for a notification.
 */
export async function dispatchRuntimeText(
	tek: MemoFS,
	text: string,
	options: DispatchOptions = {},
): Promise<string | undefined> {
	let payload: unknown;
	try {
		payload = parseJsonRpcPayload(text);
	} catch (error) {
		// parseError is the one case where the request id is unknown — spec
		// mandates `null`.
		const message =
			error instanceof Error ? error.message : "Invalid JSON payload.";
		return JSON.stringify(failure(null, JSON_RPC_ERRORS.parseError, message));
	}
	const response = await dispatchRuntimeMessage(tek, payload, options);
	return response === undefined ? undefined : JSON.stringify(response);
}

/**
 * Dispatches a parsed JSON-RPC message (single or batch array).
 *
 * @param tek - The assembled runtime.
 * @param message - The parsed payload (object or array).
 * @param options - Dispatch options.
 * @returns The response, response array, or `undefined` (notification / empty
 * batch of notifications).
 */
export async function dispatchRuntimeMessage(
	tek: MemoFS,
	message: unknown,
	options: DispatchOptions = {},
): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined> {
	if (Array.isArray(message)) {
		if (message.length === 0) {
			return failure(
				null,
				JSON_RPC_ERRORS.invalidRequest,
				"JSON-RPC batch must not be empty.",
			);
		}
		const responses: JsonRpcResponse[] = [];
		for (const item of message) {
			const response = await dispatchSingle(tek, item, options);
			if (response !== undefined) responses.push(response);
		}
		return responses.length > 0 ? responses : undefined;
	}
	return dispatchSingle(tek, message, options);
}

/**
 * Dispatches a single JSON-RPC request.
 *
 * Validates the shape, enforces the write-gate, routes via the handler map,
 * and wraps the result/error in the spec envelope. Notifications produce no
 * response (the HTTP layer maps that to `202`).
 */
async function dispatchSingle(
	tek: MemoFS,
	message: unknown,
	options: DispatchOptions,
): Promise<JsonRpcResponse | undefined> {
	let request;
	try {
		request = validateJsonRpcRequest(message);
	} catch (error) {
		// Neutral protocol error from the SSOT — surface its mapped code/message.
		const code =
			error &&
			typeof error === "object" &&
			"jsonRpcCode" in error &&
			typeof error.jsonRpcCode === "number"
				? error.jsonRpcCode
				: JSON_RPC_ERRORS.invalidRequest;
		const message =
			error instanceof Error ? error.message : "Invalid JSON-RPC request.";
		return failure(null, code, message);
	}

	// Notifications get no response — even for unknown/gated methods (spec §4.1).
	if (isNotification(request)) {
		return undefined;
	}

	const id = request.id ?? null;
	const params = request.params ?? {};
	const handler = RUNTIME_HANDLERS[request.method];
	if (!handler) {
		return failure(
			id,
			JSON_RPC_ERRORS.methodNotFound,
			`Runtime method "${request.method}" is not available.`,
		);
	}

	// The write-gate (Hard ordering rule). Gated mutating methods:
	// - return 503 when no concurrency layer is injected (slice 1), AND
	// - run inside `concurrencyLayer.acquire` when one is (slice 3+), so
	// concurrent writers to the same project serialize through the lock.
	// The acquire wiring is real: slice 3 implements the lock + injects it
	// here; the test that exercises this path proves the acquire callback runs.
	if (GATED_METHODS.has(request.method)) {
		if (!options.concurrencyLayer) {
			return concurrencyGateFailure(id);
		}
		const projectId =
			typeof params.projectId === "string" ? params.projectId : tek.projectId;
		try {
			const result = await options.concurrencyLayer.acquire(projectId, () =>
				handler(tek, params),
			);
			return success(id, result);
		} catch (error) {
			return failure(
				id,
				errorCodeFor(error),
				messageFor(error),
				cleanErrorData(error),
			);
		}
	}

	try {
		const result = await handler(tek, params);
		return success(id, result);
	} catch (error) {
		// A handler's defensive TypeError on a missing/invalid param maps to
		// invalidParams; anything else is an internal error. Never leak stacks.
		return failure(id, errorCodeFor(error), messageFor(error));
	}
}

/**
 * Maps a handler/lock error to its JSON-RPC code. A defensive `TypeError`
 * (missing/invalid param) → `invalidParams`; anything else → `internalError`.
 */
function errorCodeFor(error: unknown): number {
	return error instanceof TypeError
		? JSON_RPC_ERRORS.invalidParams
		: JSON_RPC_ERRORS.internalError;
}

/**
 * Surfaces a handler error's message when it is a defensive `TypeError`
 * (useful to the caller), otherwise a generic "internal error" (never leak
 * stacks or internal details).
 */
function messageFor(error: unknown): string {
	return error instanceof TypeError ? error.message : "Internal runtime error.";
}

/**
 * Optional structured `data` for a failure envelope. Currently unused (the
 * gate carries its own `data`), but kept for the slice-3 lock-timeout path
 * which will surface `retryAfterMs` here.
 */
function cleanErrorData(_error: unknown): JsonValue | undefined {
	return undefined;
}

export { RUNTIME_METHOD };
