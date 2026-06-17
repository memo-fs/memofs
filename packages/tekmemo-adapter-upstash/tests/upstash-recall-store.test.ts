import {
	RecallDimensionError,
	RecallProviderError,
	RecallValidationError,
} from "@tekbreed/tekmemo";
import { describe, expect, test } from "vitest";
import {
	createUpstashRecallStore,
	FakeUpstashIndex,
	UpstashRecallStore,
} from "../src/index";

function document(id = "chunk_1", overrides: Record<string, unknown> = {}) {
	return {
		id,
		text: "Stored memory",
		embedding: [0.1, 0.2, 0.3],
		metadata: {
			tenantId: "ten_1",
			projectId: "proj_1",
			sourceType: "note",
			sourceId: "note_1",
			memoryType: "notes",
			sectionName: "Decision",
		},
		...overrides,
	};
}

describe("UpstashRecallStore", () => {
	test("creates store and exposes snapshot", () => {
		const store = createUpstashRecallStore(new FakeUpstashIndex(), {
			environment: "test",
			dimension: 3,
		});
		expect(store).toBeInstanceOf(UpstashRecallStore);
		expect(store.snapshot()).toMatchObject({
			namespace: "tekmemo-test",
			dimension: 3,
		});
		expect(store.snapshot().capabilities.supportsMetadataFiltering).toBe(true);
	});

	test("validates client shape", () => {
		expect(() => createUpstashRecallStore({} as never)).toThrow(TypeError);
	});

	test("upsert is noop for empty docs", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, { environment: "test" });
		await store.upsert([]);
		expect(index.calls).toHaveLength(0);
	});

	test("upserts documents into namespace", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, {
			environment: "test",
			dimension: 3,
		});
		await store.upsert([document()]);
		const call = index.lastCall("upsert");
		expect(call?.options).toEqual({ namespace: "tekmemo-test" });
		expect(call?.payload).toEqual([
			expect.objectContaining({
				id: "chunk_1",
				vector: [0.1, 0.2, 0.3],
				data: "Stored memory",
				metadata: expect.objectContaining({
					projectId: "proj_1",
					sourceType: "note",
					sourceId: "note_1",
				}),
			}),
		]);
	});

	test("groups upserts by document namespace", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, {
			environment: "test",
			dimension: 3,
		});
		await store.upsert([
			document("chunk_1", { namespace: "ns_a" }),
			document("chunk_2", { namespace: "ns_b" }),
		]);
		expect(
			index.calls
				.filter((call) => call.operation === "upsert")
				.map((call) => call.options?.namespace),
		).toEqual(["ns_a", "ns_b"]);
	});

	test("batches upserts", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, {
			environment: "test",
			dimension: 3,
			batchSize: 1,
		});
		await store.upsert([document("chunk_1"), document("chunk_2")]);
		expect(
			index.calls.filter((call) => call.operation === "upsert"),
		).toHaveLength(2);
	});

	test("rejects duplicate ids in the same batch", async () => {
		const store = createUpstashRecallStore(new FakeUpstashIndex(), {
			environment: "test",
			dimension: 3,
		});
		await expect(
			store.upsert([document("chunk_1"), document("chunk_1")]),
		).rejects.toThrow(RecallValidationError);
	});

	test("infers dimension from first upsert then rejects mismatch", async () => {
		const store = createUpstashRecallStore(new FakeUpstashIndex(), {
			environment: "test",
		});
		await store.upsert([document("chunk_1")]);
		expect(store.getDimension()).toBe(3);
		await expect(
			store.upsert([document("chunk_2", { embedding: [1, 2] })]),
		).rejects.toThrow(RecallDimensionError);
	});

	test("wraps provider upsert failures", async () => {
		const index = new FakeUpstashIndex();
		index.failOperation = "upsert";
		const store = createUpstashRecallStore(index, { environment: "test" });
		await expect(store.upsert([document()])).rejects.toThrow(
			RecallProviderError,
		);
	});

	test("query sends vector, topK, filter, namespace, and include flags", async () => {
		const index = new FakeUpstashIndex();
		index.queryResponse = [
			{
				id: "chunk_1",
				score: 0.92,
				data: "Stored memory",
				metadata: {
					projectId: "proj_1",
					sourceType: "note",
					sourceId: "note_1",
					memoryType: "notes",
				},
			},
		];
		const store = createUpstashRecallStore(index, {
			environment: "test",
			dimension: 3,
			tenantId: "ten_1",
			projectId: "proj_1",
		});
		const results = await store.query({
			embedding: [0.1, 0.2, 0.3],
			topK: 5,
			filter: { memoryType: "notes" },
			includeText: true,
			includeMetadata: true,
		});

		const call = index.lastCall("query");
		expect(call?.options).toEqual({ namespace: "tekmemo-test-ten_1-proj_1" });
		expect(call?.payload).toMatchObject({
			topK: 5,
			includeData: true,
			includeMetadata: true,
			filter:
				'tenantId = "ten_1" AND projectId = "proj_1" AND memoryType = "notes"',
		});
		expect(results).toEqual([
			expect.objectContaining({
				id: "chunk_1",
				score: 0.92,
				text: "Stored memory",
				namespace: "tekmemo-test-ten_1-proj_1",
			}),
		]);
	});

	test("query honors explicit namespace", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, {
			environment: "test",
			dimension: 3,
		});
		await store.query({
			embedding: [0.1, 0.2, 0.3],
			topK: 1,
			namespace: "custom_ns",
		});
		expect(index.lastCall("query")?.options?.namespace).toBe("custom_ns");
	});

	test("query rejects invalid topK and dimensions", async () => {
		const store = createUpstashRecallStore(new FakeUpstashIndex(), {
			environment: "test",
			dimension: 3,
		});
		await expect(
			store.query({ embedding: [0.1, 0.2, 0.3], topK: 0 }),
		).rejects.toThrow(RecallValidationError);
		await expect(
			store.query({ embedding: [0.1, 0.2], topK: 1 }),
		).rejects.toThrow(RecallDimensionError);
	});

	test("query wraps provider failure and rejects non-array response", async () => {
		const index = new FakeUpstashIndex();
		index.failOperation = "query";
		const store = createUpstashRecallStore(index, {
			environment: "test",
			dimension: 3,
		});
		await expect(
			store.query({ embedding: [0.1, 0.2, 0.3], topK: 1 }),
		).rejects.toThrow(RecallProviderError);

		const bad = new FakeUpstashIndex();
		bad.query = async () => ({ bad: true }) as never;
		const badStore = createUpstashRecallStore(bad, {
			environment: "test",
			dimension: 3,
		});
		await expect(
			badStore.query({ embedding: [0.1, 0.2, 0.3], topK: 1 }),
		).rejects.toThrow(RecallProviderError);
	});

	test("delete deduplicates ids and batches provider calls", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, {
			environment: "test",
			batchSize: 1,
		});
		await store.delete(["chunk_1", "chunk_1", "chunk_2"]);
		expect(
			index.calls.filter((call) => call.operation === "delete"),
		).toHaveLength(2);
		expect(
			index.calls
				.filter((call) => call.operation === "delete")
				.map((call) => call.payload),
		).toEqual([["chunk_1"], ["chunk_2"]]);
	});

	test("delete is noop for empty ids", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, { environment: "test" });
		await store.delete([]);
		expect(index.calls).toHaveLength(0);
	});

	test("delete rejects unsafe ids and wraps provider failures", async () => {
		const store = createUpstashRecallStore(new FakeUpstashIndex(), {
			environment: "test",
		});
		await expect(store.delete(["../bad"])).rejects.toThrow(
			RecallValidationError,
		);

		const index = new FakeUpstashIndex();
		index.failOperation = "delete";
		const failingStore = createUpstashRecallStore(index, {
			environment: "test",
		});
		await expect(failingStore.delete(["chunk_1"])).rejects.toThrow(
			RecallProviderError,
		);
	});

	test("deleteBySource requires resolver by default", async () => {
		const store = createUpstashRecallStore(new FakeUpstashIndex(), {
			environment: "test",
		});
		await expect(
			store.deleteBySource({
				projectId: "proj_1",
				sourceType: "note",
				sourceId: "note_1",
			}),
		).rejects.toThrow(RecallProviderError);
	});

	test("deleteBySource can noop without resolver when configured", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, {
			environment: "test",
			deleteBySourceWithoutResolver: "noop",
		});
		await store.deleteBySource({
			projectId: "proj_1",
			sourceType: "note",
			sourceId: "note_1",
		});
		expect(index.calls).toHaveLength(0);
	});

	test("deleteBySource uses resolver then deletes ids", async () => {
		const index = new FakeUpstashIndex();
		const store = createUpstashRecallStore(index, {
			environment: "test",
			resolveChunkIdsBySource: async (input) => {
				expect(input).toMatchObject({
					namespace: "tekmemo-test",
					projectId: "proj_1",
					sourceType: "note",
					sourceId: "note_1",
				});
				return ["chunk_1", "chunk_2"];
			},
		});
		await store.deleteBySource({
			projectId: "proj_1",
			sourceType: "note",
			sourceId: "note_1",
		});
		expect(index.lastCall("delete")?.payload).toEqual(["chunk_1", "chunk_2"]);
	});

	test("deleteBySource wraps resolver failures", async () => {
		const store = createUpstashRecallStore(new FakeUpstashIndex(), {
			environment: "test",
			resolveChunkIdsBySource: async () => {
				throw new Error("resolver failed");
			},
		});
		await expect(
			store.deleteBySource({
				projectId: "proj_1",
				sourceType: "note",
				sourceId: "note_1",
			}),
		).rejects.toThrow(RecallProviderError);
	});
});
