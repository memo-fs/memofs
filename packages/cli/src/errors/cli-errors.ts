export type CliErrorCode =
	| "CLI_USAGE_ERROR"
	| "CLI_VALIDATION_ERROR"
	| "CLI_FS_ERROR"
	| "CLI_PROTOCOL_ERROR"
	| "CLI_JSONL_ERROR";

export class CliError extends Error {
	readonly code: CliErrorCode;
	readonly exitCode: number;
	readonly cause?: unknown;

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

export class CliUsageError extends CliError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_USAGE_ERROR", message, { exitCode: 1, cause: options?.cause });
	}
}

export class CliValidationError extends CliError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_VALIDATION_ERROR", message, {
			exitCode: 1,
			cause: options?.cause,
		});
	}
}

export class CliFsError extends CliError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_FS_ERROR", message, { exitCode: 1, cause: options?.cause });
	}
}

export class CliProtocolError extends CliError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_PROTOCOL_ERROR", message, {
			exitCode: 1,
			cause: options?.cause,
		});
	}
}

export class CliJsonlError extends CliError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("CLI_JSONL_ERROR", message, { exitCode: 1, cause: options?.cause });
	}
}
