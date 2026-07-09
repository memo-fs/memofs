import { describe, expect, it } from "vitest";
import {
	appendChunkRecord,
	appendMemoryEvent,
	appendSnapshotRecord,
	chunkText,
	createChunkRecord,
	createMemoryEvent,
	createSnapshotRecord,
	InMemoryMemoryStore,
	MemoryPathError,
	MemoryValidationError,
	markChunkRecordStale,
	readChunkRecords,
	readMemoryEvents,
	readSnapshotRecords,
	validateChunkRecord,
	validateMemoryEvent,
	validateSnapshotRecord,
} from "../../src/index";

describe("memory events", () => {
	it("creates, appends, and reads normalized memory events", async () => {
		const store = new InMemoryMemoryStore();
		const event = createMemoryEvent({
			type: "memory.updated",
			sourcePath: ".memofs/memory/core.md",
			summary: "Updated core memory",
			actor: { type: "agent", id: "agent_1" },
			now: () => "2026-05-02T00:00:00.000Z",
			id: "evt_1",
		});

		await appendMemoryEvent(store, event);
		await expect(readMemoryEvents(store)).resolves.toEqual([event]);
	});

	it("rejects invalid event types", () => {
		expect(() =>
			validateMemoryEvent(
				{ id: "evt", type: "bad", timestamp: "2026-05-02T00:00:00.000Z" },
				1,
			),
		).toThrow(MemoryValidationError);
	});
});

describe("chunk records", () => {
	it("creates chunk records from chunks and can mark them stale", async () => {
		const store = new InMemoryMemoryStore();
		const [chunk] = chunkText("This is a durable memory about MemoFS.", {
			source: {
				sourceType: "document",
				sourceId: "core",
				sourcePath: ".memofs/memory/core.md",
			},
			memoryType: "core",
		});
		if (!chunk) throw new Error("expected chunk");

		const record = createChunkRecord(chunk, {
			sourcePath: ".memofs/memory/core.md",
			sourceType: "document",
			sourceId: "core",
			sourceHash: "source_hash",
			createdAt: "2026-05-02T00:00:00.000Z",
		});

		await appendChunkRecord(store, record);
		expect(await readChunkRecords(store)).toEqual([record]);
		expect(
			markChunkRecordStale(record, "2026-05-03T00:00:00.000Z").status,
		).toBe("stale");
	});

	it("rejects invalid chunk statuses", () => {
		expect(() =>
			validateChunkRecord(
				{
					chunkId: "1",
					sourcePath: "x",
					sourceType: "document",
					sourceId: "s",
					sourceHash: "a",
					textHash: "b",
					memoryType: "core",
					index: 0,
					startOffset: 0,
					endOffset: 1,
					status: "bad",
					createdAt: "2026-05-02T00:00:00.000Z",
				},
				1,
			),
		).toThrow(MemoryValidationError);
	});
});

describe("snapshot records", () => {
	it("creates and stores snapshot records", async () => {
		const store = new InMemoryMemoryStore();
		const record = createSnapshotRecord({
			id: "snapshot-1",
			type: "manual",
			createdAt: "2026-05-02T00:00:00.000Z",
		});

		await appendSnapshotRecord(store, record);
		expect(await readSnapshotRecords(store)).toEqual([record]);
		expect(record.path).toBe(".memofs/snapshots/snapshot-1.json");
	});

	it("rejects snapshot records with unsafe paths", () => {
		expect(() =>
			validateSnapshotRecord(
				{
					id: "snapshot-1",
					path: "../snapshot-1.json",
					type: "manual",
					status: "available",
					createdAt: "2026-05-02T00:00:00.000Z",
				},
				1,
			),
		).toThrow(MemoryPathError);
	});

	it("rejects snapshot records whose path does not match the id", () => {
		expect(() =>
			validateSnapshotRecord(
				{
					id: "snapshot-1",
					path: ".memofs/snapshots/snapshot-2.json",
					type: "manual",
					status: "available",
					createdAt: "2026-05-02T00:00:00.000Z",
				},
				1,
			),
		).toThrow(MemoryValidationError);
	});
});
