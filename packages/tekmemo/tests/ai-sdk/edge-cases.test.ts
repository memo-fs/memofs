import {
	CONVERSATIONS_MEMORY_PATH,
	CORE_MEMORY_PATH,
	DEFAULT_CONVERSATIONS_MEMORY,
	DEFAULT_CORE_MEMORY,
	DEFAULT_NOTES_MEMORY,
	InMemoryMemoryStore,
	NOTES_MEMORY_PATH,
} from "@tekbreed/tekmemo";
import { expect, test, vi } from "vitest";
import { buildPrepareCallMemoryText } from "../../src/ai-sdk/prepare-call/build-prepare-call-memory-text";
import { safeReadMemoryPath } from "../../src/ai-sdk/prepare-call/safe-read-memory-path";
import { memoryToolInputSchema } from "../../src/ai-sdk/schemas/memory-tool-schema";

import { runStructuredMemoryTool } from "../../src/ai-sdk/tools/run-structured-memory-tool";

test("safeReadMemoryPath returns default when memory not found", async () => {
	const store = new InMemoryMemoryStore();
	const core = await safeReadMemoryPath(
		store,
		CORE_MEMORY_PATH,
		DEFAULT_CORE_MEMORY,
	);
	expect(core).toBe(DEFAULT_CORE_MEMORY);

	const notes = await safeReadMemoryPath(
		store,
		NOTES_MEMORY_PATH,
		DEFAULT_NOTES_MEMORY,
	);
	expect(notes).toBe(DEFAULT_NOTES_MEMORY);

	const convs = await safeReadMemoryPath(
		store,
		CONVERSATIONS_MEMORY_PATH,
		DEFAULT_CONVERSATIONS_MEMORY,
	);
	expect(convs).toBe(DEFAULT_CONVERSATIONS_MEMORY);
});

test("buildPrepareCallMemoryText assembles context correctly", async () => {
	const store = new InMemoryMemoryStore();
	await store.write(CORE_MEMORY_PATH, "core content");
	await store.write(NOTES_MEMORY_PATH, "notes content");

	const text = await buildPrepareCallMemoryText({
		baseInstructions: "Be helpful.",
		stores: { workspace: store },
		retrievalPlan: {
			allowedScopes: ["workspace"],
			readUserMemory: false,
			readArchivalMemory: true,
			includeRecall: false,
			precedence: ["workspace"],
		},
	});
	expect(text).toContain("core content");
	expect(text).toContain("notes content");
});

test("runStructuredMemoryTool throws on invalid parameters", async () => {
	const store = new InMemoryMemoryStore();
	await expect(
		runStructuredMemoryTool({ store }, { command: "create" }),
	).rejects.toThrow();
});

test("runStructuredMemoryTool executes successfully for valid args", async () => {
	const store = new InMemoryMemoryStore();
	const result = await runStructuredMemoryTool(
		{ store },
		{
			command: "create",
			path: CORE_MEMORY_PATH,
			content: "created",
		},
	);
	expect(result).toContain("Created");
});

// Edge case tests

test("memory tool schema rejects invalid command type", () => {
	const result = memoryToolInputSchema.safeParse({
		command: "invalid-command",
		path: CORE_MEMORY_PATH,
	});
	expect(result.success).toBe(false);
});

test("memory tool schema rejects empty content for create", () => {
	const result = memoryToolInputSchema.safeParse({
		command: "create",
		path: ".tekmemo/memory/core.md",
		content: "",
	});
	expect(result.success).toBe(false);
});

test("memory tool schema rejects core.md for search command", () => {
	const result = memoryToolInputSchema.safeParse({
		command: "search",
		path: CORE_MEMORY_PATH,
		query: "test",
	});
	expect(result.success).toBe(false);
});

test("safeReadMemoryPath propagates non-not-found errors", async () => {
	const store = new InMemoryMemoryStore();
	// Mock store.read to throw a non-not-found error
	const error = new Error("Database connection failed");
	vi.spyOn(store, "read").mockRejectedValue(error);

	await expect(
		safeReadMemoryPath(store, CORE_MEMORY_PATH, "default"),
	).rejects.toThrow("Database connection failed");
});

test.skip("runStructuredMemoryTool handles view command", async () => {
	const store = new InMemoryMemoryStore();
	await store.write(CORE_MEMORY_PATH, "# Core Memory\nTest");
	const result = await runStructuredMemoryTool(
		{ store },
		{ command: "view", path: ".tekmemo/memory/core.md" },
	);
	expect(result).toContain("Test");
});

test.skip("runStructuredMemoryTool handles update command", async () => {
	const store = new InMemoryMemoryStore();
	await store.write(CORE_MEMORY_PATH, "original");
	const result = await runStructuredMemoryTool(
		{ store },
		{
			command: "update",
			path: ".tekmemo/memory/core.md",
			content: "updated",
			mode: "overwrite",
		},
	);
	expect(result).toContain("Updated");
});

test.skip("runStructuredMemoryTool handles search command", async () => {
	const store = new InMemoryMemoryStore();
	await store.write(NOTES_MEMORY_PATH, "searchable content");
	const result = await runStructuredMemoryTool(
		{ store },
		{
			command: "search",
			path: ".tekmemo/memory/notes.md",
			query: "content",
			limit: 10,
		},
	);
	expect(result).toBeDefined();
});
