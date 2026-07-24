/**
 * Real OpenAI embedder harness via MSW — real adapter-openai code + MSW returning sanitized 384-dim.
 *
 * @remarks
 * - Real `createOpenAIEmbedder` with apiKey test-token-*** (redacted)
 * - Fetch intercepted by MSW `openaiHandlers` returning fixtures/openai/embed.json style
 * - Proves: contract still passes, error messages don't leak token, file-first truth via tmpDir
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createOpenAIEmbedder, type OpenAIEmbedder } from "@memofs/adapter-openai";

import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers.js";

/**
 * Options for creating a real OpenAI harness.
 * @public
 */
export type CreateRealOpenAIHarnessOptions = {
	/** Reuse existing tmpDir (for cross-visibility). */
	tmpDir?: string;
	/** Prefix for mkdtemp. @defaultValue "memofs-e2e-openai-" */
	prefix?: string;
	/** API key — must be opaque/redacted. @defaultValue "test-token-***" */
	apiKey?: string;
	/** Model. @defaultValue "text-embedding-3-small" */
	model?: string;
	/** Dimensions. @defaultValue 384 (MSW fixture). */
	dimensions?: number;
	/** Base URL — default OpenAI, can be overridden but MSW still intercepts. */
	baseUrl?: string;
};

/**
 * Real OpenAI harness — tmpDir + embedder + fs helpers.
 * @public
 */
export type OpenAIRealHarness = {
	tmpDir: string;
	embedder: OpenAIEmbedder;
	cleanup: () => Promise<void>;
	assertFileExists: (relPath: string) => Promise<void>;
	assertFileNotExists: (relPath: string) => Promise<void>;
	snapshotFs: () => Promise<Record<string, string>>;
	listFiles: () => Promise<string[]>;
};

/**
 * Creates a real OpenAI harness with MSW-backed embedder.
 *
 * @public
 */
export async function createRealOpenAIHarness(
	options: CreateRealOpenAIHarnessOptions = {},
): Promise<OpenAIRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-openai-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));

	const apiKey = options.apiKey ?? "test-token-***";
	const model = options.model ?? "text-embedding-3-small";
	const dimensions = options.dimensions ?? 384;

	const embedder = createOpenAIEmbedder({
		apiKey,
		model,
		dimensions,
		baseUrl: options.baseUrl,
		// Pass global fetch explicitly so MSW interception (which patches global fetch) is used.
		// OpenAI SDK captures fetch at construction time; without this it would capture the
		// original unpatched fetch if imported before server.listen().
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

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};
	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};
	const listFiles = async (): Promise<string[]> => {
		return listFilesRecursive(tmpDir);
	};
	const snapshotFs = async (): Promise<Record<string, string>> => {
		return snapshotFsRecursive(tmpDir);
	};

	return {
		tmpDir,
		embedder,
		cleanup,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
	};
}

/**
 * Asserts error message does not leak raw token.
 * @public
 */
export function assertNoTokenLeak(error: unknown, rawToken: string = "sk-"): void {
	const msg = error instanceof Error ? error.message : String(error);
	if (msg.includes(rawToken) && !msg.includes("test-token-***") && rawToken !== "test-token-***") {
		throw new Error(`Error message leaks raw token: ${msg}`);
	}
	// Also ensure redacted placeholder not containing real token — check that message doesn't contain long secret-like pattern
	// For our e2e, we just ensure it doesn't contain the rawToken substring if rawToken is the real one.
	// Since we use test-token-*** everywhere, any message containing "sk-" should be redacted to "sk-***" by openai client.
	const containsSk = /sk-[A-Za-z0-9_-]{20,}/.test(msg);
	if (containsSk) {
		throw new Error(`Error message leaks sk- token: ${msg}`);
	}
}
