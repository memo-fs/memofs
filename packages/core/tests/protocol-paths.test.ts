import { describe, expect, it } from "vitest";
import {
	assertMemoryPath,
	CHUNKS_INDEX_PATH,
	CORE_MEMORY_PATH,
	createSnapshotPath,
	MANIFEST_PATH,
	MEMOFS_DIR,
	MEMOFS_PATHS,
	MEMORY_EVENTS_PATH,
	MemoryPathError,
} from "../src/index";

describe(".memofs protocol paths", () => {
	it("uses .memofs as the canonical protocol directory", () => {
		expect(MEMOFS_DIR).toBe(".memofs");
		expect(MEMOFS_PATHS.manifest).toBe(MANIFEST_PATH);
		expect(MEMOFS_PATHS.memory.core).toBe(CORE_MEMORY_PATH);
		expect(MEMOFS_PATHS.events.memoryEvents).toBe(MEMORY_EVENTS_PATH);
		expect(MEMOFS_PATHS.indexes.chunks).toBe(CHUNKS_INDEX_PATH);
	});

	it("rejects the old .memory protocol path", () => {
		expect(() => assertMemoryPath(".memory/core.md")).toThrow(MemoryPathError);
	});

	it("supports safe dynamic snapshot paths", () => {
		expect(createSnapshotPath("snapshot-2026-05-02")).toBe(
			".memofs/snapshots/snapshot-2026-05-02.json",
		);
	});

	it("rejects unsafe snapshot IDs", () => {
		expect(() => createSnapshotPath("../secret")).toThrow(MemoryPathError);
		expect(() => createSnapshotPath("bad/name")).toThrow(MemoryPathError);
		expect(() => createSnapshotPath("bad\0name")).toThrow(MemoryPathError);
	});
});
