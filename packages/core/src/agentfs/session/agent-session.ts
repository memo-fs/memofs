/**
 * @file Agent session workspace helpers for AgentFS-backed TekMemo workflows.
 *
 * @packageDocumentation
 */

import { NOTES_MEMORY_PATH } from "../../index";
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
	CompleteTekMemoAgentSessionOptions,
	CompleteTekMemoAgentSessionResult,
	CreateTekMemoAgentSessionOptions,
	ExtractedSessionMemory,
	PrepareTekMemoAgentSessionResult,
	TekMemoAgentSession,
} from "./types";

export {
	createAgentWorkspaceFiles,
	createAgentWorkspacePaths,
	extractSessionMemory,
} from "./scaffolding";
export type {
	CompleteTekMemoAgentSessionOptions,
	CompleteTekMemoAgentSessionResult,
	CreateTekMemoAgentSessionOptions,
	ExtractedSessionMemory,
	PrepareTekMemoAgentSessionResult,
	TekMemoAgentSession,
	TekMemoAgentSessionPaths,
} from "./types";

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
