import { describe, expect, it } from "vitest";
import {
	cloneForMutationCheck,
	expectNoMutation,
	expectSortedDescending,
} from "../assertions/assertions";
import { createRecallDocumentsFixture } from "../fixtures/recall-fixtures";
import type { MinimalRecallStore } from "../types/contracts";

export interface RecallStoreContractOptions {
	name: string;
	createStore: () => Promise<MinimalRecallStore> | MinimalRecallStore;
	cleanup?: () => Promise<void> | void;
	dimensions?: number;
	requiresProjectFilter?: boolean;
}

export function defineRecallStoreContractTests(
	options: RecallStoreContractOptions,
): void {
	describe(`${options.name} RecallStore contract`, () => {
		it("upserts and queries documents", async () => {
			const store = await options.createStore();
			try {
				const documents = createRecallDocumentsFixture(options.dimensions ?? 3);
				await store.upsert(documents);
				const [firstDocument] = documents;
				if (!firstDocument)
					throw new Error("Expected recall fixture document.");

				const results = await store.query({
					embedding: firstDocument.embedding,
					topK: 2,
					filter: { projectId: "proj_1" },
				});

				expect(results.length).toBeGreaterThan(0);
				expect(results[0]?.id).toBe("chunk_core");
				expectSortedDescending(results.map((result) => result.score));
			} finally {
				await options.cleanup?.();
			}
		});

		it("returns empty query results when no documents exist", async () => {
			const store = await options.createStore();
			try {
				const results = await store.query({
					embedding: [1, 0, 0].slice(0, options.dimensions ?? 3),
					topK: 3,
					filter: { projectId: "proj_1" },
				});

				expect(results).toEqual([]);
			} finally {
				await options.cleanup?.();
			}
		});

		it("preserves project isolation through filtering", async () => {
			const store = await options.createStore();
			try {
				const documents = createRecallDocumentsFixture(options.dimensions ?? 3);
				await store.upsert(documents);
				const thirdDocument = documents[2];
				if (!thirdDocument)
					throw new Error("Expected third recall fixture document.");

				const results = await store.query({
					embedding: thirdDocument.embedding,
					topK: 10,
					filter: { projectId: "proj_1" },
				});

				expect(
					results.every((result) => result.metadata?.projectId === "proj_1"),
				).toBe(true);
			} finally {
				await options.cleanup?.();
			}
		});

		it("deletes by ids", async () => {
			const store = await options.createStore();
			try {
				const documents = createRecallDocumentsFixture(options.dimensions ?? 3);
				await store.upsert(documents);
				await store.delete(["chunk_core"]);
				const [firstDocument] = documents;
				if (!firstDocument)
					throw new Error("Expected recall fixture document.");

				const results = await store.query({
					embedding: firstDocument.embedding,
					topK: 10,
					filter: { projectId: "proj_1" },
				});

				expect(results.map((result) => result.id)).not.toContain("chunk_core");
			} finally {
				await options.cleanup?.();
			}
		});

		it("deletes by source", async () => {
			const store = await options.createStore();
			try {
				const documents = createRecallDocumentsFixture(options.dimensions ?? 3);
				await store.upsert(documents);
				const [firstDocument] = documents;
				if (!firstDocument)
					throw new Error("Expected recall fixture document.");

				await store.deleteBySource({
					projectId: "proj_1",
					sourceType: "document",
					sourceId: "core",
				});

				const results = await store.query({
					embedding: firstDocument.embedding,
					topK: 10,
					filter: { projectId: "proj_1" },
				});

				expect(results.map((result) => result.id)).not.toContain("chunk_core");
			} finally {
				await options.cleanup?.();
			}
		});

		it("does not mutate caller-owned documents", async () => {
			const store = await options.createStore();
			try {
				const documents = createRecallDocumentsFixture(options.dimensions ?? 3);
				const before = cloneForMutationCheck(documents);

				await store.upsert(documents);

				expectNoMutation(before, documents);
			} finally {
				await options.cleanup?.();
			}
		});

		it("rejects duplicate document IDs in one upsert batch", async () => {
			const store = await options.createStore();
			try {
				const documents = createRecallDocumentsFixture(options.dimensions ?? 3);
				const [firstDocument] = documents;
				if (!firstDocument)
					throw new Error("Expected recall fixture document.");
				await expect(
					store.upsert([firstDocument, { ...firstDocument }]),
				).rejects.toThrow();
			} finally {
				await options.cleanup?.();
			}
		});

		if (options.requiresProjectFilter ?? true) {
			it("rejects queries without project filter when required", async () => {
				const store = await options.createStore();
				try {
					await expect(
						store.query({
							embedding: [1, 0, 0].slice(0, options.dimensions ?? 3),
							topK: 1,
						}),
					).rejects.toThrow();
				} finally {
					await options.cleanup?.();
				}
			});
		}
	});
}
