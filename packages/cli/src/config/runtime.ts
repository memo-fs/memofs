/**
 * CLI config file writer for `.memofs/config.json`.
 *
 * Config resolution (env vars, flags, config file merging) is now handled by
 * `MemoFS`'s internal `resolveMemoFsConfig` — this module only retains the
 * `writeDefaultCliConfig` function for the `memofs config init` and
 * `memofs init` commands.
 *
 * The JSON schema is shipped inside the CLI package at `schema/config.json`
 * (exposed via the `@memofs/cli/schema/config.json` package export) and
 * resolved at runtime to a relative path from the project's `.memofs/`
 * directory — no versioned URL needed, since `node_modules` already bundles
 * the matching version.
 *
 * @module runtime
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MemoFsConfigFile } from "@memofs/core";

export type { MemoFsConfigFile };

/**
 * Hosted fallback used when the packaged schema file cannot be located on
 * disk (e.g. a bundler stripped package metadata). Matches the schema's
 * own `$id`.
 */
const FALLBACK_SCHEMA_URL = "https://memofs.dev/schema/config.json";

/**
 * Locates the packaged `schema/config.json` on disk.
 *
 * Primary strategy: Node package self-reference — the CLI package declares
 * `"./schema/config.json"` in its `exports`, so `require.resolve` works both
 * when the CLI is installed in a consumer's `node_modules` and when running
 * from the repo itself. Fallback: walk upward from this module's directory
 * (which may be a bundled `dist/` chunk) looking for `schema/config.json`,
 * since the schema always sits at the package root next to `dist/`.
 *
 * @returns Absolute path to the schema file, or undefined if not found.
 */
function locateSchemaFile(): string | undefined {
	try {
		const require = createRequire(import.meta.url);
		return require.resolve("@memofs/cli/schema/config.json");
	} catch {
		// Fall through to the directory walk.
	}
	let dir = path.dirname(fileURLToPath(import.meta.url));
	for (let depth = 0; depth < 5; depth += 1) {
		const candidate = path.join(dir, "schema", "config.json");
		if (existsSync(candidate)) return candidate;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return undefined;
}

/**
 * Resolves the `$schema` value for `.memofs/config.json`: a relative path
 * from the project's `.memofs/` directory to the `config.json` schema shipped
 * inside the installed `@memofs/cli` package.
 *
 * This replaces the previous versioned-URL approach
 * (`https://docs.memofs.dev/<version>/config.schema.json`). Because
 * `node_modules` already bundles the current version of the CLI, the schema
 * is always version-matched — no separate publishing step required. When the
 * packaged file cannot be located, falls back to the hosted schema URL.
 *
 * @param rootDir - Project root directory containing `.memofs/`.
 * @returns A relative path (from `.memofs/`) to the schema file, e.g.
 * `../node_modules/@memofs/cli/schema/config.json`, or the hosted URL.
 */
export function resolveSchemaPath(rootDir: string): string {
	const schemaFile = locateSchemaFile();
	if (!schemaFile) return FALLBACK_SCHEMA_URL;
	const memofsDir = path.join(rootDir, ".memofs");
	// JSON Schema `$schema` references use forward slashes on every platform.
	return path.relative(memofsDir, schemaFile).split(path.sep).join("/");
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
		$schema: resolveSchemaPath(root),
		runtime: "local" as const,
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
