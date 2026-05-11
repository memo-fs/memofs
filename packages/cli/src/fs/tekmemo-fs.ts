import fs from "node:fs/promises";
import path from "node:path";
import { CliFsError } from "../errors/cli-errors";
import { normalizeRootDir, resolveInsideRoot } from "./paths";

export interface TekMemoFileSystemOptions {
	rootDir: string;
	rejectSymlinkedTekMemoDir?: boolean;
}

export class TekMemoFileSystem {
	readonly rootDir: string;
	private readonly rejectSymlinkedTekMemoDir: boolean;

	constructor(options: TekMemoFileSystemOptions) {
		this.rootDir = normalizeRootDir(options.rootDir);
		this.rejectSymlinkedTekMemoDir = options.rejectSymlinkedTekMemoDir ?? true;
	}

	resolve(relativePath: string): string {
		return resolveInsideRoot(this.rootDir, relativePath);
	}

	async ensureSafeRoot(): Promise<void> {
		await fs.mkdir(this.rootDir, { recursive: true });
		await this.rejectUnsafeTekMemoSymlinkIfNeeded();
	}

	async exists(relativePath: string): Promise<boolean> {
		try {
			await fs.lstat(this.resolve(relativePath));
			return true;
		} catch (error) {
			if (isNodeError(error) && error.code === "ENOENT") return false;
			throw new CliFsError(`Failed checking path "${relativePath}".`, {
				cause: error,
			});
		}
	}

	async readText(relativePath: string): Promise<string> {
		try {
			return await fs.readFile(this.resolve(relativePath), "utf8");
		} catch (error) {
			throw new CliFsError(`Failed reading "${relativePath}".`, {
				cause: error,
			});
		}
	}

	async readTextIfExists(relativePath: string): Promise<string | undefined> {
		try {
			return await fs.readFile(this.resolve(relativePath), "utf8");
		} catch (error) {
			if (isNodeError(error) && error.code === "ENOENT") return undefined;
			throw new CliFsError(`Failed reading "${relativePath}".`, {
				cause: error,
			});
		}
	}

	async writeText(relativePath: string, content: string): Promise<void> {
		if (typeof content !== "string") {
			throw new CliFsError("content must be a string.");
		}

		const target = this.resolve(relativePath);
		const parent = path.dirname(target);
		await fs.mkdir(parent, { recursive: true });

		const tmp = path.join(
			parent,
			`.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
		);

		try {
			await fs.writeFile(tmp, content, "utf8");
			await fs.rename(tmp, target);
		} catch (error) {
			await fs.rm(tmp, { force: true }).catch(() => undefined);
			throw new CliFsError(`Failed writing "${relativePath}".`, {
				cause: error,
			});
		}
	}

	async appendText(relativePath: string, content: string): Promise<void> {
		if (typeof content !== "string") {
			throw new CliFsError("content must be a string.");
		}

		const target = this.resolve(relativePath);
		await fs.mkdir(path.dirname(target), { recursive: true });

		try {
			await fs.appendFile(target, content, "utf8");
		} catch (error) {
			throw new CliFsError(`Failed appending "${relativePath}".`, {
				cause: error,
			});
		}
	}

	async mkdir(relativePath: string): Promise<void> {
		try {
			await fs.mkdir(this.resolve(relativePath), { recursive: true });
		} catch (error) {
			throw new CliFsError(`Failed creating directory "${relativePath}".`, {
				cause: error,
			});
		}
	}

	async stat(relativePath: string): Promise<{
		isFile: boolean;
		isDirectory: boolean;
		isSymbolicLink: boolean;
		size: number;
	}> {
		try {
			const stats = await fs.lstat(this.resolve(relativePath));
			return {
				isFile: stats.isFile(),
				isDirectory: stats.isDirectory(),
				isSymbolicLink: stats.isSymbolicLink(),
				size: stats.size,
			};
		} catch (error) {
			throw new CliFsError(`Failed stat for "${relativePath}".`, {
				cause: error,
			});
		}
	}

	private async rejectUnsafeTekMemoSymlinkIfNeeded(): Promise<void> {
		if (!this.rejectSymlinkedTekMemoDir) return;

		try {
			const stats = await fs.lstat(this.resolve(".tekmemo"));
			if (stats.isSymbolicLink()) {
				throw new CliFsError("Refusing to use symlinked .tekmemo directory.");
			}
		} catch (error) {
			if (error instanceof CliFsError) throw error;
			if (isNodeError(error) && error.code === "ENOENT") return;
			throw new CliFsError("Failed checking .tekmemo directory safety.", {
				cause: error,
			});
		}
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}
