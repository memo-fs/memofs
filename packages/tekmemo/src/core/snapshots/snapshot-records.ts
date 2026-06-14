/**
 * Snapshot record management for the snapshots index (snapshotsonl).
 *
 * @remarks
 * Snapshots are versioned checkpoints of memory state. Records track
 * snapshot metadata including type, status, expiration, and checksum.
 *
 * @public
 */

import {
	assertMemoryPath,
	createSnapshotPath,
	SNAPSHOTS_INDEX_PATH,
} from "../constants/memory-paths";
import { MemoryValidationError } from "../errors/errors";
import type { SnapshotRecord } from "../types/memory-documents";
import type { MemoryStore } from "../types/memory-store";
import {
	assertIsoTimestamp,
	assertJsonSerializable,
	assertNonEmptyString,
} from "../validation/assertions";
import {
	type JsonlParseIssue,
	type MalformedJsonlMode,
	parseJsonl,
	stringifyJsonlEntry,
} from "../validation/jsonl";

const SNAPSHOT_TYPES = new Set<SnapshotRecord["type"]>([
	"manual",
	"automatic",
	"pre-sync",
	"pre-restore",
]);
const SNAPSHOT_STATUSES = new Set<SnapshotRecord["status"]>([
	"available",
	"expired",
	"deleted",
]);

export interface ReadSnapshotRecordsOptions {
	/** How to handle malformed JSONL lines. */
	malformedLineMode?: MalformedJsonlMode;
}

export interface SnapshotRecordsResult {
	/** Array of snapshot records. */
	entries: SnapshotRecord[];
	/** Any parse issues encountered. */
	issues: JsonlParseIssue[];
}

export interface CreateSnapshotRecordInput {
	/** The snapshot ID (becomes the filename). */
	id: string;
	/** The type of snapshot. */
	type: SnapshotRecord["type"];
	/** Optional status (defaults to "available"). */
	status?: SnapshotRecord["status"];
	/** Optional creation timestamp (defaults to now). */
	createdAt?: string;
	/** Optional expiration timestamp. */
	expiresAt?: string;
	/** Optional checksum for integrity verification. */
	checksum?: string;
	/** Optional metadata to attach. */
	metadata?: Record<string, unknown>;
}

/**
 * Creates a new snapshot record with defaults.
 *
 * @param input - The input for creating the record.
 * @returns A validated {@link SnapshotRecord}.
 */
export function createSnapshotRecord(
	input: CreateSnapshotRecordInput,
): SnapshotRecord {
	return normalizeSnapshotRecord({
		id: input.id,
		path: createSnapshotPath(input.id),
		type: input.type,
		status: input.status ?? "available",
		createdAt: input.createdAt ?? new Date().toISOString(),
		...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
		...(input.checksum !== undefined ? { checksum: input.checksum } : {}),
		...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
	});
}

/**
 * Appends a snapshot record to the snapshots index.
 *
 * @param store - The memory store to write to.
 * @param record - The snapshot record to append.
 * @returns A promise that resolves when the record is written.
 */
export async function appendSnapshotRecord(
	store: MemoryStore,
	record: SnapshotRecord,
): Promise<void> {
	await store.append(
		SNAPSHOTS_INDEX_PATH,
		stringifyJsonlEntry(normalizeSnapshotRecord(record)),
	);
}

/**
 * Reads all snapshot records from the store.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Array of snapshot records (issues are ignored).
 */
export async function readSnapshotRecords(
	store: MemoryStore,
	options: ReadSnapshotRecordsOptions = {},
): Promise<SnapshotRecord[]> {
	const result = await readSnapshotRecordsWithIssues(store, options);
	return result.entries;
}

/**
 * Reads snapshot records, also returning any parse issues.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Object with entries and any parse issues.
 */
export async function readSnapshotRecordsWithIssues(
	store: MemoryStore,
	options: ReadSnapshotRecordsOptions = {},
): Promise<SnapshotRecordsResult> {
	const raw = await store.read(SNAPSHOTS_INDEX_PATH);
	return parseJsonl<SnapshotRecord>(raw, {
		mode: options.malformedLineMode ?? "throw",
		validate: validateSnapshotRecord,
	});
}

/**
 * Normalizes a snapshot record by validating it.
 *
 * @param record - The record to normalize.
 * @returns The validated snapshot record.
 */
export function normalizeSnapshotRecord(
	record: SnapshotRecord,
): SnapshotRecord {
	return validateSnapshotRecord(record, 0);
}

/**
 * Validates a snapshot record object.
 *
 * @param value - The unknown value to validate.
 * @param lineNumber - The line number (for error reporting).
 * @returns The validated {@link SnapshotRecord}.
 * @throws {@link MemoryValidationError} If validation fails.
 */
export function validateSnapshotRecord(
	value: unknown,
	lineNumber: number,
): SnapshotRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Snapshot record must be an object.", {
			lineNumber,
		});
	}

	const record = value as Partial<SnapshotRecord>;
	assertNonEmptyString(record.id, "record.id");
	assertNonEmptyString(record.path, "record.path");
	assertMemoryPath(record.path);
	const expectedPath = createSnapshotPath(record.id);
	if (record.path !== expectedPath) {
		throw new MemoryValidationError("record.path must match record.id.", {
			lineNumber,
			id: record.id,
			path: record.path,
			expectedPath,
		});
	}
	assertNonEmptyString(record.type, "record.type");
	if (!SNAPSHOT_TYPES.has(record.type as SnapshotRecord["type"])) {
		throw new MemoryValidationError("record.type is invalid.", {
			lineNumber,
			type: record.type,
		});
	}
	assertNonEmptyString(record.status, "record.status");
	if (!SNAPSHOT_STATUSES.has(record.status as SnapshotRecord["status"])) {
		throw new MemoryValidationError("record.status is invalid.", {
			lineNumber,
			status: record.status,
		});
	}
	assertIsoTimestamp(record.createdAt, "record.createdAt");
	if (record.expiresAt !== undefined)
		assertIsoTimestamp(record.expiresAt, "record.expiresAt");
	if (record.checksum !== undefined)
		assertNonEmptyString(record.checksum, "record.checksum");
	if (record.metadata !== undefined)
		assertJsonSerializable(record.metadata, "record.metadata");

	return {
		id: record.id,
		path: record.path,
		type: record.type as SnapshotRecord["type"],
		status: record.status as SnapshotRecord["status"],
		createdAt: record.createdAt,
		...(record.expiresAt !== undefined ? { expiresAt: record.expiresAt } : {}),
		...(record.checksum !== undefined ? { checksum: record.checksum } : {}),
		...(record.metadata !== undefined ? { metadata: record.metadata } : {}),
	};
}
