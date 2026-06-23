/**
 * Builds model-facing instructions for an AgentFS-backed TekMemo session.
 *
 * @remarks
 * This helper intentionally accepts a structural path object instead of
 * importing `@tekbreed/tekmemo`'s `agentfs`, so this adapter keeps AgentFS optional.
 *
 * @packageDocumentation
 */

/**
 * Minimal AgentFS session paths used to instruct an AI SDK model.
 *
 * @public
 */
export interface AgentSessionInstructionPaths {
	readonly context: {
		readonly core: string;
		readonly notes: string;
	};
	readonly working: {
		readonly plan: string;
		readonly commands: string;
		readonly errors: string;
		readonly changes: string;
	};
	readonly output: {
		readonly summary: string;
		readonly durableMemory: string;
		readonly followUps: string;
	};
}

/**
 * Options for building AgentFS session instructions.
 *
 * @public
 */
export interface BuildAgentSessionInstructionsOptions {
	/**
	 * Session identifier.
	 */
	readonly sessionId: string;

	/**
	 * Current task or brief.
	 */
	readonly task: string;

	/**
	 * AgentFS session paths.
	 */
	readonly paths: AgentSessionInstructionPaths;
}

/**
 * Builds a concise instruction block for models working inside an AgentFS session.
 *
 * @param options - Instruction options.
 * @returns Markdown instruction text.
 *
 * @public
 */
export function buildAgentSessionInstructions(
	options: BuildAgentSessionInstructionsOptions,
): string {
	return [
		"# TekMemo Agent Session",
		`Session: ${options.sessionId}`,
		`Task: ${options.task}`,
		"",
		"Before editing, read:",
		`- ${options.paths.context.core}`,
		`- ${options.paths.context.notes}`,
		"",
		"During work, keep these files updated:",
		`- ${options.paths.working.plan}`,
		`- ${options.paths.working.commands}`,
		`- ${options.paths.working.errors}`,
		`- ${options.paths.working.changes}`,
		"",
		"Before finishing, write:",
		`- ${options.paths.output.summary}`,
		`- ${options.paths.output.durableMemory}`,
		`- ${options.paths.output.followUps}`,
		"",
		"Only put durable facts, decisions, preferences, constraints, and reusable patterns in durable-memory.md.",
	].join("\n");
}
