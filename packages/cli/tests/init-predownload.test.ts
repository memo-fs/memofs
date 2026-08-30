import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createNodeMemoFs, createTempMemoFsDir } from "@memofs/core/node-fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInitCommand } from "../src/commands/init";
import { createBufferedOutput } from "../src/output/output";
import {
	type ModelPredownloadResult,
	predownloadLocalEmbeddingModel,
} from "../src/utils/model-predownload";

/** Saved env keys restored after each test. */
const ENV_KEYS = [
	"MEMOFS_SKIP_MODEL_DOWNLOAD",
	"MEMOFS_LOCAL_EMBEDDINGS",
	"MEMOFS_EMBEDDING_MODEL",
] as const;
const savedEnv = new Map<string, string | undefined>();

function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
	savedEnv.set(key, process.env[key]);
	process.env[key] = value;
}

afterEach(() => {
	for (const [key, value] of savedEnv) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	savedEnv.clear();
});

/** The simplest injectable predownload: records calls, returns a fixed result. */
function recordingPredownload(result: ModelPredownloadResult) {
	const calls: Array<{ rootDir: string; json?: boolean }> = [];
	const fn = async (input: { rootDir: string; json?: boolean }) => {
		calls.push({ rootDir: input.rootDir, json: input.json });
		return result;
	};
	return { fn, calls };
}

describe("init embedding model predownload", () => {
	it("writes the recall block and reports the predownload result", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const memo = createNodeMemoFs({ rootDir: temp.rootDir });
			const output = createBufferedOutput({ noColor: true });
			const predownload = recordingPredownload({
				status: "ready",
				model: "Xenova/bge-small-en-v1.5",
				cacheDir: "/tmp/fake-cache",
			});
			const code = await runInitCommand({
				memo,
				output,
				json: true,
				noInput: true,
				predownloadModel: predownload.fn,
			});

			expect(code).toBe(0);
			expect(predownload.calls).toEqual([
				{ rootDir: temp.rootDir, json: true },
			]);

			const envelope = JSON.parse(output.stdout.join("\n")) as {
				data: { embeddings: ModelPredownloadResult };
			};
			expect(envelope.data.embeddings.status).toBe("ready");

			const config = JSON.parse(
				await readFile(
					path.join(temp.rootDir, ".memofs", "config.json"),
					"utf8",
				),
			) as Record<string, unknown>;
			expect(config.recall).toEqual({
				engine: "auto",
				localEmbeddings: true,
			});
		} finally {
			await temp.cleanup();
		}
	});

	it("skips the predownload entirely with --no-embeddings", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const memo = createNodeMemoFs({ rootDir: temp.rootDir });
			const output = createBufferedOutput({ noColor: true });
			const predownload = recordingPredownload({
				status: "ready",
				model: "Xenova/bge-small-en-v1.5",
			});
			const code = await runInitCommand({
				memo,
				output,
				json: true,
				noInput: true,
				noEmbeddings: true,
				predownloadModel: predownload.fn,
			});

			expect(code).toBe(0);
			expect(predownload.calls).toEqual([]);
			const envelope = JSON.parse(output.stdout.join("\n")) as {
				data: Record<string, unknown>;
			};
			expect(envelope.data.embeddings).toBeUndefined();
		} finally {
			await temp.cleanup();
		}
	});

	it("keeps init successful when the predownload fails", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const memo = createNodeMemoFs({ rootDir: temp.rootDir });
			const output = createBufferedOutput({ noColor: true });
			const code = await runInitCommand({
				memo,
				output,
				json: true,
				noInput: true,
				predownloadModel: recordingPredownload({
					status: "failed",
					message: "no network",
				}).fn,
			});

			expect(code).toBe(0);
			const envelope = JSON.parse(output.stdout.join("\n")) as {
				data: { embeddings: ModelPredownloadResult };
			};
			expect(envelope.data.embeddings.status).toBe("failed");
		} finally {
			await temp.cleanup();
		}
	});
});

describe("predownloadLocalEmbeddingModel", () => {
	beforeEach(() => {
		// The vitest config forces MEMOFS_LOCAL_EMBEDDINGS=0 for hermeticity;
		// these tests exercise the real (enabled) predownload path.
		setEnv("MEMOFS_LOCAL_EMBEDDINGS", undefined);
	});

	it("skips when MEMOFS_SKIP_MODEL_DOWNLOAD is set", async () => {
		setEnv("MEMOFS_SKIP_MODEL_DOWNLOAD", "1");
		let loaded = false;
		const result = await predownloadLocalEmbeddingModel({
			rootDir: "/nonexistent",
			output: createBufferedOutput({ noColor: true }),
			loadAdapter: async () => {
				loaded = true;
				throw new Error("must not be reached");
			},
		});
		expect(result).toMatchObject({ status: "skipped", reason: "disabled" });
		expect(loaded).toBe(false);
	});

	it("skips when local embeddings are disabled via env", async () => {
		setEnv("MEMOFS_LOCAL_EMBEDDINGS", "0");
		const result = await predownloadLocalEmbeddingModel({
			rootDir: "/nonexistent",
			output: createBufferedOutput({ noColor: true }),
			loadAdapter: async () => {
				throw new Error("must not be reached");
			},
		});
		expect(result).toMatchObject({ status: "skipped", reason: "disabled" });
	});

	it("skips with a hint when the adapter is not installed in the project", async () => {
		const output = createBufferedOutput({ noColor: true });
		const result = await predownloadLocalEmbeddingModel({
			rootDir: "/nonexistent",
			output,
			loadAdapter: async () => {
				throw new Error("Cannot find module");
			},
		});
		expect(result).toMatchObject({ status: "skipped", reason: "unresolved" });
		expect(output.stdout.join("\n")).toContain(
			"Install @memofs/mcp-server to enable local embeddings",
		);
	});

	it("reports failure without throwing when prewarm rejects", async () => {
		const output = createBufferedOutput({ noColor: true });
		const result = await predownloadLocalEmbeddingModel({
			rootDir: "/nonexistent",
			output,
			loadAdapter: async () => ({
				createTransformersEmbedder: () => ({
					prewarm: async () => {
						throw new Error("fetch failed");
					},
				}),
			}),
		});
		expect(result).toMatchObject({ status: "failed" });
		expect(output.stdout.join("\n")).toContain("retried on first recall");
	});

	it("honors MEMOFS_EMBEDDING_MODEL as the model override", async () => {
		setEnv("MEMOFS_EMBEDDING_MODEL", "org/custom-model");
		const models: Array<string | undefined> = [];
		const result = await predownloadLocalEmbeddingModel({
			rootDir: "/nonexistent",
			output: createBufferedOutput({ noColor: true }),
			json: true,
			loadAdapter: async () => ({
				createTransformersEmbedder: (options) => {
					models.push(options?.model);
					return { prewarm: async () => {} };
				},
			}),
		});
		expect(models).toEqual(["org/custom-model"]);
		expect(result).toMatchObject({
			status: "ready",
			model: "org/custom-model",
		});
	});

	it("resolves the adapter from the project's node_modules and prewarms it", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const cacheDir = path.join(temp.rootDir, "model-cache");
			// Simulate a cached model: the weights directory already exists.
			const modelDir = path.join(cacheDir, "Xenova", "bge-small-en-v1.5");
			await mkdir(modelDir, { recursive: true });

			// A minimal fake adapter package under the project's node_modules.
			const adapterDir = path.join(
				temp.rootDir,
				"node_modules",
				"@memofs",
				"adapter-transformers",
			);
			await mkdir(adapterDir, { recursive: true });
			await writeFile(
				path.join(adapterDir, "package.json"),
				JSON.stringify({
					name: "@memofs/adapter-transformers",
					version: "0.0.0-test",
					main: "index.cjs",
				}),
			);
			await writeFile(
				path.join(adapterDir, "index.cjs"),
				[
					'"use strict";',
					"const fs = require('node:fs');",
					`module.exports = {`,
					"  createTransformersEmbedder(options) {",
					"    return {",
					"      async prewarm() {",
					`        fs.writeFileSync(${JSON.stringify(path.join(temp.rootDir, "prewarmed.txt"))}, String(options?.model));`,
					"      },",
					"    };",
					"  },",
					`  resolveModelCacheDir() { return ${JSON.stringify(cacheDir)}; },`,
					"};",
				].join("\n"),
			);

			const output = createBufferedOutput({ noColor: true });
			const result = await predownloadLocalEmbeddingModel({
				rootDir: temp.rootDir,
				output,
			});

			expect(result).toEqual({
				status: "ready",
				model: "Xenova/bge-small-en-v1.5",
				cacheDir,
				alreadyCached: true,
			});
			// The prewarm actually ran against the resolved fake adapter.
			expect(
				await readFile(path.join(temp.rootDir, "prewarmed.txt"), "utf8"),
			).toBe("Xenova/bge-small-en-v1.5");
		} finally {
			await temp.cleanup();
		}
	});
});
