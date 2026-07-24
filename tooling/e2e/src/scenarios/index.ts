/**
 * Scenario runners index — exports all deterministic scenarios for ticket 65.
 *
 * @remarks
 * Each scenario proves file-first truth, cross-visibility, contract superset,
 * and golden snapshot. Used by `src/e2e/scenarios.e2e.test.ts` and future orchestrator (ticket 66).
 *
 * @public
 */

export * from "./types.js";
export { runLifecycleScenario } from "./lifecycle.js";
export { runAgentFsInterleavedScenario } from "./agentfs-interleaved.js";
export { runConnectorsMergeScenario } from "./connectors-merge.js";
export { runFailureRecoveryScenario } from "./failure-recovery.js";
export {
	runGoldenSnapshotsScenario,
	assertGoldenSnapshot,
	loadGoldenSnapshot,
	saveGoldenSnapshot,
	buildGoldenFromSnapshot,
	generateGoldenSnapshots,
	type GoldenSnapshotFile,
} from "./golden-snapshots.js";
