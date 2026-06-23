import { BenchmarkRunError } from "../errors/benchmark-errors";
import { summarizeIterations } from "../stats/stats";
import { SystemBenchmarkClock } from "../time/clock";
import type {
	BenchmarkCase,
	BenchmarkCaseResult,
	BenchmarkClock,
	BenchmarkIterationResult,
	BenchmarkRunnerOptions,
	BenchmarkSuite,
	BenchmarkSuiteResult,
} from "../types";
import { runConcurrent } from "../utils/concurrency";
import { withTimeout } from "../utils/timeout";
import {
	validateBenchmarkCase,
	validateBenchmarkSuite,
} from "../utils/validation";

export class BenchmarkRunner {
	private readonly clock: BenchmarkClock;
	private readonly failFast: boolean;
	private readonly captureErrors: boolean;

	constructor(options?: BenchmarkRunnerOptions) {
		this.clock = options?.clock ?? new SystemBenchmarkClock();
		this.failFast = options?.failFast ?? false;
		this.captureErrors = options?.captureErrors ?? true;
	}

	async runSuite(suite: BenchmarkSuite): Promise<BenchmarkSuiteResult> {
		validateBenchmarkSuite(suite);

		const startedAt = new Date().toISOString();
		const start = this.clock.now();
		const cases: BenchmarkCaseResult[] = [];

		for (const testCase of suite.cases) {
			cases.push(await this.runCase(suite.name, testCase));
		}

		const totalDurationMs = this.clock.now() - start;

		return {
			name: suite.name,
			description: suite.description,
			tags: suite.tags ?? [],
			cases,
			startedAt,
			completedAt: new Date().toISOString(),
			totalDurationMs,
		};
	}

	async runCase<TContext>(
		suiteName: string,
		testCase: BenchmarkCase<TContext>,
	): Promise<BenchmarkCaseResult> {
		validateBenchmarkCase(testCase);

		const startedAt = new Date().toISOString();
		let context = undefined as TContext;
		const iterations: BenchmarkIterationResult[] = [];

		try {
			if (testCase.setup) {
				context = await testCase.setup();
			}

			const warmupIterations = testCase.warmupIterations ?? 0;

			for (let i = 0; i < warmupIterations; i += 1) {
				await this.runOneIteration({
					suiteName,
					testCase,
					iteration: i,
					isWarmup: true,
					context,
				});
			}

			const measured = Array.from(
				{ length: testCase.iterations },
				(_value, index) => index,
			);
			const concurrency = testCase.concurrency ?? 1;
			const byIndex = new Map<number, BenchmarkIterationResult>();

			await runConcurrent(measured, concurrency, async (iteration) => {
				const result = await this.runOneIteration({
					suiteName,
					testCase,
					iteration,
					isWarmup: false,
					context,
				});
				byIndex.set(iteration, result);
			});

			for (const index of measured) {
				const result = byIndex.get(index);
				if (result) iterations.push(result);
			}
		} finally {
			if (testCase.teardown) {
				await testCase.teardown(context);
			}
		}

		return {
			name: testCase.name,
			description: testCase.description,
			tags: testCase.tags ?? [],
			iterations,
			stats: summarizeIterations(iterations),
			startedAt,
			completedAt: new Date().toISOString(),
		};
	}

	private async runOneIteration<TContext>(input: {
		suiteName: string;
		testCase: BenchmarkCase<TContext>;
		iteration: number;
		isWarmup: boolean;
		context: TContext;
	}): Promise<BenchmarkIterationResult> {
		const start = this.clock.now();

		try {
			await withTimeout(async (signal) => {
				const ctx = {
					suiteName: input.suiteName,
					caseName: input.testCase.name,
					iteration: input.iteration,
					isWarmup: input.isWarmup,
					context: input.context,
					signal,
				};

				await input.testCase.run(ctx);

				if (input.testCase.validate) {
					await input.testCase.validate(ctx);
				}
			}, input.testCase.timeoutMs);

			return {
				iteration: input.iteration,
				durationMs: Math.max(0, this.clock.now() - start),
				ok: true,
			};
		} catch (error) {
			if (this.failFast || !this.captureErrors || input.isWarmup) {
				throw error instanceof Error
					? error
					: new BenchmarkRunError("Benchmark iteration failed.", {
							cause: error,
						});
			}

			return {
				iteration: input.iteration,
				durationMs: Math.max(0, this.clock.now() - start),
				ok: false,
				errorName: error instanceof Error ? error.name : "UnknownError",
				errorMessage: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
