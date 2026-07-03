export type GraphErrorCode =
	| "GRAPH_CONFIG_ERROR"
	| "GRAPH_VALIDATION_ERROR"
	| "GRAPH_NOT_FOUND"
	| "GRAPH_CONFLICT"
	| "GRAPH_PARSE_ERROR";

export interface GraphErrorOptions {
	cause?: unknown;
	details?: Record<string, unknown>;
}

export class TekMemoGraphError extends Error {
	readonly code: GraphErrorCode;
	readonly details?: Record<string, unknown>;
	override readonly cause?: unknown;

	constructor(
		code: GraphErrorCode,
		message: string,
		options?: GraphErrorOptions,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.details = options?.details;
		this.cause = options?.cause;
	}
}

export class GraphConfigError extends TekMemoGraphError {
	constructor(message: string, options?: GraphErrorOptions) {
		super("GRAPH_CONFIG_ERROR", message, options);
	}
}

export class GraphValidationError extends TekMemoGraphError {
	constructor(message: string, options?: GraphErrorOptions) {
		super("GRAPH_VALIDATION_ERROR", message, options);
	}
}

export class GraphNotFoundError extends TekMemoGraphError {
	constructor(message: string, options?: GraphErrorOptions) {
		super("GRAPH_NOT_FOUND", message, options);
	}
}

export class GraphConflictError extends TekMemoGraphError {
	constructor(message: string, options?: GraphErrorOptions) {
		super("GRAPH_CONFLICT", message, options);
	}
}

export class GraphParseError extends TekMemoGraphError {
	constructor(message: string, options?: GraphErrorOptions) {
		super("GRAPH_PARSE_ERROR", message, options);
	}
}

export function isTekMemoGraphError(
	error: unknown,
): error is TekMemoGraphError {
	return error instanceof TekMemoGraphError;
}
