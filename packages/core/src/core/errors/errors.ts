/**
 * Error codes for all MemoFS-specific errors.
 */
export type MemoFsErrorCode =
	| "MEMOFS_INVALID_PATH"
	| "MEMOFS_NOT_FOUND"
	| "MEMOFS_VALIDATION_ERROR"
	| "MEMOFS_PARSE_ERROR"
	| "MEMOFS_COMMAND_ERROR"
	| "MEMOFS_STORE_ERROR"
	| "MEMOFS_WRITE_BLOCKED";

/**
 * Base error class for all MemoFS errors.
 *
 * @remarks
 * All MemoFS errors extend this class and include a machine-readable `code`
 * and optional `details` and `cause` for structured error handling.
 *
 * @public
 */
export class MemoFsError extends Error {
	/** Machine-readable error code identifying the error category. */
	readonly code: MemoFsErrorCode;
	/** Optional structured details about what caused the error. */
	readonly details?: Record<string, unknown>;
	/** Optional original cause of this error (for chaining). */
	readonly cause?: unknown;

	/**
	 * Creates a new MemoFsError.
	 *
	 * @param options - Error options including code, message, and optional details/cause.
	 */
	constructor(options: {
		code: MemoFsErrorCode;
		message: string;
		details?: Record<string, unknown>;
		cause?: unknown;
	}) {
		super(options.message);
		this.code = options.code;
		this.details = options.details;
		this.cause = options.cause;
		this.name = "MemoFsError";
	}
}

/**
 * Thrown when a memory path is invalid (bad format, traversal attempt, etc.).
 *
 * @public
 */
export class MemoryPathError extends MemoFsError {
	/**
	 * Creates a new MemoryPathError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details.
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "MEMOFS_INVALID_PATH", message, details });
		this.name = "MemoryPathError";
	}
}

/**
 * Thrown when a requested memory file does not exist.
 *
 * @public
 */
export class MemoryNotFoundError extends MemoFsError {
	/**
	 * Creates a new MemoryNotFoundError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details (often includes the path).
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "MEMOFS_NOT_FOUND", message, details });
		this.name = "MemoryNotFoundError";
	}
}

/**
 * Thrown when memory data fails validation (bad type, missing field, etc.).
 *
 * @public
 */
export class MemoryValidationError extends MemoFsError {
	/**
	 * Creates a new MemoryValidationError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details about the validation failure.
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "MEMOFS_VALIDATION_ERROR", message, details });
		this.name = "MemoryValidationError";
	}
}

/**
 * Thrown when memory data cannot be parsed (invalid JSON, JSONL, etc.).
 *
 * @public
 */
export class MemoryParseError extends MemoFsError {
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
		super({ code: "MEMOFS_PARSE_ERROR", message, details, cause });
		this.name = "MemoryParseError";
	}
}

/**
 * Thrown when a memory command is invalid or cannot be executed.
 *
 * @public
 */
export class MemoryCommandError extends MemoFsError {
	/**
	 * Creates a new MemoryCommandError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Optional structured details about the command failure.
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "MEMOFS_COMMAND_ERROR", message, details });
		this.name = "MemoryCommandError";
	}
}

/**
 * Thrown when a memory store operation fails.
 *
 * @public
 */
export class MemoryStoreError extends MemoFsError {
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
		super({ code: "MEMOFS_STORE_ERROR", message, details, cause });
		this.name = "MemoryStoreError";
	}
}

/**
 * Thrown when a write is hard-rejected by the secret/PII blocklist.
 *
 * @remarks
 * This is the security gate of write intelligence (,
 * layer 1). The blocklist detects secrets/credentials in content before it can
 * reach a syncable memory file (`notes.md`, core memory, agent-session durable
 * memory). The write never persists — the caller (agent, SDK, CLI) must drop
 * the content or redact it and retry.
 *
 * `details` carries the redacted violation list: each violation includes only
 * a truncated preview, never the full secret. Error messages and logs must
 * propagate the preview, not reconstruct the secret.
 *
 * @public
 */
export class MemoryWriteBlockedError extends MemoFsError {
	/**
	 * Creates a new MemoryWriteBlockedError.
	 *
	 * @param message - Human-readable error description.
	 * @param details - Structured details; expected to carry `violations`
	 * (redacted BlocklistViolation[]) and optionally the write `path`.
	 */
	constructor(message: string, details?: Record<string, unknown>) {
		super({ code: "MEMOFS_WRITE_BLOCKED", message, details });
		this.name = "MemoryWriteBlockedError";
	}
}

/**
 * Type guard to check if an unknown value is a MemoFsError.
 *
 * @param error - The value to check.
 * @returns `true` if the value is a MemoFsError, `false` otherwise.
 *
 * @example
 * ```typescript
 * try {
 * await store.read(path);
 * } catch (error) {
 * if (isMemoFsError(error)) {
 * console.error(`MemoFS error: ${error.code} - ${error.message}`);
 * }
 * }
 * ```
 */
export function isMemoFsError(error: unknown): error is MemoFsError {
	return error instanceof MemoFsError;
}
