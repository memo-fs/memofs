/**
 * @file Type definitions for AgentFS sync operations.
 *
 * @internal
 */

/**
 * Result of a single sync operation (pull, push, or checkpoint).
 *
 * @public
 */
export interface SyncOperationResult {
	/**
	 * The type of sync operation performed.
	 */
	operation: "pull" | "push" | "checkpoint";

	/**
	 * Whether the operation was skipped (e.g., client did not provide the required method).
	 */
	skipped: boolean;

	/**
	 * Optional label associated with the operation (e.g., checkpoint label).
	 */
	label?: string | undefined;
}

/**
 * Options for the pre-session sync operation.
 *
 * @public
 */
export interface SyncBeforeSessionOptions {
	/**
	 * If `true`, throws an error when the client does not provide the required sync method.
	 */
	requireSync?: boolean | undefined;
}

/**
 * Options for the post-session sync operation.
 *
 * @public
 */
export interface SyncAfterSessionOptions {
	/**
	 * Label to use for the checkpoint. Defaults to `"memory-update"`.
	 */
	checkpointLabel?: string | undefined;

	/**
	 * Whether to create a checkpoint before pushing. Defaults to `true`.
	 */
	checkpointBeforePush?: boolean | undefined;

	/**
	 * If `true`, throws an error when the client does not provide the required sync method.
	 */
	requireSync?: boolean | undefined;
}
