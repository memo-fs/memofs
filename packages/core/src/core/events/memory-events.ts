/**
 * Memory event logging (memory-events.jsonl).
 *
 * @remarks
 * Events are append-only records of actions taken on memory (created,
 * updated, merged, etc.). They form an audit trail for the memory system.
 *
 * @public
 */

import { assertNonEmptyString } from "@repo/utils";
import { MEMORY_EVENTS_PATH } from "../constants/memory-paths";
import { MemoryValidationError } from "../errors/errors";
import type {
	MemoryActorType,
	MemoryEvent,
	MemoryEventType,
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

const MEMORY_EVENT_TYPES = new Set<MemoryEventType>([
	"memory.created",
	"memory.updated",
	"memory.merged",
	"memory.conflicted",
	"memory.decayed",
	"memory.forgotten",
	"memory.restored",
	"memory.indexed",
	"memory.reindexed",
	"snapshot.created",
	"sync.started",
	"sync.completed",
	"sync.failed",
]);

const ACTOR_TYPES = new Set<MemoryActorType>([
	"user",
	"agent",
	"system",
	"api",
]);

/** Input for creating a memory event. */
export interface CreateMemoryEventInput {
	/** The event type. */
	type: MemoryEventType;
	/** Optional project ID. */
	projectId?: string;
	/** Optional source path that triggered the event. */
	sourcePath?: string;
	/** Optional actor (user, agent, system, api). */
	actor?: MemoryEvent["actor"];
	/** Optional one-line summary. */
	summary?: string;
	/** Optional metadata. */
	metadata?: Record<string, unknown>;
	/** Optional custom clock function. */
	now?: () => string;
	/** Optional fixed ID (auto-generated if omitted). */
	id?: string;
}

/** Options for reading memory events. */
export interface ReadMemoryEventsOptions {
	/** How to handle malformed JSONL lines. */
	malformedLineMode?: MalformedJsonlMode;
}

/** Result from reading memory events. */
export interface MemoryEventsResult {
	/** Array of memory events. */
	entries: MemoryEvent[];
	/** Any parse issues encountered. */
	issues: JsonlParseIssue[];
}

/**
 * Creates a new memory event with auto-generated ID and timestamp.
 *
 * @param input - The event input.
 * @returns A validated MemoryEvent.
 */
/**
 * Creates a new memory event with auto-generated ID and timestamp.
 *
 * @param input - The event input.
 * @returns A validated {@link MemoryEvent}.
 */
export function createMemoryEvent(input: CreateMemoryEventInput): MemoryEvent {
	const timestamp = input.now?.() ?? new Date().toISOString();
	const id =
		input.id ??
		`evt_${stableHash(`${input.type}:${timestamp}:${input.sourcePath ?? ""}:${input.summary ?? ""}`)}`;
	return normalizeMemoryEvent({
		id,
		type: input.type,
		timestamp,
		...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
		...(input.sourcePath !== undefined ? { sourcePath: input.sourcePath } : {}),
		...(input.actor !== undefined ? { actor: input.actor } : {}),
		...(input.summary !== undefined ? { summary: input.summary } : {}),
		...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
	});
}

/**
 * Appends a memory event to the event log.
 *
 * @param store - The memory store to write to.
 * @param event - The event to append.
 * @returns A promise that resolves when the event is written.
 */
export async function appendMemoryEvent(
	store: MemoryStore,
	event: MemoryEvent,
): Promise<void> {
	await store.append(
		MEMORY_EVENTS_PATH,
		stringifyJsonlEntry(normalizeMemoryEvent(event)),
	);
}

/**
 * Reads memory events, returning only valid entries (issues are ignored).
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Array of memory events.
 */
export async function readMemoryEvents(
	store: MemoryStore,
	options: ReadMemoryEventsOptions = {},
): Promise<MemoryEvent[]> {
	const result = await readMemoryEventsWithIssues(store, options);
	return result.entries;
}

/**
 * Reads memory events, also returning any parse issues.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns Object with entries and any parse issues.
 */
export async function readMemoryEventsWithIssues(
	store: MemoryStore,
	options: ReadMemoryEventsOptions = {},
): Promise<MemoryEventsResult> {
	const raw = await store.read(MEMORY_EVENTS_PATH);
	return parseJsonl<MemoryEvent>(raw, {
		mode: options.malformedLineMode ?? "throw",
		validate: validateMemoryEvent,
	});
}

/**
 * Normalizes a memory event by validating it.
 *
 * @param event - The event to normalize.
 * @returns The validated {@link MemoryEvent}.
 */
export function normalizeMemoryEvent(event: MemoryEvent): MemoryEvent {
	return validateMemoryEvent(event, 0);
}

/**
 * Validates a memory event object.
 *
 * @param value - The unknown value to validate.
 * @param lineNumber - The line number (for error reporting).
 * @returns The validated {@link MemoryEvent}.
 * @throws {@link MemoryValidationError} If validation fails.
 */
export function validateMemoryEvent(
	value: unknown,
	lineNumber: number,
): MemoryEvent {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Memory event must be an object.", {
			lineNumber,
		});
	}

	const event = value as Partial<MemoryEvent>;
	assertNonEmptyString(event.id, "event.id");
	assertNonEmptyString(event.type, "event.type");
	if (!MEMORY_EVENT_TYPES.has(event.type as MemoryEventType)) {
		throw new MemoryValidationError("Memory event type is invalid.", {
			lineNumber,
			type: event.type,
		});
	}
	assertIsoTimestamp(event.timestamp, "event.timestamp");

	if (event.projectId !== undefined)
		assertNonEmptyString(event.projectId, "event.projectId");
	if (event.sourcePath !== undefined)
		assertNonEmptyString(event.sourcePath, "event.sourcePath");
	if (event.summary !== undefined)
		assertNonEmptyString(event.summary, "event.summary");

	if (event.actor !== undefined) {
		if (
			typeof event.actor !== "object" ||
			event.actor === null ||
			Array.isArray(event.actor)
		) {
			throw new MemoryValidationError("event.actor must be an object.", {
				lineNumber,
			});
		}
		assertNonEmptyString(event.actor.type, "event.actor.type");
		if (!ACTOR_TYPES.has(event.actor.type as MemoryActorType)) {
			throw new MemoryValidationError("event.actor.type is invalid.", {
				lineNumber,
				actorType: event.actor.type,
			});
		}
		if (event.actor.id !== undefined)
			assertNonEmptyString(event.actor.id, "event.actor.id");
	}

	if (event.metadata !== undefined)
		assertJsonSerializable(event.metadata, "event.metadata");

	const normalized: MemoryEvent = {
		id: event.id,
		type: event.type as MemoryEventType,
		timestamp: event.timestamp,
	};

	if (event.projectId !== undefined) normalized.projectId = event.projectId;
	if (event.sourcePath !== undefined) normalized.sourcePath = event.sourcePath;
	if (event.actor !== undefined)
		normalized.actor = event.actor as NonNullable<MemoryEvent["actor"]>;
	if (event.summary !== undefined) normalized.summary = event.summary;
	if (event.metadata !== undefined) normalized.metadata = event.metadata;

	return normalized;
}

/**
 * Creates a stable 32-bit hash of a string (Fowler-Noll-Vo algorithm).
 *
 * @param input - The string to hash.
 * @returns An 8-character hexadecimal hash string.
 */
function stableHash(input: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}
