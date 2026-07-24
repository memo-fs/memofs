/**
 * Scenario runners index — exports all deterministic scenarios for ticket 65.
 *
 * @remarks
 * Each scenario proves file-first truth, cross-visibility, contract superset,
 * and golden snapshot. Used by `src/e2e/scenarios.e2e.test.ts` and future orchestrator (ticket 66).
 *
 * @public
 */

export type { ScenarioName } from "./types.js";
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

// Sim runners re-exported for convenience (also available via ../sim)
export { runSeededLoopScenario } from "../sim/seeded-loop.js";
export { runOrchestratorScenario } from "../sim/orchestrator.js";
