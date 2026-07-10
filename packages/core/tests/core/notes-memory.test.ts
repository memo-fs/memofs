import { describe, expect, it } from "vitest";
import {
	appendTimestampedNote,
	bootstrapMemoryStore,
	formatTimestampedNote,
	InMemoryMemoryStore,
	MemoryValidationError,
	NOTES_MEMORY_PATH,
	readNotesMemory,
} from "../../src/index";

describe("notes memory", () => {
	it("appends validated markdown note blocks", async () => {
		const store = new InMemoryMemoryStore();
		await bootstrapMemoryStore(store);

		await appendTimestampedNote(store, {
			timestamp: "2026-05-02T12:00:00.000Z",
			kind: "decision",
			title: "Architecture",
			content: "Use file-first memory.",
			tags: ["architecture", "architecture", "memory", ""],
			source: "meeting",
			confidence: 0.9,
			metadata: { ticket: "MEM-1" },
		});

		const notes = await readNotesMemory(store);
		expect(notes).toMatch(/## 2026-05-02T12:00:00.000Z — Architecture/);
		expect(notes).toMatch(/- kind: decision/);
		expect(notes).toMatch(/- tags: architecture, memory/);
		expect(notes).toMatch(/Use file-first memory/);
	});

	it("bootstraps notes implicitly if notes file is missing", async () => {
		const store = new InMemoryMemoryStore();
		await appendTimestampedNote(store, {
			timestamp: "2026-05-02T12:00:00.000Z",
			kind: "note",
			content: "A note",
		});

		expect(await store.read(NOTES_MEMORY_PATH)).toMatch(/# Notes/);
	});

	it("rejects invalid timestamps", async () => {
		const store = new InMemoryMemoryStore();
		await expect(
			appendTimestampedNote(store, {
				timestamp: "not-a-date",
				kind: "note",
				content: "A note",
			}),
		).rejects.toBeInstanceOf(MemoryValidationError);
	});

	it("rejects invalid confidence", () => {
		expect(() =>
			formatTimestampedNote({
				timestamp: "2026-05-02T12:00:00.000Z",
				kind: "note",
				content: "A note",
				confidence: 2,
			}),
		).toThrow(MemoryValidationError);
	});

	it("rejects circular metadata", () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		expect(() =>
			formatTimestampedNote({
				timestamp: "2026-05-02T12:00:00.000Z",
				kind: "note",
				content: "A note",
				metadata: circular,
			}),
		).toThrow(MemoryValidationError);
	});
});
