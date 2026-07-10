import { describe, expect, test } from "vitest";
import {
	createInMemoryRecallStore,
	InMemoryRecallStore,
	RecallDimensionError,
	RecallValidationError,
} from "../../src/index";
import {
	createRecallDocument,
	createRecallDocuments,
} from "../../src/recall/testing/fixtures";

describe("InMemoryRecallStore", () => {
	test("upsert with empty documents is a no-op", async () => {
		const store = createInMemoryRecallStore();
		await store.upsert([]);
		await expect(store.count()).resolves.toBe(0);
	});

	test("upserts and queries by cosine score", async () => {
		const store = createInMemoryRecallStore({
			duplicateDocumentIdBehavior: "last-write-wins",
		});
		await store.upsert(createRecallDocuments());

		const results = await store.query({ embedding: [1, 0, 0], topK: 2 });

		expect(results.map((result) => result.id)).toEqual(["doc_a", "doc_c"]);
		expect(results[0]?.text).toContain("TypeScript");
	});

	test("supports namespace isolation", async () => {
		const store = createInMemoryRecallStore();
		await store.upsert([
			createRecallDocument({
				id: "doc_1",
				embedding: [1, 0],
				namespace: "tenant/proj_a",
			}),
			createRecallDocument({
				id: "doc_2",
				embedding: [1, 0],
				namespace: "tenant/proj_b",
			}),
		]);

		const a = await store.query({
			embedding: [1, 0],
			topK: 10,
			namespace: "tenant/proj_a",
		});
		const b = await store.query({
			embedding: [1, 0],
			topK: 10,
			namespace: "tenant/proj_b",
		});

		expect(a.map((result) => result.id)).toEqual(["doc_1"]);
		expect(b.map((result) => result.id)).toEqual(["doc_2"]);
	});

	test("filters by metadata", async () => {
		const store = createInMemoryRecallStore({
			duplicateDocumentIdBehavior: "last-write-wins",
		});
		await store.upsert(createRecallDocuments());

		const results = await store.query({
			embedding: [1, 0, 0],
			topK: 10,
			filter: { projectId: "proj_1", tag: "typescript" },
		});

		expect(results.map((result) => result.id)).toEqual(["doc_a"]);
	});

	test("supports includeText and includeMetadata flags", async () => {
		const store = createInMemoryRecallStore();
		await store.upsert([createRecallDocument()]);

		const [result] = await store.query({
			embedding: [1, 0, 0],
			topK: 1,
			includeText: false,
			includeMetadata: false,
		});

		expect(result?.text).toBeUndefined();
		expect(result?.metadata).toBeUndefined();
	});

	test("rejects duplicate document IDs by default", async () => {
		const store = createInMemoryRecallStore();
		await store.upsert([createRecallDocument({ id: "doc_same" })]);

		await expect(
			store.upsert([createRecallDocument({ id: "doc_same" })]),
		).rejects.toThrow(RecallValidationError);
	});

	test("can use last-write-wins duplicate handling", async () => {
		const store = createInMemoryRecallStore({
			duplicateDocumentIdBehavior: "last-write-wins",
		});
		await store.upsert([createRecallDocument({ id: "doc_same", text: "old" })]);
		await store.upsert([createRecallDocument({ id: "doc_same", text: "new" })]);

		const [result] = await store.query({ embedding: [1, 0, 0], topK: 1 });
		expect(result?.text).toBe("new");
	});

	test("rejects duplicate IDs inside the same batch", async () => {
		const store = createInMemoryRecallStore();
		await expect(
			store.upsert([
				createRecallDocument({ id: "doc_same" }),
				createRecallDocument({ id: "doc_same" }),
			]),
		).rejects.toThrow(RecallValidationError);
	});

	test("enforces configured dimension", async () => {
		const store = createInMemoryRecallStore({ dimension: 2 });
		await expect(
			store.upsert([createRecallDocument({ embedding: [1, 0, 0] })]),
		).rejects.toThrow(RecallDimensionError);
	});

	test("infers dimension and rejects later mismatches", async () => {
		const store = createInMemoryRecallStore();
		await store.upsert([createRecallDocument({ embedding: [1, 0, 0] })]);
		await expect(
			store.upsert([createRecallDocument({ id: "doc_2", embedding: [1, 0] })]),
		).rejects.toThrow(RecallDimensionError);
	});

	test("delete removes IDs in a namespace", async () => {
		const store = createInMemoryRecallStore();
		await store.upsert([
			createRecallDocument({ id: "doc_1", namespace: "a" }),
			createRecallDocument({ id: "doc_1", namespace: "b" }),
		]);

		await store.delete(["doc_1"], { namespace: "a" });

		expect(await store.count("a")).toBe(0);
		expect(await store.count("b")).toBe(1);
	});

	test("deleteBySource removes matching source records", async () => {
		const store = createInMemoryRecallStore({
			duplicateDocumentIdBehavior: "last-write-wins",
		});
		await store.upsert(createRecallDocuments());

		await store.deleteBySource({
			projectId: "proj_1",
			sourceType: "note",
			sourceId: "a",
		});

		const results = await store.query({ embedding: [1, 0, 0], topK: 10 });
		expect(results.map((result) => result.id)).not.toContain("doc_a");
	});

	test("snapshot returns clones that cannot mutate store state", async () => {
		const store = new InMemoryRecallStore();
		await store.upsert([
			createRecallDocument({
				metadata: {
					projectId: "proj_1",
					sourceType: "note",
					sourceId: "note_1",
					memoryType: "notes",
					nested: { a: 1 },
				},
			}),
		]);

		const snapshot = store.snapshot();
		const [snapshotDocument] = snapshot;
		if (!snapshotDocument) throw new Error("Expected snapshot document.");
		snapshotDocument.embedding[0] = 999;
		snapshotDocument.metadata.projectId = "changed";

		const [result] = await store.query({ embedding: [1, 0, 0], topK: 1 });
		expect(result?.metadata?.projectId).toBe("proj_1");
	});
});
