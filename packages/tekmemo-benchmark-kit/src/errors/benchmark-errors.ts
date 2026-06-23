export type BenchmarkErrorCode =
	| "BENCHMARK_VALIDATION_ERROR"
	| "BENCHMARK_TIMEOUT_ERROR"
	| "BENCHMARK_RUN_ERROR"
	| "BENCHMARK_THRESHOLD_ERROR";

export class BenchmarkError extends Error {
	readonly code: BenchmarkErrorCode;
	readonly cause?: unknown;

	constructor(
		code: BenchmarkErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.cause = options?.cause;
	}
}

export class BenchmarkValidationError extends BenchmarkError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("BENCHMARK_VALIDATION_ERROR", message, options);
	}
}

export class BenchmarkTimeoutError extends BenchmarkError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("BENCHMARK_TIMEOUT_ERROR", message, options);
	}
}

export class BenchmarkRunError extends BenchmarkError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("BENCHMARK_RUN_ERROR", message, options);
	}
}

export class BenchmarkThresholdError extends BenchmarkError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("BENCHMARK_THRESHOLD_ERROR", message, options);
	}
}
