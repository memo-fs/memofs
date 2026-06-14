/**
 * Error codes for all TekMemo-specific errors.
 */
export type TekMemoErrorCode =
	| "TEKMEMO_INVALID_PATH"
	| "TEKMEMO_NOT_FOUND"
	| "TEKMEMO_VALIDATION_ERROR"
	| "TEKMEMO_PARSE_ERROR"
	| "TEKMEMO_COMMAND_ERROR"
	| "TEKMEMO_STORE_ERROR";

/**
 * Base error class for all TekMemo errors.
 *
 * @remarks
 * All TekMemo errors extend this class and include a machine-readable `code`
 * and optional `details` and `cause` for structured error handling.
 *
 * @public
 */
export class TekMemoError extends Error {
	/** Machine-readable error code identifying the error category. */
	readonly code: TekMemoErrorCode;
	/** Optional structured details about what caused the error. */
	readonly details?: Record<string, unknown>;
	/** Optional original cause of this error (for chaining). */
	readonly cause?: unknown;

	/**
	 * Creates a new TekMemoError.
	 *
	 * @param options - Error options including code, message, and optional details/cause.
	 */
	constructor(options: {
		code: TekMemoErrorCode;
		message: string;
		details?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super(options.message);
		this.code = options.code;
		this.details = options.details;
		this.cause = options.cause;
		this.name = "TekMemoError";
	}
}

/**
 * Thrown when a memory path is invalid (bad format, traversal attempt, etc.).
 *
 * @public
 */
export class MemoryPathError extends TekMemoError {
	/**
	 * Creates a new MemoryPathError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details.
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "TEKMEMO_INVALID_PATH", message, details });
		this.name = "MemoryPathError";
	}
}

/**
 * Thrown when a requested memory file does not exist.
 *
 * @public
 */
export class MemoryNotFoundError extends TekMemoError {
	/**
	 * Creates a new MemoryNotFoundError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details (often includes the path).
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "TEKMEMO_NOT_FOUND", message, details });
		this.name = "MemoryNotFoundError";
	}
}

/**
 * Thrown when memory data fails validation (bad type, missing field, etc.).
 *
 * @public
 */
export class MemoryValidationError extends TekMemoError {
	/**
	 * Creates a new MemoryValidationError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details about the validation failure.
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "TEKMEMO_VALIDATION_ERROR", message, details });
		this.name = "MemoryValidationError";
	}
}

/**
 * Thrown when memory data cannot be parsed (invalid JSON, JSONL, etc.).
 *
 * @public
 */
export class MemoryParseError extends TekMemoError {
	/**
	 * Creates a new MemoryParseError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details.
	 * @param cause - Optional original error that caused the parse failure.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super({ code: "TEKMEMO_PARSE_ERROR", message, details, cause });
		this.name = "MemoryParseError";
	}
}

/**
 * Thrown when a memory command is invalid or cannot be executed.
 *
 * @public
 */
export class MemoryCommandError extends TekMemoError {
	/**
	 * Creates a new MemoryCommandError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details about the command failure.
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "TEKMEMO_COMMAND_ERROR", message, details });
		this.name = "MemoryCommandError";
	}
}

/**
 * Thrown when a memory store operation fails.
 *
 * @public
 */
export class MemoryStoreError extends TekMemoError {
	/**
	 * Creates a new MemoryStoreError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details about the store failure.
	 * @param cause - Optional original error that caused the store failure.
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super({ code: "TEKMEMO_STORE_ERROR", message, details, cause });
		this.name = "MemoryStoreError";
	}
}

/**
 * Type guard to check if an unknown value is a TekMemoError.
 *
 * @param error - The value to check.
 * @returns `true` if the value is a TekMemoError, `false` otherwise.
 *
 * @example
 * ```typescript
 * try {
 *   await store.read(path);
 * } catch (error) {
 *   if (isTekMemoError(error)) {
 *     console.error(`TekMemo error: ${error.code} - ${error.message}`);
 *   }
 * }
 * ```
 */
export function isTekMemoError(error: unknown): error is TekMemoError {
	return error instanceof TekMemoError;
}
