/**
 * CLI MemoFS helper — creates a MemoFS instance from CLI flags, env vars, and config files.
 *
 * Replaces the old `config/runtime.ts`, `cloud/client.ts`, and `fs/memofs-fs.ts` abstractions.
 * The MemoFS class handles all config resolution, mode awareness, and cloud client creation internally.
 *
 * @module memofs-cli
 */

import { MemoFS, type MemoFsConfig } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	readMemoFsConfigFileSync,
} from "@memofs/core/node-fs";

export interface CliMemoFSOptions {
	cwd?: string;
	root?: string;
	runtime?: string;
	cloudUrl?: string;
	apiKey?: string;
	workspaceId?: string;
	projectId?: string;
	timeoutMs?: string | number;
	readPolicy?: string;
	writePolicy?: string;
}

/**
 * Creates a MemoFS instance from CLI flags, environment variables, and `.memofs/config.json`.
 *
 * @param options - CLI flag options.
 * @returns A MemoFS instance configured for the resolved mode.
 */
export function createMemoFSFromCli(options: CliMemoFSOptions = {}): MemoFS {
	const rootDir = options.root ?? options.cwd ?? ".";
	const config: MemoFsConfig = {
		// Core no longer reads `.memofs/config.json` (the read moved out of the
		// Worker-loadable barrel). The CLI is Node-only, so it reads the file
		// here and passes it as `fileConfig` — preserving constructor > env >
		// file > defaults.
		fileConfig: readMemoFsConfigFileSync(rootDir),
		rootDir,
		...(options.runtime !== undefined
			? { mode: options.runtime as MemoFsConfig["mode"] }
			: {}),
		...(options.projectId !== undefined
			? { projectId: options.projectId }
			: {}),
		...(options.workspaceId !== undefined
			? { workspaceId: options.workspaceId }
			: {}),
		...(options.readPolicy !== undefined
			? { readPolicy: options.readPolicy as MemoFsConfig["readPolicy"] }
			: {}),
		...(options.writePolicy !== undefined
			? { writePolicy: options.writePolicy as MemoFsConfig["writePolicy"] }
			: {}),
		...(options.cloudUrl !== undefined ||
		options.apiKey !== undefined ||
		options.timeoutMs !== undefined
			? {
					cloud: {
						...(options.cloudUrl !== undefined
							? { baseUrl: options.cloudUrl }
							: {}),
						...(options.apiKey !== undefined ? { apiKey: options.apiKey } : {}),
						...(typeof options.timeoutMs === "number" && options.timeoutMs > 0
							? { timeoutMs: options.timeoutMs }
							: {}),
						userAgent: "memofs/cli",
					},
				}
			: {}),
	};

	// The CLI is Node-only: inject the filesystem-backed store explicitly. The
	// root `@memofs/core` barrel is Worker-safe (no `node:fs` default), so
	// a `local`/`hybrid` runtime requires a `store`. The volatile "memory" mode
	// defaults to an in-memory store inside the constructor.
	const resolvedMode = config.mode ?? "local";
	const withStore: MemoFsConfig =
		resolvedMode === "memory"
			? config
			: {
					...config,
					store: createNodeFsMemoryStore({
						rootDir: config.rootDir ?? ".",
						createRoot: true,
						missingFileBehavior: "empty",
					}),
				};

	return new MemoFS(withStore);
}
