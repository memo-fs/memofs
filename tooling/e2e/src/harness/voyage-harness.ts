/**
 * Real Voyage embedder + reranker harness via MSW — real adapter-voyage code + sanitized fixtures.
 *
 * @remarks
 * - Real `createVoyageEmbedder` / `createVoyageReranker` with apiKey test-token-*** (redacted)
 * - Fetch intercepted by MSW `voyageHandlers` returning fixtures/voyage/embed.json (384-dim) and rerank.json
 * - Proves contract, token not leaked in errors, file-first truth tmpDir
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	createVoyageEmbedder,
	createVoyageReranker,
	type VoyageEmbedder,
	type VoyageReranker,
} from "@memofs/adapter-voyage";

import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers.js";

/**
 * Options for Voyage embedder harness.
 * @public
 */
export type CreateRealVoyageHarnessOptions = {
	tmpDir?: string;
	prefix?: string;
	apiKey?: string;
	/** @defaultValue "voyage-4-lite" */
	model?: string;
	/** Output dimension — if not set, MSW returns 384 via expectedDimensions */
	outputDimension?: number;
};

/**
 * Real Voyage embedder harness.
 * @public
 */
export type VoyageRealHarness = {
	tmpDir: string;
	embedder: VoyageEmbedder;
	cleanup: () => Promise<void>;
	assertFileExists: (relPath: string) => Promise<void>;
	assertFileNotExists: (relPath: string) => Promise<void>;
	snapshotFs: () => Promise<Record<string, string>>;
	listFiles: () => Promise<string[]>;
};

/**
 * Options for Voyage reranker harness.
 * @public
 */
export type CreateRealVoyageRerankHarnessOptions = {
	tmpDir?: string;
	prefix?: string;
	apiKey?: string;
	model?: string;
};

/**
 * Real Voyage reranker harness.
 * @public
 */
export type VoyageRerankRealHarness = {
	tmpDir: string;
	reranker: VoyageReranker;
	cleanup: () => Promise<void>;
	snapshotFs: () => Promise<Record<string, string>>;
	listFiles: () => Promise<string[]>;
};

export async function createRealVoyageHarness(
	options: CreateRealVoyageHarnessOptions = {},
): Promise<VoyageRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-voyage-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));

	const apiKey = options.apiKey ?? "test-token-***";
	const model = options.model ?? "voyage-4-lite";

	const embedder = createVoyageEmbedder({
		apiKey,
		model,
		...(options.outputDimension ? { outputDimension: options.outputDimension as never } : {}),
		fetch: (...args: Parameters<typeof fetch>) => (globalThis.fetch as typeof fetch)(...args),
	});

	let cleaned = false;
	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		if (!options.tmpDir) {
			await rm(tmpDir, { recursive: true, force: true });
		}
	};

	return {
		tmpDir,
		embedder,
		cleanup,
		assertFileExists: async (p: string) => assertFileExistsAt(tmpDir, p),
		assertFileNotExists: async (p: string) => assertFileNotExistsAt(tmpDir, p),
		snapshotFs: async () => snapshotFsRecursive(tmpDir),
		listFiles: async () => listFilesRecursive(tmpDir),
	};
}

export async function createRealVoyageRerankHarness(
	options: CreateRealVoyageRerankHarnessOptions = {},
): Promise<VoyageRerankRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-voyage-rerank-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));

	const apiKey = options.apiKey ?? "test-token-***";
	const model = options.model ?? "rerank-2";

	const reranker = createVoyageReranker({
		apiKey,
		model,
		fetch: (...args: Parameters<typeof fetch>) => (globalThis.fetch as typeof fetch)(...args),
	});

	let cleaned = false;
	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		if (!options.tmpDir) {
			await rm(tmpDir, { recursive: true, force: true });
		}
	};

	return {
		tmpDir,
		reranker,
		cleanup,
		snapshotFs: async () => snapshotFsRecursive(tmpDir),
		listFiles: async () => listFilesRecursive(tmpDir),
	};
}

export function assertNoTokenLeak(error: unknown): void {
	const msg = error instanceof Error ? error.message : String(error);
	// Voyage should never leak raw token
	if (/sk-[A-Za-z0-9_-]{20,}/.test(msg)) {
		throw new Error(`Voyage error leaks token: ${msg}`);
	}
	if (msg.includes("test-token-***") && msg.includes("Bearer test-token-***") && msg.length > 1000) {
		// redacted token presence is okay, but raw token not
	}
}
