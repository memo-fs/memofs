/**
 * CLI config file writer for `.memofs/config.json`.
 *
 * Config resolution (env vars, flags, config file merging) is now handled by
 * `MemoFS`'s internal `resolveMemoFsConfig` — this module only retains the
 * `writeDefaultCliConfig` function for the `memofs config init` and
 * `memofs init` commands.
 *
 * The JSON schema is shipped inside the CLI package at `schema/config.json`
 * (exposed via the `@memofs/cli/schema/config.json` package export).
 * `resolveSchemaPath` emits a canonical, portable
 * `./node_modules/@memofs/cli/schema/config.json` reference (the value the
 * docs advertise) when that file exists under the project root, and falls
 * back to a hosted URL otherwise — see `resolveSchemaPath` for why the
 * previous `require.resolve` + `path.relative` approach was non-portable
 * inside workspace installs.
 *
 * @module runtime
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { MemoFsConfigFile } from "@memofs/core";

export type { MemoFsConfigFile };

/**
 * Hosted fallback used when the packaged schema file cannot be located on
 * disk (e.g. a bundler stripped package metadata). Matches the schema's
 * own `$id`.
 */
const FALLBACK_SCHEMA_URL = "https://docs.memofs.dev/schema/config.json";

/**
 * Canonical relative `$schema` reference that the docs advertise and that
 * works for the overwhelmingly common case: `@memofs/cli` installed as a
 * project dev dependency. Resolved from a project's `.memofs/config.json`,
 * this points at the schema file shipped inside the installed package.
 *
 * Kept as a constant so every consumer of the schema reference emits the
 * same portable, deterministic string instead of a layout-dependent
 * filesystem path.
 */
const CANONICAL_SCHEMA_REF = "./node_modules/@memofs/cli/schema/config.json";

/**
 * Resolves the `$schema` value for `.memofs/config.json`.
 *
 * Strategy — emit a deterministic, portable reference instead of a path
 * computed from wherever `require.resolve` happened to land:
 *
 * 1. **Canonical node_modules reference** (preferred). If
 *    `<rootDir>/node_modules/@memofs/cli/schema/config.json` exists, return
 *    `./node_modules/@memofs/cli/schema/config.json`. This matches the docs
 *    example and is portable across machines, regardless of whether
 *    `@memofs/cli` was installed via npm, pnpm (with symlinks), or yarn.
 *    The `node_modules/@memofs/cli` entry may itself be a symlink to a
 *    workspace package — `existsSync` follows symlinks, so this works
 *    inside the MemoFS monorepo too, without the previous bug of emitting
 *    `../../../Users/.../packages/cli/schema/config.json`.
 * 2. **Hosted fallback URL.** When the canonical file is not on disk under
 *    `<rootDir>` (e.g. the CLI was installed globally, bundled without
 *    `node_modules`, or the schema file was stripped), fall back to the
 *    hosted schema URL so editors still get validation.
 *
 * The previous implementation called `require.resolve` and then
 * `path.relative(rootDir/.memofs, resolvedFile)`. Inside a workspace
 * install, `require.resolve` follows the `@memofs/cli` symlink to the
 * source `packages/cli/schema/config.json`, which lives *outside* the
 * consumer's project root — `path.relative` then climbs past the root and
 * emits a non-portable `../../packages/...` (or even `../../../Users/...`)
 * reference. The canonical-ref-first approach sidesteps that entirely.
 *
 * @param rootDir - Project root directory containing `.memofs/`.
 * @returns A portable `./node_modules/...` `$schema` reference, or the
 * hosted URL when the schema file isn't present under `<rootDir>`.
 */
export function resolveSchemaPath(rootDir: string): string {
	const canonical = path.resolve(rootDir, CANONICAL_SCHEMA_REF);
	return existsSync(canonical) ? CANONICAL_SCHEMA_REF : FALLBACK_SCHEMA_URL;
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
