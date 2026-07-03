/**
 * Terminal output and standard JSON envelope format writers.
 *
 * @module output
 */

/**
 * Interface defining a structured CLI output writer for stdout and stderr.
 */
export interface CliOutput {
	/**
	 * Buffered stdout message lines.
	 */
	stdout: string[];
	/**
	 * Buffered stderr message lines.
	 */
	stderr: string[];
	/**
	 * Appends a plain message to stdout.
	 */
	write(message: string): void;
	/**
	 * Appends a color-coded error message to stderr.
	 */
	error(message: string): void;
	/**
	 * Appends a color-coded success message to stdout.
	 */
	success(message: string): void;
	/**
	 * Appends a color-coded warning message to stdout.
	 */
	warn(message: string): void;
}

/**
 * Standard JSON envelope container returned when CLI options request `--json`.
 *
 * @template T - Type of the wrapped data payload.
 */
export interface JsonEnvelope<T = unknown> {
	/**
	 * Whether the command completed successfully.
	 */
	ok: boolean;
	/**
	 * Command name.
	 */
	command: string;
	/**
	 * Nested successful result data.
	 */
	data?: T;
	/**
	 * Nested error details if command failed.
	 */
	error?: {
		/**
		 * Alphanumeric error code.
		 */
		code: string;
		/**
		 * Error message string.
		 */
		message: string;
		/**
		 * Optional extra structured context details.
		 */
		details?: unknown;
	};
}

/**
 * ANSI escape codes for terminal color styling.
 */
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	dim: "\x1b[2m",
};

/**
 * Detects whether ANSI colors should be disabled based on terminal variables or flag overrides.
 *
 * @param noColor - Optional explicit flag override to disable color.
 * @returns True if coloring should be disabled, false otherwise.
 */
function shouldDisableColor(noColor?: boolean): boolean {
	if (noColor) return true;
	if ("NO_COLOR" in process.env) return true;
	if (process.env.TERM === "dumb") return true;
	return false;
}

/**
 * Options configuration for creating a buffered output writer.
 */
export interface BufferedOutputOptions {
	/**
	 * Explicit override flag to disable color output.
	 */
	noColor?: boolean;
}

/**
 * Factory creating a CliOutput buffer that collects strings in memory arrays.
 *
 * @param options - Formatting configuration.
 * @returns An implementation of `CliOutput`.
 */
export function createBufferedOutput(
	options?: BufferedOutputOptions,
): CliOutput {
	const stdout: string[] = [];
	const stderr: string[] = [];
	const disabled = shouldDisableColor(options?.noColor);

	const c = disabled
		? { red: "", green: "", yellow: "", reset: "", dim: "" }
		: colors;

	return {
		stdout,
		stderr,
		write(message) {
			stdout.push(message);
		},
		error(message) {
			stderr.push(`${c.red}${message}${c.reset}`);
		},
		success(message) {
			stdout.push(`${c.green}${message}${c.reset}`);
		},
		warn(message) {
			stdout.push(`${c.yellow}${message}${c.reset}`);
		},
	};
}

/**
 * Prints either human-readable text or JSON-stringified raw data based on the json parameter.
 *
 * @param output - Output writer.
 * @param value - Raw data value.
 * @param human - Pre-formatted human readable string.
 * @param json - Whether to output JSON representation instead.
 */
export function printHumanOrJson(
	output: CliOutput,
	value: unknown,
	human: string,
	json = false,
): void {
	if (json) {
		output.write(JSON.stringify(value, null, 2));
		return;
	}

	output.write(human);
}

/**
 * Standardized success JSON envelope printing helper.
 *
 * @template T - Type of the data.
 * @param output - Output writer.
 * @param command - Command context name.
 * @param data - The data payload.
 */
export function printJsonEnvelope<T>(
	output: CliOutput,
	command: string,
	data: T,
): void {
	const envelope: JsonEnvelope<T> = { ok: true, command, data };
	output.write(JSON.stringify(envelope, null, 2));
}

/**
 * Standardized error JSON envelope printing helper.
 *
 * @param output - Output writer.
 * @param command - Command context name.
 * @param code - Error code identifier.
 * @param message - User-facing error message.
 * @param details - Optional extra context.
 */
export function printJsonError(
	output: CliOutput,
	command: string,
	code: string,
	message: string,
	details?: unknown,
): void {
	const error: JsonEnvelope = {
		ok: false,
		command,
		error: {
			code,
			message,
			...(details !== undefined ? { details } : {}),
		},
	};
	output.write(JSON.stringify(error, null, 2));
}
