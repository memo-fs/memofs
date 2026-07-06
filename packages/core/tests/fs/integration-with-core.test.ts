import {
	appendConversationEntry,
	appendTimestampedNote,
	bootstrapMemoryStore,
	CANONICAL_TEKMEMO_FILES,
	readConversationHistory,
	readCoreMemory,
	readNotesMemory,
	writeCoreMemory,
} from "@memofs/core";
import { describe, expect, test } from "vitest";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import { createTempRoot } from "./test-utils";

describe("TekMemo core integration", () => {
	test("works end-to-end with bootstrap, core, notes, and conversations", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		const bootstrap = await bootstrapMemoryStore(store);
		expect(bootstrap.created).toEqual([...CANONICAL_TEKMEMO_FILES]);

		await writeCoreMemory(
			store,
			"# Core Memory\n\n- Prefer TypeScript examples.",
		);
		await appendTimestampedNote(store, {
			kind: "preference",
			content: "Use strict TypeScript.",
			timestamp: "2026-05-04T00:00:00.000Z",
			tags: ["typescript"],
		});
		await appendConversationEntry(store, {
			role: "user",
			content: "Remember that I want production-grade tests.",
			timestamp: "2026-05-04T00:00:00.000Z",
		});

		await expect(readCoreMemory(store)).resolves.toContain(
			"Prefer TypeScript examples",
		);
		await expect(readNotesMemory(store)).resolves.toContain(
			"Use strict TypeScript",
		);
		await expect(readConversationHistory(store)).resolves.toHaveLength(1);
	});

	test("bootstrap is idempotent with filesystem store", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await bootstrapMemoryStore(store);
		const second = await bootstrapMemoryStore(store);

		expect(second.created).toEqual([]);
		expect(second.skipped).toEqual([...CANONICAL_TEKMEMO_FILES]);
	});
});
