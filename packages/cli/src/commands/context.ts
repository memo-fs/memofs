import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";
import { parsePositiveInteger } from "../utils/numbers";

export interface ContextCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	query?: string | undefined;
	maxChars?: number | string | undefined;
	includeEvents?: boolean | undefined;
	includeChunks?: boolean | undefined;
}

interface ContextSearchMatch {
	file: string;
	line: number;
	content: string;
}

function truncate(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, Math.max(0, maxChars - 20)).trimEnd()}\n\n[truncated]`;
}

function searchText(
	file: string,
	content: string,
	query: string,
): ContextSearchMatch[] {
	const lower = query.toLowerCase();
	return content
		.split(/\r?\n/)
		.map((line, index) => ({ file, line: index + 1, content: line.trim() }))
		.filter((entry) => entry.content.toLowerCase().includes(lower));
}

export async function runContextCommand(
	options: ContextCommandOptions,
): Promise<number> {
	const maxChars =
		typeof options.maxChars === "number"
			? options.maxChars
			: options.maxChars
				? parsePositiveInteger(options.maxChars, "max chars")
				: 12000;
	const core =
		(await options.fs.readTextIfExists(TEKMEMO_PATHS.coreMemory)) ?? "";
	const notes =
		(await options.fs.readTextIfExists(TEKMEMO_PATHS.notesMemory)) ?? "";
	const eventContent =
		(await options.fs.readTextIfExists(TEKMEMO_PATHS.memoryEvents)) ?? "";
	const chunkContent =
		(await options.fs.readTextIfExists(TEKMEMO_PATHS.chunks)) ?? "";
	const events = eventContent
		? parseJsonl(eventContent)
				.slice(-10)
				.map((record) => record.value)
		: [];
	const chunks = chunkContent
		? parseJsonl(chunkContent)
				.slice(-10)
				.map((record) => record.value)
		: [];
	const matches = options.query
		? [
				...searchText(TEKMEMO_PATHS.coreMemory, core, options.query),
				...searchText(TEKMEMO_PATHS.notesMemory, notes, options.query),
			]
		: [];

	const data = {
		rootDir: options.fs.rootDir,
		query: options.query ?? null,
		core: truncate(core.trim(), Math.floor(maxChars * 0.45)),
		notes: truncate(notes.trim(), Math.floor(maxChars * 0.35)),
		matches,
		...(options.includeEvents ? { recentEvents: events } : {}),
		...(options.includeChunks ? { recentChunks: chunks } : {}),
	};

	if (options.json) {
		printJsonEnvelope(options.output, "context", data);
		return 0;
	}

	const sections = [
		"# TekMemo Context",
		`Root: ${options.fs.rootDir}`,
		options.query ? `Query: ${options.query}` : undefined,
		"",
		"## Core Memory",
		data.core || "No core memory found.",
		"",
		"## Notes Memory",
		data.notes || "No notes memory found.",
	];
	if (matches.length > 0) {
		sections.push(
			"",
			"## Text Matches",
			...matches
				.slice(0, 20)
				.map((m) => `- ${m.file}:${m.line} — ${m.content}`),
		);
	}
	if (options.includeEvents && events.length > 0) {
		sections.push(
			"",
			"## Recent Memory Events",
			...events.map((event) =>
				`- ${String(event.timestamp ?? "unknown")} ${String(event.type ?? "unknown")} ${String(event.summary ?? "")}`.trim(),
			),
		);
	}
	options.output.write(
		truncate(
			sections
				.filter((section): section is string => section !== undefined)
				.join("\n"),
			maxChars,
		),
	);
	return 0;
}
