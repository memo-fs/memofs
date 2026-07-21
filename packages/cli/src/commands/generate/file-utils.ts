/**
 * Shared file-writing helpers for the `generate` command family.
 *
 * Extracted to eliminate the stat→mkdir→writeFile force-protect pattern that
 * was duplicated across `agent.ts`, `agent-rules.ts`, and `agent-hooks.ts`.
 *
 * @module file-utils
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CliValidationError } from "../../errors/cli-errors";
import { mergeHooksJson } from "./emitters/hooks-json";
import type { EmittedHookFile } from "./emitters/types";

/**
 * Result of a force-protected file write.
 */
export interface WriteResult {
	/** Relative path from project root. */
	readonly path: string;
	/** Whether the file was created or updated (true) or skipped (false). */
	readonly created: boolean;
	/** Present and true when the write was skipped (existing content kept). */
	readonly skipped?: boolean;
	/** Present and true when the file existed and our entries were merged in. */
	readonly merged?: boolean;
}

/**
 * Writes a single file to `rootDir/relativePath`, creating parent directories
 * as needed. Refuses to overwrite an existing file unless `force` is true.
 *
 * @param rootDir - Project root directory.
 * @param relativePath - Project-relative path to the file.
 * @param content - File content to write.
 * @param force - If true, overwrites an existing file.
 * @returns The write result.
 */
export async function writeFileWithForceProtect(
	rootDir: string,
	relativePath: string,
	content: string,
	force: boolean,
): Promise<WriteResult> {
	const fullPath = resolve(rootDir, relativePath);
	if (!force) {
		try {
			await stat(fullPath);
			return { path: relativePath, created: false, skipped: true };
		} catch {
			// File does not exist — proceed to write.
		}
	}
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, content, "utf8");
	return { path: relativePath, created: true };
}

/**
 * Writes multiple files to `rootDir`, each force-protected.
 *
 * @param rootDir - Project root directory.
 * @param files - Array of { path, content } to write.
 * @param force - If true, overwrites existing files.
 * @returns Array of write results, one per file.
 */
export async function writeFilesWithForceProtect(
	rootDir: string,
	files: ReadonlyArray<{ readonly path: string; readonly content: string }>,
	force: boolean,
): Promise<WriteResult[]> {
	const results: WriteResult[] = [];
	for (const file of files) {
		results.push(
			await writeFileWithForceProtect(rootDir, file.path, file.content, force),
		);
	}
	return results;
}

/**
 * Writes emitted hook files, honoring each file's merge strategy.
 *
 * Files marked `merge: "hooks-json"` target shared platform settings files
 * (`.claude/settings.json`, `.codex/hooks.json`): existing top-level keys
 * and user-defined hook groups are preserved, prior memofs-owned groups are
 * replaced. When memofs groups already exist and `force` is false, the file
 * is left untouched (skipped) — mirroring `writeMcpConfig` semantics.
 * Unmarked files (e.g. the opencode plugin, which is exclusively ours) use
 * the plain force-protected whole-file write.
 *
 * @param rootDir - Project root directory.
 * @param files - Emitted hook files.
 * @param force - If true, replaces prior memofs entries / existing files.
 * @returns Array of write results, one per file.
 * @throws {CliValidationError} When an existing merge-target file is not
 * valid JSON (aborts rather than clobbering a hand-edited settings file).
 */
export async function writeEmittedHookFiles(
	rootDir: string,
	files: readonly EmittedHookFile[],
	force: boolean,
): Promise<WriteResult[]> {
	const results: WriteResult[] = [];
	for (const file of files) {
		if (file.merge !== "hooks-json") {
			results.push(
				await writeFileWithForceProtect(
					rootDir,
					file.path,
					file.content,
					force,
				),
			);
			continue;
		}

		const fullPath = resolve(rootDir, file.path);
		let existingContent: string | undefined;
		try {
			existingContent = await readFile(fullPath, "utf8");
		} catch {
			// File does not exist — merge into an empty document.
		}

		const fresh = JSON.parse(file.content) as { hooks: Record<string, []> };
		let merged: { content: string; entryExisted: boolean };
		try {
			merged = mergeHooksJson(existingContent, fresh.hooks);
		} catch (cause) {
			throw new CliValidationError(
				`${file.path} is not valid JSON; merge aborted to avoid clobbering. Fix or remove it and re-run.`,
				{ cause },
			);
		}

		if (merged.entryExisted && !force) {
			results.push({ path: file.path, created: false, skipped: true });
			continue;
		}

		await mkdir(dirname(fullPath), { recursive: true });
		await writeFile(fullPath, merged.content, "utf8");
		results.push({
			path: file.path,
			created: true,
			...(existingContent !== undefined ? { merged: true } : {}),
		});
	}
	return results;
}
