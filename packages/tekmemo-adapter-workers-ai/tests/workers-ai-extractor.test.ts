import { defineExtractorContractTests } from "@tekbreed/tekmemo-testing/contracts";
import { describe, expect, it } from "vitest";
import { createWorkersAiExtractor } from "../src";

/**
 * A minimal fake of the Workers AI `Ai` binding that returns a JSON-shaped
 * chat response. The extractor's real parsing/provenance/maxFacts/contradiction
 * logic runs end-to-end against it — only the network call is mocked.
 */
function createFakeAi(responseText: string | ((input: string) => string)): Ai {
	return {
		async run(_model: string, inputs: unknown) {
			const messages = (inputs as { messages: Array<{ content: string }> }).messages;
			const userText = messages[messages.length - 1]?.content ?? "";
			const body =
				typeof responseText === "function" ? responseText(userText) : responseText;
			return { response: body } as unknown as Awaited<ReturnType<Ai["run"]>>;
		},
	} as unknown as Ai;
}

/**
 * A deterministic "LLM" that derives the same facts the rule-based extractor
 * would, but emits them as the JSON the Workers AI extractor expects. Keeps the
 * shared contract suite meaningful — the extractor's parsing + mapping is what's
 * under test, and that runs against this canned output.
 */
function factsJson(input: string): string {
	const relations: Array<[RegExp, string]> = [
		[/^(.+?)\s+uses?\s+(.+)$/i, "uses"],
		[/^(.+?)\s+(?:depends on|requires|needs)\s+(.+)$/i, "depends_on"],
		[/^(.+?)\s+(?:prefers|likes)\s+(.+)$/i, "prefers"],
		[/^(.+?)\s+blocks?\s+(.+)$/i, "blocks"],
		[/^(.+?)\s+(?:supersedes|replaces|deprecates)\s+(.+)$/i, "supersedes"],
		[/^(.+?)\s+(?:owns|maintains)\s+(.+)$/i, "owns"],
		[/^(.+?)\s+(?:->|=>)\s+(.+)$/i, "related_to"],
	];
	const facts: { from: string; type: string; to: string }[] = [];
	for (const rawLine of input.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		for (const [re, type] of relations) {
			const m = line.match(re);
			if (m?.[1] && m[2]) {
				facts.push({ from: m[1].trim(), type, to: m[2].trim() });
				break;
			}
		}
	}
	return JSON.stringify({ facts });
}

// Plug the extractor into the shared, invariant contract suite that every
// Extractor implementation must satisfy (same one the rule-based extractor and
// the voyage embedder/reranker use).
defineExtractorContractTests({
	name: "workers-ai",
	createExtractor: () =>
		createWorkersAiExtractor({ ai: createFakeAi(factsJson) }),
});

describe("workers-ai extractor — defensive parsing", () => {
	it("returns empty nodes/edges when the model emits no facts", async () => {
		const extractor = createWorkersAiExtractor({
			ai: createFakeAi('{"facts":[]}'),
		});
		const result = await extractor.extract({ text: "some prose" });
		expect(result.nodes).toEqual([]);
		expect(result.edges).toEqual([]);
		expect(result.contradictions).toBeUndefined();
	});

	it("returns empty result on malformed JSON (never throws)", async () => {
		const extractor = createWorkersAiExtractor({
			ai: createFakeAi("sorry, I cannot help with that."),
		});
		const result = await extractor.extract({ text: "TekMemo uses BM25" });
		expect(result.nodes).toEqual([]);
		expect(result.edges).toEqual([]);
	});

	it("returns empty result when content is missing entirely", async () => {
		const ai = {
			async run() {
				return { somethingElse: 1 } as never;
			},
		} as unknown as Ai;
		const extractor = createWorkersAiExtractor({ ai });
		const result = await extractor.extract({ text: "x uses y" });
		expect(result.edges).toEqual([]);
	});

	it("drops facts with unknown relation types", async () => {
		const extractor = createWorkersAiExtractor({
			ai: createFakeAi(
				JSON.stringify({
					facts: [
						{ from: "A", type: "eats", to: "B" },
						{ from: "A", type: "uses", to: "B" },
					],
				}),
			),
		});
		const result = await extractor.extract({ text: "A uses B" });
		expect(result.edges).toHaveLength(1);
		expect(result.edges[0]?.type).toBe("uses");
	});

	it("stamps the model name onto the result", async () => {
		const extractor = createWorkersAiExtractor({
			ai: createFakeAi('{"facts":[]}'),
		});
		const result = await extractor.extract({ text: "x" });
		expect(result.model).toBe("workers-ai:@cf/meta/llama-3.1-8b-instruct");
	});

	it("honors a custom model id", () => {
		const extractor = createWorkersAiExtractor({
			ai: createFakeAi('{"facts":[]}'),
			model: "@cf/meta/llama-4-1232b-instruct",
		});
		expect(extractor.name).toBe("workers-ai:@cf/meta/llama-4-1232b-instruct");
	});
});
