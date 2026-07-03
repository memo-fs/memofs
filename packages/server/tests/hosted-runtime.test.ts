import {
	type Extractor,
	type ExtractionInput,
	type ExtractionResult,
	InMemoryMemoryStore,
	type LlmClient,
	type LlmCompletionInput,
	type LlmCompletionResult,
	type MemoryEmbedder,
	type Reranker,
	type RerankInput,
	type RerankResult,
	Tekmemo,
} from "@tekmemo/core";
import { beforeEach, describe, expect, it } from "vitest";
import { createHostedRuntime } from "../src";

/**
 * Slice 0 contract for the provider-neutral hosted-runtime factory. Proves:
 *   1. It assembles a working {@link Tekmemo} from **injected** adapters (no
 *      env reads, no hardcoded provider) — the cloud + the OSS self-hoster pass
 *      different bundles and get the identical engine.
 *   2. `store` is the only required slot; missing it throws a clear error.
 *   3. Every intelligence slot is optional and threads through to the assembled
 *      runtime (the `llmClient` seam especially — slice 6 reads it).
 *
 * No real provider is ever called: the local fakes stand in for the whole
 * bundle (mirrors how `apps/cloud`'s hosted-runtime test builds local doubles).
 */
describe("createHostedRuntime — provider-neutral factory (slice 0)", () => {
	let store: InMemoryMemoryStore;

	beforeEach(() => {
		store = new InMemoryMemoryStore();
	});

	it("assembles a working Tekmemo from injected fakes (no provider calls)", async () => {
		const tek = createHostedRuntime({
			store,
			projectId: "self-host",
			embedder: createFakeEmbedder(),
			reranker: createFakeReranker(),
			extractor: createFakeExtractor(),
			llmClient: createFakeLlmClient(),
		});

		expect(tek).toBeInstanceOf(Tekmemo);
		expect(tek.projectId).toBe("self-host");

		// The assembled runtime works end-to-end over the injected store: a write
		// lands, recall surfaces it. Proves the factory wired the store through.
		await tek.writeMemory({ content: "self-hosted runtime runs the engine" });
		const hits = await tek.recall("self-hosted");
		expect(hits.items.length).toBeGreaterThan(0);
	});

	it("threads every injected intelligence slot onto the assembled runtime", () => {
		const embedder = createFakeEmbedder();
		const reranker = createFakeReranker();
		const extractor = createFakeExtractor();
		const llmClient = createFakeLlmClient();

		const tek = createHostedRuntime({
			store,
			projectId: "slots",
			embedder,
			reranker,
			extractor,
			llmClient,
		});

		expect(tek.embedder).toBe(embedder);
		expect(tek.reranker).toBe(reranker);
		expect(tek.extractor).toBe(extractor);
		expect(tek.llmClient).toBe(llmClient);
	});

	it("runs with no intelligence slots injected (deterministic defaults)", async () => {
		// The deterministic-default seam: store-only config is valid. Recall is
		// lexical-only, extraction is rule-based, no LLM tier — all zero-config.
		const tek = createHostedRuntime({ store, projectId: "minimal" });

		expect(tek.embedder).toBeUndefined();
		expect(tek.reranker).toBeUndefined();
		expect(tek.extractor).toBeUndefined();
		expect(tek.llmClient).toBeUndefined();

		await tek.writeMemory({ content: "minimal config still works" });
		const hits = await tek.recall("minimal");
		expect(hits.items.length).toBeGreaterThan(0);
	});

	it("defaults name/version to the tekmemo-server identity", () => {
		const tek = createHostedRuntime({ store, projectId: "defaults" });
		expect(tek.name).toBe("tekmemo-server");
		expect(tek.version).toBe("0.1.0");
	});

	it("honors explicit name/version overrides", () => {
		const tek = createHostedRuntime({
			store,
			projectId: "branded",
			name: "acme-memory",
			version: "1.2.3",
		});
		expect(tek.name).toBe("acme-memory");
		expect(tek.version).toBe("1.2.3");
	});

	it("throws a clear error when the required `store` slot is omitted", () => {
		// Cast through `unknown` so the runtime guard (not the type system) is what
		// the test exercises — defense-in-depth: a caller that bypasses types
		// still gets a clear error, never a silent undefined-store runtime crash.
		const badOptions = { projectId: "no-store" } as unknown as Parameters<
			typeof createHostedRuntime
		>[0];
		expect(() => createHostedRuntime(badOptions)).toThrowError(/store/);
	});

	it("throws when store is explicitly null", () => {
		expect(() =>
			createHostedRuntime({
				projectId: "null-store",
				store: null as unknown as InMemoryMemoryStore,
			}),
		).toThrowError(/store/);
	});
});

/**
 * Minimal fake embedder satisfying the core {@link MemoryEmbedder} contract.
 * Returns a fixed-width vector so the recall pipeline's vector channel has
 * something deterministic to store. Local (not the testing-package fake) because
 * the factory is typed against the full core interface, not the `Minimal*` shape.
 */
function createFakeEmbedder(): MemoryEmbedder {
	return {
		async embedTexts(input: { texts: string[] }) {
			return {
				embeddings: input.texts.map((text, index) => ({
					text,
					embedding: [text.length, index],
					index,
					model: "fake-embedder",
					dimensions: 2,
				})),
				model: "fake-embedder",
			};
		},
		async embedText(text: string) {
			return {
				text,
				embedding: [text.length, 0],
				index: 0,
				model: "fake-embedder",
				dimensions: 2,
			};
		},
	} as MemoryEmbedder;
}

/** Fake reranker: returns inputs unchanged in document order with neutral scores. */
function createFakeReranker(): Reranker {
	return {
		async rerank(input: RerankInput): Promise<RerankResult[]> {
			return input.documents.map((doc, index) => ({
				id: doc.id,
				text: doc.text,
				score: 1,
				rank: index + 1,
				...(doc.metadata === undefined ? {} : { metadata: doc.metadata }),
			}));
		},
	};
}

/** Fake extractor: emits no facts (a no-op stand-in — the factory only stores it). */
function createFakeExtractor(): Extractor {
	return {
		name: "fake-extractor",
		async extract(_input: ExtractionInput): Promise<ExtractionResult> {
			return { nodes: [], edges: [] };
		},
	};
}

/**
 * Fake LLM client: echoes the user turn. Records the seam is threaded (slice 6
 * will assert on `complete` calls; slice 0 only wires it onto the runtime).
 */
function createFakeLlmClient(): LlmClient {
	return {
		name: "fake-llm-client",
		async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
			return { text: input.user, model: "fake-llm-client" };
		},
	};
}
