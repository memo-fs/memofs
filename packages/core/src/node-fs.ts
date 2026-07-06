/**
 * Node-only `node:fs`/`node:path`-backed memory store subpath.
 *
 * @remarks
 * This is the dedicated Node entry for the filesystem-backed `MemoryStore` and
 * its `node:fs`/`node:path` utils. It is **deliberately** split out of the root
 * `@memofs/core` barrel so that importing the root barrel never pulls
 * `node:fs`/`node:path` at module-eval time. The `tekmemo-server` runtime
 * Worker cannot evaluate `node:fs` even under `nodejs_compat`, so
 * keeping it behind this subpath lets the Worker load the real `Tekmemo` +
 * `RemoteBlobMemoryStore` from the root barrel while Node consumers (the CLI,
 * the MCP server, OSS self-hosters) opt into the filesystem store explicitly:
 *
 * ```ts
 * import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
 * const memo = new Tekmemo({ store: createNodeFsMemoryStore({ rootDir }), projectId });
 * ```
 *
 * The `Tekmemo` constructor no longer supplies a `node:fs` default — a
 * `local`/`hybrid` runtime requires an injected `store`. This is the clean
 * split: the root barrel is Worker-safe; this subpath is Node-only.
 *
 * @public
 */

export * from "./fs/create-node-fs-memory-store";
export * from "./fs/node-fs-memory-store";
export * from "./fs/utils/normalize-options";
export * from "./fs/utils/normalize-root-dir";
export * from "./fs/utils/resolve-absolute-memory-path";
// `createTempTekMemoDir` is a Node-only testing helper (`node:fs`/`os`/`path`),
// kept off the Worker-safe root barrel for the same reason as the Node store.
export * from "./testing/temp-dir";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractConfigFile, type TekMemoConfigFile } from "./tekmemo/config";

/**
 * Reads + parses `.tekmemo/config.json` synchronously (Node-only).
 *
 * Core's `resolveTekmemoConfig` no longer touches the filesystem (the read
 * moved out of the Worker-loadable root barrel). A Node consumer
 * (the CLI / MCP factory) calls this, then passes the result as
 * `TekmemoConfig.fileConfig` so the constructor > env > file > defaults
 * priority chain is preserved.
 *
 * Best-effort: a missing/malformed file returns `{}` (defaults apply).
 *
 * @param rootDir - The workspace root containing `.tekmemo/config.json`.
 * @returns the parsed config-file values (empty when absent/invalid).
 */
export function readTekMemoConfigFileSync(rootDir: string): TekMemoConfigFile {
	try {
		const path = resolve(rootDir, ".tekmemo", "config.json");
		const raw = readFileSync(path, "utf8");
		return extractConfigFile(JSON.parse(raw) as Record<string, unknown>);
	} catch {
		return {};
	}
}
