/**
 * CLI custom error classes and codes.
 *
 * @module cli-errors
 */

/**
 * Union type representing the allowed error codes for CLI errors.
 */
export type CliErrorCode =
	| "CLI_USAGE_ERROR"
	| "CLI_VALIDATION_ERROR"
	| "CLI_FS_ERROR"
	| "CLI_PROTOCOL_ERROR"
	| "CLI_JSONL_ERROR";

/**
 * Base CLI Error class supporting error codes, custom exit codes, and cause wrapping.
 */
export class CliError extends Error {
	/**
	 * Unique identifier string for the error type.
	 */
	readonly code: CliErrorCode;
	/**
	 * Process exit code to use when this error terminates the CLI.
	 */
	readonly exitCode: number;
	/**
	 * Optional underlying cause of the error.
	 */
	readonly cause?: unknown;

	/**
	 * Creates a CliError instance.
	 *
	 * @param code - The error code identifier.
	 * @param message - Descriptive error message.
	 * @param options - Options including exitCode override and cause.
	 */
	constructor(
		code: CliErrorCode,
		message: string,
		options?: { exitCode?: number; cause?: unknown },
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.exitCode = options?.exitCode ?? 1;
		this.cause = options?.cause;
	}
}

/**
 * Error thrown when the CLI is called with incorrect options or command arguments.
 */
export class CliUsageError extends CliError {
	/**
	 * Creates a CliUsageError instance.
	 *
	 * @param message - Descriptive error message.
	 * @param options - Optional context parameters including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_USAGE_ERROR", message, { exitCode: 1, cause: options?.cause });
	}
}

/**
 * Error thrown when input configuration or runtime values fail validation.
 */
export class CliValidationError extends CliError {
	/**
	 * Creates a CliValidationError instance.
	 *
	 * @param message - Descriptive error message.
	 * @param options - Optional context parameters including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_VALIDATION_ERROR", message, {
			exitCode: 1,
			cause: options?.cause,
		});
	}
}

/**
 * Error thrown when a filesystem operation fails or detects safety/security violations.
 */
export class CliFsError extends CliError {
	/**
	 * Creates a CliFsError instance.
	 *
	 * @param message - Descriptive error message.
	 * @param options - Optional context parameters including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_FS_ERROR", message, { exitCode: 1, cause: options?.cause });
	}
}

/**
 * Error thrown when protocol communication, handshakes, or RPC operations fail.
 */
export class CliProtocolError extends CliError {
	/**
	 * Creates a CliProtocolError instance.
	 *
	 * @param message - Descriptive error message.
	 * @param options - Optional context parameters including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_PROTOCOL_ERROR", message, {
			exitCode: 1,
			cause: options?.cause,
		});
	}
}

/**
 * Error thrown when JSONL parser fails to parse a line or write stream fails.
 */
export class CliJsonlError extends CliError {
	/**
	 * Creates a CliJsonlError instance.
	 *
	 * @param message - Descriptive error message.
	 * @param options - Optional context parameters including the underlying cause.
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_JSONL_ERROR", message, { exitCode: 1, cause: options?.cause });
	}
}
