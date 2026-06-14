import {
	type AgentfsLikeClient,
	createNodeFsMemoryStore,
	createTekMemoAgentSession,
	extractSessionMemory,
} from "@tekbreed/tekmemo";
import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";

const LATEST_AGENT_SESSION_PATH = `${TEKMEMO_PATHS.tmpDir}/agent-sessions/latest.json`;

/**
 * Shared options for local AgentFS session commands.
 */
interface AgentCommandBaseOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
}

/**
 * Options for starting an agent session.
 */
export interface AgentStartCommandOptions extends AgentCommandBaseOptions {
	task: string;
	projectId?: string | undefined;
	actorId?: string | undefined;
	sessionId?: string | undefined;
}

/**
 * Options for session lookup commands.
 */
export interface AgentSessionLookupOptions extends AgentCommandBaseOptions {
	session?: string | undefined;
}

/**
 * Options for completing an agent session.
 */
export interface AgentCompleteCommandOptions extends AgentSessionLookupOptions {
	extract?: boolean | undefined;
	checkpointLabel?: string | undefined;
}

/**
 * Starts a local AgentFS-style session workspace.
 *
 * @param options - Command options.
 * @returns CLI exit code.
 */
export async function runAgentStartCommand(
	options: AgentStartCommandOptions,
): Promise<number> {
	const client = createLocalAgentfsClient(options.fs);
	const memory = createNodeFsMemoryStore({
		rootDir: options.fs.rootDir,
		missingFileBehavior: "empty",
		createRoot: true,
	});
	const session = createTekMemoAgentSession({
		client,
		memory,
		task: options.task,
		projectId: options.projectId,
		actorId: options.actorId,
		sessionId: options.sessionId,
	});

	await session.prepare();
	const pointer = {
		sessionId: session.sessionId,
		projectId: options.projectId ?? null,
		root: session.paths.root,
		task: options.task,
		createdAt: new Date().toISOString(),
		paths: session.paths,
	};
	await options.fs.writeText(
		LATEST_AGENT_SESSION_PATH,
		`${JSON.stringify(pointer, null, 2)}\n`,
	);

	if (options.json) {
		printJsonEnvelope(options.output, "agent.start", pointer);
		return 0;
	}

	options.output.success(`Started TekMemo agent session ${session.sessionId}`);
	options.output.write(formatAgentInstructions(pointer));
	return 0;
}

/**
 * Prints paths for a known agent session.
 *
 * @param options - Command options.
 * @returns CLI exit code.
 */
export async function runAgentPathsCommand(
	options: AgentSessionLookupOptions,
): Promise<number> {
	const pointer = await readSessionPointer(options.fs, options.session);
	if (options.json) {
		printJsonEnvelope(options.output, "agent.paths", pointer);
		return 0;
	}
	options.output.write(formatAgentInstructions(pointer));
	return 0;
}

/**
 * Extracts output files from an agent session.
 *
 * @param options - Command options.
 * @returns CLI exit code.
 */
export async function runAgentExtractCommand(
	options: AgentSessionLookupOptions,
): Promise<number> {
	const pointer = await readSessionPointer(options.fs, options.session);
	const extracted = await extractSessionMemory(
		createLocalAgentfsClient(options.fs),
		pointer.paths,
	);
	if (options.json) {
		printJsonEnvelope(options.output, "agent.extract", {
			sessionId: pointer.sessionId,
			extracted,
		});
		return 0;
	}
	options.output.write(
		[
			`# TekMemo Agent Session ${pointer.sessionId}`,
			"",
			"## Summary",
			extracted.summary || "No summary written.",
			"",
			"## Durable Memory",
			extracted.durableMemory || "No durable memory written.",
			"",
			"## Follow-ups",
			extracted.followUps || "No follow-ups written.",
		].join("\n"),
	);
	return 0;
}

/**
 * Completes an agent session and optionally persists durable memory locally.
 *
 * @param options - Command options.
 * @returns CLI exit code.
 */
export async function runAgentCompleteCommand(
	options: AgentCompleteCommandOptions,
): Promise<number> {
	const pointer = await readSessionPointer(options.fs, options.session);
	const client = createLocalAgentfsClient(options.fs);
	const memory = createNodeFsMemoryStore({
		rootDir: options.fs.rootDir,
		missingFileBehavior: "empty",
		createRoot: true,
	});
	const session = createTekMemoAgentSession({
		client,
		memory,
		task: pointer.task,
		projectId: pointer.projectId ?? undefined,
		sessionId: pointer.sessionId,
	});
	const result = await session.complete({
		extractDurableMemory: options.extract ?? false,
		checkpointLabel: options.checkpointLabel,
	});

	if (options.json) {
		printJsonEnvelope(options.output, "agent.complete", {
			sessionId: pointer.sessionId,
			...result,
		});
		return 0;
	}

	options.output.success(
		`Completed TekMemo agent session ${pointer.sessionId}`,
	);
	if (result.durableMemoryWritten) {
		options.output.success("Persisted extracted durable memory to notes.");
	}
	options.output.write(
		`Summary: ${result.extracted.summary || "No summary written."}`,
	);
	return 0;
}

/**
 * Adapts the CLI filesystem to the AgentFS-like client contract.
 *
 * @param fs - CLI filesystem.
 * @returns AgentFS-like client.
 */
function createLocalAgentfsClient(fs: TekMemoFileSystem): AgentfsLikeClient {
	return {
		readText(path: string) {
			return fs.readText(toRelativeAgentPath(path));
		},
		writeText(path: string, content: string) {
			return fs.writeText(toRelativeAgentPath(path), content);
		},
		appendText(path: string, content: string) {
			return fs.appendText(toRelativeAgentPath(path), content);
		},
		exists(path: string) {
			return fs.exists(toRelativeAgentPath(path));
		},
		sync: {
			pull: async () => {},
			push: async () => {},
			checkpoint: async () => {},
		},
	};
}

/**
 * Converts AgentFS absolute-ish paths into project-relative CLI paths.
 *
 * @param path - AgentFS path.
 * @returns Project-relative path.
 */
function toRelativeAgentPath(path: string): string {
	return path.replace(/^\/+/, "");
}

/**
 * Reads a session pointer from `.tekmemo/tmp`.
 *
 * @param fs - CLI filesystem.
 * @param session - Session ID or latest.
 * @returns Session pointer.
 */
async function readSessionPointer(
	fs: TekMemoFileSystem,
	session: string | undefined,
): Promise<AgentSessionPointer> {
	const latest = await fs.readText(LATEST_AGENT_SESSION_PATH);
	const pointer = JSON.parse(latest) as AgentSessionPointer;
	if (!session || session === "latest" || session === pointer.sessionId) {
		return pointer;
	}
	throw new Error(
		`Unknown session "${session}". Only latest session ${pointer.sessionId} is tracked locally.`,
	);
}

/**
 * Formats agent-facing instructions for Codex, Claude Code, or any file-native agent.
 *
 * @param pointer - Session pointer.
 * @returns Markdown instructions.
 */
function formatAgentInstructions(pointer: AgentSessionPointer): string {
	return [
		"",
		"## Agent Instructions",
		`Session: ${pointer.sessionId}`,
		`Task: ${pointer.task}`,
		"",
		"Read before editing:",
		`- ${pointer.paths.context.core}`,
		`- ${pointer.paths.context.notes}`,
		"",
		"Update during work:",
		`- ${pointer.paths.working.plan}`,
		`- ${pointer.paths.working.commands}`,
		`- ${pointer.paths.working.errors}`,
		`- ${pointer.paths.working.changes}`,
		"",
		"Write before finishing:",
		`- ${pointer.paths.output.summary}`,
		`- ${pointer.paths.output.durableMemory}`,
		`- ${pointer.paths.output.followUps}`,
		"",
	].join("\n");
}

/**
 * Stored local pointer for the latest agent session.
 */
interface AgentSessionPointer {
	sessionId: string;
	projectId: string | null;
	root: string;
	task: string;
	createdAt: string;
	paths: ReturnType<typeof createTekMemoAgentSession>["paths"];
}
