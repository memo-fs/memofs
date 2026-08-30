import type { MemoFS } from "@memofs/core";
import { CliUsageError } from "../errors/cli-errors";
import type { CliOutput } from "../output/output";

export function collect(value: string, previous: string[]): string[] {
	previous.push(value);
	return previous;
}

export function parseScope(
	value: string | undefined,
): "local" | "global" | undefined {
	if (value === undefined) return undefined;
	if (value === "local" || value === "global") return value;
	throw new CliUsageError(
		`--scope must be "local" or "global", got "${value}"`,
	);
}

export interface CLIContext {
	globals: () => Promise<{
		root: string;
		json: boolean;
		verbose: boolean;
		quiet: boolean;
		memo: MemoFS;
	}>;
	setExitCode: (code: number) => void;
	setCurrentCommand: (cmd: string) => void;
	output: CliOutput;
	stdinContent?: string;
	cwd?: string;
	parsePositiveOption: (value: string, previous: number) => number;
	parseNonNegativeOption: (value: string, previous: number) => number;
}
