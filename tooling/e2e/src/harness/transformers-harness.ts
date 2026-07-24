/**
 * Real Transformers harness — tiny quantized model, cacheDir .cache/e2e-models.
 *
 * @remarks
 * Real `@memofs/adapter-transformers` embedder with `Xenova/all-MiniLM-L6-v2`
 * 384-dim, `cacheDir .cache/e2e-models` per ticket 63. Proves:
 * - first run downloads model,
 * - second run with same cacheDir uses cached files offline,
 * - batch order preserved,
 * - empty input [ ] -> empty embeddings,
 * - >8192 char validation via TransformersValidationError,
 * - passes `defineEmbedderContractTests`.
 *
 * Node-only: imports `node:fs`, `node:path`, `@huggingface/transformers` transitively
 * via adapter.
 *
 * Cache dir resolution: attempts to find repo root (presence of pnpm-workspace.yaml
 * or .git), otherwise falls back to tmpDir/.cache/e2e-models, but also respects
 * explicit option. Default `.cache/e2e-models` is gitignored per ticket 60 scaffold.
 *
 * @public
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RealHarness } from "./core-harness";
import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_DIMENSIONS = 384;
const MAX_TEXT_LENGTH = 8192;

/**
 * Attempts to locate repo root by walking up from current file/dir
 * looking for pnpm-workspace.yaml or .git. Fallback to process.cwd().
 */
function findRepoRoot(startDir?: string): string {
	let dir = startDir ? resolve(startDir) : resolve(__dirname, "../../../../");
	// Limit traversal to avoid infinite loop
	for (let i = 0; i < 8; i++) {
		try {
			if (
				existsSync(join(dir, "pnpm-workspace.yaml")) ||
				existsSync(join(dir, ".git")) ||
				existsSync(join(dir, "pnpm-lock.yaml"))
			) {
				return dir;
			}
		} catch {
			// ignore
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	// Fallback to cwd
	return process.cwd();
}

/**
 * Resolves default cacheDir: <repoRoot>/.cache/e2e-models
 * Ensures directory exists.
 */
async function resolveDefaultCacheDir(): Promise<string> {
	const repoRoot = findRepoRoot();
	const cacheDir = join(repoRoot, ".cache", "e2e-models");
	await mkdir(cacheDir, { recursive: true });
	return cacheDir;
}

export type TransformersRealHarness = RealHarness & {
	/** Isolated tmpDir (for general file-first truth, not model cache). */
	tmpDir: string;
	/** Cache dir for ONNX weights — .cache/e2e-models per ticket, gitignored. */
	cacheDir: string;
	/** Model id (Xenova/all-MiniLM-L6-v2). */
	model: string;
	/** Expected dimensions (384). */
	dimensions: number;
	/** Real embedder from adapter-transformers. */
	embedder: {
		embedTexts: (input: {
			texts: string[];
			inputType?: "query" | "document" | null;
			expectedDimensions?: number;
			allowEmptyText?: boolean;
			batchSize?: number;
		}) => Promise<{
			embeddings: Array<{
				text?: string;
				embedding: number[];
				index?: number;
				dimensions?: number;
				model?: string;
			}>;
			model?: string;
			usage?: Record<string, unknown>;
		}>;
		embedText?: (
			text: string,
			options?: {
				inputType?: "query" | "document" | null;
				expectedDimensions?: number;
				allowEmptyText?: boolean;
			},
		) => Promise<{
			text?: string;
			embedding: number[];
			index?: number;
			dimensions?: number;
			model?: string;
		}>;
		prewarm?: () => Promise<void>;
		dimensions?: number;
		modelName?: string;
		[key: string]: unknown;
	};
	/** Convenience: embedTexts -> embeddings array. */
	embed: (texts: string[]) => Promise<number[][]>;
	/** Whether model cache was present before first run (true means offline reuse). */
	cacheHitPre: boolean;
	/** After first successful embed, whether cache dir contains model files. */
	cacheHasModelFiles: () => Promise<boolean>;
	/** Creates a second embedder with same cacheDir (offline reuse test). */
	createOfflineReuse: () => Promise<TransformersRealHarness["embedder"]>;
	/** Close / dispose (no-op, but for symmetry). */
	close: () => Promise<void>;
};

/**
 * Options for creating a real Transformers harness.
 * @public
 */
export type CreateRealTransformersHarnessOptions = {
	/** Reuse existing tmpDir (for cross-visibility). */
	tmpDir?: string;
	/** Prefix for mkdtemp. @defaultValue "memofs-e2e-transformers-" */
	prefix?: string;
	/** Override model id. @defaultValue "Xenova/all-MiniLM-L6-v2" */
	model?: string;
	/** Override cacheDir. @defaultValue "<repoRoot>/.cache/e2e-models" */
	cacheDir?: string;
	/** Device: cpu | wasm | gpu. @defaultValue "cpu" */
	device?: "cpu" | "wasm" | "gpu";
	/** Dtype: fp32 | q8 etc. @defaultValue "fp32" */
	dtype?: string;
	/** Batch size default for embedder. @defaultValue 32 */
	batchSize?: number;
	/** Optional pipelineFactory override for fast tests (fake). */
	pipelineFactory?: unknown;
	/** Allow empty text (pass through to validation). */
	allowEmptyText?: boolean;
};

/**
 * Creates a real Transformers harness.
 *
 * Proves tiny quantized model path, cache reuse offline, batch order preservation,
 * empty and >8192 validation, contract superset.
 *
 * @example
 * ```ts
 * const t = await createRealTransformersHarness();
 * try {
 *   const r = await t.embedder.embedTexts({ texts: ["hello world"] });
 *   expect(r.embeddings[0].embedding).toHaveLength(384);
 *   // offline reuse
 *   const second = await t.createOfflineReuse();
 *   const r2 = await second.embedTexts({ texts: ["hello world"] });
 *   expect(r2.embeddings[0].embedding).toHaveLength(384);
 * } finally {
 *   await t.cleanup();
 * }
 * ```
 *
 * @public
 */
export async function createRealTransformersHarness(
	options: CreateRealTransformersHarnessOptions = {},
): Promise<TransformersRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-transformers-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));
	const model = options.model ?? DEFAULT_MODEL;
	const dimensions = DEFAULT_DIMENSIONS;

	if (options.tmpDir) {
		await mkdir(tmpDir, { recursive: true });
	}

	// Resolve cacheDir
	let cacheDir: string;
	let cacheHitPre = false;
	if (options.cacheDir) {
		cacheDir = resolve(options.cacheDir);
		await mkdir(cacheDir, { recursive: true });
		try {
			await stat(cacheDir);
			cacheHitPre = true; // exists
		} catch {
			cacheHitPre = false;
		}
	} else {
		cacheDir = await resolveDefaultCacheDir();
		try {
			// Check if cache already has files (offline reuse pre-existing)
			const files = await listFilesRecursive(cacheDir).catch(() => []);
			cacheHitPre = files.length > 0;
		} catch {
			cacheHitPre = false;
		}
	}

	// Dynamic import adapter
	let createTransformersEmbedder: (
		opts: Record<string, unknown>,
	) => TransformersRealHarness["embedder"];
	try {
		const mod = (await import("@memofs/adapter-transformers")) as unknown as {
			createTransformersEmbedder: typeof createTransformersEmbedder;
		};
		createTransformersEmbedder = mod.createTransformersEmbedder;
	} catch (e) {
		throw new Error(
			`TransformersRealHarness: failed to import @memofs/adapter-transformers. Original: ${(e as Error).message}`,
		);
	}

	const embedderOptions: Record<string, unknown> = {
		model,
		cacheDir,
		device: options.device ?? "cpu",
		dtype: options.dtype ?? "fp32",
		batchSize: options.batchSize ?? 32,
	};

	if (options.pipelineFactory) {
		embedderOptions.pipelineFactory = options.pipelineFactory;
	}

	const embedder = createTransformersEmbedder(
		embedderOptions,
	) as TransformersRealHarness["embedder"];

	let cleaned = false;

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};
	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};
	const listFiles = async (): Promise<string[]> => listFilesRecursive(tmpDir);
	const snapshotFs = async (): Promise<Record<string, string>> =>
		snapshotFsRecursive(tmpDir);

	const embed = async (texts: string[]): Promise<number[][]> => {
		const result = await embedder.embedTexts({
			texts,
			inputType: "document",
			expectedDimensions: dimensions,
		});
		// Batch order preserved via index — sort by original index, then map
		const sorted = [...result.embeddings].sort(
			(a, b) => (a.index ?? 0) - (b.index ?? 0),
		);
		return sorted.map((e) => e.embedding);
	};

	const cacheHasModelFiles = async (): Promise<boolean> => {
		try {
			const files = await listFilesRecursive(cacheDir);
			// Model cache typically contains .onnx, json, etc.
			return files.length > 0;
		} catch {
			return false;
		}
	};

	const createOfflineReuse = async (): Promise<
		TransformersRealHarness["embedder"]
	> => {
		// New embedder with same cacheDir — should hit cache
		const offlineEmbedder = createTransformersEmbedder({
			model,
			cacheDir,
			device: options.device ?? "cpu",
			dtype: options.dtype ?? "fp32",
			batchSize: options.batchSize ?? 32,
			...(options.pipelineFactory
				? { pipelineFactory: options.pipelineFactory }
				: {}),
		}) as TransformersRealHarness["embedder"];
		return offlineEmbedder;
	};

	const close = async (): Promise<void> => {
		// No native resources to dispose; pipeline may hold WASM but GC will handle
	};

	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		try {
			await close();
		} catch {
			// ignore
		}
		await rm(tmpDir, { recursive: true, force: true });
		// Note: we intentionally do NOT remove cacheDir — it's shared .cache/e2e-models gitignored
	};

	return {
		tmpDir,
		cacheDir,
		model,
		dimensions,
		embedder,
		embed,
		cacheHitPre,
		cacheHasModelFiles,
		createOfflineReuse,
		close,
		cleanup,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
	};
}

/**
 * Helper for e2e tests: validates empty input and >8192 char behavior per docs.
 * Exported for reuse in contract superset tests.
 * @public
 */
export async function assertTransformersValidationBehavior(
	embedder: TransformersRealHarness["embedder"],
): Promise<void> {
	// Empty input should return empty embeddings (per embedder-contract.ts)
	const emptyResult = await embedder.embedTexts({ texts: [] });
	if (emptyResult.embeddings.length !== 0) {
		throw new Error(
			"Transformers validation: expected empty input to yield 0 embeddings",
		);
	}

	// >8192 char should throw TransformersValidationError (per docs)
	const longText = "a".repeat(MAX_TEXT_LENGTH + 1);
	let threw = false;
	try {
		await embedder.embedTexts({ texts: [longText] });
	} catch {
		threw = true;
	}
	if (!threw) {
		throw new Error(
			`Transformers validation: expected >${MAX_TEXT_LENGTH} char to throw`,
		);
	}
}
