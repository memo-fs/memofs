import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import { TEKMEMO_PATHS } from "./constants";
import { parseJsonl } from "./jsonl";
import { parseManifest, type TekMemoCliManifest } from "./manifest";

export interface TekMemoInspection {
	rootDir: string;
	exists: boolean;
	manifest?: TekMemoCliManifest;
	files: Array<{
		path: string;
		exists: boolean;
		bytes: number;
		lines?: number;
		records?: number;
	}>;
	summary: {
		eventCount: number;
		conversationCount: number;
		chunkCount: number;
		graphNodeCount: number;
		graphEdgeCount: number;
		snapshotCount: number;
	};
}

export async function inspectTekMemo(
	fs: TekMemoFileSystem,
): Promise<TekMemoInspection> {
	const exists = await fs.exists(".tekmemo");
	const manifestContent = await fs.readTextIfExists(TEKMEMO_PATHS.manifest);
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
		const content = await fs.readTextIfExists(filePath);
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
		rootDir: fs.rootDir,
		exists,
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
