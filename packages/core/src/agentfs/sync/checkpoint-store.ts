import type { AgentfsLikeClient } from "../client/agentfs-like";
import { AgentfsSyncError } from "../errors/agentfs-error";
import type { SyncOperationResult } from "./types";
import { validateCheckpointLabel } from "./validate-checkpoint-label";

/**
 * Creates a checkpoint for the AgentFS store.
 *
 * @param client - The AgentFS client to use.
 * @param label - Optional label for the checkpoint. Defaults to `"memory-update"`.
 * @returns A result object describing the operation outcome.
 * @throws {@link AgentfsSyncError} If the checkpoint operation fails.
 *
 * @public
 */
export async function checkpointStore(
	client: AgentfsLikeClient,
	label = "memory-update",
): Promise<SyncOperationResult> {
	const normalizedLabel = validateCheckpointLabel(label);

	if (!client.sync?.checkpoint) {
		return { operation: "checkpoint", skipped: true, label: normalizedLabel };
	}

	try {
		await client.sync.checkpoint(normalizedLabel);
		return { operation: "checkpoint", skipped: false, label: normalizedLabel };
	} catch (error) {
		throw new AgentfsSyncError(
			"AgentFS checkpoint failed.",
			{ label: normalizedLabel },
			error,
		);
	}
}
