import type { MemoryStore } from "../../index";
import {
	CORE_MEMORY_PATH,
	MANIFEST_PATH,
	NOTES_MEMORY_PATH,
} from "../../index";
import type { AgentfsLikeClient } from "../client/agentfs-like";
import { normalizeRootPrefix } from "../utils/normalize-root-prefix";
import { validateSafeSegment } from "../utils/validate-safe-segment";
import {
	readAgentfsFile,
	readMemoryFile,
	stripScaffoldHeading,
	writeWorkspaceScaffold,
} from "./helpers";
import type {
	CreateMemoFSAgentSessionOptions,
	ExtractedSessionMemory,
	MemoFSAgentSessionPaths,
} from "./types";

export function createAgentWorkspacePaths(
	sessionId: string,
	rootPrefix?: string,
): MemoFSAgentSessionPaths {
	const safeSessionId = validateSafeSegment(sessionId, "sessionId");
	const root = `${normalizeRootPrefix(rootPrefix ?? "/agent-sessions")}/${safeSessionId}`;

	return {
		root,
		meta: `${root}/meta.json`,
		context: {
			manifest: `${root}/context/manifest.json`,
			core: `${root}/context/core.md`,
			notes: `${root}/context/notes.md`,
		},
		working: {
			plan: `${root}/working/plan.md`,
			commands: `${root}/working/commands.md`,
			errors: `${root}/working/errors.md`,
			changes: `${root}/working/changes.md`,
			notes: `${root}/working/notes.md`,
		},
		output: {
			summary: `${root}/output/summary.md`,
			durableMemory: `${root}/output/durable-memory.md`,
			followUps: `${root}/output/follow-ups.md`,
		},
	};
}

export async function createAgentWorkspaceFiles(
	options: CreateMemoFSAgentSessionOptions,
	paths: MemoFSAgentSessionPaths,
	sessionId: string,
): Promise<void> {
	const manifest = await readMemoryFile(options.memory, MANIFEST_PATH);
	const core = await readMemoryFile(options.memory, CORE_MEMORY_PATH);
	const notes = await readMemoryFile(options.memory, NOTES_MEMORY_PATH);
	const now = new Date().toISOString();
	const metadata = {
		sessionId,
		projectId: options.projectId ?? null,
		actorId: options.actorId ?? null,
		task: options.task,
		createdAt: now,
	};

	await options.client.writeText(
		paths.meta,
		`${JSON.stringify(metadata, null, 2)}\n`,
	);
	await options.client.writeText(paths.context.manifest, manifest);
	await options.client.writeText(paths.context.core, core);
	await options.client.writeText(paths.context.notes, notes);

	await writeWorkspaceScaffold(
		options.client,
		paths.working.plan,
		[
			"# Plan",
			"",
			`Task: ${options.task}`,
			"",
			"- [ ] Capture the intended approach.",
			"- [ ] Update this as the session evolves.",
			"",
		].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
	await writeWorkspaceScaffold(
		options.client,
		paths.working.commands,
		[
			"# Commands",
			"",
			"Record important commands, outputs, and validation notes here.",
			"",
		].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
	await writeWorkspaceScaffold(
		options.client,
		paths.working.errors,
		["# Errors", "", "Record failures, causes, and fixes here.", ""].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
	await writeWorkspaceScaffold(
		options.client,
		paths.working.changes,
		[
			"# Changes",
			"",
			"Record notable file changes and rationale here.",
			"",
		].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
	await writeWorkspaceScaffold(
		options.client,
		paths.working.notes,
		[
			"# Notes",
			"",
			"Record transient observations that may or may not become durable memory.",
			"",
		].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
	await writeWorkspaceScaffold(
		options.client,
		paths.output.summary,
		["# Summary", "", "Write the end-of-session summary here.", ""].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
	await writeWorkspaceScaffold(
		options.client,
		paths.output.durableMemory,
		[
			"# Durable Memory",
			"",
			"Write only durable facts, decisions, preferences, and reusable patterns here.",
			"",
		].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
	await writeWorkspaceScaffold(
		options.client,
		paths.output.followUps,
		["# Follow-ups", "", "Write follow-up tasks here.", ""].join("\n"),
		options.overwriteWorkspaceFiles ?? false,
	);
}

export async function extractSessionMemory(
	client: AgentfsLikeClient,
	paths: MemoFSAgentSessionPaths,
): Promise<ExtractedSessionMemory> {
	const [summary, durableMemory, followUps, errors, changes] =
		await Promise.all([
			readAgentfsFile(client, paths.output.summary),
			readAgentfsFile(client, paths.output.durableMemory),
			readAgentfsFile(client, paths.output.followUps),
			readAgentfsFile(client, paths.working.errors),
			readAgentfsFile(client, paths.working.changes),
		]);

	return {
		summary: stripScaffoldHeading(summary, "Summary"),
		durableMemory: stripScaffoldHeading(durableMemory, "Durable Memory"),
		followUps: stripScaffoldHeading(followUps, "Follow-ups"),
		errors: stripScaffoldHeading(errors, "Errors"),
		changes: stripScaffoldHeading(changes, "Changes"),
	};
}
