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

// Base harness types + core harness
export type {
	RealHarness,
	CoreRealHarness,
	CreateRealCoreHarnessOptions,
} from "./harness/core-harness";
export { createRealCoreHarness } from "./harness/core-harness";

// CLI harness (ticket 61)
export type {
	CliRealHarness,
	CliExecResult,
	CreateRealCliHarnessOptions,
} from "./harness/cli-harness";
export { createRealCliHarness } from "./harness/cli-harness";

// MCP + Server harnesses (ticket 62)
export type {
	McpStdioHarness,
	CreateRealMcpStdioHarnessOptions,
	McpTool,
} from "./harness/mcp-stdio-harness";
export { createRealMcpStdioHarness } from "./harness/mcp-stdio-harness";

export type {
	McpHttpHarness,
	CreateRealMcpHttpHarnessOptions,
} from "./harness/mcp-http-harness";
export { createRealMcpHttpHarness } from "./harness/mcp-http-harness";

export type {
	ServerRealHarness,
	CreateRealServerHarnessOptions,
} from "./harness/server-harness";
export { createRealServerHarness } from "./harness/server-harness";

// Adapter harnesses (ticket 63)
export type {
	TursoRealHarness,
	CreateRealTursoHarnessOptions,
} from "./harness/turso-harness";
export { createRealTursoHarness } from "./harness/turso-harness";

export type {
	R2RealHarness,
	CreateRealR2HarnessOptions,
} from "./harness/r2-harness";
export { createRealR2Harness } from "./harness/r2-harness";

export type {
	TransformersRealHarness,
	CreateRealTransformersHarnessOptions,
} from "./harness/transformers-harness";
export {
	createRealTransformersHarness,
	assertTransformersValidationBehavior,
} from "./harness/transformers-harness";

// MSW + connectors + remote adapters (ticket 64)
export { mswServer, allHandlers } from "./msw/server.js";
export type {
	ConnectorRealHarness,
	CreateRealConnectorHarnessOptions,
} from "./harness/connector-harness";
export { createRealConnectorHarness } from "./harness/connector-harness";

export type {
	OpenAIRealHarness,
	CreateRealOpenAIHarnessOptions,
} from "./harness/openai-harness";
export { createRealOpenAIHarness, assertNoTokenLeak as assertOpenAINoTokenLeak } from "./harness/openai-harness";

export type {
	VoyageRealHarness,
	CreateRealVoyageHarnessOptions,
	VoyageRerankRealHarness,
	CreateRealVoyageRerankHarnessOptions,
} from "./harness/voyage-harness";
export {
	createRealVoyageHarness,
	createRealVoyageRerankHarness,
	assertNoTokenLeak as assertVoyageNoTokenLeak,
} from "./harness/voyage-harness";

// MSW handler state helpers (for dedup mutable tests)
export {
	setGitHubNodes,
	setGitHubPayload,
	resetGitHubFixture,
	getGitHubFixtureMeta,
} from "./msw/handlers/github.js";
export {
	setNotionResults,
	setNotionPayload,
	resetNotionFixture,
	getNotionFixtureMeta,
} from "./msw/handlers/notion.js";
export {
	setOpenAIErrorMode,
	resetOpenAIFixture,
	getOpenAIFixtureMeta,
} from "./msw/handlers/openai.js";
export {
	setVoyageErrorMode,
	resetVoyageFixture,
	getVoyageFixtureMeta,
} from "./msw/handlers/voyage.js";

// Scenarios (ticket 65) — deterministic flows proving file-first truth, cross-visibility, golden snapshots
export type {
	ScenarioResult,
	ScenarioFsSnapshot,
	CrossVisibilityProof,
	FileFirstTruthProof,
	ScenarioOptions,
} from "./scenarios/types.js";
export type { GoldenSnapshotFile } from "./scenarios/golden-snapshots.js";
export {
	runLifecycleScenario,
	runAgentFsInterleavedScenario,
	runConnectorsMergeScenario,
	runFailureRecoveryScenario,
	runGoldenSnapshotsScenario,
	assertGoldenSnapshot,
	loadGoldenSnapshot,
	saveGoldenSnapshot,
	buildGoldenFromSnapshot,
	generateGoldenSnapshots,
} from "./scenarios/index.js";
