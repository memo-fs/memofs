/**
 * CLI config file writer for `.memofs/config.json`.
 *
 * Config resolution (env vars, flags, config file merging) is now handled by
 * `MemoFS`'s internal `resolveMemoFsConfig` — this module only retains the
 * `writeDefaultCliConfig` function for the `memofs config init` command.
 *
 * @module runtime
 */

import fs from "node:fs/promises";
import path from "node:path";
import pkg from "../../package.json" with { type: "json" };

export interface MemoFsConfigFile {
	/** JSON Schema URL for editor validation of `.memofs/config.json`. */
	$schema?: string;
	runtime?: "local" | "hybrid" | "memory";
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
		readPolicy?: "local-first" | "cloud-first" | "local-only";
		writePolicy?: "local-first" | "cloud-first" | "local-only";
	};
}

/**
 * Canonical JSON Schema URL for a given MemoFS version.
 *
 * Used as the `$schema` line in `.memofs/config.json` so editors validate
 * against the version-appropriate schema.
 */
export function configSchemaUrl(version: string): string {
	return `https://docs.memofs.dev/${version}/config.schema.json`;
}

/**
 * Seeds or overrides a local workspace config file (`.memofs/config.json`) with defaults.
 *
 * @param input - Config write instructions.
 * @returns Status object detailing paths and whether file was created/overwritten.
 */
export async function writeDefaultCliConfig(input: {
	cwd: string;
	root?: string;
	config?: MemoFsConfigFile;
	force?: boolean;
}): Promise<{ path: string; created: boolean; overwritten: boolean }> {
	const root = path.resolve(input.cwd, input.root ?? ".");
	const configPath = path.join(root, ".memofs", "config.json");
	await fs.mkdir(path.dirname(configPath), { recursive: true });
	const exists = await fileExists(configPath);
	if (exists && !input.force)
		return { path: configPath, created: false, overwritten: false };
	const config = input.config ?? {
		$schema: configSchemaUrl(pkg.version),
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
