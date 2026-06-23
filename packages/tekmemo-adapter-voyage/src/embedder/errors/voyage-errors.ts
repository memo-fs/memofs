export type VoyageErrorCode =
	| "VOYAGE_CONFIG_ERROR"
	| "VOYAGE_VALIDATION_ERROR"
	| "VOYAGE_API_ERROR"
	| "VOYAGE_NETWORK_ERROR"
	| "VOYAGE_TIMEOUT_ERROR"
	| "VOYAGE_RESPONSE_ERROR"
	| "VOYAGE_RETRY_EXHAUSTED";

export class VoyageError extends Error {
	readonly code: VoyageErrorCode;
	readonly cause?: unknown;

	constructor(
		code: VoyageErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.cause = options?.cause;
	}
}

export class VoyageConfigError extends VoyageError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_CONFIG_ERROR", message, options);
	}
}

export class VoyageValidationError extends VoyageError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_VALIDATION_ERROR", message, options);
	}
}

export class VoyageApiError extends VoyageError {
	readonly status: number;
	readonly providerCode?: string;
	readonly providerBody?: unknown;

	constructor(
		message: string,
		input: {
			status: number;
			providerCode?: string;
			providerBody?: unknown;
			cause?: unknown;
		},
	) {
		super("VOYAGE_API_ERROR", message, { cause: input.cause });
		this.status = input.status;
		this.providerCode = input.providerCode;
		this.providerBody = input.providerBody;
	}
}

export class VoyageNetworkError extends VoyageError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_NETWORK_ERROR", message, options);
	}
}

export class VoyageTimeoutError extends VoyageError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_TIMEOUT_ERROR", message, options);
	}
}

export class VoyageResponseError extends VoyageError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_RESPONSE_ERROR", message, options);
	}
}

export class VoyageRetryExhaustedError extends VoyageError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("VOYAGE_RETRY_EXHAUSTED", message, options);
	}
}
