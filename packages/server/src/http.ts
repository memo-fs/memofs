import type { Context } from "hono";
import { TekMemoServerError } from "./errors.js";
import type {
	JsonValue,
	TekMemoServerEnvelope,
	TekMemoServerErrorEnvelope,
} from "./types.js";

export function getRequestId(c: Context): string {
	return c.get("requestId") as string;
}

export function success<T>(c: Context, data: T, status = 200): Response {
	const body: TekMemoServerEnvelope<T> = {
		data,
		meta: { requestId: getRequestId(c) },
	};
	return c.json(body, status as never);
}

export function failure(c: Context, error: unknown): Response {
	const requestId = getRequestId(c);
	const normalized = normalizeError(error);
	const body: TekMemoServerErrorEnvelope = {
		error: {
			code: normalized.code,
			message: normalized.message,
		},
		meta: { requestId },
	};
	if (normalized.details !== undefined) {
		body.error.details = normalized.details as JsonValue;
	}
	return c.json(body, normalized.status as never);
}

function normalizeError(error: unknown): {
	status: number;
	code: string;
	message: string;
	details?: unknown;
} {
	if (error instanceof TekMemoServerError) {
		return {
			status: error.status,
			code: error.code,
			message: error.message,
			details: error.details,
		};
	}
	return {
		status: 500,
		code: "internal_server_error",
		message:
			error instanceof Error ? error.message : "Unexpected server error.",
	};
}
