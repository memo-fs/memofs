/**
 * @file Agent session workspace helpers for AgentFS-backed MemoFS workflows.
 *
 * @packageDocumentation
 */

import { NOTES_MEMORY_PATH } from "../../core/constants/memory-paths";
import { MemoryWriteBlockedError } from "../../core/errors/errors";
import {
	appendMemoryEvent,
	createMemoryEvent,
} from "../../core/events/memory-events";
import type { MemoryStore } from "../../core/types/memory-store";
import type { SessionOutcome } from "../../memofs/types";
import { assertWriteAllowed } from "../../security/secret-blocklist";
import { syncAfterSession } from "../sync/sync-after-session";
import { syncBeforeSession } from "../sync/sync-before-session";
import { validateSafeSegment } from "../utils/validate-safe-segment";
import {
	createDefaultSessionId,
	deleteAgentfsFiles,
	formatDurableMemoryNote,
} from "./helpers";
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
	MemoFSAgentSessionPaths,
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
 * Working scratchpad paths that are cleaned on `success` and
 * `failure + ephemeral: true`.
 */
const WORKING_FILES: readonly (keyof MemoFSAgentSessionPaths["working"])[] = [
	"plan",
	"commands",
	"errors",
	"changes",
	"notes",
];

/**
 * Output audit paths that are preserved on `success` but cleaned on
 * `failure + ephemeral: true`.
 */
const OUTPUT_FILES: readonly (keyof MemoFSAgentSessionPaths["output"])[] = [
	"summary",
	"durableMemory",
	"followUps",
];

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
	const workingPaths = WORKING_FILES.map((key) => paths.working[key]);
	const outputPaths = OUTPUT_FILES.map((key) => paths.output[key]);

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
			const outcome: SessionOutcome = completeOptions.outcome ?? "success";
			const extracted = await extractSessionMemory(options.client, paths);

			const wantDurable =
				outcome === "success" &&
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
				} catch (error) {
					if (!(error instanceof MemoryWriteBlockedError)) throw error;
				}
			}

			const skipSync = outcome === "aborted";
			const sync = skipSync
				? {
						checkpoint: undefined,
						push: { operation: "push", skipped: true } as const,
					}
				: await syncAfterSession(options.client, {
						checkpointBeforePush: !(completeOptions.skipCheckpoint ?? false),
						checkpointLabel:
							completeOptions.checkpointLabel ?? `agent-session-${sessionId}`,
						requireSync: completeOptions.requireSync,
					});

			let workingCleaned = false;
			let outputCleaned = false;
			let failureEventWritten = false;

			if (outcome === "success") {
				workingCleaned = await deleteAgentfsFiles(options.client, workingPaths);
			}

			if (outcome === "failure") {
				failureEventWritten = await writeSessionFailedEvent(
					options.memory,
					sessionId,
					paths.root,
					options.actorId,
					completeOptions.reason,
					options.projectId,
				);
				if (completeOptions.ephemeral) {
					workingCleaned = await deleteAgentfsFiles(
						options.client,
						workingPaths,
					);
					outputCleaned = await deleteAgentfsFiles(options.client, outputPaths);
				}
			}

			return {
				extracted,
				sync,
				durableMemoryWritten,
				outcome,
				workingCleaned,
				outputCleaned,
				preserved: outcome === "aborted",
				failureEventWritten,
			};
		},
	};
}

/**
 * Appends a `session.failed` event to `memory-events.jsonl` for telemetry
 * on `outcome: "failure"`. Best-effort: failures to write the event are
 * swallowed and surface as `failureEventWritten: false` on the result.
 */
async function writeSessionFailedEvent(
	memory: MemoryStore,
	sessionId: string,
	sourcePath: string,
	actorId: string | undefined,
	reason: string | undefined,
	projectId: string | undefined,
): Promise<boolean> {
	try {
		await appendMemoryEvent(
			memory,
			createMemoryEvent({
				type: "session.failed",
				sourcePath,
				actor: actorId
					? { type: "agent", id: actorId }
					: { type: "system", id: "memofs/agent-session" },
				summary: reason
					? `Agent session ${sessionId} failed: ${reason}`
					: `Agent session ${sessionId} failed`,
				...(projectId === undefined ? {} : { projectId }),
				metadata: {
					sessionId,
					...(reason === undefined ? {} : { reason }),
				},
			}),
		);
		return true;
	} catch {
		return false;
	}
}
