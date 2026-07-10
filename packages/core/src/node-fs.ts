/**
 * Node-only `node:fs`/`node:path`-backed memory store subpath.
 *
 * @remarks
 * This is the dedicated Node entry for the filesystem-backed `MemoryStore` and
 * its `node:fs`/`node:path` utils. It is **deliberately** split out of the root
 * `@memofs/core` barrel so that importing the root barrel never pulls
 * `node:fs`/`node:path` at module-eval time. The `memofs-server` runtime
 * Worker cannot evaluate `node:fs` even under `nodejs_compat`, so
 * keeping it behind this subpath lets the Worker load the real `MemoFS` +
 * `RemoteBlobMemoryStore` from the root barrel while Node consumers (the CLI,
 * the MCP server, OSS self-hosters) opt into the filesystem store explicitly:
 *
 * ```ts
 * import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
 * const memo = new MemoFS({ store: createNodeFsMemoryStore({ rootDir }), projectId });
 * ```
 *
 * The `MemoFS` constructor no longer supplies a `node:fs` default — a
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
// `createTempMemoFsDir` is a Node-only testing helper (`node:fs`/`os`/`path`),
// kept off the Worker-safe root barrel for the same reason as the Node store.
export * from "./testing/temp-dir";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createNodeFsMemoryStore } from "./fs/create-node-fs-memory-store";
import {
	extractConfigFile,
	type MemoFsConfig,
	type MemoFsConfigFile,
} from "./memofs/config";
import { MemoFS } from "./memofs/memo-fs";

/**
 * Reads + parses `.memofs/config.json` synchronously (Node-only).
 *
 * Core's `resolveMemoFsConfig` no longer touches the filesystem (the read
 * moved out of the Worker-loadable root barrel). A Node consumer
 * (the CLI / MCP factory) calls this, then passes the result as
 * `MemoFsConfig.fileConfig` so the constructor > env > file > defaults
 * priority chain is preserved.
 *
 * Best-effort: a missing/malformed file returns `{}` (defaults apply).
 *
 * @param rootDir - The workspace root containing `.memofs/config.json`.
 * @returns the parsed config-file values (empty when absent/invalid).
 */
export function readMemoFsConfigFileSync(rootDir: string): MemoFsConfigFile {
	try {
		const path = resolve(rootDir, ".memofs", "config.json");
		const raw = readFileSync(path, "utf8");
		return extractConfigFile(JSON.parse(raw) as Record<string, unknown>);
	} catch {
		return {};
	}
}

/**
 * Constructs a `MemoFS` instance from Node-only options — the shared factory
 * for every Node consumer (the CLI, the MCP server, OSS self-hosters).
 *
 * Encapsulates the three things every Node consumer does:
 * 1. Reads `.memofs/config.json` from `rootDir` (when `fileConfig` isn't
 *    already supplied) and passes it as `MemoFsConfig.fileConfig`.
 * 2. Creates a `NodeFsMemoryStore` from `rootDir` (when `store` isn't
 *    injected — e.g. an `InMemoryMemoryStore` for tests).
 * 3. Constructs `new MemoFS(config)` with the resolved values.
 *
 * Consumers that need extras (embedder wiring, `userAgent`, string-to-number
 * coercion for CLI flags) pass them via the `MemoFsConfig` fields — the
 * function spreads caller-supplied config over its defaults so every
 * `MemoFsConfig` field is honoured.
 *
 * @param config - MemoFs config overrides. `rootDir` defaults to `"."`;
 *   `fileConfig` and `store` are filled in when omitted.
 * @returns A constructed `MemoFS` instance.
 */
export function createNodeMemoFs(config: MemoFsConfig = {}): MemoFS {
	const rootDir = config.rootDir ?? ".";
	return new MemoFS({
		...config,
		rootDir,
		fileConfig: config.fileConfig ?? readMemoFsConfigFileSync(rootDir),
		store:
			config.store ??
			createNodeFsMemoryStore({
				rootDir,
				createRoot: true,
				missingFileBehavior: "empty",
			}),
	});
}
