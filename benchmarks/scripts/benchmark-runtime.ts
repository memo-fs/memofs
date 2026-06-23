import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { RecallDocument } from "@tekbreed/tekmemo";
import {
	BenchmarkRunner,
	type BenchmarkSuite,
	type BenchmarkSuiteResult,
	type BenchmarkThresholdFailure,
	type BenchmarkThresholdResult,
	type BenchmarkThresholds,
	evaluateBenchmarkThresholds,
	jsonBenchmarkReport,
	markdownBenchmarkReport,
} from "@tekbreed/tekmemo-benchmark-kit";

const BENCHMARK_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const REPO_ROOT = path.resolve(BENCHMARK_ROOT, "..");

/**
 * Runs benchmark suites, writes reports, and exits on threshold failures.
 */
export async function runBenchmarks({
	mode,
	suites,
	notes = [],
}: RunBenchmarksInput): Promise<void> {
	const thresholds = await readThresholds(mode);
	const runner = new BenchmarkRunner({ failFast: false, captureErrors: true });
	const results: BenchmarkRunResult[] = [];
	const failures: BenchmarkThresholdFailure[] = [];

	for (const suite of suites) {
		const result = await runner.runSuite(suite);
		const verdict = evaluateBenchmarkThresholds(result, thresholds.default);
		results.push({ result, verdict });
		failures.push(...verdict.failures);
	}

	await writeReports({ mode, results, notes, failures });

	if (failures.length > 0) {
		for (const failure of failures) {
			console.error(
				`${failure.caseName} failed ${failure.metric}: expected ${failure.expected}, got ${failure.actual}`,
			);
		}
		process.exitCode = 1;
	}
}

/**
 * Builds a deterministic embedding vector from a seed.
 */
export function createVector(dimensions: number, seed: number): number[] {
	return Array.from({ length: dimensions }, (_value, index) => {
		const value = Math.sin(seed + index * 13.37);
		return Number(value.toFixed(6));
	});
}

/**
 * Builds deterministic recall documents.
 */
export function createRecallDocuments(
	count: number,
	dimensions: number,
): RecallDocument[] {
	return Array.from({ length: count }, (_value, index) => ({
		id: `memory-${index}`,
		text: `TekMemo memory record ${index} about layered agent memory.`,
		embedding: createVector(dimensions, index + 1),
		metadata: {
			projectId: "tekbreed-tekmemo",
			sourceType: "benchmark",
			sourceId: `source-${index % 5}`,
			memoryType: index % 2 === 0 ? "core" : "notes",
		},
	}));
}

/**
 * Creates a repeated text body for chunking and search benchmarks.
 */
export function createMemoryText(records: number): string {
	return Array.from(
		{ length: records },
		(_value, index) =>
			`Record ${index}. TekMemo keeps core memory compact, archival notes durable, and recall fragments searchable for agent context.`,
	).join("\n\n");
}

/**
 * Formats provider benchmark skip notes.
 */
export function providerSkipNotes(
	requiredEnv: Record<string, string | undefined>,
): string[] {
	return Object.entries(requiredEnv)
		.filter(([, value]) => !value)
		.map(([name]) => `Skipped provider benchmark requiring ${name}.`);
}

/**
 * Loads tier-specific threshold settings.
 */
async function readThresholds(
	mode: BenchmarkMode,
): Promise<BenchmarkThresholdFile> {
	const raw = await readFile(
		path.join(BENCHMARK_ROOT, "thresholds", `${mode}.json`),
		"utf8",
	);
	return JSON.parse(raw) as BenchmarkThresholdFile;
}

/**
 * Writes JSON and Markdown reports for the current run.
 */
async function writeReports({
	mode,
	results,
	notes,
	failures,
}: WriteReportsInput): Promise<void> {
	const outputDir = path.join(REPO_ROOT, "benchmark-results", mode);
	await mkdir(outputDir, { recursive: true });

	const summary = {
		mode,
		startedAt: new Date().toISOString(),
		ok: failures.length === 0,
		notes,
		failures,
		suites: results.map(({ result, verdict }) => ({ result, verdict })),
	};

	await writeFile(
		path.join(outputDir, "summary.json"),
		`${JSON.stringify(summary, null, 2)}\n`,
	);

	const markdown = [
		`# TekMemo ${mode} benchmarks`,
		"",
		`Status: ${summary.ok ? "pass" : "fail"}`,
		"",
		...notes.map((note) => `- ${note}`),
		notes.length > 0 ? "" : undefined,
		...results.flatMap(({ result }) => [
			markdownBenchmarkReport(result),
			"```json",
			jsonBenchmarkReport(result),
			"```",
			"",
		]),
	].filter(Boolean);

	await writeFile(
		path.join(outputDir, "summary.md"),
		`${markdown.join("\n")}\n`,
	);
}

type BenchmarkMode = "smoke" | "release" | "full";

interface RunBenchmarksInput {
	mode: BenchmarkMode;
	suites: BenchmarkSuite[];
	notes?: string[];
}

interface BenchmarkThresholdFile {
	default: BenchmarkThresholds;
}

interface BenchmarkRunResult {
	result: BenchmarkSuiteResult;
	verdict: BenchmarkThresholdResult;
}

interface WriteReportsInput {
	mode: BenchmarkMode;
	results: BenchmarkRunResult[];
	notes: string[];
	failures: BenchmarkThresholdFailure[];
}
