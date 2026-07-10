import { chunkText } from "../../core/chunking/chunk-text";
import {
	CORE_MEMORY_PATH,
	NOTES_MEMORY_PATH,
} from "../../core/constants/memory-paths";
import {
	readCoreMemory,
	writeCoreMemory,
} from "../../core/documents/core-memory";
import { appendTimestampedNote } from "../../core/documents/notes-memory";
import {
	appendMemoryEvent,
	createMemoryEvent,
} from "../../core/events/memory-events";
import type {
	MemorySourceType,
	MemoryType,
} from "../../core/types/memory-documents";
import type { GraphEdge } from "../../graph/types";
import { classifyDurability } from "../../security/durability-tier";
import { assertWriteAllowed } from "../../security/secret-blocklist";
import type {
	MemoryDocumentResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "../types";
import {
	hash,
	stableEdgeKey,
	toGraphEdgeInput,
	toGraphNodeInput,
} from "./helpers";
import type { LocalStrategyContext } from "./types";

export async function writeMemory(
	ctx: LocalStrategyContext,
	input: WriteMemoryInput,
	signal?: AbortSignal,
): Promise<WriteMemoryResult> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();

	assertWriteAllowed(
		[input.content, ...(input.title === undefined ? [] : [input.title])],
		NOTES_MEMORY_PATH,
	);

	const tierDecision = classifyDurability({
		content: input.content,
		...(input.kind === undefined ? {} : { kind: input.kind }),
		...(input.confidence === undefined ? {} : { confidence: input.confidence }),
		...(input.tier === undefined ? {} : { tier: input.tier }),
	});
	const durable = tierDecision.tier === "durable";
	const now = new Date().toISOString();

	const id = input.id ?? `mem_${hash(`${now}:${input.content}`).slice(0, 16)}`;
	await appendTimestampedNote(ctx.options.store, {
		timestamp: now,
		kind: input.kind ?? "note",
		content: input.content,
		...(input.title === undefined ? {} : { title: input.title }),
		...(input.tags === undefined ? {} : { tags: input.tags }),
		...(input.confidence === undefined ? {} : { confidence: input.confidence }),
		...(input.source === undefined
			? { source: "memofs" }
			: { source: input.source }),
		metadata: {
			id,
			...(input.workspaceId === undefined
				? {}
				: { workspaceId: input.workspaceId }),
			...(input.projectId === undefined ? {} : { projectId: input.projectId }),
			...(input.sourceRefs === undefined
				? {}
				: { sourceRefs: input.sourceRefs }),
			...(input.metadata ?? {}),
		},
	});
	await appendMemoryEvent(
		ctx.options.store,
		createMemoryEvent({
			type: "memory.created",
			...((input.projectId ?? ctx.options.projectId)
				? { projectId: input.projectId ?? ctx.options.projectId }
				: {}),
			actor: { type: "agent", id: "memofs" },
			summary: input.title ?? input.content.slice(0, 160),
			metadata: {
				id,
				kind: input.kind ?? "note",
				tags: input.tags ?? [],
			},
		}),
	);

	const noteText = `${input.title ?? input.content.slice(0, 80)}\n${input.content}`;

	if (durable) {
		if (ctx.options.embedder && ctx.options.recallStore) {
			await indexDocument(ctx, noteText, {
				sourceType: "note",
				sourceId: now,
				sourcePath: NOTES_MEMORY_PATH,
				memoryType: "notes",
				tags: input.tags,
				kind: input.kind,
				confidence: input.confidence,
			});
		}

		ctx.indexLexical({ id, text: noteText });

		if (ctx.options.autoExtractGraph !== false) {
			await autoExtractGraph(ctx, noteText, {
				sourceType: "note",
				sourceId: id,
			});
		}
	}

	return {
		id,
		created: true,
		tier: tierDecision.tier,
		tierReason: tierDecision.reason,
		...(input.sourceRefs === undefined ? {} : { sourceRefs: input.sourceRefs }),
	};
}

export async function updateCoreMemory(
	ctx: LocalStrategyContext,
	content: string,
	signal?: AbortSignal,
): Promise<MemoryDocumentResult> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();

	assertWriteAllowed([content], CORE_MEMORY_PATH);
	await writeCoreMemory(ctx.options.store, content);
	await appendMemoryEvent(
		ctx.options.store,
		createMemoryEvent({
			type: "memory.updated",
			...(ctx.options.projectId ? { projectId: ctx.options.projectId } : {}),
			actor: { type: "agent", id: "memofs" },
			summary: "Core memory updated.",
		}),
	);

	if (ctx.options.embedder && ctx.options.recallStore) {
		await indexDocument(ctx, content, {
			sourceType: "document",
			sourceId: "core",
			sourcePath: CORE_MEMORY_PATH,
			memoryType: "core",
		});
	}

	ctx.indexLexical({ id: "core:document", text: content });

	if (ctx.options.autoExtractGraph !== false) {
		await autoExtractGraph(ctx, content, {
			sourceType: "document",
			sourceId: "core",
		});
	}

	await writeCoreMemory(ctx.options.store, content);
	return { content: await readCoreMemory(ctx.options.store) };
}

export async function indexDocument(
	ctx: LocalStrategyContext,
	text: string,
	meta: {
		sourceType: MemorySourceType;
		sourceId: string;
		sourcePath: string;
		memoryType: MemoryType;
		tags?: string[];
		kind?: string;
		confidence?: number;
	},
): Promise<void> {
	if (!ctx.options.embedder || !ctx.options.recallStore) return;
	try {
		const chunks = chunkText(text, {
			source: {
				projectId: ctx.options.projectId,
				...(ctx.options.tenantId !== undefined
					? { tenantId: ctx.options.tenantId }
					: {}),
				sourceType: meta.sourceType,
				sourceId: meta.sourceId,
				sourcePath: meta.sourcePath,
			},
			memoryType: meta.memoryType,
			metadata: {
				...(meta.tags !== undefined ? { tags: meta.tags } : {}),
				...(meta.kind !== undefined ? { kind: meta.kind } : {}),
				...(meta.confidence !== undefined
					? { confidence: meta.confidence }
					: {}),
			},
		});
		if (chunks.length === 0) return;
		const texts = chunks.map((c) => c.text);
		const embedResult = await ctx.options.embedder.embedTexts({ texts });
		const docs = chunks.map((c, i) => {
			const embRecord = embedResult.embeddings[i];
			if (!embRecord)
				throw new Error("Mismatch between chunk index and embedding output.");
			const safeRecallId = c.id.replace(/[^A-Za-z0-9._:@#-]/g, "_");
			return {
				id: safeRecallId,
				text: c.text,
				embedding: embRecord.embedding,
				metadata: {
					projectId: ctx.options.projectId,
					...(ctx.options.tenantId !== undefined
						? { tenantId: ctx.options.tenantId }
						: {}),
					sourceType: meta.sourceType,
					sourceId: meta.sourceId,
					memoryType: meta.memoryType,
					...c.metadata,
				},
			};
		});
		await ctx.options.recallStore.upsert(docs);
	} catch {
		// Best effort.
	}
}

export async function autoExtractGraph(
	ctx: LocalStrategyContext,
	text: string,
	source: { sourceType: string; sourceId: string },
): Promise<void> {
	try {
		const sourceRef = {
			sourceType: source.sourceType,
			sourceId: source.sourceId,
		};
		const result = await ctx.extractor.extract({
			text,
			sourceRef,
			defaultNodeType: "concept",
		});
		const contradictionEdges: GraphEdge[] = (result.contradictions ?? []).map(
			(c) => ({
				from: c.from,
				to: c.to,
				type: c.type === "" ? "supersedes" : c.type,
				directed: true,
				weight: 0.5,
				confidence: 0.5,
				sourceRefs: [sourceRef],
				metadata: { extractor: ctx.extractor.name, contradiction: true },
			}),
		);
		const edges = [...result.edges, ...contradictionEdges];
		if (result.nodes.length === 0 && edges.length === 0) {
			return;
		}
		if (result.nodes.length > 0) {
			await ctx.graphStore.upsertNodes(result.nodes);
			for (const node of result.nodes) {
				ctx.graphNodes.set(node.id, toGraphNodeInput(node));
				ctx.indexLexical({
					id: `graph:${node.id}`,
					text: `${node.label}${node.summary ? ` ${node.summary}` : ""}`,
				});
			}
		}
		for (const edge of edges) {
			try {
				await ctx.graphStore.upsertEdges([edge]);
				ctx.graphEdges.set(stableEdgeKey(edge.from, edge.type, edge.to), {
					directed: true,
					weight: 1,
					...toGraphEdgeInput(edge),
				});
			} catch {
				// Skip an edge that the store rejects.
			}
		}
	} catch {
		// Best effort.
	}
}
