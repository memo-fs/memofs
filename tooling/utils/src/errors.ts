/**
 * Base error class for all MemoFS packages.
 *
 * @remarks
 * Provides structured error handling with code, status, details, and cause support.
 * Used as the base class for both OSS and internal errors.
 *
 * @internal
 */
export class BaseError extends Error {
	/** Machine-readable error code (e.g., "VALIDATION", "API"). */
	public readonly code: string;
	/** Optional HTTP status code associated with the error. */
	public readonly status?: number;
	/** Optional structured details about the error. */
	public readonly details?: Record<string, unknown>;
	/** Optional original cause of this error (for chaining). */
	public readonly cause?: unknown;

	/**
	 * Creates a new BaseError.
	 *
	 * @param message - Human-readable error description.
	 * @param options - Optional code, status, details, and cause.
	 */
	constructor(
		message: string,
		options?: {
			code?: string;
			status?: number;
			details?: Record<string, unknown>;
			cause?: unknown;
		},
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = options?.code ?? "UNKNOWN";
		this.status = options?.status;
		this.details = options?.details;
		this.cause = options?.cause;
	}
}

/**
 * Common error codes used across MemoFS packages.
 */
export const ErrorCodes = {
	CONFIG: "CONFIG",
	VALIDATION: "VALIDATION",
	API: "API",
	NETWORK: "NETWORK",
	TIMEOUT: "TIMEOUT",
	RETRY_EXHAUSTED: "RETRY_EXHAUSTED",
	NOT_FOUND: "NOT_FOUND",
	PARSE: "PARSE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Default HTTP status codes that are considered retryable.
 */
export const DEFAULT_RETRYABLE_STATUSES = [
	408, 409, 425, 429, 500, 502, 503, 504,
] as const;

export type RetryableStatus = (typeof DEFAULT_RETRYABLE_STATUSES)[number];
