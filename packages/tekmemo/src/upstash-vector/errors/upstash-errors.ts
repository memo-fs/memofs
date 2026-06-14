import { RecallProviderError, RecallValidationError } from "../../recall/index";

/**
 * @file Custom error types for Upstash Vector operations.
 *
 * @remarks
 * These errors extend the base TekMemo error types with Upstash-specific
 * context and naming.
 *
 * @internal
 */

type RecallErrorDetails = Record<string, unknown>;

/**
 * Error thrown when an Upstash Vector operation fails at the provider level.
 *
 * @public
 */
export class UpstashRecallError extends RecallProviderError {
	override readonly name = "UpstashRecallError";

	/**
	 * Creates a new UpstashRecallError.
	 *
	 * @param message - The error message.
	 * @param options - Additional error context including operation, details, and cause.
	 */
	constructor(
		message: string,
		options: {
			operation?: string;
			details?: RecallErrorDetails;
			cause?: unknown;
		} = {},
	) {
		super(message, {
			provider: "upstash",
			operation: options.operation,
			details: options.details,
			cause: options.cause,
		});
	}
}

/**
 * Error thrown when Upstash Vector input validation fails.
 *
 * @public
 */
export class UpstashRecallValidationError extends RecallValidationError {
	override readonly name = "UpstashRecallValidationError";

	/**
	 * Creates a new UpstashRecallValidationError.
	 *
	 * @param message - The error message.
	 * @param details - Optional additional error details.
	 */
	constructor(message: string, details?: RecallErrorDetails) {
		super(message, { provider: "upstash", ...details });
	}
}
