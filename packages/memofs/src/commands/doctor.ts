/**
 * CLI command handler for auditing and diagnosing MemoFS workspace repositories.
 *
 * @module doctor
 */

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { MemoFS } from "@memofs/core";
import type { z } from "zod";
import { exists, getRootDir, readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import {
	MEMOFS_CLI_PATHS,
	REQUIRED_DIRS,
	REQUIRED_FILES,
} from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";
import {
	ConversationEntrySchema,
	ManifestSchema,
	MemoryChunkSchema,
	MemoryEventSchema,
	SnapshotEntrySchema,
} from "../protocol/schemas";

/**
 * Represents a validation problem (error or warning) detected by the doctor check.
 */
export interface DoctorIssue {
	/**
	 * Severity level of the issue.
	 */
	level: "error" | "warning";
	/**
	 * Machine-readable category code for the issue.
	 */
	code: string;
	/**
	 * Human-readable descriptive message.
	 */
	message: string;
}

/**
 * Options configuration for the doctor command.
 */
export interface DoctorCommandOptions {
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
	/**
	 * If true, throws errors on malformed lines during JSONL parsing.
	 */
	strict?: boolean | undefined;
}

/**
 * Runs the doctor command, checking repository integrity, schema compliance, and formatting.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runDoctorCommand(
	options: DoctorCommandOptions,
): Promise<number> {
	const issues: DoctorIssue[] = [];

	const rootDir = getRootDir(options.memo.store);

	for (const dir of REQUIRED_DIRS) {
		try {
			await stat(resolve(rootDir, dir));
		} catch {
			issues.push({
				level: "error",
				code: "missing_dir",
				message: `Missing directory: ${dir}`,
			});
		}
	}

	for (const file of REQUIRED_FILES) {
		const fileExists = await exists(options.memo.store, file);
		if (!fileExists) {
			issues.push({
				level: "error",
				code: "missing_file",
				message: `Missing file: ${file}`,
			});
		}
	}

	const manifestContent = await readTextIfExists(
		options.memo.store,
		MEMOFS_CLI_PATHS.manifest,
	);
	if (manifestContent) {
		try {
			const parsed = JSON.parse(manifestContent);
			ManifestSchema.parse(parsed);
		} catch (error) {
			issues.push({
				level: "error",
				code: "invalid_manifest",
				message: `manifest.json: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	}

	const validationMap: Record<string, z.ZodSchema> = {
		[MEMOFS_CLI_PATHS.memoryEvents]: MemoryEventSchema,
		[MEMOFS_CLI_PATHS.conversations]: ConversationEntrySchema,
		[MEMOFS_CLI_PATHS.chunks]: MemoryChunkSchema,
		[MEMOFS_CLI_PATHS.snapshots]: SnapshotEntrySchema,
	};

	const conversationIds = new Set<string>();

	for (const [file, schema] of Object.entries(validationMap)) {
		const content = await readTextIfExists(options.memo.store, file);
		if (content === undefined) continue;

		const records = parseJsonl(content, { strict: options.strict ?? false });
		for (const record of records) {
			try {
				const validated = schema.parse(record.value) as Record<string, unknown>;

				if (
					file === MEMOFS_CLI_PATHS.conversations &&
					typeof validated.id === "string"
				) {
					conversationIds.add(validated.id);
				}
			} catch (error) {
				issues.push({
					level: "error",
					code: "invalid_line",
					message: `${file}:${record.line}: ${error instanceof Error ? error.message : String(error)}`,
				});
			}
		}
	}

	const eventContent = await readTextIfExists(
		options.memo.store,
		MEMOFS_CLI_PATHS.memoryEvents,
	);
	if (eventContent) {
		const events = parseJsonl(eventContent);
		for (const event of events) {
			const docId = event.value.documentId;
			if (typeof docId !== "string") continue;
			if (docId === "core" || docId === "notes") continue;

			if (conversationIds.size > 0 && !conversationIds.has(docId)) {
				issues.push({
					level: "warning",
					code: "orphaned_event",
					message: `${MEMOFS_CLI_PATHS.memoryEvents}:${event.line}: Event references unknown document/conversation "${docId}"`,
				});
			}
		}
	}

	const result = {
		ok: issues.filter((issue) => issue.level === "error").length === 0,
		issues,
	};

	if (options.json) {
		options.output.write(JSON.stringify(result, null, 2));
	} else if (result.ok) {
		if (issues.length > 0) {
			options.output.warn(
				[
					"MemoFS doctor passed with warnings:",
					...issues.map((issue) => `- [${issue.level}] ${issue.message}`),
				].join("\n"),
			);
		} else {
			options.output.success("MemoFS doctor passed.");
		}
	} else {
		options.output.error(
			[
				"MemoFS doctor found errors:",
				...issues.map((issue) => `- [${issue.level}] ${issue.message}`),
			].join("\n"),
		);
	}

	return result.ok ? 0 : 1;
}
