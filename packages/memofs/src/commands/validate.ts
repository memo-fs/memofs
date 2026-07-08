/**
 * CLI command handler for validating local workspace files and structures.
 *
 * @module validate
 */

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { MemoFS } from "@memofs/core";
import type { z } from "zod";
import { exists, getRootDir, readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import {
	MEMOFS_PATHS,
	REQUIRED_DIRS,
	REQUIRED_FILES,
} from "../protocol/constants";
import { parseManifest } from "../protocol/manifest";
import {
	ConversationEntrySchema,
	MemoryChunkSchema,
	MemoryEventSchema,
	SnapshotEntrySchema,
} from "../protocol/schemas";

/**
 * Options configuration for the validate command.
 */
export interface ValidateCommandOptions {
	/**
	 * The MemoFS client instance.
	 */
	memo: MemoFS;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
}

/**
 * Represents a single protocol validation issue/error.
 */
interface ValidateIssue {
	/**
	 * Machine-readable code describing the validation failure type.
	 */
	code: string;
	/**
	 * Descriptive validation failure message.
	 */
	message: string;
}

/**
 * Runs the validate command, performing strict schema and structure checkups.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runValidateCommand(
	options: ValidateCommandOptions,
): Promise<number> {
	const rootDir = getRootDir(options.memo.store);
	const issues: ValidateIssue[] = [];

	for (const dir of REQUIRED_DIRS) {
		try {
			await stat(resolve(rootDir, dir));
		} catch {
			issues.push({
				code: "missing_dir",
				message: `Missing required directory: ${dir}`,
			});
		}
	}

	for (const file of REQUIRED_FILES) {
		const fileExists = await exists(options.memo.store, file);
		if (!fileExists) {
			issues.push({
				code: "missing_file",
				message: `Missing required file: ${file}`,
			});
		}
	}

	const manifestContent = await readTextIfExists(
		options.memo.store,
		MEMOFS_PATHS.manifest,
	);
	if (manifestContent === undefined) {
		issues.push({
			code: "missing_manifest",
			message: "manifest.json is missing",
		});
	} else {
		try {
			const manifest = parseManifest(manifestContent);
			for (const key of ["core", "notes"] as const) {
				const filePath = manifest.memory[key];
				const refExists = await exists(options.memo.store, filePath);
				if (!refExists) {
					issues.push({
						code: "manifest_ref_missing",
						message: `Manifest references ${filePath} but file is missing`,
					});
				}
			}
		} catch (error) {
			issues.push({
				code: "invalid_manifest",
				message: `manifest.json: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	}

	const strictSchemas: Record<string, z.ZodSchema> = {
		[MEMOFS_PATHS.memoryEvents]: MemoryEventSchema,
		[MEMOFS_PATHS.conversations]: ConversationEntrySchema,
		[MEMOFS_PATHS.chunks]: MemoryChunkSchema,
		[MEMOFS_PATHS.snapshots]: SnapshotEntrySchema,
	};

	for (const [file, schema] of Object.entries(strictSchemas)) {
		const content = await readTextIfExists(options.memo.store, file);
		if (content === undefined) continue;

		const lines = content.split(/\r?\n/);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]?.trim();
			if (!line) continue;

			const lineNumber = i + 1;
			let parsed: unknown;
			try {
				parsed = JSON.parse(line);
			} catch {
				issues.push({
					code: "invalid_json",
					message: `${file}:${lineNumber}: Invalid JSON`,
				});
				continue;
			}

			const result = schema.safeParse(parsed);
			if (!result.success) {
				const firstIssue = result.error.issues[0];
				const path = firstIssue?.path.join(".") ?? "unknown";
				const msg = firstIssue?.message ?? "validation failed";
				issues.push({
					code: "schema_violation",
					message: `${file}:${lineNumber}: ${path} — ${msg}`,
				});
			}
		}
	}

	const ok = issues.length === 0;

	if (options.json) {
		options.output.write(JSON.stringify({ ok, issues }, null, 2));
	} else if (ok) {
		options.output.success("Validation passed. All protocol files are valid.");
	} else {
		options.output.error(
			[
				"Validation failed:",
				...issues.map((issue) => `- [${issue.code}] ${issue.message}`),
			].join("\n"),
		);
	}

	return ok ? 0 : 1;
}
