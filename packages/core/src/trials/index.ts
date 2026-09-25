/**
 * Outcome-warranted memory trials (spec-0038).
 *
 * @public
 */

export {
	appendAssignment,
	appendOutcome,
	type ReadTrialLedgerOptions,
	readAssignments,
	readOutcomes,
	validateTrialAssignment,
	validateTrialOutcome,
} from "./trial-ledger";
export type {
	TrialArm,
	TrialAssignment,
	TrialOutcome,
	TrialSourceState,
	WarrantState,
	WarrantStateName,
	WarrantTransition,
} from "./types";
export {
	type ReadWarrantOptions,
	readWarrantHistory,
	readWarrantState,
	validateWarrantState,
	validateWarrantTransition,
	type WriteWarrantOptions,
	writeWarrantState,
} from "./warrant-store";
