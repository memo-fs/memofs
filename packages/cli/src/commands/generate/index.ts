/**
 * Re-exports for the `generate` command group.
 *
 * The `generate/` directory contains:
 * - `agent-rules.ts` — the existing `generate agent-rules` command (rules-only)
 * - `emitters/types.ts` — the `HookEmitter` / `HookModule` interfaces
 * - `hooks/` — platform-agnostic hook modules (context injection, subagent
 *   injection, compaction survival, status display)
 * - `emitters/` — per-platform hook emitters (added in T5/T6)
 *
 * All existing imports from `"./generate"` or `"../commands/generate"`
 * continue to work via these re-exports.
 *
 * @module generate
 */

export type { GenerateAgentCommandOptions } from "./agent";
export { runGenerateAgentCommand } from "./agent";
export type { GenerateAgentHooksCommandOptions } from "./agent-hooks";
export { runGenerateAgentHooksCommand } from "./agent-hooks";
export type {
	AgentRulesFile,
	AgentRulesTarget,
	EmitAgentRulesOptions,
	GenerateAgentRulesCommandOptions,
} from "./agent-rules";
export {
	AGENT_RULES_TARGETS,
	emitAgentRules,
	MAX_AGENT_RULES_LINES,
	parseAgentRulesTarget,
	runGenerateAgentRulesCommand,
} from "./agent-rules";
export {
	getEmitter,
	HOOK_EMITTER_TARGETS,
} from "./emitters";
export type {
	EmittedHookFile,
	HookCapabilities,
	HookEmitContext,
	HookEmitter,
	HookEvent,
	HookModule,
} from "./emitters/types";
export { compactionSurvivalModule } from "./hooks/compaction-survival";
export { contextInjectionModule } from "./hooks/context-injection";
export { statusDisplayModule } from "./hooks/status-display";
export { subagentInjectionModule } from "./hooks/subagent-injection";
export type {
	EmitMcpConfigOptions,
	EmittedMcpConfig,
	McpConfigFormat,
	McpConfigMeta,
	McpConfigWriteResult,
	McpScope,
} from "./mcp-config";
export {
	emitMcpConfig,
	MCP_CONFIG_META,
	resolveMcpGlobal,
	resolveMcpPath,
	resolveScope,
	runGenerateMcpCommand,
	supportsScope,
	writeMcpConfig,
} from "./mcp-config";
