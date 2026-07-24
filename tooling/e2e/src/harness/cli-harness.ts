/**
 * Real CLI harness — spawn built binary & cross-visibility proof.
 *
 * @remarks
 * Resolves the built CLI binary `packages/cli/dist/bin/memofs.mjs`,
 * spawns via `node` child_process with isolated tmpDir, captures
 * stdout/stderr/exitCode. Proves binary packing, arg parsing, file-first
 * truth, and cross-visibility with core harness (ADR 0021, ticket 61).
 *
 * Node-only: imports `node:fs`, `node:child_process`.
 */

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers.js";

import type { RealHarness } from "./core-harness.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Result of a CLI exec.
 * @public
 */
export type CliExecResult = {
	/** Captured stdout (joined). */
	stdout: string;
	/** Captured stderr (joined). */
	stderr: string;
	/** Exit code (0 = success). */
	exitCode: number;
	/** Combined stdout+stderr for debugging. */
	combined: string;
	/** tmpDir used for this exec (same as harness.tmpDir). */
	tmpDir: string;
	/** Args that were passed (including auto --root). */
	args: string[];
};

/**
 * CLI real harness — spawn built binary proof.
 * @public
 */
export type CliRealHarness = RealHarness & {
	/** Absolute path to resolved CLI binary (dist/bin/memofs.mjs). */
	cliBin: string;
	/**
	 * Exec CLI with args.
	 * Automatically prepends `--root <tmpDir>` unless caller includes `--root`/`-r`.
	 * @param args - CLI args e.g. `['init','--no-input']` or `['remember','fact','--json']`
	 * @param opts - optional env/cwd overrides
	 */
	exec: (
		args: string[],
		opts?: { env?: Record<string, string>; cwd?: string; timeoutMs?: number },
	) => Promise<CliExecResult>;
};

export type CreateRealCliHarnessOptions = {
	/** Reuse existing tmpDir instead of creating new (for cross-visibility). */
	tmpDir?: string;
	/** Prefix for mkdtemp. @defaultValue "memofs-e2e-cli-" */
	prefix?: string;
	/** Explicit CLI bin path override. */
	cliBin?: string;
	/** Extra env vars to merge. */
	env?: Record<string, string>;
};

/**
 * Resolve CLI bin path.
 * Tries multiple candidates for robustness inside monorepo:
 * - explicit override
 * - relative to this file: ../../../../packages/cli/dist/bin/memofs.mjs
 * - memofs-cli.mjs fallback (old name per ticket)
 * - from process.cwd() if cwd is repo root
 */
function resolveCliBin(explicit?: string): string {
	if (explicit) {
		if (!existsSync(explicit)) {
			throw new Error(`CliRealHarness: explicit cliBin not found: ${explicit}`);
		}
		return resolve(explicit);
	}

	const candidates: string[] = [];

	// From file location: tooling/e2e/src/harness -> root (4 levels)
	const fromFileRoot = resolve(__dirname, "../../../../packages/cli/dist/bin/memofs.mjs");
	const fromFileRootCliLegacy = resolve(
		__dirname,
		"../../../../packages/cli/dist/bin/memofs-cli.mjs",
	);
	const fromFileRootAlt = resolve(__dirname, "../../../..", "packages/cli/dist/bin/memofs.mjs");
	candidates.push(fromFileRoot, fromFileRootCliLegacy, fromFileRootAlt);

	// From current working directory (vitest may run with cwd = repo root or package root)
	const cwd = process.cwd();
	candidates.push(
		resolve(cwd, "packages/cli/dist/bin/memofs.mjs"),
		resolve(cwd, "packages/cli/dist/bin/memofs-cli.mjs"),
		resolve(cwd, "../../packages/cli/dist/bin/memofs.mjs"),
		resolve(cwd, "../cli/dist/bin/memofs.mjs"),
		resolve(cwd, "dist/bin/memofs.mjs"), // if cwd is packages/cli itself
	);

	// Dedupe
	const seen = new Set<string>();
	const uniq: string[] = [];
	for (const c of candidates) {
		if (!seen.has(c)) {
			seen.add(c);
			uniq.push(c);
		}
	}

	for (const candidate of uniq) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new Error(
		`CliRealHarness: could not resolve CLI bin. Tried:\n${uniq.join("\n")}\n` +
			`Did you run pnpm build? cwd=${cwd}`,
	);
}

/**
 * Creates a real CLI harness with isolated tmpDir.
 *
 * Proves file-first truth: `exec(['init','--no-input'])` creates `.memofs/`
 * with manifest, not touching repo or home.
 *
 * Cross-visibility: after `exec(['remember', fact])`, a CoreRealHarness
 * with same tmpDir can `search` and find the fact.
 *
 * @example
 * ```ts
 * const cli = await createRealCliHarness();
 * try {
 *   const init = await cli.exec(['init','--no-input']);
 *   expect(init.exitCode).toBe(0);
 *   await cli.assertFileExists('.memofs/manifest.json');
 *   await cli.exec(['remember','Simba prefers TS']);
 *   const ctx = await cli.exec(['context','--json']);
 *   const parsed = JSON.parse(ctx.stdout);
 * } finally {
 *   await cli.cleanup();
 * }
 * ```
 *
 * @public
 */
export async function createRealCliHarness(
	options: CreateRealCliHarnessOptions = {},
): Promise<CliRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-cli-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));

	if (options.tmpDir) {
		await mkdir(tmpDir, { recursive: true });
	}

	const cliBin = resolveCliBin(options.cliBin);

	let cleaned = false;

	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		await rm(tmpDir, { recursive: true, force: true });
	};

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};
	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};
	const listFiles = async (): Promise<string[]> => {
		return listFilesRecursive(tmpDir);
	};
	const snapshotFs = async (): Promise<Record<string, string>> => {
		return snapshotFsRecursive(tmpDir);
	};

	const exec = async (
		args: string[],
		opts?: { env?: Record<string, string>; cwd?: string; timeoutMs?: number },
	): Promise<CliExecResult> => {
		// Always isolate via MEMOFS_ROOT and --root
		const hasRoot = args.includes("--root") || args.includes("-r");
		const finalArgs = hasRoot ? [...args] : ["--root", tmpDir, ...args];

		// Build env: isolate, disable color for stable JSON parsing
		const env: Record<string, string> = {
			...process.env as Record<string, string>,
			MEMOFS_ROOT: tmpDir,
			MEMOFS_HOME: tmpDir, // legacy ticket name, harmless
			NO_COLOR: "1",
			FORCE_COLOR: "0",
			...options.env,
			...opts?.env,
		};

		// Ensure we don't touch user's home: set HOME to tmpDir as well? No, that would break node module resolution.
		// MEMOFS_ROOT is the documented isolation mechanism.

		const cwd = opts?.cwd ?? tmpDir;
		const timeoutMs = opts?.timeoutMs ?? 30_000;

		return new Promise<CliExecResult>((resolvePromise, reject) => {
			// Spawn via node binary: `node <cliBin> --root <tmpDir> ...`
			const child = spawn(process.execPath, [cliBin, ...finalArgs], {
				cwd,
				env,
				stdio: ["ignore", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";

			child.stdout?.on("data", (chunk: Buffer) => {
				stdout += chunk.toString("utf8");
			});
			child.stderr?.on("data", (chunk: Buffer) => {
				stderr += chunk.toString("utf8");
			});

			let timedOut = false;
			let timeoutHandle: NodeJS.Timeout | undefined;
			if (timeoutMs > 0) {
				timeoutHandle = setTimeout(() => {
					timedOut = true;
					child.kill("SIGKILL");
				}, timeoutMs);
			}

			child.on("error", (err) => {
				if (timeoutHandle) clearTimeout(timeoutHandle);
				reject(err);
			});

			child.on("close", (code) => {
				if (timeoutHandle) clearTimeout(timeoutHandle);
				if (timedOut) {
					reject(
						new Error(
							`CliRealHarness: exec timed out after ${timeoutMs}ms: ${finalArgs.join(" ")}`,
						),
					);
					return;
				}
				const exitCode = typeof code === "number" ? code : 1;
				resolvePromise({
					stdout,
					stderr,
					exitCode,
					combined: `${stdout}\n${stderr}`.trim(),
					tmpDir,
					args: finalArgs,
				});
			});
		});
	};

	// Sanity: cliBin file exists
	try {
		await stat(cliBin);
	} catch {
		throw new Error(`CliRealHarness: cliBin does not exist after resolution: ${cliBin}`);
	}

	return {
		tmpDir,
		cliBin,
		cleanup,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
		exec,
	};
}
