import { BenchmarkValidationError } from "../errors/benchmark-errors";
import type { BenchmarkCaseStats, BenchmarkIterationResult } from "../types";

export function percentile(values: readonly number[], p: number): number {
	if (!Number.isFinite(p) || p < 0 || p > 100) {
		throw new BenchmarkValidationError(
			"Percentile p must be between 0 and 100.",
		);
	}

	if (values.length === 0) return 0;

	const sorted = [...values].sort((a, b) => a - b);
	const rank = (p / 100) * (sorted.length - 1);
	const lower = Math.floor(rank);
	const upper = Math.ceil(rank);

	if (lower === upper) return sorted[lower] ?? 0;

	const lowerValue = sorted[lower] ?? 0;
	const upperValue = sorted[upper] ?? 0;
	return lowerValue + (upperValue - lowerValue) * (rank - lower);
}

export function mean(values: readonly number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeIterations(
	iterations: readonly BenchmarkIterationResult[],
): BenchmarkCaseStats {
	const durations = iterations.map((item) => item.durationMs);
	const successes = iterations.filter((item) => item.ok).length;
	const failures = iterations.length - successes;
	const totalDurationMs = durations.reduce((sum, value) => sum + value, 0);

	const minMs = durations.length === 0 ? 0 : Math.min(...durations);
	const maxMs = durations.length === 0 ? 0 : Math.max(...durations);
	const meanMs = mean(durations);
	const throughputPerSecond =
		totalDurationMs > 0 ? (iterations.length / totalDurationMs) * 1000 : 0;

	return {
		count: iterations.length,
		successes,
		failures,
		errorRate: iterations.length > 0 ? failures / iterations.length : 0,
		totalDurationMs,
		minMs,
		maxMs,
		meanMs,
		medianMs: percentile(durations, 50),
		p50Ms: percentile(durations, 50),
		p90Ms: percentile(durations, 90),
		p95Ms: percentile(durations, 95),
		p99Ms: percentile(durations, 99),
		throughputPerSecond,
	};
}
