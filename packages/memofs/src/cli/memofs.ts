/**
 * CLI MemoFS helper — creates a MemoFS instance from CLI flags, env vars, and config files.
 *
 * Replaces the old `config/runtime.ts`, `cloud/client.ts`, and `fs/memofs-fs.ts` abstractions.
 * The MemoFS class handles all config resolution, mode awareness, and cloud client creation internally.
 *
 * @module memofs-cli
 */

import type { MemoFS, MemoFsConfig } from "@memofs/core";
import { createNodeMemoFs } from "@memofs/core/node-fs";

export interface CliMemoFSOptions {
	cwd?: string;
	root?: string;
	runtime?: string;
	cloudUrl?: string;
	apiKey?: string;
	workspaceId?: string;
	projectId?: string;
	timeoutMs?: string | number;
}

/**
 * Creates a MemoFS instance from CLI flags, environment variables, and `.memofs/config.json`.
 *
 * @param options - CLI flag options.
 * @returns A MemoFS instance configured for the resolved mode.
 */
export function createMemoFSFromCli(options: CliMemoFSOptions = {}): MemoFS {
	const rootDir = options.root ?? options.cwd ?? ".";
	const timeoutMs =
		typeof options.timeoutMs === "string"
			? Number(options.timeoutMs)
			: options.timeoutMs;

	return createNodeMemoFs({
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
		...(options.cloudUrl !== undefined ||
		options.apiKey !== undefined ||
		(typeof timeoutMs === "number" && timeoutMs > 0)
			? {
					cloud: {
						...(options.cloudUrl !== undefined
							? { baseUrl: options.cloudUrl }
							: {}),
						...(options.apiKey !== undefined ? { apiKey: options.apiKey } : {}),
						...(typeof timeoutMs === "number" && timeoutMs > 0
							? { timeoutMs }
							: {}),
						userAgent: "memofs/cli",
					},
				}
			: {}),
	});
}
