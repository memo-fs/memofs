/**
 * @file Error classes for the @tekmemo/core/openai package.
 *
 * @remarks
 * This module defines a hierarchy of error classes for different failure modes
 * when working with the OpenAI API, including configuration errors, validation
 * errors, API errors, and network-related errors.
 *
 * @public
 */

/**
 * Error codes for OpenAI embedder errors.
 *
 * @public
 */
export type OpenAIErrorCode =
	| "OPENAI_CONFIG_ERROR"
	| "OPENAI_VALIDATION_ERROR"
	| "OPENAI_API_ERROR"
	| "OPENAI_NETWORK_ERROR"
	| "OPENAI_TIMEOUT_ERROR"
	| "OPENAI_RESPONSE_ERROR"
	| "OPENAI_RETRY_EXHAUSTED";

/**
 * Base error class for all OpenAI embedder errors.
 *
 * @public
 */
export class OpenAIEmbedderError extends Error {
	/** The error code identifying the type of error. */
	readonly code: OpenAIErrorCode;
	/** The underlying cause of the error, if any. */
	readonly cause?: unknown;

	/**
	 * Creates a new OpenAIEmbedderError.
	 *
	 * @param code - The error code identifying the type of error.
	 * @param message - The error message.
	 * @param options - Additional options including the underlying cause.
	 */
	constructor(
		code: OpenAIErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.cause = options?.cause;
	}
}

/**
 * Error thrown when there is a configuration issue (missing API key, invalid URL, etc.).
 *
 * @public
 */
export class OpenAIConfigError extends OpenAIEmbedderError {
	/**
	 * Creates a new OpenAIConfigError.
	 *
	 * @param message - The error message.
	 * @param options - Additional options including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("OPENAI_CONFIG_ERROR", message, options);
	}
}

/**
 * Error thrown when input validation fails (invalid model, dimensions, texts, etc.).
 *
 * @public
 */
export class OpenAIValidationError extends OpenAIEmbedderError {
	/**
	 * Creates a new OpenAIValidationError.
	 *
	 * @param message - The error message.
	 * @param options - Additional options including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("OPENAI_VALIDATION_ERROR", message, options);
	}
}

/**
 * Error thrown when the OpenAI API returns an error response.
 *
 * @public
 */
export class OpenAIAPIError extends OpenAIEmbedderError {
	/** The HTTP status code from the API response. */
	readonly status: number;
	/** The error code provided by the OpenAI API, if any. */
	readonly providerCode: string | undefined;
	/** The error type provided by the OpenAI API, if any. */
	readonly providerType: string | undefined;
	/** The response body from the OpenAI API, if available. */
	readonly providerBody?: unknown;

	/**
	 * Creates a new OpenAIAPIError.
	 *
	 * @param message - The error message.
	 * @param input - The error details including status, provider code, type, body, and cause.
	 */
	constructor(
		message: string,
		input: {
			status: number;
			providerCode?: string | undefined;
			providerType?: string | undefined;
			providerBody?: unknown;
			cause?: unknown;
		},
	) {
		super("OPENAI_API_ERROR", message, { cause: input.cause });
		this.status = input.status;
		this.providerCode = input.providerCode;
		this.providerType = input.providerType;
		this.providerBody = input.providerBody;
	}
}

/**
 * Error thrown when a network error occurs (DNS failure, connection refused, etc.).
 *
 * @public
 */
export class OpenAINetworkError extends OpenAIEmbedderError {
	/**
	 * Creates a new OpenAINetworkError.
	 *
	 * @param message - The error message.
	 * @param options - Additional options including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("OPENAI_NETWORK_ERROR", message, options);
	}
}

/**
 * Error thrown when a request to the OpenAI API times out.
 *
 * @public
 */
export class OpenAITimeoutError extends OpenAIEmbedderError {
	/**
	 * Creates a new OpenAITimeoutError.
	 *
	 * @param message - The error message.
	 * @param options - Additional options including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("OPENAI_TIMEOUT_ERROR", message, options);
	}
}

/**
 * Error thrown when the OpenAI API returns an invalid or unexpected response.
 *
 * @public
 */
export class OpenAIResponseError extends OpenAIEmbedderError {
	/**
	 * Creates a new OpenAIResponseError.
	 *
	 * @param message - The error message.
	 * @param options - Additional options including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("OPENAI_RESPONSE_ERROR", message, options);
	}
}

/**
 * Error thrown when all retry attempts have been exhausted.
 *
 * @public
 */
export class OpenAIRetryExhaustedError extends OpenAIEmbedderError {
	/**
	 * Creates a new OpenAIRetryExhaustedError.
	 *
	 * @param message - The error message.
	 * @param options - Additional options including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("OPENAI_RETRY_EXHAUSTED", message, options);
	}
}
