import type {
	MinimalRecallDocument,
	MinimalRecallQuery,
	MinimalRecallResult,
	MinimalRecallStore,
} from "../types/contracts";

export class FakeRecallStore implements MinimalRecallStore {
	private readonly documents = new Map<string, MinimalRecallDocument>();

	async upsert(documents: MinimalRecallDocument[]): Promise<void> {
		const seen = new Set<string>();
		for (const document of documents) {
			if (seen.has(document.id)) {
				throw new Error(`Duplicate recall document id: ${document.id}`);
			}
			seen.add(document.id);
		}

		for (const document of documents) {
			this.documents.set(
				document.id,
				JSON.parse(JSON.stringify(document)) as MinimalRecallDocument,
			);
		}
	}

	async query(query: MinimalRecallQuery): Promise<MinimalRecallResult[]> {
		return Array.from(this.documents.values())
			.filter((document) => matchesFilter(document.metadata, query.filter))
			.map((document) => ({
				id: document.id,
				text: document.text,
				score: cosineSimilarity(document.embedding, query.embedding),
				metadata: JSON.parse(JSON.stringify(document.metadata)) as Record<
					string,
					unknown
				>,
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, query.topK);
	}

	async delete(ids: string[]): Promise<void> {
		for (const id of ids) {
			this.documents.delete(id);
		}
	}

	async deleteBySource(input: {
		projectId: string;
		sourceType: string;
		sourceId: string;
	}): Promise<void> {
		for (const [id, document] of this.documents.entries()) {
			if (
				document.metadata.projectId === input.projectId &&
				document.metadata.sourceType === input.sourceType &&
				document.metadata.sourceId === input.sourceId
			) {
				this.documents.delete(id);
			}
		}
	}

	size(): number {
		return this.documents.size;
	}
}

export function createFakeRecallStore(): FakeRecallStore {
	return new FakeRecallStore();
}

function matchesFilter(
	metadata: Record<string, unknown>,
	filter: Record<string, unknown> | undefined,
): boolean {
	if (!filter) return true;

	for (const [key, value] of Object.entries(filter)) {
		if (metadata[key] !== value) return false;
	}

	return true;
}

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i += 1) {
		const left = a[i] ?? 0;
		const right = b[i] ?? 0;
		dot += left * right;
		normA += left ** 2;
		normB += right ** 2;
	}

	if (normA === 0 || normB === 0) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
