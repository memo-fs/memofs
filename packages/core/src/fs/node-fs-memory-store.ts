import fs from "node:fs/promises";
/**
 * Filesystem-backed memory store implementation.
 *
 * @remarks
 * Uses Node.js `fs` module to read/write files under a root directory.
 * Supports atomic writes via rename, symlink protection, and path locking.
 *
 * @public
 */

import { PathLock } from "@repo/utils";
import type { MemoryPath, MemoryStore } from "@tekmemo/core";
import { MemoryNotFoundError, TEKMEMO_DIR } from "@tekmemo/core";
import { assertString } from "../core/validation/assertions";
import { isNotFoundError, wrapFsError } from "./errors/fs-memory-store-error";
import type {
	NodeFsMemoryStoreOptions,
	NormalizedNodeFsMemoryStoreOptions,
} from "./types/options";
import { AdvisoryFileLock } from "./utils/advisory-lock";
import { assertNoSymlinkPath } from "./utils/assert-no-symlink-path";
import { ensureParentDir } from "./utils/ensure-parent-dir";
import { ensureRootDir } from "./utils/ensure-root-dir";
import { normalizeOptions } from "./utils/normalize-options";
import { resolveAbsoluteMemoryPath } from "./utils/resolve-absolute-memory-path";
import { writeFileAtomic } from "./utils/write-file-atomic";

/**
 * Node.js filesystem-backed memory store.
 *
 * @param options - Configuration options for the store.
 */
export class NodeFsMemoryStore implements MemoryStore {
	private readonly options: NormalizedNodeFsMemoryStoreOptions;
	/** @internal */
	private readonly locks = new PathLock();
	private readonly lock: AdvisoryFileLock | null;

	/**
	 * Creates a new filesystem-backed memory store.
	 *
	 * @param options - Configuration options for the store.
	 */
	constructor(options: NodeFsMemoryStoreOptions) {
		this.options = normalizeOptions(options);
		this.lock = this.options.lock
			? new AdvisoryFileLock(this.lockPath, {
					fileMode: this.options.fileMode,
					maxAgeMs: this.options.lockMaxAgeMs,
				})
			: null;
	}

	/**
	 * Returns the root directory of this store.
	 *
	 * @returns The normalized root directory path.
	 */
	get rootDir(): string {
		return this.options.rootDir;
	}

	/** Absolute path of the cross-process advisory lock file (`.tekmemo/.lock`). */
	private get lockPath(): string {
		return `${this.options.rootDir}/${TEKMEMO_DIR}/.lock`;
	}

	/**
	 * Resolves a memory path to an absolute filesystem path.
	 *
	 * @param path - The memory path to resolve.
	 * @returns The absolute filesystem path.
	 */
	resolve(path: MemoryPath): string {
		return resolveAbsoluteMemoryPath(this.options, path);
	}

	/**
	 * Acquires the cross-process advisory lock (idempotent) before a mutating op.
	 *
	 * @remarks
	 * Enforces the local single-process contract (Q28). Reads never acquire;
	 * only write/append/delete do. Throws {@link LockHeldError} if another live
	 * process holds the lock. No-op when the store was created with `lock: false`.
	 *
	 * The root directory is ensured *first* so that `createRoot: false` and
	 * rootDir-is-a-file errors surface before the lock file is created. The
	 * `.tekmemo/` parent of the lock is also ensured (it is a canonical path
	 * that any write would create anyway; creating it here is a no-op for a
	 * healthy store and lets the lock file land).
	 *
	 * @throws {LockHeldError} If another process holds the lock.
	 */
	private async ensureLock(): Promise<void> {
		if (this.lock) {
			await ensureRootDir(this.options);
			await ensureParentDir(this.lockPath, this.options);
			await this.lock.acquire();
		}
	}

	/**
	 * Releases the cross-process advisory lock, if held.
	 *
	 * @remarks
	 * Idempotent. Safe to call in a `using`/`finally` block or as part of a
	 * graceful teardown. The lock is also auto-released on `process.exit`, so
	 * calling this is only required to free the lock *before* process exit
	 * (e.g. a long-lived process that creates and discards stores).
	 */
	async dispose(): Promise<void> {
		await this.lock?.release();
	}

	/**
	 * Reads a file from the filesystem store.
	 *
	 * @param path - The memory path to read.
	 * @returns The file content.
	 * @throws {@link MemoryNotFoundError} If the file does not exist and missingFileBehavior is "throw".
	 * @throws {@link FsMemoryStoreError} If the read fails.
	 */
	async read(path: MemoryPath): Promise<string> {
		const absolutePath = this.resolve(path);

		try {
			await ensureRootDir(this.options);
			await assertNoSymlinkPath(absolutePath, this.options);
			return await fs.readFile(absolutePath, "utf8");
		} catch (error) {
			if (isNotFoundError(error)) {
				if (this.options.missingFileBehavior === "empty") {
					return "";
				}
				throw new MemoryNotFoundError(`Memory file not found: ${path}`, {
					path,
					absolutePath,
				});
			}
			if (error instanceof MemoryNotFoundError) {
				throw error;
			}
			throw wrapFsError(
				"Failed to read memory file.",
				{ path, absolutePath },
				error,
			);
		}
	}

	/**
	 * Writes content to a file in the filesystem store.
	 *
	 * @param path - The memory path to write to.
	 * @param content - The content to write.
	 * @returns A promise that resolves when the write is complete.
	 * @throws {@link FsMemoryStoreError} If the write fails.
	 */
	async write(path: MemoryPath, content: string): Promise<void> {
		assertString(content, "content");
		const absolutePath = this.resolve(path);

		await this.ensureLock();
		await this.locks.runExclusive(absolutePath, async () => {
			try {
				await ensureRootDir(this.options);
				await ensureParentDir(absolutePath, this.options);
				await assertNoSymlinkPath(absolutePath, this.options);
				await writeFileAtomic(absolutePath, content, this.options);
			} catch (error) {
				throw wrapFsError(
					"Failed to write memory file.",
					{ path, absolutePath },
					error,
				);
			}
		});
	}

	/**
	 * Appends content to a file in the filesystem store.
	 *
	 * @param path - The memory path to append to.
	 * @param content - The content to append.
	 * @returns A promise that resolves when the append is complete.
	 * @throws {@link FsMemoryStoreError} If the append fails.
	 */
	async append(path: MemoryPath, content: string): Promise<void> {
		assertString(content, "content");
		const absolutePath = this.resolve(path);

		if (content.length === 0) {
			return;
		}

		await this.ensureLock();
		await this.locks.runExclusive(absolutePath, async () => {
			try {
				await ensureRootDir(this.options);
				await ensureParentDir(absolutePath, this.options);
				await assertNoSymlinkPath(absolutePath, this.options);
				await fs.appendFile(absolutePath, content, {
					encoding: "utf8",
					mode: this.options.fileMode,
					flag: "a",
				});
			} catch (error) {
				throw wrapFsError(
					"Failed to append memory file.",
					{ path, absolutePath },
					error,
				);
			}
		});
	}

	/**
	 * Checks if a file exists in the filesystem store.
	 *
	 * @param path - The memory path to check.
	 * @returns `true` if the file exists, `false` otherwise.
	 * @throws {@link FsMemoryStoreError} If the check fails.
	 */
	async exists(path: MemoryPath): Promise<boolean> {
		const absolutePath = this.resolve(path);

		try {
			await ensureRootDir(this.options);
			await assertNoSymlinkPath(absolutePath, this.options);
			const stats = await fs.stat(absolutePath);
			return stats.isFile();
		} catch (error) {
			if (isNotFoundError(error)) {
				return false;
			}
			throw wrapFsError(
				"Failed to check memory file existence.",
				{ path, absolutePath },
				error,
			);
		}
	}

	/**
	 * Deletes a file from the filesystem store. Idempotent: a missing file is
	 * treated as success. Used by file-replication sync to apply server-side
	 * removals.
	 *
	 * @param path - The memory path to delete.
	 * @throws {@link FsMemoryStoreError} If the delete fails for a non-ENOENT reason.
	 */
	async delete(path: MemoryPath): Promise<void> {
		const absolutePath = this.resolve(path);

		await this.ensureLock();
		await this.locks.runExclusive(absolutePath, async () => {
			try {
				await ensureRootDir(this.options);
				await assertNoSymlinkPath(absolutePath, this.options);
				await fs.rm(absolutePath, { force: true });
			} catch (error) {
				if (isNotFoundError(error)) {
					return;
				}
				throw wrapFsError(
					"Failed to delete memory file.",
					{ path, absolutePath },
					error,
				);
			}
		});
	}
}
