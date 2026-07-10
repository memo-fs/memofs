import { describe, expect, it } from "vitest";
import {
	assertMemoryPath,
	CORE_MEMORY_PATH,
	createDefaultMemoFsManifest,
	isMemoFsError,
	isMemoryPath,
	MemoFsError,
	MemoryPathError,
	MemoryValidationError,
	memoryTypeFromPath,
	normalizeTimestampedNote,
	validateMemoFsManifest,
} from "../../src/index";

describe("path validation", () => {
	it("detects valid paths", () => {
		expect(isMemoryPath(CORE_MEMORY_PATH)).toBe(true);
		expect(memoryTypeFromPath(CORE_MEMORY_PATH)).toBe("core");
	});

	it("rejects traversal and backslashes", () => {
		expect(() => assertMemoryPath("../x")).toThrow(MemoryPathError);
		expect(() => assertMemoryPath(".memory\\core.md")).toThrow(MemoryPathError);
	});

	it("rejects null-byte paths", () => {
		expect(() => assertMemoryPath("core\0md")).toThrow(MemoryPathError);
		expect(() => assertMemoryPath("../\0x")).toThrow(MemoryPathError);
	});

	it("rejects absolute paths", () => {
		expect(() => assertMemoryPath("/etc/passwd")).toThrow(MemoryPathError);
		expect(() => assertMemoryPath("C:\\Windows")).toThrow(MemoryPathError);
	});

	it("rejects paths outside .memofs/", () => {
		expect(() => assertMemoryPath(".memofs/../etc/passwd")).toThrow(
			MemoryPathError,
		);
		expect(() => assertMemoryPath(".memofs/../secret")).toThrow(
			MemoryPathError,
		);
	});
});

describe("typed errors", () => {
	it("detects MemoFS errors", () => {
		const error = new MemoFsError({
			code: "MEMOFS_VALIDATION_ERROR",
			message: "bad",
		});
		expect(isMemoFsError(error)).toBe(true);
		expect(error.code).toBe("MEMOFS_VALIDATION_ERROR");
	});
});

describe("note validation", () => {
	it("normalizes duplicate and blank tags", () => {
		const note = normalizeTimestampedNote({
			timestamp: "2026-05-02T12:00:00.000Z",
			kind: "note",
			content: "hello",
			tags: ["A", "a", "", "B"],
		});

		expect(note.tags).toEqual(["A", "B"]);
	});

	it("rejects empty content", () => {
		expect(() =>
			normalizeTimestampedNote({
				timestamp: "2026-05-02T12:00:00.000Z",
				kind: "note",
				content: " ",
			}),
		).toThrow(MemoryValidationError);
	});

	it("rejects invalid timestamp", () => {
		expect(() =>
			normalizeTimestampedNote({
				timestamp: "not-a-date",
				kind: "note",
				content: "hello",
			}),
		).toThrow(MemoryValidationError);
	});

	it("rejects invalid confidence", () => {
		expect(() =>
			normalizeTimestampedNote({
				timestamp: "2026-05-02T12:00:00.000Z",
				kind: "note",
				content: "hello",
				confidence: 2,
			}),
		).toThrow(MemoryValidationError);
	});

	it("rejects invalid note kinds", () => {
		expect(() =>
			normalizeTimestampedNote({
				timestamp: "2026-05-02T12:00:00.000Z",
				kind: "reminder" as "note",
				content: "hello",
			}),
		).toThrow(MemoryValidationError);
	});

	it("rejects non-json metadata values", () => {
		for (const metadata of [
			{ value: undefined },
			{ value: () => "x" },
			{ value: Symbol("x") },
			{ value: BigInt(1) },
			{ value: Number.NaN },
			{ value: Number.POSITIVE_INFINITY },
			{ nested: { date: new Date("2026-05-02T00:00:00.000Z") } },
		]) {
			expect(() =>
				normalizeTimestampedNote({
					timestamp: "2026-05-02T12:00:00.000Z",
					kind: "note",
					content: "hello",
					metadata,
				}),
			).toThrow(MemoryValidationError);
		}
	});

	it("rejects nested circular metadata", () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		expect(() =>
			normalizeTimestampedNote({
				timestamp: "2026-05-02T12:00:00.000Z",
				kind: "note",
				content: "hello",
				metadata: { circular },
			}),
		).toThrow(MemoryValidationError);
	});
});

describe("manifest validation", () => {
	it("rejects paths outside the canonical protocol", () => {
		const manifest = createDefaultMemoFsManifest({
			now: () => "2026-05-02T00:00:00.000Z",
		});

		expect(() =>
			validateMemoFsManifest({
				...manifest,
				memory: { ...manifest.memory, core: "core.md" },
			}),
		).toThrow(MemoryPathError);
	});

	it("rejects safe paths assigned to the wrong manifest field", () => {
		const manifest = createDefaultMemoFsManifest({
			now: () => "2026-05-02T00:00:00.000Z",
		});

		expect(() =>
			validateMemoFsManifest({
				...manifest,
				memory: {
					...manifest.memory,
					core: ".memofs/snapshots/not-core.json",
				},
			}),
		).toThrow(MemoryValidationError);
	});
});
