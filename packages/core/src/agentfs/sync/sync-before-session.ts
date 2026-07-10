import type { AgentfsLikeClient } from "../client/agentfs-like";
import { AgentfsSyncError } from "../errors/agentfs-error";
import type { SyncBeforeSessionOptions, SyncOperationResult } from "./types";

/**
 * Performs pre-session synchronization by pulling remote changes.
 *
 * @param client - The AgentFS client to use for sync.
 * @param options - Optional settings for the sync operation.
 * @returns A result object describing the operation outcome.
 * @throws {@link AgentfsSyncError} If sync is required but not available, or if the pull fails.
 *
 * @public
 */
export async function syncBeforeSession(
	client: AgentfsLikeClient,
	options: SyncBeforeSessionOptions = {},
): Promise<SyncOperationResult> {
	if (!client.sync?.pull) {
		if (options.requireSync) {
			throw new AgentfsSyncError(
				"AgentFS client does not provide sync.pull().",
			);
		}
		return { operation: "pull", skipped: true };
	}

	try {
		await client.sync.pull();
		return { operation: "pull", skipped: false };
	} catch (error) {
		throw new AgentfsSyncError("AgentFS pull sync failed.", undefined, error);
	}
}
