import { assertString } from "@repo/utils";
import type { Tekmemo } from "../Tekmemo";
import type {
	ConversationEntry,
	SnapshotRecord,
	TimestampedNote,
} from "../../core/types/memory-documents";
import type { ReadConversationHistoryOptions } from "../../core/documents/conversations-memory";
import type {
	WriteMemoryInput,
	WriteMemoryResult,
	SnapshotMemoryInput,
} from "../types";
import {
	readConversationHistory,
	appendConversationEntry,
	MemoryNotFoundError,
	readSnapshotRecords,
	createSnapshotPath,
	writeCoreMemory,
	NOTES_MEMORY_PATH,
	MEMORY_EVENTS_PATH,
	createTekMemoAgentSession,
} from "../../index";
import type {
	CreateTekMemoAgentSessionOptions,
	TekMemoAgentSession,
} from "../../agentfs/session/agent-session";
import { createLocalStrategy } from "../local-strategy";
import { createMemoryStrategy } from "../memory-strategy";
import { createHybridStrategy } from "../hybrid-strategy";
import { createFileSyncLayer } from "../sync/file-replication";
import { bootstrapMemoryStore } from "../../index";

export async function coreRead(
	self: Tekmemo,
	signal?: AbortSignal,
): Promise<string> {
	const result = await (self as any).strategy.readCoreMemory(signal);
	return result.content;
}

export async function coreUpdate(
	self: Tekmemo,
	content: string,
	signal?: AbortSignal,
): Promise<void> {
	assertString(content, "content");
	await (self as any).strategy.updateCoreMemory(content, signal);
}

export async function notesRead(
	self: Tekmemo,
	signal?: AbortSignal,
): Promise<string> {
	const result = await (self as any).strategy.readNotesMemory(signal);
	return result.content;
}

export async function notesRecord(
	self: Tekmemo,
	note: Omit<TimestampedNote, "timestamp"> & {
		timestamp?: string;
		tier?: WriteMemoryInput["tier"];
	},
	signal?: AbortSignal,
): Promise<WriteMemoryResult> {
	return (self as any).strategy.writeMemory(
		{
			content: note.content,
			kind: note.kind ?? "note",
			...(note.title === undefined ? {} : { title: note.title }),
			...(note.tags === undefined ? {} : { tags: note.tags }),
			...(note.confidence === undefined ? {} : { confidence: note.confidence }),
			...(note.source === undefined ? {} : { source: note.source }),
			...(note.tier === undefined ? {} : { tier: note.tier }),
			...(note.metadata === undefined ? {} : { metadata: note.metadata }),
		},
		signal,
	);
}

export async function conversationsRead(
	self: Tekmemo,
	options?: ReadConversationHistoryOptions,
): Promise<ConversationEntry[]> {
	await self.bootstrap(); // ensure bootstrapped
	try {
		return await readConversationHistory(self.store, options);
	} catch (err) {
		if (err instanceof MemoryNotFoundError) return [];
		throw err;
	}
}

export async function conversationsAppend(
	self: Tekmemo,
	entry: ConversationEntry,
): Promise<void> {
	await self.bootstrap();
	await appendConversationEntry(self.store, entry);
}

export async function snapshotsList(self: Tekmemo): Promise<SnapshotRecord[]> {
	await self.bootstrap();
	try {
		return await readSnapshotRecords(self.store);
	} catch (err) {
		if (err instanceof MemoryNotFoundError) return [];
		throw err;
	}
}

export async function snapshotsRestore(
	self: Tekmemo,
	id: string,
): Promise<void> {
	await self.bootstrap();
	const path = createSnapshotPath(id);
	const raw = await self.store.read(path);
	const parsed = JSON.parse(raw);
	if (parsed.version !== 1 || !parsed.files) {
		throw new Error("Invalid or unsupported snapshot format.");
	}
	const files = parsed.files;
	if (typeof files.core === "string") {
		await writeCoreMemory(self.store, files.core);
	}
	if (typeof files.notes === "string") {
		await self.store.write(NOTES_MEMORY_PATH, files.notes);
	}
	if (Array.isArray(files.events)) {
		const eventLines =
			files.events.map((e: unknown) => JSON.stringify(e)).join("\n") +
			(files.events.length > 0 ? "\n" : "");
		await self.store.write(MEMORY_EVENTS_PATH, eventLines);
	}
}

export function agentfsCreateSession(
	self: Tekmemo,
	options: Omit<CreateTekMemoAgentSessionOptions, "memory" | "projectId"> & {
		projectId?: string;
	},
): TekMemoAgentSession {
	return createTekMemoAgentSession({
		memory: self.store,
		projectId: options.projectId ?? self.projectId,
		...options,
	} as CreateTekMemoAgentSessionOptions);
}

export function createStrategy(self: Tekmemo, resolved: any): any {
	if (resolved.mode === "memory") {
		return createMemoryStrategy({
			name: self.name,
			version: self.version,
		});
	}

	if (resolved.mode === "hybrid") {
		if (!self.cloud) {
			throw new Error(
				"Hybrid mode requires cloud configuration (baseUrl + apiKey) or a cloudClient instance.",
			);
		}
		let local: ReturnType<typeof createLocalStrategy>;
		const sync = createFileSyncLayer({
			client: self.cloud,
			store: self.store,
			projectId: self.projectId,
			snapshot: (input?: SnapshotMemoryInput) => local.createSnapshot(input),
			reindex: () =>
				bootstrapMemoryStore(self.store, { projectId: self.projectId }),
		});
		local = createLocalStrategy({
			store: self.store,
			embedder: self.embedder,
			extractor: self.extractor,
			reranker: self.reranker,
			llmClient: self.llmClient,
			recallStore: self.recallStore,
			projectId: self.projectId,
			tenantId: self.tenantId,
			autoBootstrap: resolved.autoBootstrap,
			name: self.name,
			version: self.version,
			syncLayer: sync,
		});
		return createHybridStrategy({
			local,
			sync,
			readPolicy: self.readPolicy,
			writePolicy: self.writePolicy,
		});
	}

	return createLocalStrategy({
		store: self.store,
		embedder: self.embedder,
		extractor: self.extractor,
		reranker: self.reranker,
		llmClient: self.llmClient,
		recallStore: self.recallStore,
		projectId: self.projectId,
		tenantId: self.tenantId,
		autoBootstrap: resolved.autoBootstrap,
		name: self.name,
		version: self.version,
	});
}
