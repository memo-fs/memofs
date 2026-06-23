/**
 * CLI Tekmemo helper — creates a Tekmemo instance from CLI flags, env vars, and config files.
 *
 * Replaces the old `config/runtime.ts`, `cloud/client.ts`, and `fs/tekmemo-fs.ts` abstractions.
 * The Tekmemo class handles all config resolution, mode awareness, and cloud client creation internally.
 *
 * @module tekmemo-cli
 */

import { Tekmemo, type TekmemoConfig } from "@tekbreed/tekmemo";

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
	const config: TekmemoConfig = {
		...(options.root !== undefined ? { rootDir: options.root } : {}),
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
						userAgent: "@tekbreed/tekmemo/cli",
					},
				}
			: {}),
	};

	return new Tekmemo(config);
}
