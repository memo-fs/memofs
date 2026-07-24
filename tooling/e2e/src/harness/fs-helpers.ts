/**
 * Shared FS helpers for real harnesses.
 * Node-only: uses `node:fs/promises`, `node:path`.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

/**
 * Lists all files under root recursively, relative paths sorted.
 * Skips `node_modules`.
 */
export async function listFilesRecursive(root: string): Promise<string[]> {
	const result: string[] = [];

	async function walk(dir: string): Promise<void> {
		let entries: Array<{
			name: string;
			isDirectory(): boolean;
			isFile(): boolean;
		}>;
		try {
			entries = (await readdir(dir, {
				withFileTypes: true,
			})) as unknown as typeof entries;
		} catch {
			return;
		}
		for (const entry of entries) {
			const abs = join(dir, entry.name);
			const rel = relative(root, abs);
			if (entry.isDirectory()) {
				if (entry.name === "node_modules") continue;
				await walk(abs);
			} else if (entry.isFile()) {
				result.push(rel);
			}
		}
	}

	await walk(root);
	result.sort();
	return result;
}

/**
 * Snapshots all files under root as Record<relPath, content>.
 * Binary/unreadable files get placeholder.
 */
export async function snapshotFsRecursive(
	root: string,
): Promise<Record<string, string>> {
	const files = await listFilesRecursive(root);
	const record: Record<string, string> = {};
	for (const rel of files) {
		const abs = join(root, rel);
		try {
			const st = await stat(abs);
			if (!st.isFile()) continue;
			try {
				record[rel] = await readFile(abs, "utf8");
			} catch {
				record[rel] = "<binary or unreadable>";
			}
		} catch {
			// file disappeared, ignore
		}
	}
	return record;
}

/**
 * Asserts a file exists at root/relPath, throws with helpful listing on failure.
 */
export async function assertFileExistsAt(
	root: string,
	relPath: string,
): Promise<void> {
	const abs = join(root, relPath);
	try {
		await stat(abs);
	} catch {
		const files = await listFilesRecursive(root).catch(() => []);
		throw new Error(
			`RealHarness: expected file to exist: ${relPath} (abs: ${abs})\n` +
				`tmpDir: ${root}\n` +
				`Existing files (${files.length}):\n${files.slice(0, 50).join("\n")}`,
		);
	}
}

/**
 * Asserts file does NOT exist at root/relPath.
 */
export async function assertFileNotExistsAt(
	root: string,
	relPath: string,
): Promise<void> {
	const abs = join(root, relPath);
	try {
		await stat(abs);
		throw new Error(
			`RealHarness: expected file NOT to exist but found: ${relPath}`,
		);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("expected file NOT to exist")
		) {
			throw error;
		}
		// stat threw -> not exists, success
	}
}
