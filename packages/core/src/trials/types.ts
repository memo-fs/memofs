/**
 * Trial ledger + warrant types (spec-0038, ticket 1).
 *
 * @remarks
 * A trial assigns a candidate memory to an exposure arm, runs an agent,
 * validates the outcome with an independent signal, and appends both rows to
 * the ledger. Warrants are separate versioned assertions beside memories —
 * trial results never mutate original memory files.
 *
 * @public
 */

/** Exposure arm for a trial assignment. */
export type TrialArm = "treatment" | "control" | "shadow";

/** Source-state validity at the moment a validator ran. */
export type TrialSourceState = "current" | "stale" | "unverified";

/**
 * One exposure assignment: a memory shown to (treatment/shadow) or withheld
 * from (control) an agent run for a task. Design records arrive in ticket 2;
 * until then `designRef` is an opaque reference carried through, not resolved.
 */
export interface TrialAssignment {
	/** Unique assignment id. */
	id: string;
	/** Memory under trial. */
	memoryId: string;
	/** Task the agent attempted. */
	task: string;
	/** Exposure arm. */
	arm: TrialArm;
	/** Predeclared design reference (opaque until ticket 2). */
	designRef?: string;
	/** ISO timestamp of assignment. */
	timestamp: string;
}

/**
 * One validator outcome: an independent signal's verdict on an assignment.
 * Agent self-reported success is recorded as observation only and can never
 * validate (enforced in ticket 3) — this row carries whatever the validator
 * reported, including its source-state fingerprint.
 */
export interface TrialOutcome {
	/** Unique outcome id. */
	id: string;
	/** Assignment this outcome validates. */
	assignmentId: string;
	/** Memory under trial (denormalized for ledger scans). */
	memoryId: string;
	/** Validator name (e.g. `typecheck`, `schema-check`, `human-review`). */
	validator: string;
	/** Whether the independent signal passed. */
	passed: boolean;
	/** Source-state validity when the validator ran. */
	sourceState: TrialSourceState;
	/** Fingerprint of the source state (anchor hash, model+tool versions). */
	sourceFingerprint: string;
	/** ISO timestamp of validation. */
	timestamp: string;
	/** Optional validator detail (kept small; raw logs stay out of the ledger). */
	detail?: string;
}

/** Authority lifecycle states for a memory (ADR-0030). */
export type WarrantStateName =
	| "candidate"
	| "probation"
	| "warranted"
	| "suspended"
	| "revoked"
	| "archived";

/** Current inspectable warrant state for one memory. */
export interface WarrantState {
	/** Memory this warrant asserts about. */
	memoryId: string;
	/** Current authority state. */
	state: WarrantStateName;
	/** ISO timestamp of the last transition. */
	updatedAt: string;
	/** Human-readable reason for the current state. */
	reason?: string;
}

/** One authority transition appended to `warrants/history.jsonl`. */
export interface WarrantTransition {
	/** Memory this transition concerns. */
	memoryId: string;
	/** State before the transition. */
	from: WarrantStateName;
	/** State after the transition. */
	to: WarrantStateName;
	/** Why the transition happened (required — no bare verdicts). */
	reason: string;
	/** ISO timestamp of the transition. */
	timestamp: string;
}
