/**
 * @file Error classes for the @tekbreed/tekmemo/recall package.
 *
 * @remarks
 * Provides a hierarchy of error classes for different failure modes
 * including validation errors, dimension errors, and provider errors.
 *
 * @public
 */

/**
 * Additional details that can be attached to a RecallError.
 *
 * @public
 */
export interface RecallErrorDetails {
	[key: string]: unknown;
}

/**
 * Base error class for all recall-related errors.
 *
 * @remarks
 * All other error classes in this module extend this class.
 *
 * @public
 */
export class RecallError extends Error {
	readonly code: string;
	readonly details?: RecallErrorDetails;
	override readonly name: string = "RecallError";

	/**
	 * Creates a new RecallError instance.
	 *
	 * @param message - Human-readable error message
	 * @param options - Additional error options including code, details, and cause
	 *
	 * @public
	 */
	constructor(
		message: string,
		options: {
			code?: string;
			details?: RecallErrorDetails;
			cause?: unknown;
		} = {},
	) {
		super(
			message,
			options.cause === undefined ? undefined : { cause: options.cause },
		);
		this.code = options.code ?? "recall_error";
		this.details = options.details;
	}
}

/**
 * Error thrown when input validation fails.
 *
 * @public
 */
export class RecallValidationError extends RecallError {
	override readonly name: string = "RecallValidationError";

	/**
	 * Creates a new RecallValidationError instance.
	 *
	 * @param message - Human-readable error message
	 * @param details - Optional additional error details
	 *
	 * @public
	 */
	constructor(message: string, details?: RecallErrorDetails) {
		super(message, { code: "recall_validation_error", details });
	}
}

/**
 * Error thrown when a provider operation fails.
 *
 * @remarks
 * Used for external service errors (e.g., vector database, embedding API).
 *
 * @public
 */
export class RecallProviderError extends RecallError {
	override readonly name: string = "RecallProviderError";

	/**
	 * Creates a new RecallProviderError instance.
	 *
	 * @param message - Human-readable error message
	 * @param options - Provider error options including provider name and operation
	 *
	 * @public
	 */
	constructor(
		message: string,
		options: {
			provider?: string;
			operation?: string;
			details?: RecallErrorDetails;
			cause?: unknown;
		} = {},
	) {
		super(message, {
			code: "recall_provider_error",
			details: {
				provider: options.provider,
				operation: options.operation,
				...options.details,
			},
			cause: options.cause,
		});
	}
}

/**
 * Error thrown when embedding dimensions don't match expected values.
 *
 * @public
 */
export class RecallDimensionError extends RecallValidationError {
	override readonly name: string = "RecallDimensionError";
}

/**
 * Error thrown for operations that are not yet implemented.
 *
 * @public
 */
export class RecallNotImplementedError extends RecallError {
	override readonly name: string = "RecallNotImplementedError";

	/**
	 * Creates a new RecallNotImplementedError instance.
	 *
	 * @param message - Human-readable error message
	 * @param details - Optional additional error details
	 *
	 * @public
	 */
	constructor(message: string, details?: RecallErrorDetails) {
		super(message, { code: "recall_not_implemented", details });
	}
}
