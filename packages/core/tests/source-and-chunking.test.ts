import { describe, expect, it } from "vitest";
import {
	assertMemorySourceReference,
	chunkText,
	createChunkId,
	createSourceKey,
	hashString,
	MemoryValidationError,
} from "../src/index";

const source = {
	tenantId: "tenant",
	projectId: "project",
	sourceType: "document" as const,
	sourceId: "core",
};

describe("source manifest helpers", () => {
	it("creates deterministic source keys", () => {
		expect(createSourceKey(source)).toBe("tenant:project:document:core");
	});

	it("rejects invalid source types", () => {
		expect(() =>
			createSourceKey({ ...source, sourceType: "bad" as "document" }),
		).toThrow(MemoryValidationError);
	});

	it("rejects non-object source references", () => {
		for (const value of [null, "source", ["source"]]) {
			expect(() => assertMemorySourceReference(value as typeof source)).toThrow(
				MemoryValidationError,
			);
		}
	});
});

describe("chunkText", () => {
	it("chunks text with deterministic IDs and hashes", () => {
		const chunks = chunkText(
			"A long piece of text that should become chunks.",
			{
				source,
				memoryType: "core",
				maxChars: 12,
				overlapChars: 2,
			},
		);

		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks[0]?.id).toContain("tenant:project:document:core");
		expect(chunks[0]?.hash).toHaveLength(8);
	});

	it("rejects overlap greater than max chars", () => {
		expect(() =>
			chunkText("hello", {
				source,
				memoryType: "core",
				maxChars: 5,
				overlapChars: 5,
			}),
		).toThrow(MemoryValidationError);
	});

	it("rejects invalid memory types", () => {
		expect(() =>
			chunkText("hello", { source, memoryType: "bad" as "core" }),
		).toThrow(MemoryValidationError);
	});

	it("rejects circular metadata", () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		expect(() =>
			chunkText("hello", { source, memoryType: "core", metadata: circular }),
		).toThrow(MemoryValidationError);
	});

	it("hashes consistently", () => {
		expect(hashString("abc")).toBe(hashString("abc"));
		expect(hashString("abc")).not.toBe(hashString("abcd"));
	});

	it("creates deterministic chunk IDs", () => {
		expect(createChunkId(source, 1, "hash")).toBe(
			createChunkId(source, 1, "hash"),
		);
	});
});
