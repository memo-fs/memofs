/**
 * Manifest management for TekMemo projects.
 *
 * @remarks
 * The manifest (`manifest.json`) defines the canonical file structure
 * and metadata for a TekMemo project. This module provides create,
 * read, write, parse, and validate functions.
 *
 * @public
 */

import {
	assertMemoryPath,
	CHUNKS_INDEX_PATH,
	CONVERSATIONS_MEMORY_PATH,
	CORE_MEMORY_PATH,
	GRAPH_EDGES_PATH,
	GRAPH_NODES_PATH,
	MANIFEST_PATH,
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
	SNAPSHOTS_INDEX_PATH,
} from "../constants/memory-paths";
import { MemoryValidationError } from "../errors/errors";
import type { TekMemoManifest } from "../types/memory-documents";
import type { MemoryStore } from "../types/memory-store";
import {
	assertIsoTimestamp,
	assertJsonSerializable,
	assertNonEmptyString,
} from "../validation/assertions";

export interface CreateDefaultTekMemoManifestOptions {
	projectId?: string;
	now?: () => string;
	version?: string;
}

/**
 * Creates a default TekMemo manifest for a new project.
 *
 * @param options - Options including projectId, version, and custom clock.
 * @returns A {@link TekMemoManifest} with defaults filled in.
 */
export function createDefaultTekMemoManifest(
	options: CreateDefaultTekMemoManifestOptions = {},
): TekMemoManifest {
	const timestamp = options.now?.() ?? new Date().toISOString();
	assertIsoTimestamp(timestamp, "timestamp");

	return {
		version: options.version ?? "1",
		...(options.projectId !== undefined
			? { projectId: options.projectId }
			: {}),
		createdAt: timestamp,
		updatedAt: timestamp,
		memory: {
			core: CORE_MEMORY_PATH,
			notes: NOTES_MEMORY_PATH,
		},
		events: {
			memoryEvents: MEMORY_EVENTS_PATH,
			conversations: CONVERSATIONS_MEMORY_PATH,
		},
		indexes: {
			chunks: CHUNKS_INDEX_PATH,
		},
		graph: {
			nodes: GRAPH_NODES_PATH,
			edges: GRAPH_EDGES_PATH,
		},
		snapshots: {
			index: SNAPSHOTS_INDEX_PATH,
		},
	};
}

/**
 * Stringifies a manifest to JSON with consistent formatting.
 *
 * @param manifest - The manifest to stringify.
 * @returns The JSON string (with trailing newline).
 */
export function stringifyManifest(manifest: TekMemoManifest): string {
	const normalized = validateTekMemoManifest(manifest);
	return `${JSON.stringify(normalized, null, 2)}\n`;
}

/**
 * Parses a manifest from a JSON string.
 *
 * @param content - The JSON string to parse.
 * @returns The validated {@link TekMemoManifest}.
 * @throws {@link MemoryValidationError} If the JSON is invalid or manifest is malformed.
 */
export function parseManifest(content: string): TekMemoManifest {
	assertNonEmptyString(content, "manifest content");
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		throw new MemoryValidationError("Manifest must be valid JSON.", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return validateTekMemoManifest(parsed);
}

/**
 * Reads and parses the manifest from a memory store.
 *
 * @param store - The memory store to read from.
 * @returns The validated {@link TekMemoManifest}.
 */
export async function readManifest(
	store: MemoryStore,
): Promise<TekMemoManifest> {
	return parseManifest(await store.read(MANIFEST_PATH));
}

/**
 * Validates and writes a manifest to a memory store.
 *
 * @param store - The memory store to write to.
 * @param manifest - The manifest to write.
 */
export async function writeManifest(
	store: MemoryStore,
	manifest: TekMemoManifest,
): Promise<void> {
	await store.write(MANIFEST_PATH, stringifyManifest(manifest));
}

/**
 * Validates that a value is a well-formed {@link TekMemoManifest}.
 *
 * @param value - The unknown value to validate.
 * @returns The validated {@link TekMemoManifest}.
 * @throws {@link MemoryValidationError} If validation fails.
 */
export function validateTekMemoManifest(value: unknown): TekMemoManifest {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Manifest must be an object.");
	}

	const manifest = value as Partial<TekMemoManifest>;
	assertNonEmptyString(manifest.version, "manifest.version");
	assertIsoTimestamp(manifest.createdAt, "manifest.createdAt");
	assertIsoTimestamp(manifest.updatedAt, "manifest.updatedAt");

	if (manifest.projectId !== undefined) {
		assertNonEmptyString(manifest.projectId, "manifest.projectId");
	}

	validatePathObject(manifest.memory, "manifest.memory", {
		core: CORE_MEMORY_PATH,
		notes: NOTES_MEMORY_PATH,
	});
	validatePathObject(manifest.events, "manifest.events", {
		memoryEvents: MEMORY_EVENTS_PATH,
		conversations: CONVERSATIONS_MEMORY_PATH,
	});
	validatePathObject(manifest.indexes, "manifest.indexes", {
		chunks: CHUNKS_INDEX_PATH,
	});
	validatePathObject(manifest.graph, "manifest.graph", {
		nodes: GRAPH_NODES_PATH,
		edges: GRAPH_EDGES_PATH,
	});
	validatePathObject(manifest.snapshots, "manifest.snapshots", {
		index: SNAPSHOTS_INDEX_PATH,
	});
	assertJsonSerializable(manifest, "manifest");

	return manifest as TekMemoManifest;
}

/**
 * Validates that an object contains the expected canonical memory paths.
 *
 * @param value - The object to validate.
 * @param fieldName - Field path for error messages.
 * @param expectedPaths - Map of key to expected canonical path.
 * @throws {@link MemoryValidationError} If validation fails.
 */
function validatePathObject(
	value: unknown,
	fieldName: string,
	expectedPaths: Record<string, string>,
): void {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError(`${fieldName} must be an object.`, {
			fieldName,
		});
	}
	const record = value as Record<string, unknown>;
	for (const [key, expectedPath] of Object.entries(expectedPaths)) {
		assertNonEmptyString(record[key], `${fieldName}.${key}`);
		assertMemoryPath(record[key]);
		if (record[key] !== expectedPath) {
			throw new MemoryValidationError(
				`${fieldName}.${key} must match the canonical TekMemo path.`,
				{
					fieldName: `${fieldName}.${key}`,
					path: record[key],
					expectedPath,
				},
			);
		}
	}
}
