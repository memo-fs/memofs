/**
 * Typed throwable errors for the cloud API.
 *
 * Handlers throw `ApiError` (or a subclass) to short-circuit with a structured
 * HTTP response; the global `onError` handler in `index.ts` catches every throw
 * and serializes it into the `{ error: { code, message, details? }, meta }`
 * envelope the client transport unwraps (`cloud-client/types.ts`).
 *
 * Why a custom error hierarchy and not Hono's `HTTPException`:
 *   - `HTTPException` reshapes the body to `{ message }` and needs a custom
 *     handler to emit our envelope + `requestId` anyway. We'd be fighting it.
 *   - Our client contract carries a `code` (machine-readable, stable) distinct
 *     from `message` (human-readable); `HTTPException` has no `code` field.
 *   - Subclasses (`AuthError`, `EntitlementError`, …) let auth/entitlement
 *     middleware throw semantically without each handler re-deriving a status.
 *
 * Status codes are chosen to match what `TekMemoCloudTransport` maps back to the
 * typed error classes (`createHttpError` in `cloud-client/errors.ts`): 401→Auth,
 * 403→Permission, 404→NotFound, 409→Conflict, 422→Validation, 429→RateLimit,
 * 402→PaymentRequired (the entitlement upgrade payload, §12.3). 503 is reserved
 * for `ConcurrencyError` (ADR 0010 §6) — a transient write-lock contention that
 * the client retries after `retryAfterMs`.
 *
 * @see packages/tekmemo/src/cloud-client/errors.ts — client-side decoding.
 */
import type { JsonValue } from "@tekmemo/core/cloud-client";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { PlanTier } from "../db/schema";

/**
 * HTTP response headers an `ApiError` wants attached to its serialized
 * response. Used today by `RateLimitError` / `ConcurrencyError` to carry
 * `Retry-After`; the global `onError` handler spreads these onto the response.
 */
export type ApiErrorHeaders = Record<string, string>;

export interface ApiErrorOptions {
	code: string;
	message: string;
	status?: number;
	details?: JsonValue;
	/** Hide the internal message from the response body for 5xx (see onError). */
	hideMessage?: boolean;
	/** Response headers the global error handler should attach (e.g. Retry-After). */
	headers?: ApiErrorHeaders;
	cause?: unknown;
}

export class ApiError extends Error {
	readonly status: ContentfulStatusCode;
	readonly code: string;
	readonly details?: JsonValue;
	readonly hideMessage: boolean;
	/** Response headers to attach when serialized (see `onError` in `index.ts`). */
	readonly headers?: ApiErrorHeaders;
	override readonly cause?: unknown;

	constructor(options: ApiErrorOptions) {
		super(options.message);
		this.name = new.target.name;
		this.code = options.code;
		this.status = (options.status ?? 500) as ContentfulStatusCode;
		this.details = options.details;
		this.hideMessage = options.hideMessage ?? Number(this.status) >= 500;
		this.headers = options.headers;
		this.cause = options.cause;
	}
}

/** 400 — malformed request body / params. */
export class ValidationError extends ApiError {
	constructor(message: string, details?: JsonValue) {
		super({ code: "validation_error", message, status: 400, details });
	}
}

/** 401 — missing/invalid bearer token (§12.4). */
export class AuthError extends ApiError {
	constructor(message = "Authentication required.", details?: JsonValue) {
		super({ code: "unauthorized", message, status: 401, details });
	}
}

/** 403 — authenticated but not allowed to touch this project. */
export class PermissionError extends ApiError {
	constructor(message = "Forbidden.", details?: JsonValue) {
		super({ code: "forbidden", message, status: 403, details });
	}
}

/** 404 — project/file/route not found. */
export class NotFoundError extends ApiError {
	constructor(message = "Not found.", details?: JsonValue) {
		super({ code: "not_found", message, status: 404, details });
	}
}

/** 409 — cursor/version conflict (§4.4 push semantics). */
export class ConflictError extends ApiError {
	constructor(message: string, details?: JsonValue) {
		super({ code: "conflict", message, status: 409, details });
	}
}

/**
 * 402 — entitlement limit hit (§12.3). Carries the structured `upgrade` payload
 * the dashboard / CLI can render: the limit hit, the current vs. requested
 * bytes, and the plan to upgrade to.
 */
export class EntitlementError extends ApiError {
	constructor(
		message: string,
		details: {
			limit: "storage" | "connectors";
			used: number;
			requested: number;
			max: number;
			plan: PlanTier;
		},
	) {
		super({
			code: "entitlement_limit_exceeded",
			message,
			status: 402,
			details: details as JsonValue,
		});
	}
}

/**
 * 429 — rate limited. `retryAfterMs` becomes the `Retry-After` header (seconds).
 * Carried in `headers` so the global `onError` handler attaches it; also kept on
 * the instance for programmatic access / tests.
 */
export class RateLimitError extends ApiError {
	readonly retryAfterMs?: number;
	constructor(message = "Rate limit exceeded.", retryAfterMs?: number) {
		super({
			code: "rate_limited",
			message,
			status: 429,
			headers: retryAfterMs
				? { "retry-after": String(Math.ceil(retryAfterMs / 1000)) }
				: undefined,
		});
		this.retryAfterMs = retryAfterMs;
	}
}

/**
 * 503 — write-lock contention (ADR 0010 §6). Thrown when a multi-writer commit
 * could not acquire the project's `BEGIN IMMEDIATE` write lock within the
 * libSQL interactive-transaction timeout (≈5s queue). Transient by definition:
 * the client should retry the same `push/complete` after `retryAfterMs`.
 *
 * The optimistic-cursor variant of push contention (a stale `baseCursor`) is NOT
 * this error — that is a deterministic `ConflictError` (409) carrying the
 * current cursor, because the client can make forward progress only by
 * re-diffing. `ConcurrencyError` is purely "try again in a moment."
 *
 * `details.currentCursor` lets a client that lost the race surface "another
 * agent committed at <cursor>" without a separate round-trip.
 */
export class ConcurrencyError extends ApiError {
	readonly retryAfterMs: number;
	constructor(
		message = "Project is currently being written by another agent. Retry shortly.",
		opts: { retryAfterMs?: number; currentCursor?: string } = {},
	) {
		const retryAfterMs = opts.retryAfterMs ?? DEFAULT_CONCURRENCY_RETRY_MS;
		super({
			code: "concurrency_locked",
			message,
			status: 503,
			headers: {
				"retry-after": String(Math.ceil(retryAfterMs / 1000)),
			},
			details: opts.currentCursor
				? ({ retryAfterMs, currentCursor: opts.currentCursor } as JsonValue)
				: ({ retryAfterMs } as JsonValue),
		});
		this.retryAfterMs = retryAfterMs;
	}
}

/**
 * Default `Retry-After` hint (ms) for write-lock contention. Chosen just above
 * the libSQL interactive-transaction lock-acquisition timeout so a client that
 * backs off this long is virtually certain to find the lock free.
 */
export const DEFAULT_CONCURRENCY_RETRY_MS = 2000;

/** True if a thrown value is one of ours (vs. an unexpected third-party throw). */
export function isApiError(value: unknown): value is ApiError {
	return value instanceof ApiError;
}
