/**
 * Warrant-state store (spec-0038, ticket 1).
 *
 * @remarks
 * Current authority lives in `warrants/<memory-id>.json`; every transition
 * appends to `warrants/history.jsonl` with its reason. A memory with no
 * warrant file reads back as `candidate` — authority is derived, and absence
 * of evidence is never authority. Transition *policy* (when evidence warrants)
 * arrives with the ticket-4 estimator; this module owns durable state only.
 *
 * @public
 */

import {
	createWarrantPath,
	WARRANTS_HISTORY_PATH,
} from "../core/constants/memory-paths";
import { MemoryValidationError } from "../core/errors/errors";
import type { MemoryStore } from "../core/types/memory-store";
import {
	assertIsoTimestamp,
	assertNonEmptyString,
} from "../core/validation/assertions";
import {
	type MalformedJsonlMode,
	parseJsonl,
	stringifyJsonlEntry,
} from "../core/validation/jsonl";
import type {
	WarrantState,
	WarrantStateName,
	WarrantTransition,
} from "./types";

const WARRANT_STATES = new Set<WarrantStateName>([
	"candidate",
	"probation",
	"warranted",
	"suspended",
	"revoked",
	"archived",
]);

/** Options for reading warrant state/history. */
export interface ReadWarrantOptions {
	/** How to handle malformed history JSONL lines. Defaults to `"throw"`. */
	malformedLineMode?: MalformedJsonlMode;
	/** Custom clock for the default candidate state. */
	now?: () => string;
}

/** Options for writing warrant state. */
export interface WriteWarrantOptions {
	/** Custom clock for the transition timestamp. */
	now?: () => string;
}

/**
 * Validates an unknown value as a {@link WarrantState}.
 *
 * @param value - The unknown value to validate.
 * @returns The validated {@link WarrantState}.
 */
export function validateWarrantState(value: unknown): WarrantState {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Warrant state must be an object.", {});
	}

	const state = value as Partial<WarrantState>;
	assertNonEmptyString(state.memoryId, "warrant.memoryId");
	if (!WARRANT_STATES.has(state.state as WarrantStateName)) {
		throw new MemoryValidationError("Warrant state name is invalid.", {
			state: state.state,
		});
	}
	assertIsoTimestamp(state.updatedAt, "warrant.updatedAt");
	if (state.reason !== undefined) {
		assertNonEmptyString(state.reason, "warrant.reason");
	}

	return {
		memoryId: state.memoryId,
		state: state.state as WarrantStateName,
		updatedAt: state.updatedAt,
		...(state.reason === undefined ? {} : { reason: state.reason }),
	};
}

/**
 * Validates an unknown value as a {@link WarrantTransition}.
 *
 * @param value - The unknown value to validate.
 * @param lineNumber - The line number (for error reporting).
 * @returns The validated {@link WarrantTransition}.
 */
export function validateWarrantTransition(
	value: unknown,
	lineNumber: number,
): WarrantTransition {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Warrant transition must be an object.", {
			lineNumber,
		});
	}

	const transition = value as Partial<WarrantTransition>;
	assertNonEmptyString(transition.memoryId, "transition.memoryId");
	if (!WARRANT_STATES.has(transition.from as WarrantStateName)) {
		throw new MemoryValidationError(
			"Warrant transition from-state is invalid.",
			{
				lineNumber,
				from: transition.from,
			},
		);
	}
	if (!WARRANT_STATES.has(transition.to as WarrantStateName)) {
		throw new MemoryValidationError("Warrant transition to-state is invalid.", {
			lineNumber,
			to: transition.to,
		});
	}
	assertNonEmptyString(transition.reason, "transition.reason");
	assertIsoTimestamp(transition.timestamp, "transition.timestamp");

	return {
		memoryId: transition.memoryId,
		from: transition.from as WarrantStateName,
		to: transition.to as WarrantStateName,
		reason: transition.reason,
		timestamp: transition.timestamp,
	};
}

/**
 * Sentinel timestamp for memories that never transitioned: absence of
 * evidence carries a fixed stamp, never a fresh clock reading, so repeated
 * reads of an unwarranted memory are identical and replay-safe.
 */
const NEVER_TRANSITIONED_AT = "1970-01-01T00:00:00.000Z";

/**
 * Reads the current warrant state for a memory. Memories with no warrant file
 * read back as `candidate` — absence of evidence is never authority.
 *
 * @param store - The memory store to read from.
 * @param memoryId - The memory to read the warrant state for.
 * @param options - Read options.
 * @returns The current {@link WarrantState}.
 */
export async function readWarrantState(
	store: MemoryStore,
	memoryId: string,
	options: ReadWarrantOptions = {},
): Promise<WarrantState> {
	const path = createWarrantPath(memoryId);
	if (!(await store.exists(path))) {
		return {
			memoryId,
			state: "candidate",
			updatedAt: (options.now ?? (() => NEVER_TRANSITIONED_AT))(),
		};
	}
	const raw = await store.read(path);
	return validateWarrantState(JSON.parse(raw) as unknown);
}

/**
 * Transitions a memory's warrant state: writes the current-state file and
 * appends the transition (with its reason) to history. Reasons are required —
 * no bare verdicts.
 *
 * @param store - The memory store to write to.
 * @param memoryId - The memory to transition.
 * @param to - The state to transition to.
 * @param reason - Why the transition happened.
 * @param options - Write options.
 * @returns The new {@link WarrantState}.
 */
export async function writeWarrantState(
	store: MemoryStore,
	memoryId: string,
	to: WarrantStateName,
	reason: string,
	options: WriteWarrantOptions = {},
): Promise<WarrantState> {
	assertNonEmptyString(reason, "reason");
	if (!WARRANT_STATES.has(to)) {
		throw new MemoryValidationError("Warrant state name is invalid.", {
			to,
		});
	}

	const now = (options.now ?? (() => new Date().toISOString()))();
	const current = await readWarrantState(store, memoryId, options);
	const next: WarrantState = {
		memoryId,
		state: to,
		updatedAt: now,
		reason,
	};
	const transition: WarrantTransition = {
		memoryId,
		from: current.state,
		to,
		reason,
		timestamp: now,
	};

	await store.write(
		createWarrantPath(memoryId),
		`${JSON.stringify(validateWarrantState(next))}\n`,
	);
	await store.append(
		WARRANTS_HISTORY_PATH,
		stringifyJsonlEntry(validateWarrantTransition(transition, 0)),
	);
	return next;
}

/**
 * Reads warrant history, optionally filtered to one memory. Returns `[]` on a
 * fresh workspace. The full chain replays in ledger order.
 *
 * @param store - The memory store to read from.
 * @param memoryId - Optional memory to filter transitions to.
 * @param options - Read options.
 * @returns The matching {@link WarrantTransition} rows in ledger order.
 */
export async function readWarrantHistory(
	store: MemoryStore,
	memoryId?: string,
	options: ReadWarrantOptions = {},
): Promise<WarrantTransition[]> {
	if (memoryId !== undefined) createWarrantPath(memoryId);
	if (!(await store.exists(WARRANTS_HISTORY_PATH))) return [];
	const raw = await store.read(WARRANTS_HISTORY_PATH);
	const entries = parseJsonl<WarrantTransition>(raw, {
		mode: options.malformedLineMode ?? "throw",
		validate: validateWarrantTransition,
	}).entries;
	return memoryId === undefined
		? entries
		: entries.filter((entry) => entry.memoryId === memoryId);
}
