/**
 * Structured error classes and sanitization utility for MCP runtime processes.
 *
 * @module errors
 */

/**
 * Base class for all MemoFS MCP runtime errors.
 */
export class MemoFSMcpError extends Error {
	/**
	 * Unique alphanumeric error type identifier.
	 */
	readonly code: string;
	/**
	 * Canonical HTTP status code equivalent.
	 */
	readonly status: number;
	/**
	 * Optional extra structured context details.
	 */
	readonly details?: unknown;

	/**
	 * Creates a MemoFSMcpError.
	 *
	 * @param message - User-facing error message.
	 * @param code - Error code identifier.
	 * @param status - Equivalency HTTP status code.
	 * @param details - Extra context details.
	 */
	constructor(
		message: string,
		code = "MEMOFS_MCP_ERROR",
		status = 500,
		details?: unknown,
	) {
		super(message);
		this.name = "MemoFSMcpError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

/**
 * Thrown when incoming MCP requests fail schema or validation assertions.
 */
export class McpValidationError extends MemoFSMcpError {
	/**
	 * Creates an McpValidationError.
	 *
	 * @param message - Validation failure message.
	 * @param details - Extra validation context details.
	 */
	constructor(message: string, details?: unknown) {
		super(message, "MCP_VALIDATION_ERROR", 400, details);
		this.name = "McpValidationError";
	}
}

/**
 * Thrown when a write tool operation is requested without client/user authorization.
 */
export class McpAuthorizationError extends MemoFSMcpError {
	/**
	 * Creates an McpAuthorizationError.
	 *
	 * @param message - Authorization failure message.
	 * @param details - Extra authorization details.
	 */
	constructor(
		message = "This MCP operation is not authorized.",
		details?: unknown,
	) {
		super(message, "MCP_AUTHORIZATION_ERROR", 403, details);
		this.name = "McpAuthorizationError";
	}
}

/**
 * Thrown when a requested resource, tool, or prompt is not found.
 */
export class McpNotFoundError extends MemoFSMcpError {
	/**
	 * Creates an McpNotFoundError.
	 *
	 * @param message - Not found message.
	 * @param details - Extra lookup details.
	 */
	constructor(message: string, details?: unknown) {
		super(message, "MCP_NOT_FOUND", 404, details);
		this.name = "McpNotFoundError";
	}
}

/**
 * Thrown when an asynchronous runtime operation exceeds its timeout limit.
 */
export class McpTimeoutError extends MemoFSMcpError {
	/**
	 * Creates an McpTimeoutError.
	 *
	 * @param message - Timeout message.
	 * @param details - Extra timeout details.
	 */
	constructor(message = "MCP operation timed out.", details?: unknown) {
		super(message, "MCP_TIMEOUT", 504, details);
		this.name = "McpTimeoutError";
	}
}

/**
 * Thrown when a response size exceeds the configured payload byte limit.
 */
export class McpOutputLimitError extends MemoFSMcpError {
	/**
	 * Creates an McpOutputLimitError.
	 *
	 * @param message - Truncation limit failure message.
	 * @param details - Extra payload size details.
	 */
	constructor(
		message = "MCP output exceeded the configured limit.",
		details?: unknown,
	) {
		super(message, "MCP_OUTPUT_LIMIT", 413, details);
		this.name = "McpOutputLimitError";
	}
}

/**
 * Normalizes any caught error into a safe, structured object suitable for JSON response payloads.
 *
 * @param error - The caught error object.
 * @returns A safe error representation object.
 */
export function toSafeError(error: unknown): {
	name: string;
	message: string;
	code: string;
	status: number;
	details?: unknown;
} {
	if (error instanceof MemoFSMcpError) {
		return {
			name: error.name,
			message: error.message,
			code: error.code,
			status: error.status,
			...(error.details === undefined ? {} : { details: error.details }),
		};
	}

	if (error instanceof Error) {
		return {
			name: error.name || "Error",
			message: error.message || "Unexpected error.",
			code: "UNEXPECTED_ERROR",
			status: 500,
		};
	}

	return {
		name: "UnknownError",
		message: "Unexpected non-error throw value.",
		code: "UNEXPECTED_THROW",
		status: 500,
	};
}
