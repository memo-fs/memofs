export class TekMemoMcpError extends Error {
	readonly code: string;
	readonly status: number;
	readonly details?: unknown;

	constructor(
		message: string,
		code = "TEKMEMO_MCP_ERROR",
		status = 500,
		details?: unknown,
	) {
		super(message);
		this.name = "TekMemoMcpError";
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

export class McpValidationError extends TekMemoMcpError {
	constructor(message: string, details?: unknown) {
		super(message, "MCP_VALIDATION_ERROR", 400, details);
		this.name = "McpValidationError";
	}
}

export class McpAuthorizationError extends TekMemoMcpError {
	constructor(
		message = "This MCP operation is not authorized.",
		details?: unknown,
	) {
		super(message, "MCP_AUTHORIZATION_ERROR", 403, details);
		this.name = "McpAuthorizationError";
	}
}

export class McpNotFoundError extends TekMemoMcpError {
	constructor(message: string, details?: unknown) {
		super(message, "MCP_NOT_FOUND", 404, details);
		this.name = "McpNotFoundError";
	}
}

export class McpTimeoutError extends TekMemoMcpError {
	constructor(message = "MCP operation timed out.", details?: unknown) {
		super(message, "MCP_TIMEOUT", 504, details);
		this.name = "McpTimeoutError";
	}
}

export class McpOutputLimitError extends TekMemoMcpError {
	constructor(
		message = "MCP output exceeded the configured limit.",
		details?: unknown,
	) {
		super(message, "MCP_OUTPUT_LIMIT", 413, details);
		this.name = "McpOutputLimitError";
	}
}

export function toSafeError(error: unknown): {
	name: string;
	message: string;
	code: string;
	status: number;
	details?: unknown;
} {
	if (error instanceof TekMemoMcpError) {
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
