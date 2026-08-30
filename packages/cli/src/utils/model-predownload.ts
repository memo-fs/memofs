/**
 * Init-time predownload of the local embedding model weights.
 *
 * @remarks
 * `memofs init` writes a config that defaults `recall.localEmbeddings` to
 * `true`, so without this module the first vector recall would pay the model
 * download at MCP connect time. Instead, init resolves the Transformers.js
 * adapter installed in the user's project (brought in by
 * `@memofs/mcp-server`), constructs the default embedder, and prewarms it
 * into the shared user-level model cache — so by the time an agent connects,
 * the weights are already on disk.
 *
 * Two contracts matter here:
 *
 * 1. **Never fatal.** Offline or air-gap installs must still get a
 *    successful `init`. On any failure we warn and continue; the lazy
 *    embedder retries the download on first recall, so a skipped
 *    predownload only delays embeddings, it never breaks them.
 * 2. **Never a hard dependency.** The CLI must not depend on the adapter
 *    (that would drag the heavy ONNX runtime into every CLI install). The
 *    adapter is resolved from the *project's* `node_modules` via
 *    `createRequire`; when it is not there, the predownload is skipped with
 *    a hint.
 *
 * @module model-predownload
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_LOCAL_EMBEDDING_MODEL } from "@memofs/core";
import type { CliOutput, CliProgressBar } from "../output/output";

/** Module specifier of the adapter resolved from the user's project. */
const ADAPTER_SPECIFIER = "@memofs/adapter-transformers";

/** Progress payload forwarded by the adapter during model download/load. */
export interface ModelDownloadProgress {
	progress: number;
	status: string;
	file?: string;
}

/** Structural shape of the adapter module the predownload needs. */
interface AdapterModule {
	createTransformersEmbedder?: (options: {
		model?: string;
		onProgress?: (info: ModelDownloadProgress) => void;
	}) => {
		prewarm: () => Promise<void>;
	};
	resolveModelCacheDir?: () => string;
}

/**
 * Outcome of the init-time model predownload, reported structurally in
 * `--json` mode.
 *
 * - `"ready"` — weights are cached locally (downloaded now or already present).
 * - `"skipped"` — intentionally not attempted (disabled, or no adapter installed).
 * - `"failed"` — attempted but errored (e.g. no network). Non-fatal.
 */
export type ModelPredownloadResult =
	| {
			status: "ready";
			model: string;
			cacheDir?: string;
			alreadyCached?: boolean;
	  }
	| { status: "skipped"; reason: "disabled" | "unresolved"; message: string }
	| { status: "failed"; message: string };

/** Input for {@link predownloadLocalEmbeddingModel}. */
export interface ModelPredownloadInput {
	/** Project root the adapter is resolved from (`.memofs/` parent). */
	rootDir: string;
	/** CLI output writer for human-mode messages. */
	output: CliOutput;
	/** When true, suppress progress rendering and human messages. */
	json?: boolean;
	/**
	 * Model id to prewarm. Defaults to `MEMOFS_EMBEDDING_MODEL` when set,
	 * else the canonical default model.
	 */
	model?: string;
	/**
	 * Test seam replacing adapter resolution + import. When omitted, the
	 * adapter is resolved from the project root's `node_modules`.
	 *
	 * @internal
	 */
	loadAdapter?: (rootDir: string) => Promise<AdapterModule>;
}

/**
 * Resolve the adapter entry path from the user's project.
 *
 * Anchored strictly at the project root: that is where `@memofs/mcp-server`
 * (a hard adapter dependency) installs it, so the exact runtime the MCP
 * server will use is the one we prewarm. When the adapter is not installed
 * in the project, resolution throws and the predownload is skipped.
 */
function resolveAdapterPath(rootDir: string): string {
	const projectRequire = createRequire(path.join(rootDir, "package.json"));
	return projectRequire.resolve(ADAPTER_SPECIFIER);
}

async function loadAdapterModule(rootDir: string): Promise<AdapterModule> {
	const adapterPath = resolveAdapterPath(rootDir);
	// CJS interop: named exports may sit behind `default` depending on how
	// the adapter was built and imported.
	const imported = (await import(
		pathToFileURL(adapterPath).href
	)) as AdapterModule & { default?: AdapterModule };
	if (
		typeof imported.createTransformersEmbedder === "function" ||
		typeof imported.resolveModelCacheDir === "function"
	) {
		return imported;
	}
	return imported.default ?? imported;
}

/**
 * Build a progress renderer mapping adapter download events to the CLI
 * progress bar. Transformers.js reports per-file progress as a percentage
 * (0–100); older runtimes reported a 0–1 fraction — normalize both.
 */
function createDownloadProgress(
	output: CliOutput,
	json: boolean,
): { onProgress: (info: ModelDownloadProgress) => void; stop: () => void } {
	if (json) {
		return { onProgress: () => {}, stop: () => {} };
	}
	const bar: CliProgressBar = output.progress();
	return {
		onProgress(info) {
			if (info.status !== "progress" || !Number.isFinite(info.progress)) {
				return;
			}
			const percent = Math.min(
				100,
				Math.max(0, info.progress > 1 ? info.progress : info.progress * 100),
			);
			bar.update(Math.round(percent), 100, info.file ?? "model weights");
		},
		stop() {
			bar.stop();
		},
	};
}

function envFlag(value: string | undefined): boolean {
	return value === "1" || value?.toLowerCase() === "true";
}

/**
 * Predownload the local embedding model into the shared user-level cache.
 *
 * Non-fatal by contract: every failure path resolves to a `skipped` or
 * `failed` result (with a human-mode warning) instead of throwing.
 *
 * @param input - Project root, output writer, and optional overrides.
 * @returns Structured outcome for the init report.
 */
export async function predownloadLocalEmbeddingModel(
	input: ModelPredownloadInput,
): Promise<ModelPredownloadResult> {
	if (
		envFlag(process.env.MEMOFS_SKIP_MODEL_DOWNLOAD) ||
		process.env.MEMOFS_LOCAL_EMBEDDINGS === "0" ||
		process.env.MEMOFS_LOCAL_EMBEDDINGS?.toLowerCase() === "false"
	) {
		return {
			status: "skipped",
			reason: "disabled",
			message:
				"Embedding model predownload skipped (local embeddings disabled).",
		};
	}

	const model =
		input.model ??
		(typeof process.env.MEMOFS_EMBEDDING_MODEL === "string" &&
		process.env.MEMOFS_EMBEDDING_MODEL.length > 0
			? process.env.MEMOFS_EMBEDDING_MODEL
			: DEFAULT_LOCAL_EMBEDDING_MODEL);

	const loadAdapter = input.loadAdapter ?? loadAdapterModule;
	let adapter: AdapterModule;
	try {
		adapter = await loadAdapter(input.rootDir);
	} catch {
		const message = `Embedding model not predownloaded — ${ADAPTER_SPECIFIER} is not installed in this project. Install @memofs/mcp-server to enable local embeddings; the model will download on first recall.`;
		if (!input.json) input.output.warn(message);
		return { status: "skipped", reason: "unresolved", message };
	}

	const createEmbedder = adapter.createTransformersEmbedder;
	if (typeof createEmbedder !== "function") {
		const message = `Embedding model not predownloaded — ${ADAPTER_SPECIFIER} did not export createTransformersEmbedder.`;
		if (!input.json) input.output.warn(message);
		return { status: "skipped", reason: "unresolved", message };
	}

	const cacheDir = adapter.resolveModelCacheDir?.();
	// transformers.js nests weights under `<cacheDir>/<org>/<model>/`.
	const alreadyCached =
		cacheDir !== undefined &&
		existsSync(path.join(cacheDir, ...model.split("/")));

	if (!input.json) {
		input.output.write(
			alreadyCached
				? `Checking local embedding model ${model}…`
				: `Downloading local embedding model ${model} (~32 MB, first run only)…`,
		);
	}

	const progress = createDownloadProgress(input.output, input.json === true);
	try {
		await createEmbedder({
			model,
			onProgress: progress.onProgress,
		}).prewarm();
	} catch (error) {
		progress.stop();
		const message = `Embedding model predownload failed (${
			error instanceof Error ? error.message : String(error)
		}). It will be retried on first recall.`;
		if (!input.json) input.output.warn(message);
		return { status: "failed", message };
	}
	progress.stop();

	if (!input.json) {
		input.output.success(
			cacheDir !== undefined
				? `Local embedding model ready (cached at ${cacheDir}).`
				: "Local embedding model ready.",
		);
	}

	return {
		status: "ready",
		model,
		...(cacheDir !== undefined ? { cacheDir } : {}),
		...(alreadyCached ? { alreadyCached: true } : {}),
	};
}
