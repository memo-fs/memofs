import type { BenchmarkCase, BenchmarkSuite } from "../types";
import { validateBenchmarkSuite } from "../utils/validation";

export function createBenchmarkSuite(input: BenchmarkSuite): BenchmarkSuite {
	const suite: BenchmarkSuite = {
		name: input.name,
		description: input.description,
		tags: input.tags ? [...input.tags] : [],
		cases: input.cases.map((testCase: BenchmarkCase) => ({
			...testCase,
			tags: testCase.tags ? [...testCase.tags] : [],
		})),
	};

	validateBenchmarkSuite(suite);
	return suite;
}
