/**
 * Scenario runners index — exports all deterministic scenarios for ticket 65.
 *
 * @remarks
 * Each scenario proves file-first truth, cross-visibility, contract superset,
 * and golden snapshot. Used by `src/e2e/scenarios.e2e.test.ts` and future orchestrator (ticket 66).
 *
 * @public
 */

export { runOrchestratorScenario } from "../sim/orchestrator";
// Sim runners re-exported for convenience (also available via ../sim)
export { runSeededLoopScenario } from "../sim/seeded-loop";
export { runAgentFsInterleavedScenario } from "./agentfs-interleaved";
export { runConnectorsMergeScenario } from "./connectors-merge";
export { runFailureRecoveryScenario } from "./failure-recovery";
export {
	assertGoldenSnapshot,
	buildGoldenFromSnapshot,
	type GoldenSnapshotFile,
	generateGoldenSnapshots,
	loadGoldenSnapshot,
	runGoldenSnapshotsScenario,
	saveGoldenSnapshot,
} from "./golden-snapshots";
export { runLifecycleScenario } from "./lifecycle";
export type { ScenarioName } from "./types";
export * from "./types";
