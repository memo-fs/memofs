/**
 * Append-only trial assignment/outcome ledger.
 *
 * @remarks
 * Assignments land in `trials/assignments.jsonl`, outcomes in
 * `trials/outcomes.jsonl`, via the existing `MemoryStore` read/write/append
 * surface. Ledgers stay absent until the first append — reads on a fresh
 * workspace return `[]` so init output is unchanged. Trial rows never touch
 * `memory/` files (asserted by test, not convention).
 *
 * @public
 */

import {
	TRIALS_ASSIGNMENTS_PATH,
	TRIALS_OUTCOMES_PATH,
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
	TrialArm,
	TrialAssignment,
	TrialOutcome,
	TrialSourceState,
} from "./types";

const TRIAL_ARMS = new Set<TrialArm>(["treatment", "control", "shadow"]);

const TRIAL_SOURCE_STATES = new Set<TrialSourceState>([
	"current",
	"stale",
	"unverified",
]);

/** Options for reading the trial ledger. */
export interface ReadTrialLedgerOptions {
	/** How to handle malformed JSONL lines. Defaults to `"throw"`. */
	malformedLineMode?: MalformedJsonlMode;
}

/**
 * Validates an unknown value as a {@link TrialAssignment}.
 *
 * @param value - The unknown value to validate.
 * @param lineNumber - The line number (for error reporting).
 * @returns The validated {@link TrialAssignment}.
 */
export function validateTrialAssignment(
	value: unknown,
	lineNumber: number,
): TrialAssignment {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Trial assignment must be an object.", {
			lineNumber,
		});
	}

	const assignment = value as Partial<TrialAssignment>;
	assertNonEmptyString(assignment.id, "assignment.id");
	assertNonEmptyString(assignment.memoryId, "assignment.memoryId");
	assertNonEmptyString(assignment.task, "assignment.task");
	if (!TRIAL_ARMS.has(assignment.arm as TrialArm)) {
		throw new MemoryValidationError("Trial assignment arm is invalid.", {
			lineNumber,
			arm: assignment.arm,
		});
	}
	if (assignment.designRef !== undefined) {
		assertNonEmptyString(assignment.designRef, "assignment.designRef");
	}
	assertIsoTimestamp(assignment.timestamp, "assignment.timestamp");

	return {
		id: assignment.id,
		memoryId: assignment.memoryId,
		task: assignment.task,
		arm: assignment.arm as TrialArm,
		...(assignment.designRef === undefined
			? {}
			: { designRef: assignment.designRef }),
		timestamp: assignment.timestamp,
	};
}

/**
 * Validates an unknown value as a {@link TrialOutcome}.
 *
 * @param value - The unknown value to validate.
 * @param lineNumber - The line number (for error reporting).
 * @returns The validated {@link TrialOutcome}.
 */
export function validateTrialOutcome(
	value: unknown,
	lineNumber: number,
): TrialOutcome {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new MemoryValidationError("Trial outcome must be an object.", {
			lineNumber,
		});
	}

	const outcome = value as Partial<TrialOutcome>;
	assertNonEmptyString(outcome.id, "outcome.id");
	assertNonEmptyString(outcome.assignmentId, "outcome.assignmentId");
	assertNonEmptyString(outcome.memoryId, "outcome.memoryId");
	assertNonEmptyString(outcome.validator, "outcome.validator");
	if (typeof outcome.passed !== "boolean") {
		throw new MemoryValidationError("Trial outcome passed must be boolean.", {
			lineNumber,
		});
	}
	if (!TRIAL_SOURCE_STATES.has(outcome.sourceState as TrialSourceState)) {
		throw new MemoryValidationError("Trial outcome sourceState is invalid.", {
			lineNumber,
			sourceState: outcome.sourceState,
		});
	}
	assertNonEmptyString(outcome.sourceFingerprint, "outcome.sourceFingerprint");
	assertIsoTimestamp(outcome.timestamp, "outcome.timestamp");
	if (outcome.detail !== undefined) {
		assertNonEmptyString(outcome.detail, "outcome.detail");
	}

	return {
		id: outcome.id,
		assignmentId: outcome.assignmentId,
		memoryId: outcome.memoryId,
		validator: outcome.validator,
		passed: outcome.passed,
		sourceState: outcome.sourceState as TrialSourceState,
		sourceFingerprint: outcome.sourceFingerprint,
		timestamp: outcome.timestamp,
		...(outcome.detail === undefined ? {} : { detail: outcome.detail }),
	};
}

/**
 * Appends an exposure assignment to the trial ledger.
 *
 * @param store - The memory store to append to.
 * @param assignment - The assignment to record (validated before write).
 * @returns The recorded {@link TrialAssignment}.
 */
export async function appendAssignment(
	store: MemoryStore,
	assignment: TrialAssignment,
): Promise<TrialAssignment> {
	const record = validateTrialAssignment(assignment, 0);
	await store.append(TRIALS_ASSIGNMENTS_PATH, stringifyJsonlEntry(record));
	return record;
}

/**
 * Reads all trial assignments. Returns `[]` on a fresh workspace.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns All recorded {@link TrialAssignment} rows in ledger order.
 */
export async function readAssignments(
	store: MemoryStore,
	options: ReadTrialLedgerOptions = {},
): Promise<TrialAssignment[]> {
	if (!(await store.exists(TRIALS_ASSIGNMENTS_PATH))) return [];
	const raw = await store.read(TRIALS_ASSIGNMENTS_PATH);
	return parseJsonl<TrialAssignment>(raw, {
		mode: options.malformedLineMode ?? "throw",
		validate: validateTrialAssignment,
	}).entries;
}

/**
 * Appends a validator outcome to the trial ledger.
 *
 * @param store - The memory store to append to.
 * @param outcome - The outcome to record (validated before write).
 * @returns The recorded {@link TrialOutcome}.
 */
export async function appendOutcome(
	store: MemoryStore,
	outcome: TrialOutcome,
): Promise<TrialOutcome> {
	const record = validateTrialOutcome(outcome, 0);
	await store.append(TRIALS_OUTCOMES_PATH, stringifyJsonlEntry(record));
	return record;
}

/**
 * Reads all trial outcomes. Returns `[]` on a fresh workspace.
 *
 * @param store - The memory store to read from.
 * @param options - Read options.
 * @returns All recorded {@link TrialOutcome} rows in ledger order.
 */
export async function readOutcomes(
	store: MemoryStore,
	options: ReadTrialLedgerOptions = {},
): Promise<TrialOutcome[]> {
	if (!(await store.exists(TRIALS_OUTCOMES_PATH))) return [];
	const raw = await store.read(TRIALS_OUTCOMES_PATH);
	return parseJsonl<TrialOutcome>(raw, {
		mode: options.malformedLineMode ?? "throw",
		validate: validateTrialOutcome,
	}).entries;
}
