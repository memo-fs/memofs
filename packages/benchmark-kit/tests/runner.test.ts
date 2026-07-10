import { describe, expect, it } from "vitest";
import {
	BenchmarkRunner,
	BenchmarkValidationError,
	createBenchmarkSuite,
	DeterministicBenchmarkClock,
} from "../src";

describe("BenchmarkRunner", () => {
	it("runs a benchmark suite", async () => {
		const runner = new BenchmarkRunner({
			clock: new DeterministicBenchmarkClock({ step: 5 }),
		});

		const suite = createBenchmarkSuite({
			name: "suite",
			cases: [
				{
					name: "case",
					iterations: 3,
					warmupIterations: 1,
					async run() {},
				},
			],
		});

		const result = await runner.runSuite(suite);
		expect(result.cases).toHaveLength(1);
		expect(result.cases[0]?.stats.count).toBe(3);
		expect(result.cases[0]?.stats.successes).toBe(3);
	});

	it("captures errors by default", async () => {
		const runner = new BenchmarkRunner({
			clock: new DeterministicBenchmarkClock({ step: 1 }),
		});

		const result = await runner.runSuite({
			name: "suite",
			cases: [
				{
					name: "case",
					iterations: 2,
					async run() {
						throw new Error("boom");
					},
				},
			],
		});

		expect(result.cases[0]?.stats.failures).toBe(2);
	});

	it("validates suite names", async () => {
		const runner = new BenchmarkRunner();
		await expect(
			runner.runSuite({
				name: "bad name",
				cases: [
					{
						name: "case",
						iterations: 1,
						async run() {},
					},
				],
			}),
		).rejects.toThrow(BenchmarkValidationError);
	});

	it("runs teardown after case", async () => {
		let tornDown = false;
		const runner = new BenchmarkRunner();

		await runner.runSuite({
			name: "suite",
			cases: [
				{
					name: "case",
					iterations: 1,
					setup() {
						return { value: 1 };
					},
					async run() {},
					teardown() {
						tornDown = true;
					},
				},
			],
		});

		expect(tornDown).toBe(true);
	});
});
