/**
 * Real e2e harness entry — Node-only.
 *
 * @remarks
 * This subpath is **Node-only** and imports `node:fs`, `node:os`, `node:path`
 * and real MemoFS implementations (`@memofs/core/node-fs`). It must NOT be
 * imported from Workers or edge runtimes. The main `@memofs/testing` barrel
 * does NOT re-export this — same pattern as `@memofs/core/node-fs`.
 *
 * ```ts
 * import { createRealCoreHarness } from "@memofs/testing/real";
 * ```
 *
 * This is the primary seam for real e2e (ADR 0021). Future harnesses
 * (CLI, MCP, server, Turso, R2, Transformers, connectors, MSW) will be
 * exported from here.
 *
 * @public
 */

// Base harness types + core harness
export type {
	CoreRealHarness,
	CreateRealCoreHarnessOptions,
	RealHarness,
} from "./harness/core-harness";
export { createRealCoreHarness } from "./harness/core-harness";

// Placeholder re-exports for future tickets — commented until implemented
// export type { CliRealHarness } from "./harness/cli-harness";
// export type { McpStdioHarness } from "./harness/mcp-stdio-harness";
// export type { McpHttpHarness } from "./harness/mcp-http-harness";
// export type { ServerRealHarness } from "./harness/server-harness";
// export type { TursoRealHarness } from "./harness/turso-harness";
// export type { R2RealHarness } from "./harness/r2-harness";
// export type { TransformersRealHarness } from "./harness/transformers-harness";
// export type { ConnectorRealHarness } from "./harness/connector-harness";
