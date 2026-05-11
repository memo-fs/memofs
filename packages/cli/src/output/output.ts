export interface CliOutput {
	stdout: string[];
	stderr: string[];
	write(message: string): void;
	error(message: string): void;
	success(message: string): void;
	warn(message: string): void;
}

export interface JsonEnvelope<T = unknown> {
	ok: boolean;
	command: string;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: unknown;
	};
}

const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	dim: "\x1b[2m",
};

function shouldDisableColor(noColor?: boolean): boolean {
	if (noColor) return true;
	if ("NO_COLOR" in process.env) return true;
	if (process.env.TERM === "dumb") return true;
	return false;
}

export interface BufferedOutputOptions {
	noColor?: boolean;
}

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

export function printJsonEnvelope<T>(
	output: CliOutput,
	command: string,
	data: T,
): void {
	const envelope: JsonEnvelope<T> = { ok: true, command, data };
	output.write(JSON.stringify(envelope, null, 2));
}

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
