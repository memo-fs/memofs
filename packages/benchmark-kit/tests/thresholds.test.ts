import { describe, expect, it } from "vitest";
import { evaluateBenchmarkThresholds } from "../src";

describe("thresholds", () => {
	it("returns ok when thresholds pass", () => {
		const result = evaluateBenchmarkThresholds(
			{
				name: "suite",
				tags: [],
				startedAt: "",
				completedAt: "",
				totalDurationMs: 10,
				cases: [
					{
						name: "case",
						tags: [],
						iterations: [],
						startedAt: "",
						completedAt: "",
						stats: {
							count: 1,
							successes: 1,
							failures: 0,
							errorRate: 0,
							totalDurationMs: 10,
							minMs: 10,
							maxMs: 10,
							meanMs: 10,
							medianMs: 10,
							p50Ms: 10,
							p90Ms: 10,
							p95Ms: 10,
							p99Ms: 10,
							throughputPerSecond: 100,
						},
					},
				],
			},
			{ maxP95Ms: 20, maxErrorRate: 0 },
		);

		expect(result.ok).toBe(true);
	});

	it("returns failures when thresholds fail", () => {
		const result = evaluateBenchmarkThresholds(
			{
				name: "suite",
				tags: [],
				startedAt: "",
				completedAt: "",
				totalDurationMs: 10,
				cases: [
					{
						name: "case",
						tags: [],
						iterations: [],
						startedAt: "",
						completedAt: "",
						stats: {
							count: 1,
							successes: 1,
							failures: 0,
							errorRate: 0.2,
							totalDurationMs: 10,
							minMs: 10,
							maxMs: 10,
							meanMs: 10,
							medianMs: 10,
							p50Ms: 10,
							p90Ms: 10,
							p95Ms: 30,
							p99Ms: 30,
							throughputPerSecond: 1,
						},
					},
				],
			},
			{ maxP95Ms: 20, maxErrorRate: 0.1, minThroughputPerSecond: 5 },
		);

		expect(result.ok).toBe(false);
		expect(result.failures).toHaveLength(3);
	});
});
