/**
 * CLI command handler for initializing a new MemoFS local workspace.
 *
 * @module init
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import readline from "node:readline/promises";
import type { MemoFS } from "@memofs/core";
import {
	exists,
	getRootDir,
	readTextIfExists,
	writeText,
} from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import {
	REQUIRED_DIRS,
	REQUIRED_FILES,
	MEMOFS_PATHS,
} from "../protocol/constants";
import { createDefaultManifest } from "../protocol/manifest";

/**
 * Options configuration for the init command.
 */
export interface InitCommandOptions {
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
	 * If true, forces overwriting of existing workspace seed files.
	 */
	force?: boolean | undefined;
	/**
	 * Custom project identifier to seed. If omitted, a random ID is prompted or generated.
	 */
	projectId?: string | undefined;
	/**
	 * If true, suppresses interactive TTY prompt for project ID.
	 */
	noInput?: boolean | undefined;
}

/**
 * Runs the init command, generating standard directory layout and seed files.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runInitCommand(
	options: InitCommandOptions,
): Promise<number> {
	const rootDir = getRootDir(options.memo.store);
	await options.memo.bootstrap();

	let projectId: string | undefined = options.projectId?.trim();
	if (projectId !== undefined && projectId.length === 0) projectId = undefined;

	if (!projectId && !options.json && !options.noInput && process.stdout.isTTY) {
		options.output.write("Initializing MemoFS...");
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

	for (const dir of REQUIRED_DIRS) {
		await mkdir(resolve(rootDir, dir), { recursive: true });
	}

	const existingManifest = await readTextIfExistsSafe(
		options.memo.store,
		MEMOFS_PATHS.manifest,
	);
	if (existingManifest && !options.force) {
		const data = {
			created: false,
			rootDir,
			message: ".memofs already exists. Use --force to overwrite seed files.",
		};
		if (options.json) printJsonEnvelope(options.output, "init", data);
		else options.output.write(data.message);
		return 0;
	}

	const manifest = createDefaultManifest(projectId ? { projectId } : undefined);
	const seedFiles: Record<string, string> = {
		[MEMOFS_PATHS.manifest]: `${JSON.stringify(manifest, null, 2)}\n`,
		[MEMOFS_PATHS.coreMemory]: "# Core Memory\n\n",
		[MEMOFS_PATHS.notesMemory]: "# Notes\n\n",
		[MEMOFS_PATHS.memoryEvents]: "",
		[MEMOFS_PATHS.conversations]: "",
		[MEMOFS_PATHS.chunks]: "",
		[MEMOFS_PATHS.graphNodes]: "",
		[MEMOFS_PATHS.graphEdges]: "",
		[MEMOFS_PATHS.snapshots]: "",
	};

	const created: string[] = [];
	const overwritten: string[] = [];
	const skipped: string[] = [];

	for (const file of REQUIRED_FILES) {
		const fileExists = await exists(options.memo.store, file);
		if (!fileExists || options.force) {
			await writeText(options.memo.store, file, seedFiles[file] ?? "");
			if (fileExists) overwritten.push(file);
			else created.push(file);
		} else {
			skipped.push(file);
		}
	}

	const data = {
		created: true,
		rootDir,
		manifest,
		files: { created, overwritten, skipped },
	};
	if (options.json) printJsonEnvelope(options.output, "init", data);
	else
		options.output.success(
			`Initialized .memofs at ${rootDir} (Project ID: ${manifest.projectId ?? "none"})`,
		);
	return 0;
}

async function readTextIfExistsSafe(
	store: import("@memofs/core").MemoryStore,
	path: string,
): Promise<string | undefined> {
	return readTextIfExists(store, path);
}
