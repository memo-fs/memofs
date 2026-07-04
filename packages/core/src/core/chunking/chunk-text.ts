/**
 * Text chunking utilities for splitting documents into embeddable pieces.
 *
 * @remarks
 * Chunks text into overlapping pieces suitable for embedding and semantic recall.
 * Uses soft boundaries (paragraphs, sentences) when possible to preserve meaning.
 *
 * @public
 */

import { assertNonEmptyString, assertPositiveInteger } from "@repo/utils";
import {
	assertMemorySourceReference,
	createSourceKey,
} from "../documents/source-manifest";
import { MemoryValidationError } from "../errors/errors";
import type {
	MemoryChunk,
	MemorySourceReference,
	MemoryType,
} from "../types/memory-documents";
import {
	assertJsonSerializable,
	assertNonNegativeInteger,
} from "../validation/assertions";

/**
 * Options for chunking text into smaller pieces.
 */
export interface ChunkTextOptions {
	/** Source reference identifying where the text came from. */
	source: MemorySourceReference;
	/** The memory type (core, notes, etc.). */
	memoryType: MemoryType;
	/** Maximum characters per chunk. Defaults to 1200. */
	maxChars?: number;
	/** Overlap characters between consecutive chunks. Defaults to 120. */
	overlapChars?: number;
	/** Optional section name for organizational purposes. */
	sectionName?: string;
	/** Optional metadata to attach to each chunk. */
	metadata?: Record<string, unknown>;
}

/**
 * Splits text into overlapping chunks suitable for embedding and recall.
 *
 * @param text - The text to chunk.
 * @param options - Chunking options.
 * @returns An array of memory chunks.
 * @throws {@link MemoryValidationError} If inputs are invalid or overlapChars >= maxChars.
 *
 * @example
 * ```typescript
 * const chunks = chunkText("Long text here...", {
 * source: { sourceType: "document", sourceId: "doc1" },
 * memoryType: "core",
 * });
 * ```
 */
export function chunkText(
	text: string,
	options: ChunkTextOptions,
): MemoryChunk[] {
	assertNonEmptyString(text, "text");
	assertMemorySourceReference(options.source);
	validateMemoryType(options.memoryType);

	const maxChars = options.maxChars ?? 1200;
	const overlapChars = options.overlapChars ?? 120;
	assertPositiveInteger(maxChars, "maxChars");
	assertNonNegativeInteger(overlapChars, "overlapChars");

	if (overlapChars >= maxChars) {
		throw new MemoryValidationError(
			"overlapChars must be smaller than maxChars.",
			{
				maxChars,
				overlapChars,
			},
		);
	}

	if (options.metadata !== undefined) {
		assertJsonSerializable(options.metadata, "metadata");
	}

	const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
	if (!normalized) return [];

	const chunks: MemoryChunk[] = [];
	let start = 0;
	let index = 0;

	while (start < normalized.length) {
		const hardEnd = Math.min(start + maxChars, normalized.length);
		const end = findSoftBoundary(normalized, start, hardEnd);
		const chunk = normalized.slice(start, end).trim();

		if (chunk) {
			const hash = hashString(chunk);
			chunks.push({
				id: createChunkId(options.source, index, hash),
				text: chunk,
				source: options.source,
				memoryType: options.memoryType,
				index,
				startOffset: start,
				endOffset: end,
				hash,
				...(options.sectionName !== undefined
					? { sectionName: options.sectionName }
					: {}),
				...(options.metadata !== undefined
					? { metadata: options.metadata }
					: {}),
			});
			index += 1;
		}

		if (end >= normalized.length) break;
		start = Math.max(end - overlapChars, start + 1);
	}

	return chunks;
}

/**
 * Creates a unique ID for a memory chunk.
 *
 * @param source - The source reference of the chunk.
 * @param index - The sequential index of the chunk.
 * @param hash - The hash of the chunk text.
 * @returns A unique chunk ID string.
 */
export function createChunkId(
	source: MemorySourceReference,
	index: number,
	hash: string,
): string {
	assertMemorySourceReference(source);
	assertNonNegativeInteger(index, "index");
	assertNonEmptyString(hash, "hash");
	return `${safeId(createSourceKey(source))}:${index}:${safeId(hash)}`;
}

/**
 * Creates a 32-bit hash of a string (Fowler-Noll-Vo algorithm).
 *
 * @param input - The string to hash.
 * @returns An 8-character hexadecimal hash string.
 */
export function hashString(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Finds a soft boundary (paragraph or sentence break) within a text window.
 *
 * @param text - The full text being chunked.
 * @param start - The start offset of the current chunk.
 * @param hardEnd - The maximum end offset (hard boundary).
 * @returns A soft boundary position, or hardEnd if no soft boundary found.
 */
function findSoftBoundary(
	text: string,
	start: number,
	hardEnd: number,
): number {
	if (hardEnd >= text.length) return text.length;
	const window = text.slice(start, hardEnd);
	const candidates = ["\n\n", "\n", ". ", "? ", "! ", " "];

	for (const candidate of candidates) {
		const position = window.lastIndexOf(candidate);
		if (position > Math.floor(window.length * 0.5)) {
			return start + position + candidate.length;
		}
	}

	return hardEnd;
}

/**
 * Sanitizes a string for use as an ID by replacing unsafe characters.
 *
 * @param value - The string to sanitize.
 * @returns A safe ID string with only alphanumeric, underscore, dot, colon, and percent.
 */
function safeId(value: string): string {
	return value.replace(/[^a-zA-Z0-9_.:%-]/g, "_");
}

/**
 * Validates that a memory type is supported.
 *
 * @param memoryType - The memory type to validate.
 * @throws {@link MemoryValidationError} If the memory type is not supported.
 */
function validateMemoryType(memoryType: MemoryType): void {
	if (
		!["core", "notes", "conversation", "event", "chunk", "graph"].includes(
			memoryType,
		)
	) {
		throw new MemoryValidationError("Unsupported memory type.", { memoryType });
	}
}
