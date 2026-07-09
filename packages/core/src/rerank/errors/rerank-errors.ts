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
		super(
			message,
			options?.cause === undefined ? undefined : { cause: options.cause },
		);
		this.name = this.constructor.name;
		this.code = code;
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
