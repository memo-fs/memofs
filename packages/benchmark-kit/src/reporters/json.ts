import type { BenchmarkSuiteResult } from "../types";

export function jsonBenchmarkReport(
	result: BenchmarkSuiteResult,
	space = 2,
): string {
	return JSON.stringify(result, null, space);
}
