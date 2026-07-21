/**
 * Notes memory document management (notes.md).
 *
 * @remarks
 * Notes memory stores lower-confidence observations, working memory,
 * and timestamped notes with kind, tags, confidence, and metadata.
 *
 * @public
 */

import { NOTES_MEMORY_PATH } from "../constants/memory-paths";
import { MemoryValidationError } from "../errors/errors";
import type { NoteKind, TimestampedNote } from "../types/memory-documents";
import type { MemoryStore } from "../types/memory-store";
import {
	assertConfidence,
	assertIsoTimestamp,
	assertJsonSerializable,
	assertNonEmptyString,
	normalizeStringArray,
	singleLine,
} from "../validation/assertions";
import { normalizeMarkdownDocument } from "./core-memory";

const NOTE_KINDS = new Set<NoteKind>([
	"decision",
	"constraint",
	"goal",
	"preference",
	"reference",
	"summary",
	"note",
]);

/**
 * Reads the notes memory document from the store.
 *
 * @param store - The memory store to read from.
 * @returns The raw notes memory text.
 */
/**
 * Reads the notes memory document from the store.
 *
 * @param store - The memory store to read from.
 * @returns The raw notes memory text.
 */
export async function readNotesMemory(store: MemoryStore): Promise<string> {
	return store.read(NOTES_MEMORY_PATH);
}

/**
 * Appends a timestamped note to the notes memory document.
 *
 * @param store - The memory store to write to.
 * @param note - The note to append.
 */
/**
 * Appends a timestamped note to the notes memory document.
 *
 * @param store - The memory store to write to.
 * @param note - The note to append.
 * @returns A promise that resolves when the note is written.
 */
export async function appendTimestampedNote(
	store: MemoryStore,
	note: TimestampedNote,
): Promise<void> {
	const normalized = normalizeTimestampedNote(note);
	const current = await safeReadNotesMemory(store);
	const next =
		`${current.trimEnd()}\n\n${formatTimestampedNote(normalized)}`.trimStart();
	await store.write(NOTES_MEMORY_PATH, normalizeMarkdownDocument(next));
}

/** Normalized form of a TimestampedNote with required confidence and optional tags array. */
export type NormalizedTimestampedNote = Omit<
	TimestampedNote,
	"confidence" | "tags"
> & {
	confidence: number;
	tags?: string[];
};

/**
 * Normalizes a timestamped note by validating and filling defaults.
 *
 * @param note - The note to normalize.
 * @returns The normalized note.
 */
/**
 * Normalizes a timestamped note by validating and filling defaults.
 *
 * @param note - The note to normalize.
 * @returns The normalized note with defaults applied.
 */
export function normalizeTimestampedNote(
	note: TimestampedNote,
): NormalizedTimestampedNote {
	assertIsoTimestamp(note.timestamp, "note.timestamp");
	assertNonEmptyString(note.kind, "note.kind");
	if (!NOTE_KINDS.has(note.kind)) {
		throw new MemoryValidationError("note.kind is invalid.", {
			kind: note.kind,
			allowed: [...NOTE_KINDS],
		});
	}
	assertNonEmptyString(note.content, "note.content");

	const confidence = note.confidence ?? 1;
	assertConfidence(confidence);

	const tags = normalizeStringArray(note.tags, "note.tags");

	if (note.source !== undefined) {
		assertNonEmptyString(note.source, "note.source");
	}

	if (note.writer !== undefined) {
		assertNonEmptyString(note.writer, "note.writer");
	}

	if (note.title !== undefined) {
		assertNonEmptyString(note.title, "note.title");
	}

	if (note.metadata !== undefined) {
		assertJsonSerializable(note.metadata, "note.metadata");
	}

	return {
		timestamp: note.timestamp,
		kind: note.kind,
		content: note.content,
		confidence,
		...(note.title !== undefined ? { title: note.title } : {}),
		...(tags !== undefined ? { tags } : {}),
		...(note.source !== undefined ? { source: note.source } : {}),
		...(note.writer !== undefined ? { writer: note.writer } : {}),
		...(note.metadata !== undefined ? { metadata: note.metadata } : {}),
	};
}

/**
 * Formats a timestamped note into markdown text.
 *
 * @param note - The note to format.
 * @returns Formatted markdown string ready to append to notes.md.
 */
export function formatTimestampedNote(note: TimestampedNote): string {
	const normalized = normalizeTimestampedNote(note);
	const heading = normalized.title
		? `${normalized.timestamp} — ${singleLine(normalized.title)}`
		: normalized.timestamp;
	const tags = normalized.tags?.length
		? normalized.tags.map(singleLine).join(", ")
		: "none";

	const lines = [
		`## ${heading}`,
		`- kind: ${singleLine(normalized.kind)}`,
		`- tags: ${tags}`,
		`- confidence: ${normalized.confidence}`,
		normalized.source
			? `- source: ${singleLine(normalized.source)}`
			: undefined,
		normalized.writer
			? `- writer: ${singleLine(normalized.writer)}`
			: undefined,
		normalized.metadata
			? `- metadata: ${JSON.stringify(normalized.metadata)}`
			: undefined,
		"",
		normalized.content.trim(),
		"",
	];

	return lines.filter((line): line is string => line !== undefined).join("\n");
}

async function safeReadNotesMemory(store: MemoryStore): Promise<string> {
	try {
		return await store.read(NOTES_MEMORY_PATH);
	} catch {
		return "# Notes\n";
	}
}
