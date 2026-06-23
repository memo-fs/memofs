import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type RecallEngineConfig, resolveTekmemoConfig } from "../../src/index";
import { createTempTekMemoDir } from "../../src/testing/temp-dir";

/**
 * @file Recall engine config resolution — covers the `recall` block priority
 * chain (constructor > env > `.tekmemo/config.json` > defaults) and the env
 * var parsing for `TEKMEMO_RECALL_ENGINE` / `TEKMEMO_LOCAL_EMBEDDINGS` /
 * `TEKMEMO_EMBEDDING_MODEL`.
 *
 * These resolution rules live in `resolveTekmemoConfig` (config.ts) but were
 * previously untested.
 */

async function writeConfigFile(
	rootDir: string,
	recall: unknown,
): Promise<void> {
	await mkdir(resolve(rootDir, ".tekmemo"), { recursive: true });
	await writeFile(
		resolve(rootDir, ".tekmemo", "config.json"),
		JSON.stringify({ recall }),
		"utf8",
	);
}

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";

describe("resolveTekmemoConfig — recall engine", () => {
	describe("defaults", () => {
		it("defaults to engine 'auto', localEmbeddings false, canonical model", () => {
			const resolved = resolveTekmemoConfig({ env: {} });
			expect(resolved.recall).toEqual({
				engine: "auto",
				localEmbeddings: false,
				embeddingModel: DEFAULT_MODEL,
			});
		});

		it("marks recall as Required<RecallEngineConfig>", () => {
			const resolved = resolveTekmemoConfig({ env: {} });
			// All three keys are always present on the resolved config.
			const keys = Object.keys(resolved.recall) as (keyof RecallEngineConfig)[];
			expect(keys).toContain("engine");
			expect(keys).toContain("localEmbeddings");
			expect(keys).toContain("embeddingModel");
		});
	});

	describe("constructor arg priority", () => {
		it("honors an explicit constructor recall block", () => {
			const resolved = resolveTekmemoConfig({
				env: { TEKMEMO_RECALL_ENGINE: "lexical" },
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
			const resolved = resolveTekmemoConfig({
				env: { TEKMEMO_RECALL_ENGINE: "lexical" },
				config: { recall: { localEmbeddings: true } },
			});
			// localEmbeddings from constructor wins; engine falls through env.
			expect(resolved.recall.localEmbeddings).toBe(true);
			expect(resolved.recall.engine).toBe("lexical");
		});
	});

	describe("env var parsing", () => {
		it("TEKMEMO_RECALL_ENGINE drives the engine", () => {
			for (const engine of ["lexical", "vector", "hybrid", "auto"] as const) {
				const resolved = resolveTekmemoConfig({
					env: { TEKMEMO_RECALL_ENGINE: engine },
				});
				expect(resolved.recall.engine).toBe(engine);
			}
		});

		it("falls back to 'auto' for an invalid engine env value", () => {
			const resolved = resolveTekmemoConfig({
				env: { TEKMEMO_RECALL_ENGINE: "nonsense" },
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
		])("TEKMEMO_LOCAL_EMBEDDINGS=%s → %s", (raw, expected) => {
			const resolved = resolveTekmemoConfig({
				env: { TEKMEMO_LOCAL_EMBEDDINGS: raw },
			});
			expect(resolved.recall.localEmbeddings).toBe(expected);
		});

		it("TEKMEMO_EMBEDDING_MODEL sets the model when non-empty", () => {
			const resolved = resolveTekmemoConfig({
				env: { TEKMEMO_EMBEDDING_MODEL: "env/model" },
			});
			expect(resolved.recall.embeddingModel).toBe("env/model");
		});

		it("ignores an empty TEKMEMO_EMBEDDING_MODEL (falls back to default)", () => {
			const resolved = resolveTekmemoConfig({
				env: { TEKMEMO_EMBEDDING_MODEL: "" },
			});
			expect(resolved.recall.embeddingModel).toBe(DEFAULT_MODEL);
		});
	});

	describe("config.json file", () => {
		it("reads the recall block from .tekmemo/config.json", async () => {
			const { rootDir, cleanup } = await createTempTekMemoDir();
			try {
				await writeConfigFile(rootDir, {
					engine: "hybrid",
					localEmbeddings: true,
					embeddingModel: "file/model",
				});
				const resolved = resolveTekmemoConfig({
					cwd: rootDir,
					env: {},
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
			const { rootDir, cleanup } = await createTempTekMemoDir();
			try {
				await writeConfigFile(rootDir, {
					engine: "lexical",
					localEmbeddings: false,
				});
				const resolved = resolveTekmemoConfig({
					cwd: rootDir,
					env: { TEKMEMO_RECALL_ENGINE: "vector" },
					config: { recall: { engine: "hybrid" } },
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
			const { rootDir, cleanup } = await createTempTekMemoDir();
			try {
				await writeConfigFile(rootDir, { engine: "bogus" });
				const resolved = resolveTekmemoConfig({ cwd: rootDir, env: {} });
				expect(resolved.recall.engine).toBe("auto");
			} finally {
				await cleanup();
			}
		});

		it("tolerates a missing config.json (defaults apply)", async () => {
			const { rootDir, cleanup } = await createTempTekMemoDir();
			try {
				const resolved = resolveTekmemoConfig({ cwd: rootDir, env: {} });
				expect(resolved.recall.engine).toBe("auto");
			} finally {
				await cleanup();
			}
		});
	});
});
