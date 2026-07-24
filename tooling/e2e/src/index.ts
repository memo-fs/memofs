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

// Placeholder re-exports for future tickets — commented until implemented
// export type { TursoRealHarness } from "./harness/turso-harness";
// export type { R2RealHarness } from "./harness/r2-harness";
// export type { TransformersRealHarness } from "./harness/transformers-harness";
// export type { ConnectorRealHarness } from "./harness/connector-harness";
