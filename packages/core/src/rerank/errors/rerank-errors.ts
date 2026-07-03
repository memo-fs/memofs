/**
 * Error codes used by the rerank package.
 *
 * @public
 */
export type RerankErrorCode =
	| "RERANK_VALIDATION_ERROR"
	| "RERANK_PROVIDER_ERROR"
	| "RERANK_RESPONSE_ERROR";

/**
 * Base error class for all rerank-related errors.
 *
 * @public
 */
export class RerankError extends Error {
	/** The error code identifying the type of error. */
	readonly code: RerankErrorCode;
	/** The original cause of the error, if any. */
	readonly cause?: unknown;

	/**
	 * Creates a new RerankError.
	 *
	 * @param code - The error code identifying the type of error.
	 * @param message - The error message.
	 * @param options - Additional options including the original cause.
	 */
	constructor(
		code: RerankErrorCode,
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
 * Error thrown when rerank input or output validation fails.
 *
 * @public
 */
export class RerankValidationError extends RerankError {
	/**
	 * Creates a new RerankValidationError.
	 *
	 * @param message - The error message describing the validation failure.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("RERANK_VALIDATION_ERROR", message, options);
	}
}

/**
 * Error thrown when a rerank provider (e.g., external API) fails.
 *
 * @public
 */
export class RerankProviderError extends RerankError {
	/**
	 * Creates a new RerankProviderError.
	 *
	 * @param message - The error message describing the provider failure.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("RERANK_PROVIDER_ERROR", message, options);
	}
}

/**
 * Error thrown when a rerank provider returns an invalid or unexpected response.
 *
 * @public
 */
export class RerankResponseError extends RerankError {
	/**
	 * Creates a new RerankResponseError.
	 *
	 * @param message - The error message describing the response error.
	 * @param options - Additional options including the original cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("RERANK_RESPONSE_ERROR", message, options);
	}
}
