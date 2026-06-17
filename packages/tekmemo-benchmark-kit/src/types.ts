export interface BenchmarkClock {
	now(): number;
}

export interface BenchmarkIterationContext<TContext = unknown> {
	suiteName: string;
	caseName: string;
	iteration: number;
	isWarmup: boolean;
	context: TContext;
	signal?: AbortSignal | undefined;
}

export interface BenchmarkCase<TContext = unknown> {
	name: string;
	description?: string | undefined;
	iterations: number;
	warmupIterations?: number | undefined;
	concurrency?: number | undefined;
	timeoutMs?: number | undefined;
	tags?: string[] | undefined;
	setup?: () => Promise<TContext> | TContext;
	teardown?: (context: TContext) => Promise<void> | void;
	run: (ctx: BenchmarkIterationContext<TContext>) => Promise<void> | void;
	validate?: (ctx: BenchmarkIterationContext<TContext>) => Promise<void> | void;
}

export interface BenchmarkSuite {
	name: string;
	description?: string | undefined;
	cases: BenchmarkCase[];
	tags?: string[] | undefined;
}

export interface BenchmarkIterationResult {
	iteration: number;
	durationMs: number;
	ok: boolean;
	errorName?: string | undefined;
	errorMessage?: string | undefined;
}

export interface BenchmarkCaseStats {
	count: number;
	successes: number;
	failures: number;
	errorRate: number;
	totalDurationMs: number;
	minMs: number;
	maxMs: number;
	meanMs: number;
	medianMs: number;
	p50Ms: number;
	p90Ms: number;
	p95Ms: number;
	p99Ms: number;
	throughputPerSecond: number;
}

export interface BenchmarkCaseResult {
	name: string;
	description?: string | undefined;
	tags: string[];
	iterations: BenchmarkIterationResult[];
	stats: BenchmarkCaseStats;
	startedAt: string;
	completedAt: string;
}

export interface BenchmarkSuiteResult {
	name: string;
	description?: string | undefined;
	tags: string[];
	cases: BenchmarkCaseResult[];
	startedAt: string;
	completedAt: string;
	totalDurationMs: number;
}

export interface BenchmarkRunnerOptions {
	clock?: BenchmarkClock | undefined;
	failFast?: boolean | undefined;
	captureErrors?: boolean | undefined;
}

export interface BenchmarkThresholds {
	maxMeanMs?: number | undefined;
	maxP50Ms?: number | undefined;
	maxP90Ms?: number | undefined;
	maxP95Ms?: number | undefined;
	maxP99Ms?: number | undefined;
	maxErrorRate?: number | undefined;
	minThroughputPerSecond?: number | undefined;
}

export interface BenchmarkThresholdFailure {
	caseName: string;
	metric: keyof BenchmarkThresholds;
	expected: number;
	actual: number;
}

export interface BenchmarkThresholdResult {
	ok: boolean;
	failures: BenchmarkThresholdFailure[];
}
