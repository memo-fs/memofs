/**
 * Main entry point exporting all CLI command runner functions.
 *
 * @module commands
 */

export {
	runAgentCompleteCommand,
	runAgentExtractCommand,
	runAgentPathsCommand,
	runAgentStartCommand,
} from "./agent";
export { runChunksCommand } from "./chunks";
export {
	runCloudHealthCommand,
	runCloudReadinessCommand,
	runCloudSyncPullCommand,
	runCloudSyncPushCommand,
	runCloudSyncStatusCommand,
} from "./cloud";
export {
	runConnectorsAddCommand,
	runConnectorsListCommand,
	runConnectorsRemoveCommand,
	runConnectorsRunCommand,
} from "./connectors";
export { runContextCommand } from "./context";
export { runDiffCommand } from "./diff";
export { runDoctorCommand } from "./doctor";
export { runEventsCommand } from "./events";
export {
	AGENT_RULES_TARGETS,
	HOOK_EMITTER_TARGETS,
	MAX_AGENT_RULES_LINES,
	runGenerateAgentCommand,
	runGenerateAgentHooksCommand,
	runGenerateAgentRulesCommand,
	runGenerateMcpCommand,
} from "./generate";
export { runInitCommand } from "./init";
export { runInspectCommand } from "./inspect";
export { runReadCommand } from "./read";
export { runRememberCommand } from "./remember";
export { runSearchCommand } from "./search";
export { runSnapshotCommand } from "./snapshot";
export { runStatusCommand } from "./status";
export { runValidateCommand } from "./validate";
