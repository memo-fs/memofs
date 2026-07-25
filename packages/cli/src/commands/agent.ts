/**
 * CLI command handlers for local AgentFS sessions.
 *
 * @module agent
 */

import {
	appendFile,
	mkdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import {
	type AgentfsLikeClient,
	createMemoFsAgentSession,
	extractSessionMemory,
	type MemoFS,
} from "@memofs/core";
import { getRootDir, readText, writeText } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { MEMOFS_CLI_PATHS } from "../protocol/constants";

const LATEST_AGENT_SESSION_PATH = `${MEMOFS_CLI_PATHS.tmpDir}/agent-sessions/latest.json`;

/** Resolves a POSIX-like agent remote path inside the workspace root, preventing traversal. */
function resolveAgentPath(rootDir: string, remotePath: string): string {
	if (remotePath.includes("\0")) {
		throw new Error("Agent session path contains invalid characters.");
	}
	// const relative = remotePath.replace(/^\/+/, "");
	const relative = remotePath.replace(/^[/\\]+/, "");
	const resolved = resolve(rootDir, relative);
	const normalizedRoot = rootDir.endsWith(sep) ? rootDir : rootDir + sep;
	if (resolved !== rootDir && !resolved.startsWith(normalizedRoot)) {
		throw new Error("Agent session path escaped the workspace root.");
	}
	return resolved;
}

/**
 * Shared options for local AgentFS session commands.
 */
interface AgentCommandBaseOptions {
	/**
	 * The MemoFS client instance.
	 */
	memo: MemoFS;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
}

/**
 * Options for starting an agent session.
 */
export interface AgentStartCommandOptions extends AgentCommandBaseOptions {
	/**
	 * The core task description the agent is assigned to perform.
	 */
	task: string;
	/**
	 * Optional identifier of the project context.
	 */
	projectId?: string | undefined;
	/**
	 * Optional actor identifier performing the operation.
	 */
	actorId?: string | undefined;
	/**
	 * Optional custom session identifier. If omitted, a UUID is generated.
	 */
	sessionId?: string | undefined;
}

/**
 * Options for session lookup commands.
 */
export interface AgentSessionLookupOptions extends AgentCommandBaseOptions {
	/**
	 * Optional session identifier. If omitted, resolves to the latest session.
	 */
	session?: string | undefined;
}

/**
 * Options for completing an agent session.
 */
export interface AgentCompleteCommandOptions extends AgentSessionLookupOptions {
	/**
	 * If true, extracts memory from the session and appends it to notes.
	 */
	extract?: boolean | undefined;
	/**
	 * Optional label to tag the final repository checkpoint with.
	 */
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
	const client = createLocalAgentfsClient(options.memo);
	const session = createMemoFsAgentSession({
		client,
		memory: options.memo.store,
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
	await writeText(
		options.memo.store,
		LATEST_AGENT_SESSION_PATH,
		`${JSON.stringify(pointer, null, 2)}\n`,
	);

	if (options.json) {
		printJsonEnvelope(options.output, "agent.start", pointer);
		return 0;
	}

	options.output.success(`Started MemoFS agent session ${session.sessionId}`);
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
	const pointer = await readSessionPointer(options.memo, options.session);
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
	const pointer = await readSessionPointer(options.memo, options.session);
	const extracted = await extractSessionMemory(
		createLocalAgentfsClient(options.memo),
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
			`# MemoFS Agent Session ${pointer.sessionId}`,
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
	const pointer = await readSessionPointer(options.memo, options.session);
	const client = createLocalAgentfsClient(options.memo);
	const session = createMemoFsAgentSession({
		client,
		memory: options.memo.store,
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

	options.output.success(`Completed MemoFS agent session ${pointer.sessionId}`);
	if (result.durableMemoryWritten) {
		options.output.success("Persisted extracted durable memory to notes.");
	}
	options.output.write(
		`Summary: ${result.extracted.summary || "No summary written."}`,
	);
	return 0;
}

/**
 * Uses Node's filesystem directly (like the core local-strategy client)
 * so agent sessions live at `<rootDir>/agent-sessions/...` (gitignored at
 * project root) and do NOT go through the MemoryStore, which only allows
 * `.memofs/` paths and would throw "Memory path must be inside the canonical
 * .memofs directory."
 *
 * @param memo - MemoFS client instance.
 * @returns AgentFS-like client.
 */
function createLocalAgentfsClient(memo: MemoFS): AgentfsLikeClient {
	const rootDir = getRootDir(memo.store);
	return {
		async readText(remotePath: string) {
			const target = resolveAgentPath(rootDir, remotePath);
			return readFile(target, "utf8");
		},
		async writeText(remotePath: string, content: string) {
			const target = resolveAgentPath(rootDir, remotePath);
			await mkdir(dirname(target), { recursive: true });
			await writeFile(target, content, "utf8");
		},
		async appendText(remotePath: string, content: string) {
			const target = resolveAgentPath(rootDir, remotePath);
			await mkdir(dirname(target), { recursive: true });
			await appendFile(target, content, "utf8");
		},
		async exists(remotePath: string) {
			const target = resolveAgentPath(rootDir, remotePath);
			try {
				await stat(target);
				return true;
			} catch {
				return false;
			}
		},
		async deleteText(remotePath: string) {
			const target = resolveAgentPath(rootDir, remotePath);
			await rm(target, { force: true });
		},
		sync: {
			pull: async () => {},
			push: async () => {},
			checkpoint: async () => {},
		},
	};
}

/**
 * Reads a session pointer from `.memofs/tmp`.
 *
 * @param memo - MemoFS client instance.
 * @param session - Session ID or latest.
 * @returns Session pointer.
 */
async function readSessionPointer(
	memo: MemoFS,
	session: string | undefined,
): Promise<AgentSessionPointer> {
	const latest = await readText(memo.store, LATEST_AGENT_SESSION_PATH);
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
	paths: ReturnType<typeof createMemoFsAgentSession>["paths"];
}
