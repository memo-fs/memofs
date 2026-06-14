import readline from "node:readline/promises";
import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import {
	REQUIRED_DIRS,
	REQUIRED_FILES,
	TEKMEMO_PATHS,
} from "../protocol/constants";
import { createDefaultManifest } from "../protocol/manifest";

export interface InitCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	force?: boolean | undefined;
	projectId?: string | undefined;
	noInput?: boolean | undefined;
}

export async function runInitCommand(
	options: InitCommandOptions,
): Promise<number> {
	await options.fs.ensureSafeRoot();

	let projectId: string | undefined = options.projectId?.trim();
	if (projectId !== undefined && projectId.length === 0) projectId = undefined;

	if (!projectId && !options.json && !options.noInput && process.stdout.isTTY) {
		options.output.write("Initializing TekMemo...");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		try {
			const answer = await rl.question(
				"Enter project ID (leave empty for random): ",
			);
			if (answer.trim()) projectId = answer.trim();
		} finally {
			rl.close();
		}
	}

	for (const dir of REQUIRED_DIRS) await options.fs.mkdir(dir);

	const existingManifest = await options.fs.readTextIfExists(
		TEKMEMO_PATHS.manifest,
	);
	if (existingManifest && !options.force) {
		const data = {
			created: false,
			rootDir: options.fs.rootDir,
			message: ".tekmemo already exists. Use --force to overwrite seed files.",
		};
		if (options.json) printJsonEnvelope(options.output, "init", data);
		else options.output.write(data.message);
		return 0;
	}

	const manifest = createDefaultManifest(projectId ? { projectId } : undefined);
	const seedFiles: Record<string, string> = {
		[TEKMEMO_PATHS.manifest]: `${JSON.stringify(manifest, null, 2)}\n`,
		[TEKMEMO_PATHS.coreMemory]: "# Core Memory\n\n",
		[TEKMEMO_PATHS.notesMemory]: "# Notes\n\n",
		[TEKMEMO_PATHS.memoryEvents]: "",
		[TEKMEMO_PATHS.conversations]: "",
		[TEKMEMO_PATHS.chunks]: "",
		[TEKMEMO_PATHS.graphNodes]: "",
		[TEKMEMO_PATHS.graphEdges]: "",
		[TEKMEMO_PATHS.snapshots]: "",
	};

	const created: string[] = [];
	const overwritten: string[] = [];
	const skipped: string[] = [];

	for (const file of REQUIRED_FILES) {
		const exists = await options.fs.exists(file);
		if (!exists || options.force) {
			await options.fs.writeText(file, seedFiles[file] ?? "");
			if (exists) overwritten.push(file);
			else created.push(file);
		} else {
			skipped.push(file);
		}
	}

	const data = {
		created: true,
		rootDir: options.fs.rootDir,
		manifest,
		files: { created, overwritten, skipped },
	};
	if (options.json) printJsonEnvelope(options.output, "init", data);
	else
		options.output.success(
			`Initialized .tekmemo at ${options.fs.rootDir} (Project ID: ${manifest.projectId ?? "none"})`,
		);
	return 0;
}
