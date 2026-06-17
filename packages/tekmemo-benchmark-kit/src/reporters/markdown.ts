import type { BenchmarkSuiteResult } from "../types";

export function markdownBenchmarkReport(result: BenchmarkSuiteResult): string {
	const lines: string[] = [];

	lines.push(`# Benchmark: ${result.name}`);
	lines.push("");

	if (result.description) {
		lines.push(result.description);
		lines.push("");
	}

	lines.push(`- Started: ${result.startedAt}`);
	lines.push(`- Completed: ${result.completedAt}`);
	lines.push(`- Total duration: ${formatMs(result.totalDurationMs)}`);
	lines.push("");

	lines.push(
		"| Case | Iterations | Success | Error rate | Mean | P50 | P95 | P99 | Throughput/sec |",
	);
	lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");

	for (const testCase of result.cases) {
		lines.push(
			`| ${testCase.name} | ${testCase.stats.count} | ${testCase.stats.successes} | ${formatPercent(testCase.stats.errorRate)} | ${formatMs(testCase.stats.meanMs)} | ${formatMs(testCase.stats.p50Ms)} | ${formatMs(testCase.stats.p95Ms)} | ${formatMs(testCase.stats.p99Ms)} | ${testCase.stats.throughputPerSecond.toFixed(2)} |`,
		);
	}

	lines.push("");
	return lines.join("\n");
}

function formatMs(value: number): string {
	return `${value.toFixed(2)}ms`;
}

function formatPercent(value: number): string {
	return `${(value * 100).toFixed(2)}%`;
}
