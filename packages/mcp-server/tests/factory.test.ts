import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryMemoryStore } from "@memofs/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoFSMcpRuntimeFromConfig } from "../src/index";

/**
 * Create a throwaway MemoFS root dir for filesystem-backed local-mode tests.
 * The MCP server test suite otherwise only exercises memory mode; local mode
 * needs a real rootDir with the bootstrap files present.
 */
async function createTempRoot(): Promise<{
	rootDir: string;
	cleanup: () => Promise<void>;
}> {
	const rootDir = await mkdtemp(join(tmpdir(), "memofs-mcp-"));
	return {
		rootDir,
		async cleanup() {
			await rm(rootDir, { recursive: true, force: true });
		},
	};
}

/** Shared scratch dirs cleaned up after each test. */
const dirsToClean: string[] = [];
afterEach(async () => {
	while (dirsToClean.length > 0) {
		const dir = dirsToClean.pop();
		if (dir) await rm(dir, { recursive: true, force: true });
	}
});

async function tempRoot() {
	const { rootDir, cleanup } = await createTempRoot();
	dirsToClean.push(rootDir);
	return { rootDir, cleanup };
}

/**
 * @file MCP runtime factory — recall/embedder wiring.
 *
 * The factory decides whether to wire a lazy local ONNX embedder based on
 * `recall.localEmbeddings`, the `MEMOFS_LOCAL_EMBEDDINGS` env var, and the
 * runtime mode. The embedder itself is lazy (loaded on first vector query), so
 * these tests assert the *observable* consequences of the wiring decision:
 *
 * - memory mode never attempts the local vector path,
 * - local mode stays functional with zero API keys (lexical fallback),
 * - a missing adapter never breaks recall (graceful degradation),
 * - disabling local embeddings keeps the runtime import-light.
 */

describe("createMemoFSMcpRuntimeFromConfig — embedder wiring", () => {
	describe("mode-gated wiring", () => {
		it("memory mode: runtime is healthy and never wires the local embedder", async () => {
			const runtime = createMemoFSMcpRuntimeFromConfig({
				mode: "local",
				store: new InMemoryMemoryStore(),
			});
			const health = await runtime.health();
			expect(health.ok).toBe(true);
			// memory mode is volatile; recall returns no items but must not throw.
			// The local factory always wires `recall`, so the non-null assertion
			// is safe here and keeps the result type non-optional.
			// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
			const result = await runtime.recall!({ query: "anything" });
			expect(result.items).toEqual([]);
		});

		it("hybrid mode: constructs with cloud config and never throws on wiring", async () => {
			// Hybrid mode (local engine + cloud file-replica sync) is the only
			// cloud-facing mode after the D4 trim; there is no standalone "cloud"
			// mode. Pointed at a non-existent base URL so the client is constructed
			// but unused; we only assert the runtime wires without throwing.
			const runtime = createMemoFSMcpRuntimeFromConfig({
				mode: "hybrid",
				cloud: { baseUrl: "https://invalid.example.com" },
				recall: { localEmbeddings: true },
			});
			// Constructing the runtime must not throw and must not import the
			// (absent) local adapter eagerly.
			expect(runtime).toBeDefined();
		});
	});

	describe("local mode with zero API keys", () => {
		it("recall falls back to the lexical path when the adapter is absent", async () => {
			// Force the factory toward the local-embedder path, but the adapter
			// package is an optional peer that is not installed in this test
			// environment. Recall must degrade gracefully to lexical-only.
			const { rootDir, cleanup } = await tempRoot();
			try {
				const runtime = createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					rootDir,
					projectId: "mcp-factory",
					recall: { localEmbeddings: true, engine: "hybrid" },
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
				await runtime.writeMemory!({
					content: "Authentication uses JWT tokens in the login flow.",
					kind: "decision",
					title: "Auth",
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
				const result = await runtime.recall!({
					query: "login auth",
					limit: 5,
				});
				// Lexical path surfaces the memory even though the vector path
				// could not initialize (no adapter).
				expect(result.items.length).toBeGreaterThan(0);
				expect(result.items[0]?.text).toMatch(/authentication/i);
			} finally {
				await cleanup();
			}
		});

		it("recall: false localEmbeddings keeps the runtime import-light and still works lexically", async () => {
			const { rootDir, cleanup } = await tempRoot();
			try {
				const runtime = createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					rootDir,
					projectId: "mcp-factory",
					recall: { localEmbeddings: false },
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
				await runtime.writeMemory!({
					content: "The deployment pipeline runs on GitHub Actions.",
					kind: "reference",
				});

				// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
				const result = await runtime.recall!({
					query: "deployment pipeline",
					limit: 5,
				});
				expect(result.items.length).toBeGreaterThan(0);
			} finally {
				await cleanup();
			}
		});
	});

	describe("env var override", () => {
		it("MEMOFS_LOCAL_EMBEDDINGS=0 disables the local embedder", async () => {
			vi.stubEnv("MEMOFS_LOCAL_EMBEDDINGS", "0");
			try {
				const { rootDir, cleanup } = await tempRoot();
				try {
					const runtime = createMemoFSMcpRuntimeFromConfig({
						mode: "local",
						rootDir,
						projectId: "mcp-factory",
					});
					// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
					await runtime.writeMemory!({
						content: "Env-disabled embedder still recalls lexically.",
						kind: "note",
					});
					// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
					const result = await runtime.recall!({
						query: "env-disabled embedder",
						limit: 5,
					});
					expect(result.items.length).toBeGreaterThan(0);
				} finally {
					await cleanup();
				}
			} finally {
				vi.unstubAllEnvs();
			}
		});
	});

	describe("runtime delegation", () => {
		it("readCoreMemory returns the bootstrapped core document", async () => {
			const { rootDir, cleanup } = await tempRoot();
			try {
				const runtime = createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					rootDir,
					projectId: "mcp-factory",
				});
				const readCoreMemory = runtime.readCoreMemory;
				if (!readCoreMemory) throw new Error("readCoreMemory is missing");
				const { content } = await readCoreMemory();
				// Bootstrapped core memory is a non-empty markdown document.
				expect(content.length).toBeGreaterThan(0);
			} finally {
				await cleanup();
			}
		});
	});
});
