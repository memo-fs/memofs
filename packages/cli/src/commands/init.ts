/**
 * CLI command handler for initializing a new MemoFS local workspace.
 *
 * Creates the canonical `.memofs/` directory structure, seeds all memory
 * files, and writes a default `.memofs/config.json` with a `$schema`
 * reference pointing to the schema bundled in the installed CLI package.
 *
 * @module init
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import readline from "node:readline/promises";
import type { MemoFS } from "@memofs/core";
import { getRootDir, readTextIfExists } from "../cli/store-helpers";
import { resolveSchemaPath, writeDefaultCliConfig } from "../config";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { MEMOFS_CLI_PATHS, REQUIRED_DIRS } from "../protocol/constants";
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

	// Check existence BEFORE bootstrapping — bootstrap creates the manifest,
	// so checking after would always report ".memofs already exists" on first init.
	const existingManifest = await readTextIfExistsSafe(
		options.memo.store,
		MEMOFS_CLI_PATHS.manifest,
	);
	if (existingManifest && !options.force) {
		const configResult = await writeDefaultCliConfig({
			cwd: rootDir,
			root: ".",
			force: options.force,
			config: {
				$schema: resolveSchemaPath(rootDir),
				runtime: "local",
				root: ".",
			},
		});
		const data = {
			created: false,
			rootDir,
			message: ".memofs already exists. Use --force to overwrite seed files.",
			config: configResult,
		};
		if (options.json) printJsonEnvelope(options.output, "init", data);
		else options.output.write(data.message);
		return 0;
	}

	let projectId: string | undefined = options.projectId?.trim();
	if (projectId !== undefined && projectId.length === 0) projectId = undefined;

	if (!projectId && !options.json && !options.noInput && process.stdout.isTTY) {
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

	// Bootstrap is the canonical file creator — single source of truth for
	// default templates. Pass projectId and force so first init is correctly
	// recorded and --force overwrites.
	const bootstrapResult = await options.memo.bootstrap({
		...(projectId ? { projectId } : {}),
		...(options.force ? { overwriteExisting: true } : {}),
	});

	// Read back the manifest that bootstrap wrote (it contains the resolved projectId).
	const manifestRaw = await readTextIfExistsSafe(
		options.memo.store,
		MEMOFS_CLI_PATHS.manifest,
	);
	let manifest: ReturnType<typeof createDefaultManifest>;
	try {
		manifest = manifestRaw
			? (JSON.parse(manifestRaw) as ReturnType<typeof createDefaultManifest>)
			: createDefaultManifest(projectId ? { projectId } : undefined);
	} catch {
		manifest = createDefaultManifest(projectId ? { projectId } : undefined);
	}

	const configResult = await writeDefaultCliConfig({
		cwd: rootDir,
		root: ".",
		force: options.force,
		config: {
			$schema: resolveSchemaPath(rootDir),
			runtime: "local",
			root: ".",
		},
	});

	const data = {
		created: true,
		rootDir,
		manifest,
		files: bootstrapResult,
		config: configResult,
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
