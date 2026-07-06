/**
 * Response envelope helpers — the SSOT for how the cloud API shapes JSON.
 *
 * The published `@memofs/core/cloud-client` transport unwraps exactly two
 * shapes (`cloud-client/transport.ts` `isSuccessEnvelope` / `isErrorEnvelope`):
 *
 *   success: { data, meta: { requestId, ... } }
 *   error:   { error: { code, message, details? }, meta: { requestId, ... } }
 *
 * Every cloud response MUST go through `json()` / `jsonError()` so the wire
 * contract the client compiles against stays in one place. `requestId` is
 * threaded from the `requestId` middleware (set on `c.var`) so a single id
 * echoes through the request lifecycle, the `x-request-id` header, and the
 * envelope `meta` — matching what `MemofsCloudTransport` reads back to populate
 * `error.requestId` on thrown client errors.
 *
 * @see packages/memofs/src/cloud-client/types.ts — the frozen envelope types.
 * @see packages/memofs/src/cloud-client/transport.ts — unwrap/throw on these.
 */

import type {
	JsonValue,
	MemoFSCloudErrorEnvelope,
	MemoFSCloudMeta,
	MemoFsCloudSuccessEnvelope,
} from "@memofs/core/cloud-client";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Builds the `{ data, meta }` success envelope. `requestId` is pulled from the
 * Hono context variable the `requestId` middleware sets, so callers never pass
 * it explicitly.
 */
export function successBody<T>(
	c: Context,
	data: T,
	extraMeta?: MemoFSCloudMeta,
): MemoFsCloudSuccessEnvelope<T> {
	const requestId = c.get("requestId");
	return {
		data,
		meta: { requestId, ...extraMeta },
	};
}

/**
 * Builds the `{ error: { code, message, details? }, meta }` error envelope.
 * Used by the global error + notFound handlers (and directly where a handler
 * needs to short-circuit with a structured error without throwing).
 */
export function errorBody(
	c: Context,
	code: string,
	message: string,
	details?: JsonValue,
	extraMeta?: MemoFSCloudMeta,
): MemoFSCloudErrorEnvelope {
	const requestId = c.get("requestId");
	return {
		error: { code, message, details },
		meta: { requestId, ...extraMeta },
	};
}

/**
 * Sends a 200 success response in the envelope. The Hono `c.json()` accepts the
 * body + status; we set `x-request-id` so clients that read the header (the
 * transport's `getHeader(headers, "x-request-id")`) get the same id as `meta`.
 */
export function json<T>(
	c: Context,
	data: T,
	status: ContentfulStatusCode = 200,
) {
	return c.json(successBody(c, data), status, {
		"x-request-id": requestIdFrom(c) ?? "",
	});
}

/**
 * Sends an error response in the envelope. Prefer throwing `ApiError` from
 * inside handlers (the global `onError` serializes it); use this helper only
 * for the rare case where you need to return an error Response directly.
 *
 * `headers` (e.g. `Retry-After` from `RateLimitError`/`ConcurrencyError`) is
 * merged onto the response alongside the always-present `x-request-id`.
 */
export function jsonError(
	c: Context,
	status: ContentfulStatusCode,
	code: string,
	message: string,
	details?: JsonValue,
	headers?: Record<string, string>,
) {
	return c.json(errorBody(c, code, message, details), status, {
		"x-request-id": requestIdFrom(c) ?? "",
		...headers,
	});
}

/** Reads the current request id (set by the `requestId` middleware). */
export function requestIdFrom(c: Context): string | undefined {
	return c.get("requestId");
}
