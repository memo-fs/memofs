/**
 * @file Agent session workspace helpers for AgentFS-backed MemoFS workflows.
 *
 * @packageDocumentation
 */

import { NOTES_MEMORY_PATH } from "../../core/constants/memory-paths";
import { assertWriteAllowed } from "../../security/secret-blocklist";
import { syncAfterSession } from "../sync/sync-after-session";
import { syncBeforeSession } from "../sync/sync-before-session";
import { validateSafeSegment } from "../utils/validate-safe-segment";
import { createDefaultSessionId, formatDurableMemoryNote } from "./helpers";
import {
	createAgentWorkspaceFiles,
	createAgentWorkspacePaths,
	extractSessionMemory,
} from "./scaffolding";
import type {
	CompleteMemoFSAgentSessionOptions,
	CompleteMemoFSAgentSessionResult,
	CreateMemoFSAgentSessionOptions,
	ExtractedSessionMemory,
	MemoFSAgentSession,
	PrepareMemoFSAgentSessionResult,
} from "./types";

export {
	createAgentWorkspaceFiles,
	createAgentWorkspacePaths,
	extractSessionMemory,
} from "./scaffolding";
export type {
	CompleteMemoFSAgentSessionOptions,
	CompleteMemoFSAgentSessionResult,
	CreateMemoFSAgentSessionOptions,
	ExtractedSessionMemory,
	MemoFSAgentSession,
	MemoFSAgentSessionPaths,
	PrepareMemoFSAgentSessionResult,
} from "./types";

/**
 * Creates a high-level MemoFS agent session backed by AgentFS files.
 *
 * @param options - Session options.
 * @returns Agent session controller.
 *
 * @public
 */
export function createMemoFsAgentSession(
	options: CreateMemoFSAgentSessionOptions,
): MemoFSAgentSession {
	const sessionId = validateSafeSegment(
		options.sessionId ?? createDefaultSessionId(),
		"sessionId",
	);
	const paths = createAgentWorkspacePaths(sessionId, options.rootPrefix);

	return {
		sessionId,
		paths,
		prepare: async (): Promise<PrepareMemoFSAgentSessionResult> => {
			const sync = await syncBeforeSession(options.client);
			await createAgentWorkspaceFiles(options, paths, sessionId);
			return { sync, paths };
		},
		extract: async (): Promise<ExtractedSessionMemory> =>
			extractSessionMemory(options.client, paths),
		complete: async (
			completeOptions: CompleteMemoFSAgentSessionOptions = {},
		): Promise<CompleteMemoFSAgentSessionResult> => {
			const extracted = await extractSessionMemory(options.client, paths);
			const wantDurable =
				(completeOptions.extractDurableMemory ?? false) &&
				extracted.durableMemory.trim().length > 0;

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
					// secret in the error path.
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
