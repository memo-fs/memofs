/**
 * Conversation history management (conversations.jsonl).
 *
 * @remarks
 * Conversations are stored as JSONL with entries containing timestamp,
 * role (user/assistant/system/tool), content, and optional metadata.
 *
 * @public
 */

import { assertNonEmptyString, assertString } from "@repo/utils";
import { CONVERSATIONS_MEMORY_PATH } from "../constants/memory-paths";
import { MemoryValidationError } from "../errors/errors";
import type {
	ConversationEntry,
	ConversationRole,
} from "../types/memory-documents";
import type { MemoryStore } from "../types/memory-store";
import {
	assertIsoTimestamp,
	assertJsonSerializable,
} from "../validation/assertions";
import {
	type JsonlParseIssue,
	type MalformedJsonlMode,
	parseJsonl,
	stringifyJsonlEntry,
} from "../validation/jsonl";

const CONVERSATION_ROLES = new Set<ConversationRole>([
	"user",
	"assistant",
	"system",
	"tool",
]);

/** Options for reading conversation history. */
export interface ReadConversationHistoryOptions {
	/** How to handle malformed JSONL lines. */
	malformedLineMode?: MalformedJsonlMode;
}

/** Result from reading conversation history. */
export interface ConversationHistoryResult {
	/** Array of conversation entries. */
	entries: ConversationEntry[];
	/** Any parse issues encountered. */
	issues: JsonlParseIssue[];
}

/**
 * Appends a conversation entry to the conversations JSONL file.
 *
 * @param store - The memory store to write to.
 * @param entry - The conversation entry to append.
 */
/**
 * Appends a conversation entry to the conversations JSONL file.
 *
 * @param store - The memory store to write to.
 * @param entry - The conversation entry to append.
 * @returns A promise that resolves when the entry is written.
 */
export async function appendConversationEntry(
	store: MemoryStore,
	entry: ConversationEntry,
): Promise<void> {
	const normalized = normalizeConversationEntry(entry);
	await store.append(
		CONVERSATIONS_MEMORY_PATH,
		stringifyJsonlEntry(normalized),
	);
}

/**
 * Reads conversation history, returning only valid entries.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Array of conversation entries.
 */
/**
 * Reads conversation history, returning only valid entries.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Array of conversation entries.
 */
export async function readConversationHistory(
	store: MemoryStore,
	options: ReadConversationHistoryOptions = {},
): Promise<ConversationEntry[]> {
	const result = await readConversationHistoryWithIssues(store, options);
	return result.entries;
}

/**
 * Reads conversation history, also returning any parse issues.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Object with entries and issues.
 */
/**
 * Reads conversation history, also returning any parse issues.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Object with entries and issues.
 */
export async function readConversationHistoryWithIssues(
	store: MemoryStore,
	options: ReadConversationHistoryOptions = {},
): Promise<ConversationHistoryResult> {
	const raw = await store.read(CONVERSATIONS_MEMORY_PATH);
	return parseJsonl<ConversationEntry>(raw, {
		mode: options.malformedLineMode ?? "throw",
		validate: validateConversationEntry,
	});
}

/**
 * Normalizes a conversation entry by validating it.
 *
 * @param entry - The entry to normalize.
 * @returns The validated entry.
 */
/**
 * Normalizes a conversation entry by validating it.
 *
 * @param entry - The entry to normalize.
 * @returns The validated {@link ConversationEntry}.
 */
export function normalizeConversationEntry(
	entry: ConversationEntry,
): ConversationEntry {
	return validateConversationEntry(entry, 0);
}

/**
 * Validates a conversation entry object.
 *
 * @param value - The unknown value to validate.
 * @param lineNumber - The line number (for error reporting).
 * @returns The validated ConversationEntry.
 */
export function validateConversationEntry(
	value: unknown,
	lineNumber: number,
): ConversationEntry {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Conversation entry must be an object.", {
			lineNumber,
		});
	}

	const entry = value as Partial<ConversationEntry>;
	assertIsoTimestamp(entry.timestamp, "entry.timestamp");
	assertString(entry.role, "entry.role");
	if (!CONVERSATION_ROLES.has(entry.role as ConversationRole)) {
		throw new MemoryValidationError("Conversation role is invalid.", {
			lineNumber,
			role: entry.role,
			allowed: [...CONVERSATION_ROLES],
		});
	}
	assertNonEmptyString(entry.content, "entry.content");

	if (entry.summary !== undefined) {
		assertNonEmptyString(entry.summary, "entry.summary");
	}

	if (entry.metadata !== undefined) {
		assertJsonSerializable(entry.metadata, "entry.metadata");
	}

	return {
		timestamp: entry.timestamp,
		role: entry.role as ConversationRole,
		content: entry.content,
		...(entry.summary !== undefined ? { summary: entry.summary } : {}),
		...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
	};
}
