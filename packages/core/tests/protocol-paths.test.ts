import { describe, expect, it } from "vitest";
import {
	assertMemoryPath,
	CHUNKS_INDEX_PATH,
	CORE_MEMORY_PATH,
	createSnapshotPath,
	MANIFEST_PATH,
	MEMORY_EVENTS_PATH,
	MemoryPathError,
	TEKMEMO_DIR,
	TEKMEMO_PATHS,
} from "../src/index";

describe(".tekmemo protocol paths", () => {
	it("uses .tekmemo as the canonical protocol directory", () => {
		expect(TEKMEMO_DIR).toBe(".tekmemo");
		expect(TEKMEMO_PATHS.manifest).toBe(MANIFEST_PATH);
		expect(TEKMEMO_PATHS.memory.core).toBe(CORE_MEMORY_PATH);
		expect(TEKMEMO_PATHS.events.memoryEvents).toBe(MEMORY_EVENTS_PATH);
		expect(TEKMEMO_PATHS.indexes.chunks).toBe(CHUNKS_INDEX_PATH);
	});

	it("rejects the old .memory protocol path", () => {
		expect(() => assertMemoryPath(".memory/core.md")).toThrow(MemoryPathError);
	});

	it("supports safe dynamic snapshot paths", () => {
		expect(createSnapshotPath("snapshot-2026-05-02")).toBe(
			".tekmemo/snapshots/snapshot-2026-05-02.json",
		);
	});

	it("rejects unsafe snapshot IDs", () => {
		expect(() => createSnapshotPath("../secret")).toThrow(MemoryPathError);
		expect(() => createSnapshotPath("bad/name")).toThrow(MemoryPathError);
		expect(() => createSnapshotPath("bad\0name")).toThrow(MemoryPathError);
	});
});
