import { describe, expect, it } from "vitest";
import { jsonBenchmarkReport, markdownBenchmarkReport } from "../src";

const result = {
	name: "suite",
	tags: [],
	startedAt: "start",
	completedAt: "end",
	totalDurationMs: 10,
	cases: [
		{
			name: "case",
			tags: [],
			iterations: [],
			startedAt: "start",
			completedAt: "end",
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
};

describe("reporters", () => {
	it("creates JSON report", () => {
		expect(JSON.parse(jsonBenchmarkReport(result)).name).toBe("suite");
	});

	it("creates Markdown report", () => {
		const markdown = markdownBenchmarkReport(result);
		expect(markdown).toContain("# Benchmark: suite");
		expect(markdown).toContain("| case |");
	});
});
