import { assertString, PathLock } from "@repo/utils";
import {
	assertMemoryPath,
	MemoryNotFoundError,
	type MemoryPath,
	type MemoryStore,
	MemoryStoreError,
} from "@tekbreed/tekmemo";
import {
	type AgentfsLikeClient,
	assertAgentfsLikeClient,
} from "../client/agentfs-like";
import {
	AgentfsClientError,
	AgentfsConfigError,
	AgentfsValidationError,
} from "../errors/agentfs-error";
import type {
	AgentfsMemoryStoreConfig,
	NormalizedAgentfsMemoryStoreConfig,
} from "../types/config";

import { isNotFoundError } from "../utils/is-not-found-error";
import { resolveAgentfsMemoryPath } from "./resolve-agentfs-memory-path";
import { normalizeAgentfsMemoryStoreConfig } from "./resolve-store-root";

/**
 * AgentFS-backed implementation of the TekMemo {@link MemoryStore} interface.
 *
 * @remarks
 * This store delegates all read/write/append operations to an {@link AgentfsLikeClient},
 * resolving memory paths against a configured root and handling errors with domain-specific
 * error types.
 *
 * @public
 */
export class AgentfsMemoryStore implements MemoryStore {
	private readonly client: AgentfsLikeClient;
	private readonly config: NormalizedAgentfsMemoryStoreConfig;
	private readonly appendLock = new PathLock();

	/**
	 * Creates a new AgentFS memory store.
	 *
	 * @param client - An AgentFS-compatible client for remote operations.
	 * @param config - Configuration for the memory store.
	 * @throws {@link AgentfsConfigError} If the client is invalid or config cannot be normalized.
	 */
	constructor(client: AgentfsLikeClient, config: AgentfsMemoryStoreConfig) {
		try {
			assertAgentfsLikeClient(client);
		} catch (error) {
			throw new AgentfsConfigError("Invalid AgentFS client.", undefined, error);
		}

		this.client = client;
		this.config = normalizeAgentfsMemoryStoreConfig(config);
	}

	/**
	 * Reads the full text content at the given memory path.
	 *
	 * @param path - The memory path to read from.
	 * @returns A promise resolving to the file content as a string.
	 * @throws {@link MemoryNotFoundError} If the file is not found and `missingFileBehavior` is `"throw"`.
	 * @throws {@link AgentfsClientError} If the client returns non-string content.
	 * @throws {@link MemoryStoreError} If the read operation fails.
	 *
	 * @public
	 */
	async read(path: MemoryPath): Promise<string> {
		assertMemoryPath(path);
		const remotePath = this.absolute(path);

		try {
			const content = await this.client.readText(remotePath);
			if (typeof content !== "string") {
				throw new AgentfsClientError(
					"AgentFS client returned non-string content.",
					{
						remotePath,
						valueType: typeof content,
					},
				);
			}
			return content;
		} catch (error) {
			if (isNotFoundError(error)) {
				if (this.config.missingFileBehavior === "empty") {
					return "";
				}

				throw new MemoryNotFoundError("AgentFS memory file was not found.", {
					path,
					remotePath,
				});
			}

			if (
				error instanceof AgentfsClientError ||
				error instanceof MemoryNotFoundError
			) {
				throw error;
			}

			throw new MemoryStoreError(
				"Failed to read AgentFS memory file.",
				{ path, remotePath },
				error,
			);
		}
	}

	/**
	 * Writes text content to the given memory path, overwriting any existing content.
	 *
	 * @param path - The memory path to write to.
	 * @param content - The text content to write.
	 * @returns A promise that resolves when the write completes.
	 * @throws {@link MemoryStoreError} If the write operation fails.
	 *
	 * @public
	 */
	async write(path: MemoryPath, content: string): Promise<void> {
		assertMemoryPath(path);
		assertString(content, "content", AgentfsValidationError);
		const remotePath = this.absolute(path);

		try {
			await this.client.writeText(remotePath, content);
		} catch (error) {
			throw new MemoryStoreError(
				"Failed to write AgentFS memory file.",
				{ path, remotePath },
				error,
			);
		}
	}

	/**
	 * Appends text content to the given memory path.
	 *
	 * @remarks
	 * If the client provides `appendText` and `preferNativeAppend` is enabled, the native method is used.
	 * Otherwise, a read-modify-write fallback is used when `allowReadWriteAppendFallback` is enabled.
	 * Same-path appends are serialized via an internal lock to reduce race conditions.
	 *
	 * @param path - The memory path to append to.
	 * @param content - The text content to append.
	 * @returns A promise that resolves when the append completes.
	 * @throws {@link AgentfsValidationError} If append is not supported and fallback is disabled.
	 * @throws {@link MemoryStoreError} If the append operation fails.
	 *
	 * @public
	 */
	async append(path: MemoryPath, content: string): Promise<void> {
		assertMemoryPath(path);
		assertString(content, "content", AgentfsValidationError);
		const remotePath = this.absolute(path);

		await this.appendLock.runExclusive(remotePath, async () => {
			if (
				this.config.preferNativeAppend &&
				typeof this.client.appendText === "function"
			) {
				try {
					await this.client.appendText(remotePath, content);
					return;
				} catch (error) {
					throw new MemoryStoreError(
						"Failed to append AgentFS memory file.",
						{ path, remotePath },
						error,
					);
				}
			}

			if (!this.config.allowReadWriteAppendFallback) {
				throw new AgentfsValidationError(
					"AgentFS client does not provide appendText and fallback append is disabled.",
					{
						path,
						remotePath,
					},
				);
			}

			try {
				const existing = await this.read(path).catch((error: unknown) => {
					if (error instanceof MemoryNotFoundError) {
						return "";
					}
					throw error;
				});
				await this.write(path, `${existing}${content}`);
			} catch (error) {
				if (
					error instanceof MemoryStoreError ||
					error instanceof MemoryNotFoundError
				) {
					throw error;
				}
				throw new MemoryStoreError(
					"Failed to append AgentFS memory file with read/write fallback.",
					{ path, remotePath },
					error,
				);
			}
		});
	}

	/**
	 * Checks whether a file exists at the given memory path.
	 *
	 * @param path - The memory path to check.
	 * @returns A promise resolving to `true` if the file exists, `false` otherwise.
	 * @throws {@link MemoryStoreError} If the existence check fails.
	 *
	 * @public
	 */
	async exists(path: MemoryPath): Promise<boolean> {
		assertMemoryPath(path);
		const remotePath = this.absolute(path);

		if (typeof this.client.exists === "function") {
			try {
				return await this.client.exists(remotePath);
			} catch (error) {
				throw new MemoryStoreError(
					"Failed to check AgentFS memory file existence.",
					{ path, remotePath },
					error,
				);
			}
		}

		try {
			await this.client.readText(remotePath);
			return true;
		} catch (error) {
			if (isNotFoundError(error)) {
				return false;
			}
			throw new MemoryStoreError(
				"Failed to check AgentFS memory file existence using read fallback.",
				{ path, remotePath },
				error,
			);
		}
	}

	/**
	 * Deletes the file at the given memory path. Idempotent: a missing file is
	 * treated as success. Used by file-replication sync to apply server-side
	 * removals.
	 *
	 * @param path - The memory path to delete.
	 * @returns A promise that resolves when the delete completes.
	 * @throws {@link MemoryStoreError} If the client does not support `deleteText`, or the delete fails.
	 *
	 * @public
	 */
	async delete(path: MemoryPath): Promise<void> {
		assertMemoryPath(path);
		const remotePath = this.absolute(path);

		if (typeof this.client.deleteText !== "function") {
			throw new MemoryStoreError(
				"AgentFS client does not support deleteText; cannot delete memory file.",
				{ path, remotePath },
			);
		}

		try {
			await this.client.deleteText(remotePath);
		} catch (error) {
			if (isNotFoundError(error)) {
				return;
			}
			throw new MemoryStoreError(
				"Failed to delete AgentFS memory file.",
				{ path, remotePath },
				error,
			);
		}
	}

	/**
	 * Resolves a memory path to its absolute remote path.
	 *
	 * @param path - The memory path to resolve.
	 * @returns The absolute remote path.
	 *
	 * @internal
	 */
	absolute(path: MemoryPath): string {
		return resolveAgentfsMemoryPath(this.config.root, path);
	}

	/**
	 * Returns the resolved root path for this store.
	 *
	 * @returns The root path string.
	 *
	 * @internal
	 */
	getRoot(): string {
		return this.config.root;
	}

	/**
	 * Returns a copy of the normalized configuration for this store.
	 *
	 * @returns The normalized store configuration.
	 *
	 * @internal
	 */
	getConfig(): NormalizedAgentfsMemoryStoreConfig {
		return { ...this.config };
	}
}

/**
 * Factory function to create a new {@link AgentfsMemoryStore} instance.
 *
 * @param client - An AgentFS-compatible client for remote operations.
 * @param config - Configuration for the memory store.
 * @returns A new AgentfsMemoryStore instance.
 *
 * @public
 */
export function createAgentfsMemoryStore(
	client: AgentfsLikeClient,
	config: AgentfsMemoryStoreConfig,
): AgentfsMemoryStore {
	return new AgentfsMemoryStore(client, config);
}
