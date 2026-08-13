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
	CORE_MEMORY_SOFT_LIMIT,
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
	/**
	 * If true, automatically consolidates memory graph nodes and
	 * physically moves deprecated memories to .memofs/archive/<id>.json.
	 */
	fix?: boolean | undefined;
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
	const spinner = options.output.spinner({ json: options.json });
	spinner.start("Running MemoFS workspace integrity diagnostics...");

	try {
		const rootDir = getRootDir(options.memo.store);

		spinner.update("Checking required workspace directory structure...");
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

		spinner.update("Verifying required canonical memory files...");
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

		spinner.update("Validating manifest.json schema...");
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

		spinner.update("Checking core memory size...");
		const coreContent = await readTextIfExists(
			options.memo.store,
			MEMOFS_CLI_PATHS.coreMemory,
		);
		if (coreContent !== undefined) {
			const lineCount = coreContent.split("\n").length;
			if (lineCount > CORE_MEMORY_SOFT_LIMIT) {
				issues.push({
					level: "warning",
					code: "core_memory_oversize",
					message: `${MEMOFS_CLI_PATHS.coreMemory}: ${lineCount} lines (soft limit ${CORE_MEMORY_SOFT_LIMIT}). Core memory is injected in full on every session — trim it to keep context tight.`,
				});
			}
		}

		spinner.update("Auditing JSONL record schemas and conversation links...");
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
					const validated = schema.parse(record.value) as Record<
						string,
						unknown
					>;

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

		spinner.update(
			"Checking for deprecated memories and consolidation status...",
		);
		if (options.fix) {
			await options.memo.consolidate({ apply: true });
			const archiveResult = await options.memo.archiveDeprecated();
			if (archiveResult.archived > 0) {
				issues.push({
					level: "warning",
					code: "deprecated_memories_archived",
					message: `Auto-archived ${archiveResult.archived} deprecated memory item${archiveResult.archived === 1 ? "" : "s"} to cold storage archive.`,
				});
			}
		} else {
			const nodesContent = await readTextIfExists(
				options.memo.store,
				MEMOFS_CLI_PATHS.graphNodes,
			);
			if (nodesContent) {
				const nodeRecords = parseJsonl(nodesContent);
				let deprecatedCount = 0;
				for (const record of nodeRecords) {
					if (
						typeof record.value === "object" &&
						record.value !== null &&
						(record.value as { status?: string }).status === "deprecated"
					) {
						deprecatedCount++;
					}
				}
				if (deprecatedCount > 0) {
					issues.push({
						level: "warning",
						code: "deprecated_memories_pending_archive",
						message: `${deprecatedCount} deprecated memory item${deprecatedCount === 1 ? " is" : "s are"} pending archive. Run "memofs doctor --fix" or "memofs consolidate --archive-deprecated" to move them to cold storage archive.`,
					});
				}
			}
		}

		const result = {
			ok: issues.filter((issue) => issue.level === "error").length === 0,
			issues,
		};

		spinner.stop();

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
				options.output.success(
					"MemoFS doctor passed — workspace memory is healthy.",
				);
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
	} catch (error) {
		spinner.fail("Doctor diagnostic check encountered an unexpected error");
		throw error;
	}
}
