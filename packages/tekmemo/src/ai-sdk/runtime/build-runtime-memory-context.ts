import {
	canReadMemoryMetadata,
	createRecallFilters,
	normalizeAccessContext,
} from "../scope/scope-policy";
import type {
	BuildRuntimeMemoryContextInput,
	BuildRuntimeMemoryContextResult,
} from "../types/runtime";

const DEFAULT_MAX_CHARS = 24_000;
const DEFAULT_SECTION_CHARS = 8_000;

export async function buildRuntimeMemoryContext(
	input: BuildRuntimeMemoryContextInput,
): Promise<BuildRuntimeMemoryContextResult> {
	const access = normalizeAccessContext(input.access);
	const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
	const maxSectionChars = input.maxSectionChars ?? DEFAULT_SECTION_CHARS;
	const warnings: string[] = [];
	const sections: Array<{ title: string; text: string }> = [];

	const baseInstructions = input.baseInstructions?.trim();
	if (baseInstructions) {
		sections.push({
			title: "Instructions",
			text: limitText(
				baseInstructions,
				maxSectionChars,
				warnings,
				"Instructions",
			),
		});
	}

	if (input.includeCoreMemory !== false && access.includeProjectMemory) {
		try {
			const core = await input.runtime.readCoreMemory(input.signal);
			if (core.content.trim()) {
				sections.push({
					title: "Project Memory",
					text: limitText(
						core.content,
						maxSectionChars,
						warnings,
						"Project Memory",
					),
				});
			}
		} catch (error) {
			warnings.push(`Could not read project memory: ${formatError(error)}`);
		}
	}

	if (input.includeNotes !== false) {
		try {
			const page = await input.runtime.listNotes(
				{ limit: input.noteLimit ?? 12 },
				input.signal,
			);
			const visible = page.items.filter((note) =>
				canReadMemoryMetadata(note.metadata, access),
			);
			if (visible.length > 0) {
				sections.push({
					title: "Relevant Notes",
					text: limitText(
						visible.map(formatNote).join("\n"),
						maxSectionChars,
						warnings,
						"Relevant Notes",
					),
				});
			}
		} catch (error) {
			warnings.push(`Could not list notes: ${formatError(error)}`);
		}
	}

	if (input.includeRecall !== false && input.query?.trim()) {
		try {
			const recall = await input.runtime.recall(
				{
					query: input.query,
					topK: input.recallLimit ?? 8,
					filters: createRecallFilters(access),
				},
				input.signal,
			);
			const visible = recall.items.filter((hit) =>
				canReadMemoryMetadata(hit.metadata, access),
			);
			if (visible.length > 0) {
				sections.push({
					title: "Memory Recall",
					text: limitText(
						visible.map(formatRecallHit).join("\n"),
						maxSectionChars,
						warnings,
						"Memory Recall",
					),
				});
			}
			for (const warning of recall.warnings ?? []) warnings.push(warning);
		} catch (error) {
			warnings.push(`Could not recall memory: ${formatError(error)}`);
		}
	}

	const rendered: string[] = [];
	const outputSections: BuildRuntimeMemoryContextResult["sections"] = [];
	let used = 0;
	for (const section of sections) {
		const block = `## ${section.title}\n\n${section.text.trim()}`;
		if (used + block.length > maxChars) {
			warnings.push(`Context truncated before section: ${section.title}.`);
			break;
		}
		rendered.push(block);
		used += block.length + 2;
		outputSections.push({ title: section.title, charLength: block.length });
	}

	return {
		text: rendered.join("\n\n").trim(),
		warnings,
		sections: outputSections,
	};
}

function formatNote(note: {
	title?: string;
	content: string;
	kind?: string;
	tags?: string[];
}): string {
	const title = note.title ? ` ${note.title}` : "";
	const tags = note.tags?.length ? ` [${note.tags.join(", ")}]` : "";
	return `- (${note.kind ?? "note"})${title}${tags}: ${singleLine(note.content)}`;
}

function formatRecallHit(hit: { text: string; score?: number }): string {
	const score =
		typeof hit.score === "number" ? ` score=${hit.score.toFixed(3)}` : "";
	return `- ${singleLine(hit.text)}${score}`;
}

function singleLine(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function limitText(
	value: string,
	max: number,
	warnings: string[],
	section: string,
): string {
	if (value.length <= max) return value;
	warnings.push(`${section} was truncated to ${max} characters.`);
	return `${value.slice(0, Math.max(0, max - 20)).trimEnd()}\n…[truncated]`;
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
