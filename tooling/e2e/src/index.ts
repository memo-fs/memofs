/**
 * Real e2e harness — private, Node-only, local/manual.
 *
 * @remarks
 * Private package `@repo/e2e` — never published. This is the primary seam
 * for real e2e (ADR 0021). It imports real implementations (`@memofs/core/node-fs`)
 * and provides isolated tmpDir factories. Must NOT be imported from Workers.
 *
 * ```ts
 * import { createRealCoreHarness } from "@repo/e2e";
 * ```
 *
 * Future harnesses (CLI, MCP, server, Turso, R2, Transformers, connectors, MSW)
 * will be exported from here.
 *
 * @public
 */

// CLI harness (ticket 61)
export type {
	CliExecResult,
	CliRealHarness,
	CreateRealCliHarnessOptions,
} from "./harness/cli-harness";
export { createRealCliHarness } from "./harness/cli-harness";
export type {
	ConnectorRealHarness,
	CreateRealConnectorHarnessOptions,
} from "./harness/connector-harness";
export { createRealConnectorHarness } from "./harness/connector-harness";
// Base harness types + core harness
export type {
	CoreRealHarness,
	CreateRealCoreHarnessOptions,
	RealHarness,
} from "./harness/core-harness";
export { createRealCoreHarness } from "./harness/core-harness";

export type {
	CreateRealMcpHttpHarnessOptions,
	McpHttpHarness,
} from "./harness/mcp-http-harness";
export { createRealMcpHttpHarness } from "./harness/mcp-http-harness";
// MCP + Server harnesses (ticket 62)
export type {
	CreateRealMcpStdioHarnessOptions,
	McpStdioHarness,
	McpTool,
} from "./harness/mcp-stdio-harness";
export { createRealMcpStdioHarness } from "./harness/mcp-stdio-harness";
export type {
	CreateRealOpenAIHarnessOptions,
	OpenAIRealHarness,
} from "./harness/openai-harness";
export {
	assertNoTokenLeak as assertOpenAINoTokenLeak,
	createRealOpenAIHarness,
} from "./harness/openai-harness";

export type {
	CreateRealR2HarnessOptions,
	R2RealHarness,
} from "./harness/r2-harness";
export { createRealR2Harness } from "./harness/r2-harness";
export type {
	CreateRealServerHarnessOptions,
	ServerRealHarness,
} from "./harness/server-harness";
export { createRealServerHarness } from "./harness/server-harness";
export type {
	CreateRealTransformersHarnessOptions,
	TransformersRealHarness,
} from "./harness/transformers-harness";
export {
	assertTransformersValidationBehavior,
	createRealTransformersHarness,
} from "./harness/transformers-harness";
// Adapter harnesses (ticket 63)
export type {
	CreateRealTursoHarnessOptions,
	TursoRealHarness,
} from "./harness/turso-harness";
export { createRealTursoHarness } from "./harness/turso-harness";
export type {
	CreateRealVoyageHarnessOptions,
	CreateRealVoyageRerankHarnessOptions,
	VoyageRealHarness,
	VoyageRerankRealHarness,
} from "./harness/voyage-harness";
export {
	assertNoTokenLeak as assertVoyageNoTokenLeak,
	createRealVoyageHarness,
	createRealVoyageRerankHarness,
} from "./harness/voyage-harness";
// MSW handler state helpers (for dedup mutable tests)
export {
	getGitHubFixtureMeta,
	resetGitHubFixture,
	setGitHubNodes,
	setGitHubPayload,
} from "./msw/handlers/github";
export {
	getNotionFixtureMeta,
	resetNotionFixture,
	setNotionPayload,
	setNotionResults,
} from "./msw/handlers/notion";
export {
	getOpenAIFixtureMeta,
	resetOpenAIFixture,
	setOpenAIErrorMode,
} from "./msw/handlers/openai";
export {
	getVoyageFixtureMeta,
	resetVoyageFixture,
	setVoyageErrorMode,
} from "./msw/handlers/voyage";
// MSW + connectors + remote adapters (ticket 64)
export { allHandlers, mswServer } from "./msw/server";
export type { GoldenSnapshotFile } from "./scenarios/golden-snapshots";
export {
	assertGoldenSnapshot,
	buildGoldenFromSnapshot,
	generateGoldenSnapshots,
	loadGoldenSnapshot,
	runAgentFsInterleavedScenario,
	runConnectorsMergeScenario,
	runFailureRecoveryScenario,
	runGoldenSnapshotsScenario,
	runLifecycleScenario,
	runOrchestratorScenario,
	runSeededLoopScenario,
	saveGoldenSnapshot,
} from "./scenarios/index";
// Scenarios (ticket 65) — deterministic flows proving file-first truth, cross-visibility, golden snapshots
export type {
	CrossVisibilityProof,
	FileFirstTruthProof,
	ScenarioFsSnapshot,
	ScenarioOptions,
	ScenarioResult,
} from "./scenarios/types";
export { runOrchestratorScenario as runOrchestrator } from "./sim/orchestrator";
export type { SeededLoopStats } from "./sim/seeded-loop";
// Sim (ticket 66) — seeded-loop + orchestrator (aliases)
export { runSeededLoopScenario as runSeededLoop } from "./sim/seeded-loop";
