import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { inspectTekMemo } from "../protocol/summary";

export interface InspectCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean;
}

export async function runInspectCommand(
	options: InspectCommandOptions,
): Promise<number> {
	const inspection = await inspectTekMemo(options.fs);

	if (options.json) {
		options.output.write(JSON.stringify(inspection, null, 2));
		return 0;
	}

	const lines = [
		`TekMemo root: ${inspection.rootDir}`,
		`.tekmemo exists: ${inspection.exists ? "yes" : "no"}`,
		inspection.manifest
			? `Project: ${inspection.manifest.projectId}`
			: "Project: missing manifest",
		"",
		"Files:",
	];

	for (const file of inspection.files) {
		lines.push(
			`- ${file.path}: ${file.exists ? `${file.bytes} bytes` : "missing"}${file.records !== undefined ? `, ${file.records} records` : ""}`,
		);
	}

	lines.push("");
	lines.push("Summary:");
	lines.push(`- events: ${inspection.summary.eventCount}`);
	lines.push(`- conversations: ${inspection.summary.conversationCount}`);
	lines.push(`- chunks: ${inspection.summary.chunkCount}`);
	lines.push(`- graph nodes: ${inspection.summary.graphNodeCount}`);
	lines.push(`- graph edges: ${inspection.summary.graphEdgeCount}`);
	lines.push(`- snapshots: ${inspection.summary.snapshotCount}`);

	options.output.write(lines.join("\n"));
	return 0;
}
