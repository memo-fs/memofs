/**
 * Chunk record management for the chunks index (chunks.jsonl).
 *
 * @remarks
 * Chunk records track the lifecycle of text chunks produced by the
 * chunking process. Records include status (active/stale/deleted)
 * and are used for re-indexing and change detection.
 *
 * @public
 */

import { assertNonEmptyString } from "@repo/utils";
import { CHUNKS_INDEX_PATH } from "../constants/memory-paths";
import { MemoryValidationError } from "../errors/errors";
import type {
	ChunkRecord,
	MemoryChunk,
	MemorySourceType,
	MemoryType,
} from "../types/memory-documents";
import type { MemoryStore } from "../types/memory-store";
import {
	assertIsoTimestamp,
	assertJsonSerializable,
	assertNonNegativeInteger,
} from "../validation/assertions";
import {
	type JsonlParseIssue,
	type MalformedJsonlMode,
	parseJsonl,
	stringifyJsonlEntry,
} from "../validation/jsonl";

const MEMORY_TYPES = new Set<MemoryType>([
	"core",
	"notes",
	"conversation",
	"event",
	"chunk",
	"graph",
]);
const SOURCE_TYPES = new Set<MemorySourceType>([
	"document",
	"note",
	"conversation",
	"event",
	"import",
	"graph",
]);
const CHUNK_STATUSES = new Set<ChunkRecord["status"]>([
	"active",
	"stale",
	"deleted",
]);

export interface ReadChunkRecordsOptions {
	malformedLineMode?: MalformedJsonlMode;
}

export interface ChunkRecordsResult {
	entries: ChunkRecord[];
	issues: JsonlParseIssue[];
}

export interface CreateChunkRecordOptions {
	sourcePath: string;
	sourceType: MemorySourceType;
	sourceId: string;
	sourceHash: string;
	createdAt?: string;
	status?: ChunkRecord["status"];
}

/**
 * Creates a new chunk record from a memory chunk.
 *
 * @param chunk - The memory chunk to create a record for.
 * @param options - Options including source info and status.
 * @returns A validated {@link ChunkRecord}.
 */
export function createChunkRecord(
	chunk: MemoryChunk,
	options: CreateChunkRecordOptions,
): ChunkRecord {
	const timestamp = options.createdAt ?? new Date().toISOString();
	return normalizeChunkRecord({
		chunkId: chunk.id,
		sourcePath: options.sourcePath,
		sourceType: options.sourceType,
		sourceId: options.sourceId,
		sourceHash: options.sourceHash,
		textHash: chunk.hash,
		memoryType: chunk.memoryType,
		index: chunk.index,
		startOffset: chunk.startOffset,
		endOffset: chunk.endOffset,
		status: options.status ?? "active",
		createdAt: timestamp,
		...(chunk.sectionName !== undefined
			? { sectionName: chunk.sectionName }
			: {}),
		...(chunk.metadata !== undefined ? { metadata: chunk.metadata } : {}),
	});
}

/**
 * Appends a chunk record to the chunks index.
 *
 * @param store - The memory store to write to.
 * @param record - The chunk record to append.
 * @returns A promise that resolves when the record is written.
 */
export async function appendChunkRecord(
	store: MemoryStore,
	record: ChunkRecord,
): Promise<void> {
	await store.append(
		CHUNKS_INDEX_PATH,
		stringifyJsonlEntry(normalizeChunkRecord(record)),
	);
}

/**
 * Reads chunk records, ignoring any parse issues.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Array of chunk records.
 */
export async function readChunkRecords(
	store: MemoryStore,
	options: ReadChunkRecordsOptions = {},
): Promise<ChunkRecord[]> {
	const result = await readChunkRecordsWithIssues(store, options);
	return result.entries;
}

/**
 * Reads chunk records, also returning any parse issues.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Object with entries and any parse issues.
 */
export async function readChunkRecordsWithIssues(
	store: MemoryStore,
	options: ReadChunkRecordsOptions = {},
): Promise<ChunkRecordsResult> {
	const raw = await store.read(CHUNKS_INDEX_PATH);
	return parseJsonl<ChunkRecord>(raw, {
		mode: options.malformedLineMode ?? "throw",
		validate: validateChunkRecord,
	});
}

/**
 * Normalizes a chunk record by validating it.
 *
 * @param record - The record to normalize.
 * @returns The validated {@link ChunkRecord}.
 */
export function normalizeChunkRecord(record: ChunkRecord): ChunkRecord {
	return validateChunkRecord(record, 0);
}

/**
 * Marks a chunk record as stale.
 *
 * @param record - The record to mark stale.
 * @param updatedAt - Optional custom timestamp (defaults to now).
 * @returns A new record with status set to "stale".
 */
export function markChunkRecordStale(
	record: ChunkRecord,
	updatedAt = new Date().toISOString(),
): ChunkRecord {
	return normalizeChunkRecord({ ...record, status: "stale", updatedAt });
}

export function validateChunkRecord(
	value: unknown,
	lineNumber: number,
): ChunkRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Chunk record must be an object.", {
			lineNumber,
		});
	}

	const record = value as Partial<ChunkRecord>;
	assertNonEmptyString(record.chunkId, "record.chunkId");
	assertNonEmptyString(record.sourcePath, "record.sourcePath");
	assertNonEmptyString(record.sourceType, "record.sourceType");
	if (!SOURCE_TYPES.has(record.sourceType as MemorySourceType)) {
		throw new MemoryValidationError("record.sourceType is invalid.", {
			lineNumber,
			sourceType: record.sourceType,
		});
	}
	assertNonEmptyString(record.sourceId, "record.sourceId");
	assertNonEmptyString(record.sourceHash, "record.sourceHash");
	assertNonEmptyString(record.textHash, "record.textHash");
	assertNonEmptyString(record.memoryType, "record.memoryType");
	if (!MEMORY_TYPES.has(record.memoryType as MemoryType)) {
		throw new MemoryValidationError("record.memoryType is invalid.", {
			lineNumber,
			memoryType: record.memoryType,
		});
	}
	assertNonNegativeInteger(record.index, "record.index");
	assertNonNegativeInteger(record.startOffset, "record.startOffset");
	assertNonNegativeInteger(record.endOffset, "record.endOffset");
	if ((record.endOffset ?? 0) < (record.startOffset ?? 0)) {
		throw new MemoryValidationError(
			"record.endOffset must be greater than or equal to record.startOffset.",
			{
				lineNumber,
				startOffset: record.startOffset,
				endOffset: record.endOffset,
			},
		);
	}
	assertNonEmptyString(record.status, "record.status");
	if (!CHUNK_STATUSES.has(record.status as ChunkRecord["status"])) {
		throw new MemoryValidationError("record.status is invalid.", {
			lineNumber,
			status: record.status,
		});
	}
	assertIsoTimestamp(record.createdAt, "record.createdAt");
	if (record.updatedAt !== undefined)
		assertIsoTimestamp(record.updatedAt, "record.updatedAt");
	if (record.sectionName !== undefined)
		assertNonEmptyString(record.sectionName, "record.sectionName");
	if (record.metadata !== undefined)
		assertJsonSerializable(record.metadata, "record.metadata");

	return {
		chunkId: record.chunkId,
		sourcePath: record.sourcePath,
		sourceType: record.sourceType as MemorySourceType,
		sourceId: record.sourceId,
		sourceHash: record.sourceHash,
		textHash: record.textHash,
		memoryType: record.memoryType as MemoryType,
		index: record.index,
		startOffset: record.startOffset,
		endOffset: record.endOffset,
		status: record.status as ChunkRecord["status"],
		createdAt: record.createdAt,
		...(record.updatedAt !== undefined ? { updatedAt: record.updatedAt } : {}),
		...(record.sectionName !== undefined
			? { sectionName: record.sectionName }
			: {}),
		...(record.metadata !== undefined ? { metadata: record.metadata } : {}),
	};
}
