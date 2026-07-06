/**
 * @file Error classes for the @memofs/core/agentfs package.
 *
 * @remarks
 * All errors in this package extend the base {@link AgentfsError} class,
 * which provides a consistent structure with error codes, details, and cause chaining.
 *
 * @internal
 */

/**
 * Error codes used by {@link AgentfsError} and its subclasses.
 *
 * @public
 */
export type AgentfsErrorCode =
	| "AGENTFS_INVALID_CONFIG"
	| "AGENTFS_CLIENT_ERROR"
	| "AGENTFS_SYNC_ERROR"
	| "AGENTFS_LEASE_ERROR"
	| "AGENTFS_VALIDATION_ERROR";

/**
 * Options for constructing an {@link AgentfsError}.
 *
 * @public
 */
export interface AgentfsErrorOptions {
	/**
	 * The error code identifying the error type.
	 */
	code: AgentfsErrorCode;

	/**
	 * Human-readable error message.
	 */
	message: string;

	/**
	 * Optional structured details about the error context.
	 */
	details?: Record<string, unknown> | undefined;

	/**
	 * Optional underlying cause (for error chaining).
	 */
	cause?: unknown | undefined;
}

/**
 * Base error class for all AgentFS-related errors.
 *
 * @remarks
 * Provides a consistent error structure with error codes, optional details,
 * and cause chaining for debugging.
 *
 * @public
 */
export class AgentfsError extends Error {
	/**
	 * The error code identifying the error type.
	 */
	readonly code: AgentfsErrorCode;

	/**
	 * Structured details about the error context.
	 */
	readonly details: Record<string, unknown> | undefined;

	/**
	 * The underlying cause of this error, if any.
	 */
	override readonly cause: unknown | undefined;

	/**
	 * Creates a new AgentfsError.
	 *
	 * @param options - Configuration for the error.
	 */
	constructor(options: AgentfsErrorOptions) {
		super(options.message);
		this.name = "AgentfsError";
		this.code = options.code;
		this.details = options.details;
		this.cause = options.cause;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * Error thrown for invalid AgentFS configuration.
 *
 * @public
 */
export class AgentfsConfigError extends AgentfsError {
	/**
	 * Creates a new AgentfsConfigError.
	 *
	 * @param message - Human-readable error message.
	 * @param details - Optional structured details about the error context.
	 * @param cause - Optional underlying cause.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super({ code: "AGENTFS_INVALID_CONFIG", message, details, cause });
		this.name = "AgentfsConfigError";
	}
}

/**
 * Error thrown when the AgentFS client behaves unexpectedly or returns invalid data.
 *
 * @public
 */
export class AgentfsClientError extends AgentfsError {
	/**
	 * Creates a new AgentfsClientError.
	 *
	 * @param message - Human-readable error message.
	 * @param details - Optional structured details about the error context.
	 * @param cause - Optional underlying cause.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super({ code: "AGENTFS_CLIENT_ERROR", message, details, cause });
		this.name = "AgentfsClientError";
	}
}

/**
 * Error thrown for sync-related failures (pull, push, checkpoint).
 *
 * @public
 */
export class AgentfsSyncError extends AgentfsError {
	/**
	 * Creates a new AgentfsSyncError.
	 *
	 * @param message - Human-readable error message.
	 * @param details - Optional structured details about the error context.
	 * @param cause - Optional underlying cause.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super({ code: "AGENTFS_SYNC_ERROR", message, details, cause });
		this.name = "AgentfsSyncError";
	}
}

/**
 * Error thrown for lease-related failures (acquire, release, extend).
 *
 * @public
 */
export class AgentfsLeaseError extends AgentfsError {
	/**
	 * Creates a new AgentfsLeaseError.
	 *
	 * @param message - Human-readable error message.
	 * @param details - Optional structured details about the error context.
	 * @param cause - Optional underlying cause.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super({ code: "AGENTFS_LEASE_ERROR", message, details, cause });
		this.name = "AgentfsLeaseError";
	}
}

/**
 * Error thrown for validation failures (e.g., invalid input parameters).
 *
 * @public
 */
export class AgentfsValidationError extends AgentfsError {
	/**
	 * Creates a new AgentfsValidationError.
	 *
	 * @param message - Human-readable error message.
	 * @param details - Optional structured details about the error context.
	 * @param cause - Optional underlying cause.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super({ code: "AGENTFS_VALIDATION_ERROR", message, details, cause });
		this.name = "AgentfsValidationError";
	}
}

/**
 * Type guard to check if an error is an {@link AgentfsError}.
 *
 * @param error - The value to check.
 * @returns `true` if the error is an AgentfsError instance, `false` otherwise.
 *
 * @public
 */
export function isAgentfsError(error: unknown): error is AgentfsError {
	return error instanceof AgentfsError;
}
