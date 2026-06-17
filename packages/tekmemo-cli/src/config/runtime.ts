/**
 * CLI config file writer for `.tekmemo/config.json`.
 *
 * Config resolution (env vars, flags, config file merging) is now handled by
 * `Tekmemo`'s internal `resolveTekmemoConfig` — this module only retains the
 * `writeDefaultCliConfig` function for the `tekmemo config init` command.
 *
 * @module runtime
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface TekMemoConfigFile {
	runtime?: "local" | "cloud" | "hybrid" | "memory";
	root?: string;
	projectId?: string;
	workspaceId?: string;
	cloud?: {
		baseUrl?: string;
		apiKey?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
	};
	hybrid?: {
		readPolicy?: "local-first" | "cloud-first" | "local-only" | "cloud-only";
		writePolicy?: "local-first" | "cloud-first" | "local-only" | "cloud-only";
	};
}

/**
 * Seeds or overrides a local workspace config file (`.tekmemo/config.json`) with defaults.
 *
 * @param input - Config write instructions.
 * @returns Status object detailing paths and whether file was created/overwritten.
 */
export async function writeDefaultCliConfig(input: {
	cwd: string;
	root?: string;
	config?: TekMemoConfigFile;
	force?: boolean;
}): Promise<{ path: string; created: boolean; overwritten: boolean }> {
	const root = path.resolve(input.cwd, input.root ?? ".");
	const configPath = path.join(root, ".tekmemo", "config.json");
	await fs.mkdir(path.dirname(configPath), { recursive: true });
	const exists = await fileExists(configPath);
	if (exists && !input.force)
		return { path: configPath, created: false, overwritten: false };
	const config = input.config ?? {
		runtime: "local",
		root: ".",
	};
	await fs.writeFile(
		configPath,
		`${JSON.stringify(config, null, 2)}\n`,
		"utf8",
	);
	return { path: configPath, created: !exists, overwritten: exists };
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.stat(filePath);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return false;
		throw error;
	}
}
