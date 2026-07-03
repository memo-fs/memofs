/**
 * @file Agent session workspace helpers for AgentFS-backed TekMemo workflows.
 *
 * @remarks
 * These helpers turn AgentFS from a raw memory-store backend into a safe
 * filesystem-facing session surface where agents can read context, write plans,
 * capture command output, and return curated durable memory to TekMemo.
 *
 * @packageDocumentation
 */

import { randomUUID } from "node:crypto";
import type { MemoryStore } from "@tekmemo/core";
import {
	CORE_MEMORY_PATH,
	MANIFEST_PATH,
	type MemoryPath,
	NOTES_MEMORY_PATH,
} from "@tekmemo/core";
// Direct source import (not the package barrel) to avoid the index → agentfs →
// agent-session → index cycle: assertWriteAllowed is exported from the barrel
// *after* the agentfs block, so a barrel import would be `undefined` at module
// evaluation time.
import { assertWriteAllowed } from "../../security/secret-blocklist";
import type { AgentfsLikeClient } from "../client/agentfs-like";
import { AgentfsClientError } from "../errors/agentfs-error";
import type { SyncAfterSessionResult } from "../sync/sync-after-session";
import { syncAfterSession } from "../sync/sync-after-session";
import { syncBeforeSession } from "../sync/sync-before-session";
import type { SyncOperationResult } from "../sync/types";
import { isNotFoundError } from "../utils/is-not-found-error";
import { normalizeRootPrefix } from "../utils/normalize-root-prefix";
import { validateSafeSegment } from "../utils/validate-safe-segment";

/**
 * File paths created for an AgentFS-backed TekMemo agent session.
 *
 * @public
 */
export interface TekMemoAgentSessionPaths {
	/**
	 * Root directory for this session workspace.
	 */
	readonly root: string;

	/**
	 * JSON metadata file describing the session.
	 */
	readonly meta: string;

	/**
	 * Read-only-ish memory context files prepared before the agent runs.
	 */
	readonly context: {
		readonly manifest: string;
		readonly core: string;
		readonly notes: string;
	};

	/**
	 * Working files the agent can update during the session.
	 */
	readonly working: {
		readonly plan: string;
		readonly commands: string;
		readonly errors: string;
		readonly changes: string;
		readonly notes: string;
	};

	/**
	 * Output files used for end-of-session summaries and durable extraction.
	 */
	readonly output: {
		readonly summary: string;
		readonly durableMemory: string;
		readonly followUps: string;
	};
}

/**
 * Options for preparing a TekMemo agent session workspace.
 *
 * @public
 */
export interface CreateTekMemoAgentSessionOptions {
	/**
	 * AgentFS-compatible client that stores session files.
	 */
	readonly client: AgentfsLikeClient;

	/**
	 * TekMemo memory store that provides durable context and receives extracted memory.
	 */
	readonly memory: MemoryStore;

	/**
	 * Human-readable task or brief for the session.
	 */
	readonly task: string;

	/**
	 * Project identifier written to metadata and used as a safe session label.
	 */
	readonly projectId?: string | undefined;

	/**
	 * Explicit session identifier. Defaults to a generated safe segment.
	 */
	readonly sessionId?: string | undefined;

	/**
	 * Agent or actor identifier written to metadata.
	 */
	readonly actorId?: string | undefined;

	/**
	 * Root prefix for session workspaces. Defaults to `/agent-sessions`.
	 */
	readonly rootPrefix?: string | undefined;

	/**
	 * If true, scaffolded working/output files are overwritten during prepare.
	 */
	readonly overwriteWorkspaceFiles?: boolean | undefined;
}

/**
 * Result of preparing a TekMemo AgentFS session workspace.
 *
 * @public
 */
export interface PrepareTekMemoAgentSessionResult {
	/**
	 * Pre-session sync result.
	 */
	readonly sync: SyncOperationResult;

	/**
	 * Paths written or confirmed during preparation.
	 */
	readonly paths: TekMemoAgentSessionPaths;
}

/**
 * Curated text collected from an AgentFS-backed session workspace.
 *
 * @public
 */
export interface ExtractedSessionMemory {
	/**
	 * End-of-session summary intended for humans and future agents.
	 */
	readonly summary: string;

	/**
	 * Durable facts, decisions, and patterns that should be considered for TekMemo memory.
	 */
	readonly durableMemory: string;

	/**
	 * Follow-up tasks captured by the agent.
	 */
	readonly followUps: string;

	/**
	 * Error notes captured during the session.
	 */
	readonly errors: string;

	/**
	 * Change notes captured during the session.
	 */
	readonly changes: string;
}

/**
 * Options for completing a TekMemo AgentFS session.
 *
 * @public
 */
export interface CompleteTekMemoAgentSessionOptions {
	/**
	 * Checkpoint label to use before pushing AgentFS changes.
	 */
	readonly checkpointLabel?: string | undefined;

	/**
	 * If true, append extracted durable memory to TekMemo notes.
	 */
	readonly extractDurableMemory?: boolean | undefined;

	/**
	 * If true, skip the checkpoint before push.
	 */
	readonly skipCheckpoint?: boolean | undefined;

	/**
	 * If true, require AgentFS sync hooks to exist.
	 */
	readonly requireSync?: boolean | undefined;
}

/**
 * Result of completing a TekMemo AgentFS session.
 *
 * @public
 */
export interface CompleteTekMemoAgentSessionResult {
	/**
	 * Extracted text collected from session output files.
	 */
	readonly extracted: ExtractedSessionMemory;

	/**
	 * Post-session AgentFS sync result.
	 */
	readonly sync: SyncAfterSessionResult;

	/**
	 * Whether durable memory was appended to TekMemo notes.
	 */
	readonly durableMemoryWritten: boolean;
}

/**
 * High-level AgentFS-backed session controller.
 *
 * @public
 */
export interface TekMemoAgentSession {
	/**
	 * Safe session identifier.
	 */
	readonly sessionId: string;

	/**
	 * Workspace paths for this session.
	 */
	readonly paths: TekMemoAgentSessionPaths;

	/**
	 * Pulls AgentFS changes and writes context/scaffold files.
	 */
	prepare(): Promise<PrepareTekMemoAgentSessionResult>;

	/**
	 * Reads output files without mutating durable TekMemo memory.
	 */
	extract(): Promise<ExtractedSessionMemory>;

	/**
	 * Extracts output files, optionally appends durable memory, checkpoints, and pushes.
	 *
	 * @param options - Completion behavior.
	 * @returns Completion result.
	 */
	complete(
		options?: CompleteTekMemoAgentSessionOptions,
	): Promise<CompleteTekMemoAgentSessionResult>;
}

/**
 * Builds the canonical AgentFS file layout for a TekMemo agent session.
 *
 * @param sessionId - Safe session identifier.
 * @param rootPrefix - Optional AgentFS root prefix.
 * @returns Workspace paths for the session.
 *
 * @public
 */
export function createAgentWorkspacePaths(
	sessionId: string,
	rootPrefix?: string,
): TekMemoAgentSessionPaths {
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

/**
 * Writes TekMemo context and scaffold files into an AgentFS session workspace.
 *
 * @param options - Session creation options.
 * @param paths - Workspace paths to write.
 * @param sessionId - Safe session identifier.
 * @returns A promise that resolves when files have been prepared.
 *
 * @public
 */
export async function createAgentWorkspaceFiles(
	options: CreateTekMemoAgentSessionOptions,
	paths: TekMemoAgentSessionPaths,
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

/**
 * Extracts curated memory artifacts from an AgentFS session workspace.
 *
 * @param client - AgentFS client to read from.
 * @param paths - Workspace paths to extract.
 * @returns Extracted session memory text.
 *
 * @public
 */
export async function extractSessionMemory(
	client: AgentfsLikeClient,
	paths: TekMemoAgentSessionPaths,
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

/**
 * Creates a high-level TekMemo agent session backed by AgentFS files.
 *
 * @param options - Session options.
 * @returns Agent session controller.
 *
 * @public
 */
export function createTekMemoAgentSession(
	options: CreateTekMemoAgentSessionOptions,
): TekMemoAgentSession {
	const sessionId = validateSafeSegment(
		options.sessionId ?? createDefaultSessionId(),
		"sessionId",
	);
	const paths = createAgentWorkspacePaths(sessionId, options.rootPrefix);

	return {
		sessionId,
		paths,
		prepare: async (): Promise<PrepareTekMemoAgentSessionResult> => {
			const sync = await syncBeforeSession(options.client);
			await createAgentWorkspaceFiles(options, paths, sessionId);
			return { sync, paths };
		},
		extract: async (): Promise<ExtractedSessionMemory> =>
			extractSessionMemory(options.client, paths),
		complete: async (
			completeOptions: CompleteTekMemoAgentSessionOptions = {},
		): Promise<CompleteTekMemoAgentSessionResult> => {
			const extracted = await extractSessionMemory(options.client, paths);
			const wantDurable =
				(completeOptions.extractDurableMemory ?? false) &&
				extracted.durableMemory.trim().length > 0;

			// Write intelligence gate (ADR 0009 Component 6): agent-extracted
			// durable memory is the highest-risk path for a leaked secret (the
			// agent scraped a .env and wrote it to "durable memory"). It lands in
			// syncable notes.md via a raw store append, bypassing writeMemory — so
			// the gate runs here too. If blocked, the extraction is dropped (not
			// persisted) and the result reports durableMemoryWritten: false.
			let durableMemoryWritten = false;
			if (wantDurable) {
				try {
					assertWriteAllowed([extracted.durableMemory], NOTES_MEMORY_PATH);
					await options.memory.append(
						NOTES_MEMORY_PATH,
						formatDurableMemoryNote(sessionId, extracted.durableMemory),
					);
					durableMemoryWritten = true;
				} catch {
					// Secret material detected — drop the write, do not surface the
					// secret in the error path. The session still completes; the
					// tainted durable memory simply isn't persisted.
				}
			}

			const sync = await syncAfterSession(options.client, {
				checkpointBeforePush: !(completeOptions.skipCheckpoint ?? false),
				checkpointLabel:
					completeOptions.checkpointLabel ?? `agent-session-${sessionId}`,
				requireSync: completeOptions.requireSync,
			});

			return {
				extracted,
				sync,
				durableMemoryWritten,
			};
		},
	};
}

/**
 * Creates a generated safe session identifier.
 *
 * @returns Safe single-segment session identifier.
 */
function createDefaultSessionId(): string {
	const timestamp = new Date()
		.toISOString()
		.replaceAll(":", "-")
		.replaceAll(".", "-");
	return `session_${timestamp}_${randomUUID().slice(0, 8)}`;
}

/**
 * Reads a canonical TekMemo memory file, returning an empty string when absent.
 *
 * @param memory - Memory store to read from.
 * @param path - Canonical memory path.
 * @returns File content or an empty string.
 */
async function readMemoryFile(
	memory: MemoryStore,
	path: MemoryPath,
): Promise<string> {
	try {
		return await memory.read(path);
	} catch (error) {
		if (isNotFoundError(error)) {
			return "";
		}
		throw error;
	}
}

/**
 * Reads an AgentFS workspace file, returning an empty string when absent.
 *
 * @param client - AgentFS client.
 * @param path - AgentFS file path.
 * @returns File content or an empty string.
 */
async function readAgentfsFile(
	client: AgentfsLikeClient,
	path: string,
): Promise<string> {
	try {
		const content = await client.readText(path);
		if (typeof content !== "string") {
			throw new AgentfsClientError(
				"AgentFS readText returned non-string content.",
				{
					path,
					valueType: typeof content,
				},
			);
		}
		return content;
	} catch (error) {
		if (isNotFoundError(error)) {
			return "";
		}
		throw error;
	}
}

/**
 * Writes a scaffold file unless it already exists and overwrite is disabled.
 *
 * @param client - AgentFS client.
 * @param path - AgentFS file path.
 * @param content - Scaffold content.
 * @param overwrite - Whether to overwrite existing content.
 */
async function writeWorkspaceScaffold(
	client: AgentfsLikeClient,
	path: string,
	content: string,
	overwrite: boolean,
): Promise<void> {
	if (!overwrite && (await agentfsPathExists(client, path))) {
		return;
	}
	await client.writeText(path, content);
}

/**
 * Checks whether an AgentFS path exists using native exists or read fallback.
 *
 * @param client - AgentFS client.
 * @param path - AgentFS file path.
 * @returns Whether the file exists.
 */
async function agentfsPathExists(
	client: AgentfsLikeClient,
	path: string,
): Promise<boolean> {
	if (client.exists) {
		return client.exists(path);
	}

	try {
		await client.readText(path);
		return true;
	} catch (error) {
		if (isNotFoundError(error)) {
			return false;
		}
		throw error;
	}
}

/**
 * Removes untouched scaffold headings from extracted files.
 *
 * @param content - Raw file content.
 * @param heading - Markdown heading to remove.
 * @returns Trimmed content with placeholder-only text removed.
 */
function stripScaffoldHeading(content: string, heading: string): string {
	const trimmed = content.trim();
	const headingText = `# ${heading}`;
	if (!trimmed.startsWith(headingText)) {
		return trimmed;
	}

	const body = trimmed.slice(headingText.length).trim();
	return isDefaultScaffoldBody(heading, body) ? "" : body;
}

/**
 * Checks whether extracted content is only untouched scaffold placeholder text.
 *
 * @param heading - Markdown heading associated with the scaffold.
 * @param body - Extracted body text after heading removal.
 * @returns Whether the body should be treated as empty.
 */
function isDefaultScaffoldBody(heading: string, body: string): boolean {
	const placeholders: Record<string, string> = {
		Changes: "Record notable file changes and rationale here.",
		"Durable Memory":
			"Write only durable facts, decisions, preferences, and reusable patterns here.",
		Errors: "Record failures, causes, and fixes here.",
		"Follow-ups": "Write follow-up tasks here.",
		Summary: "Write the end-of-session summary here.",
	};

	return body === (placeholders[heading] ?? "");
}

/**
 * Formats extracted durable memory as an append-only notes entry.
 *
 * @param sessionId - Source session identifier.
 * @param durableMemory - Durable memory text to append.
 * @returns Markdown note content.
 */
function formatDurableMemoryNote(
	sessionId: string,
	durableMemory: string,
): string {
	return [
		"",
		"",
		`## Agent session ${sessionId}`,
		"",
		durableMemory.trim(),
		"",
	].join("\n");
}
