import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type RecallEngineConfig,
	resolveMemoFsConfig,
	type MemoFsConfigFile,
} from "../../src/index";
import { createTempMemoFsDir } from "../../src/testing/temp-dir";

/**
 * @file Recall engine config resolution — covers the `recall` block priority
 * chain (constructor > env > `.memofs/config.json` > defaults) and the env
 * var parsing for `MEMOFS_RECALL_ENGINE` / `MEMOFS_LOCAL_EMBEDDINGS` /
 * `MEMOFS_EMBEDDING_MODEL`.
 *
 * Core no longer reads the filesystem (ADR 0013 — the root barrel stays free
 * of `node:fs`). The `.memofs/config.json` file is the **caller's**
 * responsibility: these tests mirror a Node consumer by writing the file,
 * reading + parsing it, and passing it as `config.fileConfig`.
 */

async function writeConfigFile(
	rootDir: string,
	recall: unknown,
): Promise<void> {
	await mkdir(resolve(rootDir, ".memofs"), { recursive: true });
	await writeFile(
		resolve(rootDir, ".memofs", "config.json"),
		JSON.stringify({ recall }),
		"utf8",
	);
}

/**
 * Mirrors what a Node consumer (CLI / MCP factory) does: read + parse
 * `.memofs/config.json`, then hand it to `resolveMemoFsConfig` as
 * `fileConfig`. Core never touches the filesystem.
 */
async function readConfigFileAsFileConfig(
	rootDir: string,
): Promise<MemoFsConfigFile> {
	try {
		const raw = await readFile(
			resolve(rootDir, ".memofs", "config.json"),
			"utf8",
		);
		return { recall: (JSON.parse(raw) as { recall?: unknown }).recall };
	} catch {
		return {};
	}
}

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";

describe("resolveMemoFsConfig — recall engine", () => {
	describe("defaults", () => {
		it("defaults to engine 'auto', localEmbeddings false, canonical model", () => {
			const resolved = resolveMemoFsConfig({ env: {} });
			expect(resolved.recall).toEqual({
				engine: "auto",
				localEmbeddings: false,
				embeddingModel: DEFAULT_MODEL,
			});
		});

		it("marks recall as Required<RecallEngineConfig>", () => {
			const resolved = resolveMemoFsConfig({ env: {} });
			// All three keys are always present on the resolved config.
			const keys = Object.keys(resolved.recall) as (keyof RecallEngineConfig)[];
			expect(keys).toContain("engine");
			expect(keys).toContain("localEmbeddings");
			expect(keys).toContain("embeddingModel");
		});
	});

	describe("constructor arg priority", () => {
		it("honors an explicit constructor recall block", () => {
			const resolved = resolveMemoFsConfig({
				env: { MEMOFS_RECALL_ENGINE: "lexical" },
				config: {
					recall: {
						engine: "hybrid",
						localEmbeddings: true,
						embeddingModel: "custom/model",
					},
				},
			});
			expect(resolved.recall).toEqual({
				engine: "hybrid",
				localEmbeddings: true,
				embeddingModel: "custom/model",
			});
		});

		it("constructor fields override only the keys they specify (partial)", () => {
			const resolved = resolveMemoFsConfig({
				env: { MEMOFS_RECALL_ENGINE: "lexical" },
				config: { recall: { localEmbeddings: true } },
			});
			// localEmbeddings from constructor wins; engine falls through env.
			expect(resolved.recall.localEmbeddings).toBe(true);
			expect(resolved.recall.engine).toBe("lexical");
		});
	});

	describe("env var parsing", () => {
		it("MEMOFS_RECALL_ENGINE drives the engine", () => {
			for (const engine of ["lexical", "vector", "hybrid", "auto"] as const) {
				const resolved = resolveMemoFsConfig({
					env: { MEMOFS_RECALL_ENGINE: engine },
				});
				expect(resolved.recall.engine).toBe(engine);
			}
		});

		it("falls back to 'auto' for an invalid engine env value", () => {
			const resolved = resolveMemoFsConfig({
				env: { MEMOFS_RECALL_ENGINE: "nonsense" },
			});
			expect(resolved.recall.engine).toBe("auto");
		});

		it.each([
			["1", true],
			["true", true],
			["TRUE", true],
			["0", false],
			["false", false],
			["", false],
		])("MEMOFS_LOCAL_EMBEDDINGS=%s → %s", (raw, expected) => {
			const resolved = resolveMemoFsConfig({
				env: { MEMOFS_LOCAL_EMBEDDINGS: raw },
			});
			expect(resolved.recall.localEmbeddings).toBe(expected);
		});

		it("MEMOFS_EMBEDDING_MODEL sets the model when non-empty", () => {
			const resolved = resolveMemoFsConfig({
				env: { MEMOFS_EMBEDDING_MODEL: "env/model" },
			});
			expect(resolved.recall.embeddingModel).toBe("env/model");
		});

		it("ignores an empty MEMOFS_EMBEDDING_MODEL (falls back to default)", () => {
			const resolved = resolveMemoFsConfig({
				env: { MEMOFS_EMBEDDING_MODEL: "" },
			});
			expect(resolved.recall.embeddingModel).toBe(DEFAULT_MODEL);
		});
	});

	describe("config.json file", () => {
		it("reads the recall block from .memofs/config.json", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				await writeConfigFile(rootDir, {
					engine: "hybrid",
					localEmbeddings: true,
					embeddingModel: "file/model",
				});
				const fileConfig = await readConfigFileAsFileConfig(rootDir);
				const resolved = resolveMemoFsConfig({
					cwd: rootDir,
					env: {},
					config: { fileConfig },
				});
				expect(resolved.recall).toEqual({
					engine: "hybrid",
					localEmbeddings: true,
					embeddingModel: "file/model",
				});
			} finally {
				await cleanup();
			}
		});

		it("constructor > env > file priority", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				await writeConfigFile(rootDir, {
					engine: "lexical",
					localEmbeddings: false,
				});
				const fileConfig = await readConfigFileAsFileConfig(rootDir);
				const resolved = resolveMemoFsConfig({
					cwd: rootDir,
					env: { MEMOFS_RECALL_ENGINE: "vector" },
					config: { recall: { engine: "hybrid" }, fileConfig },
				});
				// Constructor wins over env wins over file.
				expect(resolved.recall.engine).toBe("hybrid");
				// localEmbeddings: constructor absent, env absent → file (false).
				expect(resolved.recall.localEmbeddings).toBe(false);
			} finally {
				await cleanup();
			}
		});

		it("ignores an invalid engine in the config.json file", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				await writeConfigFile(rootDir, { engine: "bogus" });
				const fileConfig = await readConfigFileAsFileConfig(rootDir);
				const resolved = resolveMemoFsConfig({
					cwd: rootDir,
					env: {},
					config: { fileConfig },
				});
				expect(resolved.recall.engine).toBe("auto");
			} finally {
				await cleanup();
			}
		});

		it("tolerates a missing config.json (defaults apply)", async () => {
			const { rootDir, cleanup } = await createTempMemoFsDir();
			try {
				const fileConfig = await readConfigFileAsFileConfig(rootDir);
				const resolved = resolveMemoFsConfig({
					cwd: rootDir,
					env: {},
					config: { fileConfig },
				});
				expect(resolved.recall.engine).toBe("auto");
			} finally {
				await cleanup();
			}
		});
	});
});
