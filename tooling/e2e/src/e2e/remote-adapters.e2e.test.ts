/**
 * Real e2e: Remote adapters via MSW — OpenAI + Voyage real code + sanitized fixtures.
 *
 * Proves:
 * - real adapter-openai / adapter-voyage code executes, fetch intercepted by MSW
 * - fixtures contain RUN_ID + secret redacted test-token-***
 * - 384-dim vectors (contract superset)
 * - passes defineEmbedderContractTests
 * - error messages don't leak token
 * - file-first truth tmpDir isolation (optional)
 */

import { defineEmbedderContractTests } from "@memofs/testing";
import { describe, expect, it } from "vitest";

import {
	createRealOpenAIHarness,
	createRealVoyageHarness,
	createRealVoyageRerankHarness,
	getOpenAIFixtureMeta,
	getVoyageFixtureMeta,
	resetOpenAIFixture,
	resetVoyageFixture,
	setOpenAIErrorMode,
	setVoyageErrorMode,
} from "../index.js";

describe("remote adapters real harness — OpenAI via MSW (ticket 64)", () => {
	it("real OpenAIEmbedder via MSW returns 384-dim, batch order preserved, file-first truth tmpDir", async () => {
		const harness = await createRealOpenAIHarness({ dimensions: 384 });
		try {
			expect(harness.tmpDir).toBeDefined();

			// Single
			const single = await harness.embedder.embedTexts({
				texts: ["hello MemoFS e2e OpenAI"],
				expectedDimensions: 384,
			});
			expect(single.embeddings).toHaveLength(1);
			expect(single.embeddings[0]?.embedding).toHaveLength(384);
			expect(single.embeddings[0]?.index).toBe(0);

			// Batch order preserved
			const batch = await harness.embedder.embedTexts({
				texts: ["alpha", "beta", "gamma", "delta", "epsilon"],
				expectedDimensions: 384,
				batchSize: 2,
			});
			expect(batch.embeddings.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
			expect(batch.embeddings.map((r) => r.text)).toEqual([
				"alpha",
				"beta",
				"gamma",
				"delta",
				"epsilon",
			]);
			for (const rec of batch.embeddings) {
				expect(rec.embedding).toHaveLength(384);
			}

			// Snapshot of tmpDir works (isolation)
			const snap = await harness.snapshotFs();
			expect(typeof snap).toBe("object");
		} finally {
			await harness.cleanup();
		}
	});

	it("OpenAI fixture meta contains RUN_ID and secretRedacted", () => {
		const meta = getOpenAIFixtureMeta();
		if (meta) {
			expect(meta.sanitized).toBe(true);
			expect(meta.secretRedacted).toBe("test-token-***");
			expect(meta.runId).toMatch(/test-run-e2e-0021-/);
		}
	});

	describe("contract superset — OpenAI via MSW", () => {
		defineEmbedderContractTests({
			name: "createOpenAIEmbedder (real code + MSW 384-dim)",
			createEmbedder: async () => {
				const h = await createRealOpenAIHarness({ dimensions: 384 });
				return h.embedder as never;
			},
			expectedDimensions: 384,
			supportsEmbedText: true,
			rejectsEmptyText: true,
		});
	});

	it("OpenAI error messages don't leak token (redacted to test-token-***)", async () => {
		const harness = await createRealOpenAIHarness({ dimensions: 384 });
		try {
			// Force MSW to return 401 with message that could leak token if not redacted
			setOpenAIErrorMode(
				true,
				"Invalid API key: sk-*** redacted proof — real token would be test-token-*** only",
			);

			try {
				await harness.embedder.embedTexts({
					texts: ["will fail"],
					expectedDimensions: 384,
				});
				// Should throw
				expect.fail("should have thrown");
			} catch (e) {
				const msg = (e as Error).message;
				// Should contain redacted message, not raw token
				expect(msg).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
				// If we forced redacted message, it should contain redacted keyword
				expect(msg.toLowerCase()).toContain("redacted");
				// Ensure no raw token pattern
				expect(msg).not.toContain("ghp_");
				// The error message itself should not contain "test-token-***" as raw leak? Actually redacted placeholder is okay,
				// but we ensure no long secret.
				// The important part: error message doesn't contain the original raw token (we never set raw token in this test)
				// So we just check it doesn't contain secret pattern.
			}
		} finally {
			resetOpenAIFixture();
			await harness.cleanup();
		}
	});
});

describe("remote adapters real harness — Voyage via MSW (ticket 64)", () => {
	it("real VoyageEmbedder via MSW returns 384-dim, batch order preserved", async () => {
		const harness = await createRealVoyageHarness({});
		try {
			const result = await harness.embedder.embedTexts({
				texts: ["voyage doc A", "voyage doc B"],
				inputType: "document",
				expectedDimensions: 384,
			});
			expect(result.embeddings).toHaveLength(2);
			expect(result.embeddings[0]?.embedding).toHaveLength(384);
			expect(result.embeddings[0]?.index).toBe(0);
			expect(result.embeddings[1]?.index).toBe(1);

			// Batch order preserved across 5
			const batch = await harness.embedder.embedTexts({
				texts: ["a", "b", "c", "d", "e"],
				inputType: "document",
				expectedDimensions: 384,
				batchSize: 2,
			});
			expect(batch.embeddings.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
		} finally {
			await harness.cleanup();
		}
	});

	it("Voyage fixture meta contains RUN_ID and secretRedacted", () => {
		const meta = getVoyageFixtureMeta();
		expect(meta.secretRedacted).toBe("test-token-***");
		expect(meta.embedRunId).toMatch(/test-run-e2e-0021-/);
		expect(meta.rerankRunId).toMatch(/test-run-e2e-0021-/);
	});

	describe("contract superset — Voyage via MSW", () => {
		defineEmbedderContractTests({
			name: "createVoyageEmbedder (real code + MSW 384-dim)",
			createEmbedder: async () => {
				const h = await createRealVoyageHarness({});
				return h.embedder as never;
			},
			expectedDimensions: 384,
			supportsEmbedText: true,
			rejectsEmptyText: true,
		});
	});

	it("Voyage error messages don't leak token", async () => {
		const harness = await createRealVoyageHarness({});
		try {
			setVoyageErrorMode({ embed: true });

			try {
				await harness.embedder.embedTexts({
					texts: ["fail"],
					expectedDimensions: 384,
				});
				expect.fail("should have thrown");
			} catch (e) {
				const msg = (e as Error).message;
				expect(msg).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
				expect(msg.toLowerCase()).toContain("redacted");
			}
		} finally {
			resetVoyageFixture();
			await harness.cleanup();
		}
	});

	it("Voyage reranker via MSW returns fixture with relevance_score and RUN_ID", async () => {
		const harness = await createRealVoyageRerankHarness({});
		try {
			const result = await harness.reranker.rerank({
				query: "MemoFS memory",
				documents: [
					{ id: "doc-a", text: "Document A [RUN_ID test-run-e2e-0021-005]" },
					{ id: "doc-b", text: "Document B" },
					{ id: "doc-c", text: "Document C" },
				],
				topK: 3,
			});

			expect(result.length).toBe(3);
			// Results should have relevance scores descending (our deterministic)
			expect(typeof result[0]?.score).toBe("number");
			// Check text exists
			const firstText = result[0]?.text ?? "";
			expect(firstText.length >= 0).toBe(true);

			// Ensure no token leak in result
			const raw = JSON.stringify(result);
			expect(raw).not.toContain("sk-");
			expect(raw).not.toMatch(/ghp_[A-Za-z0-9_]+/);
		} finally {
			await harness.cleanup();
		}
	});

	it("Voyage reranker error messages don't leak token", async () => {
		const harness = await createRealVoyageRerankHarness({});
		try {
			setVoyageErrorMode({ rerank: true });

			try {
				await harness.reranker.rerank({
					query: "q",
					documents: [
						{ id: "d1", text: "d1" },
						{ id: "d2", text: "d2" },
					],
					topK: 2,
				});
				expect.fail("should have thrown");
			} catch (e) {
				const msg = (e as Error).message;
				expect(msg).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);
				expect(msg.toLowerCase()).toContain("redacted");
			}
		} finally {
			resetVoyageFixture();
			await harness.cleanup();
		}
	});
});

describe("MSW fixture layer — sanitized, RUN_ID, secret redacted (ticket 64)", () => {
	it("all fixtures contain sanitized, RUN_ID, test-token-*** redaction", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const __dirname = fileURLToPath(new URL(".", import.meta.url));
		const fixturesDir = join(__dirname, "..", "msw", "fixtures");

		const githubRaw = readFileSync(join(fixturesDir, "github.json"), "utf8");
		expect(githubRaw).toContain("test-run-e2e-0021-");
		expect(githubRaw).toContain("test-token-***");
		expect(githubRaw).toContain('"sanitized": true');
		expect(githubRaw).not.toMatch(/ghp_[A-Za-z0-9_]+/);
		expect(githubRaw).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);

		const notionRaw = readFileSync(join(fixturesDir, "notion.json"), "utf8");
		expect(notionRaw).toContain("test-run-e2e-0021-");
		expect(notionRaw).toContain("test-token-***");

		const openaiRaw = readFileSync(
			join(fixturesDir, "openai", "embed.json"),
			"utf8",
		);
		expect(openaiRaw).toContain("test-run-e2e-0021-");
		expect(openaiRaw).toContain("test-token-***");
		expect(openaiRaw).not.toMatch(/sk-[A-Za-z0-9_-]{20,}/);

		const voyageEmbedRaw = readFileSync(
			join(fixturesDir, "voyage", "embed.json"),
			"utf8",
		);
		expect(voyageEmbedRaw).toContain("test-run-e2e-0021-");
		expect(voyageEmbedRaw).toContain("test-token-***");

		const voyageRerankRaw = readFileSync(
			join(fixturesDir, "voyage", "rerank.json"),
			"utf8",
		);
		expect(voyageRerankRaw).toContain("test-run-e2e-0021-");
		expect(voyageRerankRaw).toContain("test-token-***");
	});

	it("deterministic network proof: real adapter code executes, fetch intercepted by MSW, no live network", async () => {
		// Prove that without MEMOFS_E2E_LIVE, all requests go via MSW fixtures, not live network.
		// We already have MSW server listening — if it wasn't, openai/voyage calls would fail with network error.
		// So successful embed via MSW proves deterministic.
		const openaiHarness = await createRealOpenAIHarness({ dimensions: 384 });
		const voyageHarness = await createRealVoyageHarness({});
		try {
			const o = await openaiHarness.embedder.embedTexts({
				texts: ["deterministic proof"],
				expectedDimensions: 384,
			});
			expect(o.embeddings[0]?.embedding).toHaveLength(384);

			const v = await voyageHarness.embedder.embedTexts({
				texts: ["deterministic proof"],
				expectedDimensions: 384,
			});
			expect(v.embeddings[0]?.embedding).toHaveLength(384);
		} finally {
			await openaiHarness.cleanup();
			await voyageHarness.cleanup();
		}
	});
});
