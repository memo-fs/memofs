import type { MemoryStore } from "@tekbreed/tekmemo";
import {
	appendTimestampedNote,
	CORE_MEMORY_PATH,
	NOTES_MEMORY_PATH,
	readCoreMemory,
	readNotesMemory,
	searchMemoryText,
	writeCoreMemory,
} from "@tekbreed/tekmemo";
import type {
	AiRuntimeMemoryNote,
	AiRuntimePage,
	AiRuntimeRecallHit,
	AiRuntimeRecallInput,
	AiRuntimeRecallResult,
	JsonObject,
	TekMemoAiRuntime,
} from "../types/runtime";

export interface CreateLocalAiSdkRuntimeOptions {
	workspace: MemoryStore;
	user?: MemoryStore;
}

export function createLocalAiSdkRuntime(
	options: CreateLocalAiSdkRuntimeOptions,
): TekMemoAiRuntime {
	return {
		async readCoreMemory() {
			return { content: await readCoreMemory(options.workspace) };
		},
		async updateCoreMemory(input) {
			await writeCoreMemory(options.workspace, input.content);
			return { content: await readCoreMemory(options.workspace) };
		},
		async listNotes(input = {}) {
			const notesText = await safeReadNotes(options.workspace);
			const items = parseMarkdownNotes(notesText).filter((note) => {
				if (input.kind && note.kind !== input.kind) return false;
				if (input.tag && !note.tags?.includes(input.tag)) return false;
				return true;
			});
			return {
				items: items.slice(0, input.limit ?? 50),
			} satisfies AiRuntimePage<AiRuntimeMemoryNote>;
		},
		async createNote(input) {
			const timestamp = new Date().toISOString();
			await appendTimestampedNote(options.workspace, {
				timestamp,
				kind: input.kind ?? "note",
				content: input.content,
				title: input.title,
				tags: input.tags,
				confidence: input.confidence,
				source: input.source,
				metadata: input.metadata,
			});
			return {
				id: `local_${hashString(`${timestamp}:${input.content}`)}`,
				kind: input.kind ?? "note",
				content: input.content,
				title: input.title,
				tags: input.tags,
				confidence: input.confidence,
				source: input.source,
				metadata: input.metadata,
				createdAt: timestamp,
			};
		},
		async recall(input) {
			return localRecall(options, input);
		},
		async index() {
			return {
				status: "skipped",
				warnings: [
					"Local AI SDK runtime uses deterministic text search; no cloud index job was created.",
				],
			};
		},
	};
}

async function localRecall(
	options: CreateLocalAiSdkRuntimeOptions,
	input: AiRuntimeRecallInput,
): Promise<AiRuntimeRecallResult> {
	const hits: AiRuntimeRecallHit[] = [];
	const topK = input.topK ?? 8;
	const workspaceText = [
		await safeReadPath(options.workspace, CORE_MEMORY_PATH),
		await safeReadPath(options.workspace, NOTES_MEMORY_PATH),
	]
		.filter(Boolean)
		.join("\n\n");

	for (const result of searchMemoryText({
		content: workspaceText,
		query: input.query,
		limit: topK,
	})) {
		hits.push({
			id: `workspace_${result.index}`,
			text: result.text,
			score: result.score,
			sourceType: "local",
			sourcePath: ".tekmemo",
			metadata: { scope: "project", visibility: "system" },
		});
	}

	if (options.user) {
		const userText = [
			await safeReadPath(options.user, CORE_MEMORY_PATH),
			await safeReadPath(options.user, NOTES_MEMORY_PATH),
		]
			.filter(Boolean)
			.join("\n\n");
		for (const result of searchMemoryText({
			content: userText,
			query: input.query,
			limit: topK,
		})) {
			hits.push({
				id: `user_${result.index}`,
				text: result.text,
				score: result.score,
				sourceType: "local-user",
				metadata: { scope: "user", visibility: "private" },
			});
		}
	}

	return {
		items: hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, topK),
		strategy: "local",
		fallbackUsed: false,
	};
}

async function safeReadNotes(store: MemoryStore): Promise<string> {
	try {
		return await readNotesMemory(store);
	} catch {
		return "";
	}
}

async function safeReadPath(
	store: MemoryStore,
	path: typeof CORE_MEMORY_PATH | typeof NOTES_MEMORY_PATH,
): Promise<string> {
	try {
		return await store.read(path);
	} catch {
		return "";
	}
}

function parseMarkdownNotes(markdown: string): AiRuntimeMemoryNote[] {
	const sections = markdown
		.split(/\n(?=##\s+)/g)
		.map((section) => section.trim())
		.filter((section) => section.startsWith("## "));
	return sections.map((section, index) => {
		const lines = section.split(/\r?\n/);
		const heading =
			lines[0]?.replace(/^##\s+/, "").trim() || `note-${index + 1}`;
		const contentStart = lines.findIndex((line) => line.trim() === "");
		const metaLines = lines.slice(1, contentStart === -1 ? 1 : contentStart);
		const body = (
			contentStart === -1 ? lines.slice(1) : lines.slice(contentStart + 1)
		)
			.join("\n")
			.trim();
		const kind = readMeta(metaLines, "kind") as
			| AiRuntimeMemoryNote["kind"]
			| undefined;
		const tags = readMeta(metaLines, "tags")
			?.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag && tag !== "none");
		const metadataRaw = readMeta(metaLines, "metadata");
		return {
			id: `local_note_${index}`,
			kind: kind ?? "note",
			title: heading,
			content: body,
			tags,
			metadata: parseMetadata(metadataRaw),
		};
	});
}

function readMeta(lines: string[], key: string): string | undefined {
	const prefix = `- ${key}:`;
	const found = lines.find((line) => line.startsWith(prefix));
	return found?.slice(prefix.length).trim();
}

function parseMetadata(raw: string | undefined): JsonObject | undefined {
	if (!raw) return undefined;
	try {
		const value = JSON.parse(raw);
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return value as JsonObject;
		}
		return undefined;
	} catch {
		return undefined;
	}
}

function hashString(input: string): string {
	let hash = 0x811c9dc5;
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}
