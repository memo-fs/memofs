import type { z } from "zod";
import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import {
	REQUIRED_DIRS,
	REQUIRED_FILES,
	TEKMEMO_PATHS,
} from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";
import {
	ConversationEntrySchema,
	ManifestSchema,
	MemoryChunkSchema,
	MemoryEventSchema,
	SnapshotEntrySchema,
} from "../protocol/schemas";

export interface DoctorIssue {
	level: "error" | "warning";
	code: string;
	message: string;
}

export interface DoctorCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	strict?: boolean | undefined;
}

export async function runDoctorCommand(
	options: DoctorCommandOptions,
): Promise<number> {
	const issues: DoctorIssue[] = [];

	for (const dir of REQUIRED_DIRS) {
		const exists = await options.fs.exists(dir);
		if (!exists) {
			issues.push({
				level: "error",
				code: "missing_dir",
				message: `Missing directory: ${dir}`,
			});
		}
	}

	for (const file of REQUIRED_FILES) {
		const exists = await options.fs.exists(file);
		if (!exists) {
			issues.push({
				level: "error",
				code: "missing_file",
				message: `Missing file: ${file}`,
			});
		}
	}

	const manifestContent = await options.fs.readTextIfExists(
		TEKMEMO_PATHS.manifest,
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
		[TEKMEMO_PATHS.memoryEvents]: MemoryEventSchema,
		[TEKMEMO_PATHS.conversations]: ConversationEntrySchema,
		[TEKMEMO_PATHS.chunks]: MemoryChunkSchema,
		[TEKMEMO_PATHS.snapshots]: SnapshotEntrySchema,
	};

	const conversationIds = new Set<string>();

	for (const [file, schema] of Object.entries(validationMap)) {
		const content = await options.fs.readTextIfExists(file);
		if (content === undefined) continue;

		const records = parseJsonl(content, { strict: options.strict ?? false });
		for (const record of records) {
			try {
				const validated = schema.parse(record.value) as Record<string, unknown>;

				if (
					file === TEKMEMO_PATHS.conversations &&
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

	const eventContent = await options.fs.readTextIfExists(
		TEKMEMO_PATHS.memoryEvents,
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
					message: `${TEKMEMO_PATHS.memoryEvents}:${event.line}: Event references unknown document/conversation "${docId}"`,
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
					"TekMemo doctor passed with warnings:",
					...issues.map((issue) => `- [${issue.level}] ${issue.message}`),
				].join("\n"),
			);
		} else {
			options.output.success("TekMemo doctor passed.");
		}
	} else {
		options.output.error(
			[
				"TekMemo doctor found errors:",
				...issues.map((issue) => `- [${issue.level}] ${issue.message}`),
			].join("\n"),
		);
	}

	return result.ok ? 0 : 1;
}
