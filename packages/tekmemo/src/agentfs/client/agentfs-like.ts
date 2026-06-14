/**
 * Represents optional sync capabilities for an AgentFS-like client.
 * Clients may implement `pull`, `push`, and/or `checkpoint` operations.
 *
 * @public
 */
export interface AgentfsLikeSync {
	/**
	 * Pulls remote changes to the local AgentFS store.
	 *
	 * @returns A promise that resolves when the pull operation completes.
	 */
	pull?(): Promise<void>;

	/**
	 * Pushes local changes to the remote AgentFS store.
	 *
	 * @returns A promise that resolves when the push operation completes.
	 */
	push?(): Promise<void>;

	/**
	 * Creates a checkpoint with the given label.
	 *
	 * @param label - A descriptive label for the checkpoint.
	 * @returns A promise that resolves when the checkpoint is created.
	 */
	checkpoint?(label: string): Promise<void>;
}

/**
 * Minimum interface that an AgentFS-compatible client must implement.
 * At minimum, `readText` and `writeText` must be provided.
 *
 * @public
 */
export interface AgentfsLikeClient {
	/**
	 * Reads the full text content at the given remote path.
	 *
	 * @param path - The remote path to read from.
	 * @returns A promise resolving to the file content as a string.
	 */
	readText(path: string): Promise<string>;

	/**
	 * Writes text content to the given remote path, overwriting any existing content.
	 *
	 * @param path - The remote path to write to.
	 * @param content - The text content to write.
	 * @returns A promise that resolves when the write completes.
	 */
	writeText(path: string, content: string): Promise<void>;

	/**
	 * Appends text content to the given remote path.
	 * This is optional; if not provided, fallback behavior may be used.
	 *
	 * @param path - The remote path to append to.
	 * @param content - The text content to append.
	 * @returns A promise that resolves when the append completes.
	 */
	appendText?(path: string, content: string): Promise<void>;

	/**
	 * Checks whether a file exists at the given remote path.
	 * This is optional; if not provided, a read-based fallback is used.
	 *
	 * @param path - The remote path to check.
	 * @returns A promise resolving to `true` if the file exists, `false` otherwise.
	 */
	exists?(path: string): Promise<boolean>;

	/**
	 * Optional sync capabilities for this client.
	 */
	sync?: AgentfsLikeSync;
}

/**
 * Asserts that the given value conforms to the {@link AgentfsLikeClient} interface.
 *
 * @param client - The value to validate.
 * @throws {@link TypeError} If the value does not implement the required methods.
 *
 * @public
 */
export function assertAgentfsLikeClient(
	client: unknown,
): asserts client is AgentfsLikeClient {
	if (!client || typeof client !== "object") {
		throw new TypeError("AgentFS client must be an object.");
	}

	const candidate = client as Record<string, unknown>;
	if (typeof candidate.readText !== "function") {
		throw new TypeError("AgentFS client must provide readText(path).");
	}

	if (typeof candidate.writeText !== "function") {
		throw new TypeError(
			"AgentFS client must provide writeText(path, content).",
		);
	}

	if (
		candidate.appendText !== undefined &&
		typeof candidate.appendText !== "function"
	) {
		throw new TypeError(
			"AgentFS client appendText must be a function when provided.",
		);
	}

	if (
		candidate.exists !== undefined &&
		typeof candidate.exists !== "function"
	) {
		throw new TypeError(
			"AgentFS client exists must be a function when provided.",
		);
	}
}
