import { describe, expect, it } from "vitest";
import {
	BenchmarkValidationError,
	percentile,
	summarizeIterations,
} from "../src";

describe("stats", () => {
	it("computes percentiles", () => {
		expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
		expect(percentile([1, 2, 3, 4], 100)).toBe(4);
	});

	it("rejects invalid percentile", () => {
		expect(() => percentile([1], -1)).toThrow(BenchmarkValidationError);
		expect(() => percentile([1], 101)).toThrow(BenchmarkValidationError);
	});

	it("summarizes iterations", () => {
		const stats = summarizeIterations([
			{ iteration: 0, durationMs: 10, ok: true },
			{ iteration: 1, durationMs: 20, ok: false },
		]);

		expect(stats.count).toBe(2);
		expect(stats.successes).toBe(1);
		expect(stats.failures).toBe(1);
		expect(stats.errorRate).toBe(0.5);
		expect(stats.meanMs).toBe(15);
	});
});
