/**
 * CLI Tekmemo helper — creates a Tekmemo instance from CLI flags, env vars, and config files.
 *
 * Replaces the old `config/runtime.ts`, `cloud/client.ts`, and `fs/tekmemo-fs.ts` abstractions.
 * The Tekmemo class handles all config resolution, mode awareness, and cloud client creation internally.
 *
 * @module tekmemo-cli
 */

import { Tekmemo, type TekmemoConfig } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	readTekMemoConfigFileSync,
} from "@memofs/core/node-fs";

export interface CliTekmemoOptions {
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
 * Creates a Tekmemo instance from CLI flags, environment variables, and `.tekmemo/config.json`.
 *
 * @param options - CLI flag options.
 * @returns A Tekmemo instance configured for the resolved mode.
 */
export function createTekmemoFromCli(options: CliTekmemoOptions = {}): Tekmemo {
	const rootDir = options.root ?? options.cwd ?? ".";
	const config: TekmemoConfig = {
		// Core no longer reads `.tekmemo/config.json` (the read moved out of the
		// Worker-loadable barrel). The CLI is Node-only, so it reads the file
		// here and passes it as `fileConfig` — preserving constructor > env >
		// file > defaults.
		fileConfig: readTekMemoConfigFileSync(rootDir),
		rootDir,
		...(options.runtime !== undefined
			? { mode: options.runtime as TekmemoConfig["mode"] }
			: {}),
		...(options.runtime !== undefined
			? { mode: options.runtime as TekmemoConfig["mode"] }
			: {}),
		...(options.projectId !== undefined
			? { projectId: options.projectId }
			: {}),
		...(options.workspaceId !== undefined
			? { workspaceId: options.workspaceId }
			: {}),
		...(options.readPolicy !== undefined
			? { readPolicy: options.readPolicy as TekmemoConfig["readPolicy"] }
			: {}),
		...(options.writePolicy !== undefined
			? { writePolicy: options.writePolicy as TekmemoConfig["writePolicy"] }
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
						userAgent: "tekmemo/cli",
					},
				}
			: {}),
	};

	// The CLI is Node-only: inject the filesystem-backed store explicitly. The
	// root `@memofs/core` barrel is Worker-safe (no `node:fs` default), so
	// a `local`/`hybrid` runtime requires a `store`. The volatile "memory" mode
	// defaults to an in-memory store inside the constructor.
	const resolvedMode = config.mode ?? "local";
	const withStore: TekmemoConfig =
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

	return new Tekmemo(withStore);
}
