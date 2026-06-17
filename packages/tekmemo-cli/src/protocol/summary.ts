/**
 * CLI workspace summary and health-inspection utility.
 *
 * @module summary
 */

import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { MemoryStore } from "@tekbreed/tekmemo";
import { readTextIfExists } from "../cli/store-helpers";
import { TEKMEMO_PATHS } from "./constants";
import { parseJsonl } from "./jsonl";
import { parseManifest, type TekMemoCliManifest } from "./manifest";

/**
 * Detailed diagnosis/inspection report of a TekMemo workspace repository.
 */
export interface TekMemoInspection {
	/**
	 * Normalized absolute workspace root directory path.
	 */
	rootDir: string;
	/**
	 * Whether the `.tekmemo` directory physically exists.
	 */
	exists: boolean;
	/**
	 * The parsed manifest.json object, if available.
	 */
	manifest?: TekMemoCliManifest;
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
 * Inspects a TekMemo workspace and constructs a detailed health report.
 *
 * @param store - The memory store to inspect.
 * @param rootDir - The root directory of the workspace.
 * @returns Detailed TekMemoInspection health/status report.
 */
export async function inspectTekMemo(
	store: MemoryStore,
	rootDir: string,
): Promise<TekMemoInspection> {
	let dirExists = false;
	try {
		await stat(resolve(rootDir, ".tekmemo"));
		dirExists = true;
	} catch {
		dirExists = false;
	}
	const manifestContent = await readTextIfExists(store, TEKMEMO_PATHS.manifest);
	const manifest =
		manifestContent === undefined ? undefined : parseManifest(manifestContent);

	const tracked = [
		TEKMEMO_PATHS.manifest,
		TEKMEMO_PATHS.coreMemory,
		TEKMEMO_PATHS.notesMemory,
		TEKMEMO_PATHS.memoryEvents,
		TEKMEMO_PATHS.conversations,
		TEKMEMO_PATHS.chunks,
		TEKMEMO_PATHS.graphNodes,
		TEKMEMO_PATHS.graphEdges,
		TEKMEMO_PATHS.snapshots,
	];

	const files: TekMemoInspection["files"] = [];
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
			eventCount: recordCounts[TEKMEMO_PATHS.memoryEvents] ?? 0,
			conversationCount: recordCounts[TEKMEMO_PATHS.conversations] ?? 0,
			chunkCount: recordCounts[TEKMEMO_PATHS.chunks] ?? 0,
			graphNodeCount: recordCounts[TEKMEMO_PATHS.graphNodes] ?? 0,
			graphEdgeCount: recordCounts[TEKMEMO_PATHS.graphEdges] ?? 0,
			snapshotCount: recordCounts[TEKMEMO_PATHS.snapshots] ?? 0,
		},
	};
}
