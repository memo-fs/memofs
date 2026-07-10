import { BenchmarkValidationError } from "../errors/benchmark-errors";
import type { BenchmarkCase, BenchmarkSuite } from "../types";

const SAFE_NAME = /^[A-Za-z0-9._:-]{1,128}$/;

export function assertSafeBenchmarkName(
	value: unknown,
	name: string,
): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new BenchmarkValidationError(`${name} must be a non-empty string.`);
	}

	if (!SAFE_NAME.test(value)) {
		throw new BenchmarkValidationError(
			`${name} contains unsupported characters.`,
		);
	}
}

export function assertPositiveInteger(
	value: unknown,
	name: string,
): asserts value is number {
	if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
		throw new BenchmarkValidationError(`${name} must be a positive integer.`);
	}
}

export function assertNonNegativeInteger(
	value: unknown,
	name: string,
): asserts value is number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		throw new BenchmarkValidationError(
			`${name} must be a non-negative integer.`,
		);
	}
}

export function validateBenchmarkCase<TContext>(
	testCase: BenchmarkCase<TContext>,
): void {
	assertSafeBenchmarkName(testCase.name, "case.name");
	assertPositiveInteger(testCase.iterations, "case.iterations");

	if (testCase.warmupIterations !== undefined) {
		assertNonNegativeInteger(
			testCase.warmupIterations,
			"case.warmupIterations",
		);
	}

	if (testCase.concurrency !== undefined) {
		assertPositiveInteger(testCase.concurrency, "case.concurrency");
	}

	if (testCase.timeoutMs !== undefined) {
		assertPositiveInteger(testCase.timeoutMs, "case.timeoutMs");
	}

	if (typeof testCase.run !== "function") {
		throw new BenchmarkValidationError("case.run must be a function.");
	}

	if (testCase.setup !== undefined && typeof testCase.setup !== "function") {
		throw new BenchmarkValidationError(
			"case.setup must be a function when provided.",
		);
	}

	if (
		testCase.teardown !== undefined &&
		typeof testCase.teardown !== "function"
	) {
		throw new BenchmarkValidationError(
			"case.teardown must be a function when provided.",
		);
	}

	if (
		testCase.validate !== undefined &&
		typeof testCase.validate !== "function"
	) {
		throw new BenchmarkValidationError(
			"case.validate must be a function when provided.",
		);
	}

	if (testCase.tags !== undefined && !Array.isArray(testCase.tags)) {
		throw new BenchmarkValidationError(
			"case.tags must be an array when provided.",
		);
	}
}

export function validateBenchmarkSuite(suite: BenchmarkSuite): void {
	assertSafeBenchmarkName(suite.name, "suite.name");

	if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
		throw new BenchmarkValidationError(
			"suite.cases must be a non-empty array.",
		);
	}

	for (const testCase of suite.cases) {
		validateBenchmarkCase(testCase);
	}
}
