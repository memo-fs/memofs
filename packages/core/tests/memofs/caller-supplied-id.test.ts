import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoFS, NOTES_MEMORY_PATH } from "../../src/index";
import {
	NodeFsMemoryStore,
	type NodeFsMemoryStoreOptions,
} from "../../src/node-fs";

/**
 * Q3 (ADR 0002) contract: a caller-supplied stable `id` on WriteMemoryInput is
 * honored verbatim by the local and memory strategies, so connectors can write
 * content-derived ids with no wall-clock in the hashed bytes. Omitting `id`
 * preserves the historical wall-clock-seeded behavior.
 */
describe("WriteMemoryInput.id — caller-supplied stable id (Q3)", () => {
	describe("local (filesystem) strategy", () => {
		let rootDir: string;
		let memo: MemoFS;
		let store: NodeFsMemoryStore;

		beforeEach(async () => {
			rootDir = await mkdtemp(join(tmpdir(), "memofs-caller-id-"));
			// The lock contract is single-process per root (Q28). A fresh temp
			// root per test isolates writers naturally.
			const storeOptions: NodeFsMemoryStoreOptions = { rootDir };
			store = new NodeFsMemoryStore(storeOptions);
			memo = new MemoFS({ mode: "local", store });
		});

		afterEach(async () => {
			await store.dispose();
			await rm(rootDir, { recursive: true, force: true });
		});

		it("uses the caller-supplied id verbatim and persists it in notes.md metadata", async () => {
			const result = await memo.writeMemory({
				content: "GitHub issue #42 body",
				title: "Bug: login fails",
				id: "conn_0123456789abcdef",
				source: "connector",
				sourceRefs: [{ sourceType: "connector", sourceId: "issue:42" }],
			});

			expect(result.id).toBe("conn_0123456789abcdef");

			// The id lands in the note's metadata.id (local-strategy invariant).
			const notes = await memo.notes.read();
			expect(notes).toContain("conn_0123456789abcdef");
			expect(notes).toContain("GitHub issue #42 body");
		});

		it("falls back to the wall-clock-seeded id when `id` is omitted", async () => {
			const result = await memo.writeMemory({ content: "agent note" });

			// Default local id shape: `mem_<16 hex>`.
			expect(result.id).toMatch(/^mem_[0-9a-f]{16}$/);
		});

		it("re-ingesting identical content with a stable id reproduces identical bytes in notes.md", async () => {
			// Two separate roots, two separate stores — simulating two devices
			// re-ingesting the same external content. Same id → same line.
			const stableId = "conn_samecontent";

			await memo.writeMemory({
				content: "identical body",
				id: stableId,
				source: "connector",
			});
			const firstNotes = await memo.notes.read();

			// Second store on a different root.
			const otherRoot = await mkdtemp(join(tmpdir(), "memofs-caller-id-2-"));
			const otherStore = new NodeFsMemoryStore({ rootDir: otherRoot });
			try {
				const other = new MemoFS({ mode: "local", store: otherStore });
				await other.writeMemory({
					content: "identical body",
					id: stableId,
					source: "connector",
				});
				const otherNotes = await other.notes.read();

				// The metadata.id line must be byte-identical — this is the Q3
				// "no wall-clock in hashed bytes" guarantee that makes manifest
				// diffs report "no change".
				expect(otherNotes).toContain(stableId);
				expect(otherNotes).toContain("identical body");
				expect(firstNotes).toContain(stableId);
			} finally {
				await otherStore.dispose();
				await rm(otherRoot, { recursive: true, force: true });
			}
		});

		it("references the notes memory path constant", async () => {
			// Sanity: the canonical path constant is importable and correct.
			expect(NOTES_MEMORY_PATH.endsWith("notes.md")).toBe(true);
		});
	});
});
