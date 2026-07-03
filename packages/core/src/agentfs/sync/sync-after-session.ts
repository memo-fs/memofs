import type { AgentfsLikeClient } from "../client/agentfs-like";
import { AgentfsSyncError } from "../errors/agentfs-error";
import { checkpointStore } from "./checkpoint-store";
import type { SyncAfterSessionOptions, SyncOperationResult } from "./types";

/**
 * Result of a post-session synchronization operation.
 *
 * @public
 */
export interface SyncAfterSessionResult {
	/**
	 * Optional checkpoint result, if a checkpoint was created before push.
	 */
	checkpoint?: SyncOperationResult | undefined;

	/**
	 * The result of the push operation.
	 */
	push: SyncOperationResult;
}

/**
 * Performs post-session synchronization by optionally checkpointing and then pushing changes.
 *
 * @param client - The AgentFS client to use for sync.
 * @param labelOrOptions - Either a checkpoint label string or full options.
 * @returns A result object containing checkpoint and push results.
 * @throws {@link AgentfsSyncError} If sync is required but not available, or if the push fails.
 *
 * @public
 */
export async function syncAfterSession(
	client: AgentfsLikeClient,
	labelOrOptions: string | SyncAfterSessionOptions = "memory-update",
): Promise<SyncAfterSessionResult> {
	const options: SyncAfterSessionOptions =
		typeof labelOrOptions === "string"
			? { checkpointLabel: labelOrOptions }
			: labelOrOptions;
	const checkpointBeforePush = options.checkpointBeforePush ?? true;

	const checkpoint = checkpointBeforePush
		? await checkpointStore(client, options.checkpointLabel ?? "memory-update")
		: undefined;

	if (!client.sync?.push) {
		if (options.requireSync) {
			throw new AgentfsSyncError(
				"AgentFS client does not provide sync.push().",
			);
		}
		return { checkpoint, push: { operation: "push", skipped: true } };
	}

	try {
		await client.sync.push();
		return { checkpoint, push: { operation: "push", skipped: false } };
	} catch (error) {
		throw new AgentfsSyncError("AgentFS push sync failed.", undefined, error);
	}
}
