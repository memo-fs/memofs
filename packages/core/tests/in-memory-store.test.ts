import { describe, expect, it } from "vitest";
import {
	CORE_MEMORY_PATH,
	InMemoryMemoryStore,
	MemoryNotFoundError,
	MemoryPathError,
	NOTES_MEMORY_PATH,
} from "../src/index";

describe("InMemoryMemoryStore", () => {
	it("writes, reads and appends content", async () => {
		const store = new InMemoryMemoryStore();
		await store.write(CORE_MEMORY_PATH, "hello");
		await store.append(CORE_MEMORY_PATH, " world");

		expect(await store.read(CORE_MEMORY_PATH)).toBe("hello world");
	});

	it("throws a typed error for missing files", async () => {
		const store = new InMemoryMemoryStore();
		await expect(store.read(CORE_MEMORY_PATH)).rejects.toBeInstanceOf(
			MemoryNotFoundError,
		);
	});

	it("rejects unsupported paths at runtime", async () => {
		const store = new InMemoryMemoryStore();
		await expect(
			store.write("../secret" as typeof CORE_MEMORY_PATH, "x"),
		).rejects.toBeInstanceOf(MemoryPathError);
	});

	it("rejects null-byte paths", async () => {
		const store = new InMemoryMemoryStore();
		await expect(
			store.exists(".tekmemo/memory/core.md\0" as typeof CORE_MEMORY_PATH),
		).rejects.toBeInstanceOf(MemoryPathError);
	});

	it("returns immutable snapshots", async () => {
		const store = new InMemoryMemoryStore({ [NOTES_MEMORY_PATH]: "notes" });
		const snapshot = store.snapshot();

		expect(snapshot[NOTES_MEMORY_PATH]).toBe("notes");
		expect(Object.isFrozen(snapshot)).toBe(true);
	});
});
