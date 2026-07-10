/**
 * CLI workspace summary and health-inspection utility.
 *
 * @module summary
 */

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { MemoryStore } from "@memofs/core";
import { readTextIfExists } from "../cli/store-helpers";
import { MEMOFS_CLI_PATHS } from "./constants";
import { parseJsonl } from "./jsonl";
import { type MemoFsCliManifest, parseManifest } from "./manifest";

/**
 * Detailed diagnosis/inspection report of a MemoFS workspace repository.
 */
export interface MemoFsInspection {
	/**
	 * Normalized absolute workspace root directory path.
	 */
	rootDir: string;
	/**
	 * Whether the `.memofs` directory physically exists.
	 */
	exists: boolean;
	/**
	 * The parsed manifest.json object, if available.
	 */
	manifest?: MemoFsCliManifest;
	/**
	 * Array of stats for tracked repository files.
	 */
	files: Array<{
		/**
		 * Workspace-relative path to the file.
		 */
		path: string;
		/**
		 * Whether the file physically exists.
		 */
		exists: boolean;
		/**
		 * Size of the file in bytes.
		 */
		bytes: number;
		/**
		 * Total non-empty lines in the file.
		 */
		lines?: number;
		/**
		 * Total parsed records if the file format is JSONL.
		 */
		records?: number;
	}>;
	/**
	 * Summary metadata counts of records across database files.
	 */
	summary: {
		/**
		 * Count of memory event records.
		 */
		eventCount: number;
		/**
		 * Count of conversation history records.
		 */
		conversationCount: number;
		/**
		 * Count of indexed chunks.
		 */
		chunkCount: number;
		/**
		 * Count of semantic graph nodes.
		 */
		graphNodeCount: number;
		/**
		 * Count of semantic graph edges.
		 */
		graphEdgeCount: number;
		/**
		 * Count of local snapshots created.
		 */
		snapshotCount: number;
	};
}

/**
 * Inspects a MemoFS workspace and constructs a detailed health report.
 *
 * @param store - The memory store to inspect.
 * @param rootDir - The root directory of the workspace.
 * @returns Detailed MemoFsInspection health/status report.
 */
export async function inspectMemoFs(
	store: MemoryStore,
	rootDir: string,
): Promise<MemoFsInspection> {
	let dirExists = false;
	try {
		await stat(resolve(rootDir, ".memofs"));
		dirExists = true;
	} catch {
		dirExists = false;
	}
	const manifestContent = await readTextIfExists(
		store,
		MEMOFS_CLI_PATHS.manifest,
	);
	const manifest =
		manifestContent === undefined ? undefined : parseManifest(manifestContent);

	const tracked = [
		MEMOFS_CLI_PATHS.manifest,
		MEMOFS_CLI_PATHS.coreMemory,
		MEMOFS_CLI_PATHS.notesMemory,
		MEMOFS_CLI_PATHS.memoryEvents,
		MEMOFS_CLI_PATHS.conversations,
		MEMOFS_CLI_PATHS.chunks,
		MEMOFS_CLI_PATHS.graphNodes,
		MEMOFS_CLI_PATHS.graphEdges,
		MEMOFS_CLI_PATHS.snapshots,
	];

	const files: MemoFsInspection["files"] = [];
	const recordCounts: Record<string, number> = {};

	for (const filePath of tracked) {
		const content = await readTextIfExists(store, filePath);
		const isJsonl = filePath.endsWith(".jsonl");

		let records = 0;
		if (content !== undefined && isJsonl) {
			records = parseJsonl(content, { strict: false }).length;
			recordCounts[filePath] = records;
		}

		files.push({
			path: filePath,
			exists: content !== undefined,
			bytes: content ? Buffer.byteLength(content) : 0,
			...(content !== undefined
				? { lines: content.split(/\r?\n/).filter(Boolean).length }
				: {}),
			...(content !== undefined && isJsonl ? { records } : {}),
		});
	}

	return {
		rootDir,
		exists: dirExists,
		...(manifest ? { manifest } : {}),
		files,
		summary: {
			eventCount: recordCounts[MEMOFS_CLI_PATHS.memoryEvents] ?? 0,
			conversationCount: recordCounts[MEMOFS_CLI_PATHS.conversations] ?? 0,
			chunkCount: recordCounts[MEMOFS_CLI_PATHS.chunks] ?? 0,
			graphNodeCount: recordCounts[MEMOFS_CLI_PATHS.graphNodes] ?? 0,
			graphEdgeCount: recordCounts[MEMOFS_CLI_PATHS.graphEdges] ?? 0,
			snapshotCount: recordCounts[MEMOFS_CLI_PATHS.snapshots] ?? 0,
		},
	};
}
