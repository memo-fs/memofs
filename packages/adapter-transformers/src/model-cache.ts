/**
 * Shared user-level cache resolution for downloaded ONNX model weights.
 *
 * @remarks
 * Transformers.js defaults to a cache directory relative to the process
 * working directory. MemoFS runs from several working directories over the
 * lifetime of a machine (`memofs init` from the project root, an MCP server
 * launched by an IDE, test runners, ...), so a cwd-relative cache silently
 * re-downloads the same weights once per directory. Resolving one explicit
 * user-level cache fixes that: one download per machine, shared across
 * projects and runtimes.
 *
 * @public
 */

import os from "node:os";
import path from "node:path";

/**
 * Resolve the default shared cache directory for ONNX model weights.
 *
 * @remarks
 * Honors `XDG_CACHE_HOME` when it is set to a non-empty value; otherwise
 * falls back to `.cache` under the user's home directory. The returned path
 * always ends with `memofs/models`.
 *
 * @param env - Environment to read `XDG_CACHE_HOME` from. Defaults to
 * `process.env`; injectable for tests.
 * @returns Absolute cache directory path.
 *
 * @public
 */
export function resolveModelCacheDir(
	env: { XDG_CACHE_HOME?: string } = process.env,
): string {
	const xdg =
		typeof env.XDG_CACHE_HOME === "string" ? env.XDG_CACHE_HOME.trim() : "";
	const base = xdg.length > 0 ? xdg : path.join(os.homedir(), ".cache");
	return path.join(base, "memofs", "models");
}
