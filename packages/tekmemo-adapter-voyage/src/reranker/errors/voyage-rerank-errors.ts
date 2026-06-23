/**
 * @file Error classes for Voyage AI rerank operations.
 *
 * @remarks
 * This module defines the error types thrown by the Voyage AI rerank adapter.
 * All errors extend the base VoyageRerankError class and include a specific
 * error code for programmatic handling.
 *
 * @public
 */

/**
 * Error codes for Voyage AI rerank operations.
 *
 * @public
 */
export type VoyageRerankErrorCode =
	| "VOYAGE_RERANK_CONFIG_ERROR"
	| "VOYAGE_RERANK_VALIDATION_ERROR"
	| "VOYAGE_RERANK_API_ERROR"
	| "VOYAGE_RERANK_NETWORK_ERROR"
	| "VOYAGE_RERANK_TIMEOUT_ERROR"
	| "VOYAGE_RERANK_RESPONSE_ERROR";

/**
 * Base error class for all Voyage AI rerank errors.
 *
 * @public
 */
export class VoyageRerankError extends Error {
	/** The error code identifying the type of error. */
	readonly code: VoyageRerankErrorCode;
	/** The original cause of the error, if available. */
	readonly cause?: unknown;

	/**
	 * Creates a new VoyageRerankError.
	 *
	 * @param code - The error code identifying the error type.
	 * @param message - Human-readable error message.
	 * @param options - Additional options including the original cause.
	 */
	constructor(
		code: VoyageRerankErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.cause = options?.cause;
	}
}

/**
 * Error thrown when Voyage AI rerank configuration is invalid.
 *
 * @public
 * @remarks
 * This error is thrown for issues like missing API keys, invalid base URLs,
 * or invalid client configurations.
 */
export class VoyageRerankConfigError extends VoyageRerankError {
	/**
	 * Creates a new VoyageRerankConfigError.
	 *
	 * @param message - Human-readable error message.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_RERANK_CONFIG_ERROR", message, options);
	}
}

/**
 * Error thrown when Voyage AI rerank input validation fails.
 *
 * @public
 * @remarks
 * This error is thrown for issues like invalid models, empty documents,
 * or document counts exceeding limits.
 */
export class VoyageRerankValidationError extends VoyageRerankError {
	/**
	 * Creates a new VoyageRerankValidationError.
	 *
	 * @param message - Human-readable error message.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_RERANK_VALIDATION_ERROR", message, options);
	}
}

/**
 * Error thrown when the Voyage AI API returns an error response.
 *
 * @public
 * @remarks
 * This error includes the HTTP status code and optionally the provider's
 * error code and response body for debugging.
 */
export class VoyageRerankApiError extends VoyageRerankError {
	/** The HTTP status code returned by the API. */
	readonly status: number;
	/** The error code returned by the Voyage AI API, if available. */
	readonly providerCode: string | undefined;
	/** The full response body from the API, if available. */
	readonly providerBody: unknown | undefined;

	/**
	 * Creates a new VoyageRerankApiError.
	 *
	 * @param message - Human-readable error message.
	 * @param input - Error details including status, provider code, and body.
	 */
	constructor(
		message: string,
		input: {
			status: number;
			providerCode?: string | undefined;
			providerBody?: unknown;
			cause?: unknown;
		},
	) {
		super("VOYAGE_RERANK_API_ERROR", message, { cause: input.cause });
		this.status = input.status;
		this.providerCode = input.providerCode;
		this.providerBody = input.providerBody;
	}
}

/**
 * Error thrown when a network issue occurs during Voyage AI API requests.
 *
 * @public
 * @remarks
 * This error is thrown for network-level failures like DNS resolution
 * failures, connection timeouts, or refused connections.
 */
export class VoyageRerankNetworkError extends VoyageRerankError {
	/**
	 * Creates a new VoyageRerankNetworkError.
	 *
	 * @param message - Human-readable error message.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_RERANK_NETWORK_ERROR", message, options);
	}
}

/**
 * Error thrown when a Voyage AI API request times out.
 *
 * @public
 * @remarks
 * This error is thrown when the request exceeds the configured timeout
 * duration. The timeout is controlled by the `timeoutMs` configuration option.
 */
export class VoyageRerankTimeoutError extends VoyageRerankError {
	/**
	 * Creates a new VoyageRerankTimeoutError.
	 *
	 * @param message - Human-readable error message.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_RERANK_TIMEOUT_ERROR", message, options);
	}
}

/**
 * Error thrown when the Voyage AI API returns a malformed or invalid response.
 *
 * @public
 * @remarks
 * This error is thrown when the API response cannot be parsed as JSON,
 * is not an object, or is missing required fields like `data`.
 */
export class VoyageRerankResponseError extends VoyageRerankError {
	/**
	 * Creates a new VoyageRerankResponseError.
	 *
	 * @param message - Human-readable error message.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_RERANK_RESPONSE_ERROR", message, options);
	}
}
