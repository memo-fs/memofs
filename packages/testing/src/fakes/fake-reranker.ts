import type {
	MinimalRerankDocument,
	MinimalReranker,
	MinimalRerankResult,
} from "../types/contracts";

export class FakeReranker implements MinimalReranker {
	async rerank(input: {
		query: string;
		documents: MinimalRerankDocument[];
		topK?: number;
	}): Promise<MinimalRerankResult[]> {
		if (input.query.trim().length === 0) {
			throw new Error("query must not be empty.");
		}

		const seen = new Set<string>();
		for (const document of input.documents) {
			if (seen.has(document.id)) {
				throw new Error(`Duplicate rerank document id: ${document.id}`);
			}
			seen.add(document.id);
		}

		const queryTerms = new Set(tokenize(input.query));

		return input.documents
			.map((document) => ({
				id: document.id,
				text: document.text,
				score: lexicalScore(queryTerms, document.text),
				rank: 0,
				metadata: document.metadata
					? JSON.parse(JSON.stringify(document.metadata))
					: undefined,
			}))
			.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
			.slice(0, input.topK ?? input.documents.length)
			.map((result, index) => ({
				...result,
				rank: index + 1,
			}));
	}
}

export function createFakeReranker(): FakeReranker {
	return new FakeReranker();
}

function tokenize(value: string): string[] {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/i)
		.filter(Boolean);
}

function lexicalScore(queryTerms: Set<string>, text: string): number {
	const docTerms = new Set(tokenize(text));
	let hits = 0;

	for (const term of queryTerms) {
		if (docTerms.has(term)) hits += 1;
	}

	return queryTerms.size === 0 ? 0 : hits / queryTerms.size;
}
