/**
 * Response-envelope parsing for the cloud transport.
 *
 * @remarks
 * Extracted from `transport.ts` to isolate the envelope shape contract
 * (`{ data, meta }` / `{ error, meta }`) from the HTTP request mechanics. The
 * transport class delegates response-body interpretation here.
 *
 * @internal
 */

import {
	MemoFSCloudResponseParseError,
	createHttpError,
} from "./errors";
import type {
	MemoFSCloudErrorEnvelope,
	MemoFsCloudSuccessEnvelope,
} from "./types";

/**
 * Parses the response body as JSON, handling empty bodies and parse failures.
 */
export async function parseJsonPayload(response: {
	text(): Promise<string>;
	status: number;
}): Promise<unknown> {
	const text = await response.text();
	if (!text.trim()) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch (cause) {
		throw new MemoFSCloudResponseParseError({
			code: "invalid_json_response",
			message: "MemoFS Cloud response was not valid JSON.",
			status: response.status,
			cause,
		});
	}
}

/**
 * Unwraps a success envelope, throwing on error envelopes and malformed shapes.
 */
export function unwrapSuccessPayload<T>(
	payload: unknown,
	headerRequestId: string | undefined,
): T {
	if (isSuccessEnvelope<T>(payload)) return payload.data;
	if (isErrorEnvelope(payload)) {
		throw createHttpError({
			code: payload.error.code,
			message: payload.error.message,
			requestId: payload.meta?.requestId ?? headerRequestId,
			details: payload.error.details,
		});
	}

	throw new MemoFSCloudResponseParseError({
		code: "invalid_response_envelope",
		message:
			"MemoFS Cloud response must use { data, meta } or { error, meta } envelope.",
		requestId: headerRequestId,
	});
}

/**
 * Extracts the error body from a non-ok response, tolerating non-envelope
 * shapes (e.g. a plain `{ message }` or an empty body).
 */
export function unwrapErrorBody(
	payload: unknown,
	headerRequestId: string | undefined,
): { code?: string; message?: string; details?: unknown; requestId?: string } {
	if (isErrorEnvelope(payload)) {
		return {
			code: payload.error.code,
			message: payload.error.message,
			details: payload.error.details,
			requestId: payload.meta?.requestId ?? headerRequestId,
		};
	}

	if (typeof payload === "object" && payload !== null && "message" in payload) {
		return {
			message: String((payload as { message: unknown }).message),
			requestId: headerRequestId,
		};
	}
	return { requestId: headerRequestId };
}

/**
 * Type guard for the success envelope `{ data, meta }`.
 */
export function isSuccessEnvelope<T>(
	payload: unknown,
): payload is MemoFsCloudSuccessEnvelope<T> {
	return (
		typeof payload === "object" &&
		payload !== null &&
		"data" in payload &&
		!("error" in payload)
	);
}

/**
 * Type guard for the error envelope `{ error, meta }`.
 */
export function isErrorEnvelope(
	payload: unknown,
): payload is MemoFSCloudErrorEnvelope {
	return (
		typeof payload === "object" &&
		payload !== null &&
		"error" in payload &&
		typeof (payload as { error?: unknown }).error === "object" &&
		(payload as { error?: unknown }).error !== null
	);
}
