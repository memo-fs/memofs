import type {
	BenchmarkSuiteResult,
	BenchmarkThresholdFailure,
	BenchmarkThresholdResult,
	BenchmarkThresholds,
} from "../types";

export function evaluateBenchmarkThresholds(
	suite: BenchmarkSuiteResult,
	thresholds: BenchmarkThresholds,
): BenchmarkThresholdResult {
	const failures: BenchmarkThresholdFailure[] = [];

	for (const testCase of suite.cases) {
		check(
			failures,
			testCase.name,
			"maxMeanMs",
			thresholds.maxMeanMs,
			testCase.stats.meanMs,
			(actual, expected) => actual <= expected,
		);
		check(
			failures,
			testCase.name,
			"maxP50Ms",
			thresholds.maxP50Ms,
			testCase.stats.p50Ms,
			(actual, expected) => actual <= expected,
		);
		check(
			failures,
			testCase.name,
			"maxP90Ms",
			thresholds.maxP90Ms,
			testCase.stats.p90Ms,
			(actual, expected) => actual <= expected,
		);
		check(
			failures,
			testCase.name,
			"maxP95Ms",
			thresholds.maxP95Ms,
			testCase.stats.p95Ms,
			(actual, expected) => actual <= expected,
		);
		check(
			failures,
			testCase.name,
			"maxP99Ms",
			thresholds.maxP99Ms,
			testCase.stats.p99Ms,
			(actual, expected) => actual <= expected,
		);
		check(
			failures,
			testCase.name,
			"maxErrorRate",
			thresholds.maxErrorRate,
			testCase.stats.errorRate,
			(actual, expected) => actual <= expected,
		);
		check(
			failures,
			testCase.name,
			"minThroughputPerSecond",
			thresholds.minThroughputPerSecond,
			testCase.stats.throughputPerSecond,
			(actual, expected) => actual >= expected,
		);
	}

	return {
		ok: failures.length === 0,
		failures,
	};
}

function check(
	failures: BenchmarkThresholdFailure[],
	caseName: string,
	metric: keyof BenchmarkThresholds,
	expected: number | undefined,
	actual: number,
	predicate: (actual: number, expected: number) => boolean,
): void {
	if (expected === undefined) return;

	if (!predicate(actual, expected)) {
		failures.push({
			caseName,
			metric,
			expected,
			actual,
		});
	}
}
