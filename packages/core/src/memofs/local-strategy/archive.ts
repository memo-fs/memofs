/**
 * Semantic garbage collection — cold archive move + restore.
 *
 * Implements the physical archive move: deprecated memories are moved
 * from `notes.md` to `.memofs/archive/<id>.json` (full-fidelity JSON),
 * and `memofs restore <id>` reverses the move. The auto-supersession
 * that creates the `deprecated` state is NOT re-implemented here — it
 * reuses the existing `supersedes` graph edge + `deprecated` graph-node
 * status from `consolidateMemory`. This module ships the downstream
 * archive move + restore path only.
 *
 * Lifecycle transitions this module owns:
 * - `deprecated → archived` (archive-move via `archiveDeprecated`)
 * - `archived → active` (restore via `restoreMemory`)
 *
 * Archived memories are NOT surfaced in `memofs.recall` /
 * `memofs.context` — the lexical store prunes them and the graph node
 * status `archived` filters them out of recall.
 *
 * @internal
 */

import {
	type ArchiveFilePath,
	createArchivePath,
	NOTES_MEMORY_PATH,
} from "../../core/constants/memory-paths";
import { normalizeMarkdownDocument } from "../../core/documents/core-memory";
import {
	formatTimestampedNote,
	type NormalizedTimestampedNote,
} from "../../core/documents/notes-memory";
import {
	appendMemoryEvent,
	createMemoryEvent,
} from "../../core/events/memory-events";
import type { Logger } from "../../core/types/logger";
import type { GraphNode } from "../../graph/types";
import { nowIso } from "../../graph/utils/time";
import type { GraphNodeInput, MemoryKind } from "../types";
import { parseNoteBlocks } from "./notes-parser";
import type { LocalStrategyContext } from "./types";

/**
 * A single archived memory record (full-fidelity JSON).
 *
 * @public
 */
export interface ArchivedMemoryRecord {
	/** The memory id (from the note's `metadata.id`). */
	id: string;
	/** The note timestamp (ISO 8601 — from the `## ` heading). */
	timestamp: string;
	/** Optional note title (the ` — <title>` part of the heading). */
	title?: string;
	/** The note kind (from `- kind:`). */
	kind: string;
	/** Tags (from `- tags:`, split by comma). */
	tags: string[];
	/** Confidence score (from `- confidence:`). */
	confidence: number;
	/** Optional source (from `- source:`). */
	source?: string;
	/** Optional writer (from `- writer:`). */
	writer?: string;
	/** Full metadata object (from `- metadata: <json>`). */
	metadata: Record<string, unknown>;
	/** The note body content. */
	content: string;
	/** ISO 8601 timestamp of when the archive move occurred. */
	archivedAt: string;
	/** The source path the record was moved from. */
	sourcePath: string;
	/** The archive path the record was moved to. */
	archivePath: string;
}

/**
 * Result of an `archiveDeprecated` run.
 *
 * @public
 */
export interface ArchiveDeprecatedResult {
	/** Total note entries scanned in `notes.md`. */
	scanned: number;
	/** Memories physically moved to `.memofs/archive/<id>.json`. */
	archived: number;
	/** Graph nodes transitioned from `deprecated` to `archived`. */
	nodesArchived: number;
	/** Note entries whose graph-node status was NOT `deprecated` (left in place). */
	skipped: number;
	/** IDs of the memories that were archived. */
	archivedIds: string[];
}

/**
 * Result of a `restoreMemory` call.
 *
 * @public
 */
export interface RestoreMemoryResult {
	/** Whether the restore succeeded. */
	restored: boolean;
	/** The memory id that was restored. */
	id: string;
	/** The archive path the record was read from. */
	archivePath: string;
	/** Graph nodes transitioned from `archived` to `active`. */
	nodesRestored: number;
}

/**
 * Extracts the memory id from a note block's metadata.
 */
function getMemoryId(
	metadata: Record<string, unknown> | undefined,
): string | undefined {
	if (metadata === undefined) return undefined;
	return typeof metadata.id === "string" ? metadata.id : undefined;
}

/** Separator between timestamp and title in a note heading (`## <ts> — <title>`). */
const HEADING_SEPARATOR = " — ";

/**
 * Parses a `## <timestamp> — <title>` heading into its parts.
 */
function parseHeading(heading: string): { timestamp: string; title?: string } {
	const trimmed = heading.replace(/^##\s+/, "").trim();
	const dashIdx = trimmed.indexOf(HEADING_SEPARATOR);
	if (dashIdx === -1) return { timestamp: trimmed };
	return {
		timestamp: trimmed.slice(0, dashIdx).trim(),
		title: trimmed.slice(dashIdx + HEADING_SEPARATOR.length).trim(),
	};
}

/**
 * Parses a `- tags: a, b, c` frontmatter line into an array.
 */
function parseTags(tagsLine: string): string[] {
	const raw = tagsLine.replace(/^-\s*tags:\s*/, "").trim();
	if (raw === "none" || raw === "") return [];
	return raw
		.split(",")
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}

/**
 * Parses a `- kind: <value>` frontmatter line.
 */
function parseKind(kindLine: string): string {
	return kindLine.replace(/^-\s*kind:\s*/, "").trim();
}

/**
 * Parses a `- confidence: <value>` frontmatter line.
 */
function parseConfidence(confidenceLine: string): number {
	const raw = confidenceLine.replace(/^-\s*confidence:\s*/, "").trim();
	const num = Number.parseFloat(raw);
	return Number.isNaN(num) ? 1 : num;
}

/**
 * Parses a `- source: <value>` or `- writer: <value>` frontmatter line.
 */
function parseScalar(line: string, key: string): string | undefined {
	const raw = line.replace(`- ${key}:`, "").trim();
	return raw.length > 0 ? raw : undefined;
}

/**
 * Parses a note block's raw text into a structured {@link ArchivedMemoryRecord}.
 */
function noteBlockToRecord(
	block: {
		raw: string;
		metadata: Record<string, unknown> | undefined;
		content: string;
	},
	now: string,
	archivePath: string,
): ArchivedMemoryRecord | undefined {
	const id = getMemoryId(block.metadata);
	if (id === undefined) return undefined;

	const lines = block.raw.split("\n");
	const headingLine = lines.find((l) => l.startsWith("## ")) ?? "";
	const { timestamp, title } = parseHeading(headingLine);

	let kind = "note";
	let tags: string[] = [];
	let confidence = 1;
	let source: string | undefined;
	let writer: string | undefined;

	for (const line of lines) {
		if (line.startsWith("- kind:")) kind = parseKind(line);
		else if (line.startsWith("- tags:")) tags = parseTags(line);
		else if (line.startsWith("- confidence:"))
			confidence = parseConfidence(line);
		else if (line.startsWith("- source:")) source = parseScalar(line, "source");
		else if (line.startsWith("- writer:")) writer = parseScalar(line, "writer");
	}

	return {
		id,
		timestamp,
		...(title !== undefined && title.length > 0 ? { title } : {}),
		kind,
		tags,
		confidence,
		...(source !== undefined ? { source } : {}),
		...(writer !== undefined ? { writer } : {}),
		metadata: block.metadata ?? {},
		content: block.content,
		archivedAt: now,
		sourcePath: NOTES_MEMORY_PATH,
		archivePath,
	};
}

/**
 * Validates an unknown parsed value as an {@link ArchivedMemoryRecord}.
 *
 * Disk JSON is untrusted (the archive file may have been edited out of
 * band), so the parsed shape is checked rather than cast. Returns the
 * record on success or throws.
 *
 * @internal
 */
function validateArchivedMemoryRecord(
	value: unknown,
	expectedId: string,
): ArchivedMemoryRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("archive record is not an object");
	}
	const v = value as Record<string, unknown>;
	if (typeof v.id !== "string" || v.id !== expectedId) {
		throw new Error(
			`archive record id mismatch: expected ${expectedId}, got ${String(v.id)}`,
		);
	}
	if (typeof v.timestamp !== "string") throw new Error("missing timestamp");
	if (typeof v.kind !== "string") throw new Error("missing kind");
	if (typeof v.content !== "string") throw new Error("missing content");
	if (typeof v.confidence !== "number") throw new Error("missing confidence");
	if (!Array.isArray(v.tags)) throw new Error("missing tags");
	if (typeof v.metadata !== "object" || v.metadata === null) {
		throw new Error("missing metadata");
	}
	return value as ArchivedMemoryRecord;
}

/**
 * Rebuilds a note block's raw text from an {@link ArchivedMemoryRecord}.
 */
function recordToNoteBlock(record: ArchivedMemoryRecord): string {
	const note: NormalizedTimestampedNote = {
		timestamp: record.timestamp,
		kind: record.kind as MemoryKind,
		content: record.content,
		confidence: record.confidence,
		...(record.title !== undefined ? { title: record.title } : {}),
		...(record.tags.length > 0 ? { tags: record.tags } : {}),
		...(record.source !== undefined ? { source: record.source } : {}),
		...(record.writer !== undefined ? { writer: record.writer } : {}),
		metadata: record.metadata,
	};
	return formatTimestampedNote(note);
}

/**
 * Walks `notes.md` entries and physically moves each memory whose
 * graph-node `status === "deprecated"` to `.memofs/archive/<id>.json`
 * (full-fidelity JSON). Deletes the on-disk original from `notes.md`,
 * transitions the bound graph nodes from `deprecated` to `archived`,
 * and appends `memory.archived` events for forensic recovery.
 *
 * Idempotent: re-running after all deprecated memories have been
 * archived is a no-op (no deprecated graph nodes remain to match).
 *
 * @param ctx - The local strategy context (store + graph store + indices).
 * @param logger - Optional logger for best-effort warnings.
 * @internal
 */
export async function archiveDeprecated(
	ctx: LocalStrategyContext,
	logger?: Logger,
): Promise<ArchiveDeprecatedResult> {
	await ctx.ensureReady();
	const now = nowIso();

	let notesContent: string;
	try {
		notesContent = await ctx.options.store.read(NOTES_MEMORY_PATH);
	} catch {
		return {
			scanned: 0,
			archived: 0,
			nodesArchived: 0,
			skipped: 0,
			archivedIds: [],
		};
	}

	const { header, blocks } = parseNoteBlocks(notesContent);
	if (blocks.length === 0) {
		return {
			scanned: 0,
			archived: 0,
			nodesArchived: 0,
			skipped: 0,
			archivedIds: [],
		};
	}

	// Collect the set of memory IDs whose graph nodes are deprecated.
	const deprecatedNodes = await ctx.graphStore.queryNodes({
		includeInactive: true,
	});
	const deprecatedMemoryIds = new Set<string>();
	const deprecatedNodeIds: string[] = [];
	for (const node of deprecatedNodes) {
		if (node.status !== "deprecated") continue;
		deprecatedNodeIds.push(node.id);
		if (node.sourceRefs) {
			for (const sr of node.sourceRefs) {
				if (sr.sourceId) deprecatedMemoryIds.add(sr.sourceId);
			}
		}
	}

	if (deprecatedMemoryIds.size === 0) {
		return {
			scanned: blocks.length,
			archived: 0,
			nodesArchived: 0,
			skipped: blocks.length,
			archivedIds: [],
		};
	}

	let scanned = 0;
	let archived = 0;
	let skipped = 0;
	const archivedIds: string[] = [];
	const keptBlocks: string[] = [];
	const archivedRecords: {
		id: string;
		archivePath: ArchiveFilePath;
		record: ArchivedMemoryRecord;
	}[] = [];

	for (const block of blocks) {
		scanned++;
		const memId = getMemoryId(block.metadata);

		if (memId === undefined || !deprecatedMemoryIds.has(memId)) {
			skipped++;
			keptBlocks.push(block.raw);
			continue;
		}

		const archivePath = createArchivePath(memId);
		const record = noteBlockToRecord(block, now, archivePath);
		if (record === undefined) {
			skipped++;
			keptBlocks.push(block.raw);
			continue;
		}

		archivedRecords.push({ id: memId, archivePath, record });
		archivedIds.push(memId);
		archived++;
	}

	// Write archive files (full-fidelity JSON).
	for (const { archivePath, record } of archivedRecords) {
		await ctx.options.store.write(
			archivePath,
			`${JSON.stringify(record, null, 2)}\n`,
		);
	}

	// Rewrite notes.md without the archived blocks.
	if (archived > 0) {
		const newContent = `${header.trimEnd()}\n\n${keptBlocks.join("\n\n").trimEnd()}\n`;
		await ctx.options.store.write(
			NOTES_MEMORY_PATH,
			normalizeMarkdownDocument(newContent),
		);
	}

	// Transition deprecated graph nodes → archived.
	const nodesToUpsert: GraphNode[] = [];
	for (const nodeId of deprecatedNodeIds) {
		const existing = await ctx.graphStore.getNode(nodeId);
		if (!existing) continue;
		if (existing.status !== "deprecated") continue;
		nodesToUpsert.push({
			...existing,
			status: "archived",
			updatedAt: now,
		});
	}
	if (nodesToUpsert.length > 0) {
		try {
			await ctx.graphStore.upsertNodes(nodesToUpsert);
		} catch (error) {
			logger?.warn("archive: graph node upsert failed (best-effort)", {
				error: error instanceof Error ? error.message : String(error),
				count: nodesToUpsert.length,
			});
		}
		// Update in-memory graph nodes index.
		for (const node of nodesToUpsert) {
			ctx.graphNodes.set(node.id, { ...node } as GraphNodeInput);
		}
		// Prune lexical entries for archived graph nodes (graph:<id>).
		ctx.pruneLexical(nodesToUpsert.map((n) => `graph:${n.id}`));
	}

	// Prune lexical entries for the archived memory bodies themselves.
	// `writeMemory` indexes each note under its memory id (e.g.
	// `mem_xxx`); removing the note from notes.md without pruning the
	// lexical store would leave the archived memory surfaced in
	// `memofs.recall` until a process restart — contradicting the
	// "archived memories NOT surfaced in recall" contract.
	if (archived > 0) {
		ctx.pruneLexical(archivedIds);
	}

	// Append memory.archived events.
	for (const { id, archivePath } of archivedRecords) {
		try {
			await appendMemoryEvent(
				ctx.options.store,
				createMemoryEvent({
					type: "memory.archived",
					sourcePath: NOTES_MEMORY_PATH,
					actor: { type: "system", id: "memofs/consolidate" },
					summary: `Archived memory ${id} to ${archivePath}`,
					metadata: { id, archivePath },
				}),
			);
		} catch (error) {
			logger?.warn("archive: failed to append event (best-effort)", {
				error: error instanceof Error ? error.message : String(error),
				id,
			});
		}
	}

	// Clear context cache so recall reflects the archived state.
	ctx.contextCache.clear();

	return {
		scanned,
		archived,
		nodesArchived: nodesToUpsert.length,
		skipped,
		archivedIds,
	};
}

/**
 * Reverses an archive move: reads `.memofs/archive/<id>.json`,
 * writes the note block back to `notes.md`, transitions the bound
 * graph nodes from `archived` to `active`, and appends a
 * `memory.restored` event.
 *
 * @param ctx - The local strategy context (store + graph store + indices).
 * @param id - The memory id to restore.
 * @param logger - Optional logger for best-effort warnings.
 * @internal
 */
export async function restoreMemory(
	ctx: LocalStrategyContext,
	id: string,
	logger?: Logger,
): Promise<RestoreMemoryResult> {
	await ctx.ensureReady();
	const archivePath = createArchivePath(id);
	const now = nowIso();

	// 1. Read the archive file.
	let raw: string;
	try {
		raw = await ctx.options.store.read(archivePath);
	} catch {
		return { restored: false, id, archivePath, nodesRestored: 0 };
	}

	let record: ArchivedMemoryRecord;
	try {
		const parsed: unknown = JSON.parse(raw);
		record = validateArchivedMemoryRecord(parsed, id);
	} catch (error) {
		logger?.warn("restore: failed to parse archive file", {
			error: error instanceof Error ? error.message : String(error),
			id,
			archivePath,
		});
		return { restored: false, id, archivePath, nodesRestored: 0 };
	}

	// 2. Write the note block back to notes.md + re-index lexical.
	const noteBlock = recordToNoteBlock(record);
	let notesContent: string;
	try {
		notesContent = await ctx.options.store.read(NOTES_MEMORY_PATH);
	} catch {
		notesContent = "# Notes\n";
	}
	const newContent = `${notesContent.trimEnd()}\n\n${noteBlock}\n`;
	await ctx.options.store.write(
		NOTES_MEMORY_PATH,
		normalizeMarkdownDocument(newContent),
	);
	// Re-index the restored memory body so `memofs.recall` surfaces it
	// immediately (mirrors `writeMemory`'s `ctx.indexLexical({ id, text })`
	// call so the restored memory is on equal footing with new writes).
	const noteText = `${record.title ?? record.content.slice(0, 80)}\n${record.content}`;
	ctx.indexLexical({ id, text: noteText });

	// 3. Transition archived graph nodes → active.
	const allNodes = await ctx.graphStore.queryNodes({ includeInactive: true });
	const nodesToUpsert: GraphNode[] = [];
	for (const node of allNodes) {
		if (node.status !== "archived") continue;
		if (!node.sourceRefs) continue;
		const bound = node.sourceRefs.some((sr) => sr.sourceId === id);
		if (!bound) continue;
		nodesToUpsert.push({
			...node,
			status: "active",
			validUntil: undefined,
			updatedAt: now,
		});
	}
	if (nodesToUpsert.length > 0) {
		try {
			await ctx.graphStore.upsertNodes(nodesToUpsert);
		} catch (error) {
			logger?.warn("restore: graph node upsert failed (best-effort)", {
				error: error instanceof Error ? error.message : String(error),
				count: nodesToUpsert.length,
			});
		}
		// Update in-memory graph nodes index + re-index lexical.
		for (const node of nodesToUpsert) {
			ctx.graphNodes.set(node.id, { ...node } as GraphNodeInput);
			ctx.indexLexical({
				id: `graph:${node.id}`,
				text: `${node.label}${node.summary ? ` ${node.summary}` : ""}`,
			});
		}
	}

	// 4. Delete the archive file.
	try {
		await ctx.options.store.delete(archivePath);
	} catch (error) {
		logger?.warn("restore: failed to delete archive file (best-effort)", {
			error: error instanceof Error ? error.message : String(error),
			archivePath,
		});
	}

	// 5. Append memory.restored event.
	try {
		await appendMemoryEvent(
			ctx.options.store,
			createMemoryEvent({
				type: "memory.restored",
				sourcePath: archivePath,
				actor: { type: "system", id: "memofs/restore" },
				summary: `Restored memory ${id} from ${archivePath}`,
				metadata: { id, archivePath, restoredAt: now },
			}),
		);
	} catch (error) {
		logger?.warn("restore: failed to append event (best-effort)", {
			error: error instanceof Error ? error.message : String(error),
			id,
		});
	}

	// 6. Clear context cache.
	ctx.contextCache.clear();

	return {
		restored: true,
		id,
		archivePath,
		nodesRestored: nodesToUpsert.length,
	};
}
