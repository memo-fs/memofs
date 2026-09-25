/**
 * Ticket 1 — Trials ledger stores over a real temp workspace.
 *
 * Assign exposure → record validator outcome → read warrant state, end to
 * end through the `MemoryStore` surface. Trial writes must never touch
 * original memory files (asserted, not conventional).
 */

import { describe, expect, it } from "vitest";
import {
	appendAssignment,
	appendOutcome,
	CORE_MEMORY_PATH,
	createWarrantPath,
	NOTES_MEMORY_PATH,
	readAssignments,
	readOutcomes,
	readWarrantHistory,
	readWarrantState,
	TRIALS_ASSIGNMENTS_PATH,
	TRIALS_OUTCOMES_PATH,
	WARRANTS_HISTORY_PATH,
	writeWarrantState,
} from "../../src/index";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import { createTempMemoFsDir } from "../../src/testing/temp-dir";

const STAMP = "2026-09-25T12:00:00.000Z";

async function freshStore() {
	const { rootDir, cleanup } = await createTempMemoFsDir();
	const store = createNodeFsMemoryStore({
		rootDir,
		createRoot: true,
		missingFileBehavior: "empty",
	});
	return { store, cleanup };
}

describe("trials ledger stores", () => {
	it("round-trips assignment append + outcome append", async () => {
		const { store, cleanup } = await freshStore();
		try {
			expect(await readAssignments(store)).toEqual([]);
			expect(await readOutcomes(store)).toEqual([]);

			await appendAssignment(store, {
				id: "asg_1",
				memoryId: "mem_api-types",
				task: "refactor public API types",
				arm: "treatment",
				timestamp: STAMP,
			});
			await appendOutcome(store, {
				id: "out_1",
				assignmentId: "asg_1",
				memoryId: "mem_api-types",
				validator: "typecheck",
				passed: true,
				sourceState: "current",
				sourceFingerprint: "anchor:abc123|tsc:5.9",
				timestamp: STAMP,
			});

			const assignments = await readAssignments(store);
			expect(assignments).toHaveLength(1);
			expect(assignments[0]).toMatchObject({
				id: "asg_1",
				memoryId: "mem_api-types",
				arm: "treatment",
			});

			const outcomes = await readOutcomes(store);
			expect(outcomes).toHaveLength(1);
			expect(outcomes[0]).toMatchObject({
				assignmentId: "asg_1",
				validator: "typecheck",
				passed: true,
				sourceState: "current",
			});
		} finally {
			await cleanup();
		}
	});

	it("reads back warrant state file + history with reasons", async () => {
		const { store, cleanup } = await freshStore();
		try {
			const initial = await readWarrantState(store, "mem_api-types", {
				now: () => STAMP,
			});
			expect(initial).toMatchObject({
				memoryId: "mem_api-types",
				state: "candidate",
			});

			await writeWarrantState(
				store,
				"mem_api-types",
				"probation",
				"trial design declared, evidence insufficient",
				{ now: () => STAMP },
			);

			const current = await readWarrantState(store, "mem_api-types");
			expect(current).toMatchObject({
				memoryId: "mem_api-types",
				state: "probation",
				reason: "trial design declared, evidence insufficient",
			});

			const history = await readWarrantHistory(store, "mem_api-types");
			expect(history).toHaveLength(1);
			expect(history[0]).toMatchObject({
				memoryId: "mem_api-types",
				from: "candidate",
				to: "probation",
				reason: "trial design declared, evidence insufficient",
			});
		} finally {
			await cleanup();
		}
	});

	it("trial writes never touch original memory files", async () => {
		const { store, cleanup } = await freshStore();
		try {
			const coreBefore = "# Core\n\nRun typecheck first.\n";
			const notesBefore = "# Notes\n\nAPI lesson.\n";
			await store.write(CORE_MEMORY_PATH, coreBefore);
			await store.write(NOTES_MEMORY_PATH, notesBefore);

			await appendAssignment(store, {
				id: "asg_9",
				memoryId: "mem_api-types",
				task: "refactor public API types",
				arm: "control",
				timestamp: STAMP,
			});
			await appendOutcome(store, {
				id: "out_9",
				assignmentId: "asg_9",
				memoryId: "mem_api-types",
				validator: "typecheck",
				passed: false,
				sourceState: "current",
				sourceFingerprint: "anchor:abc123|tsc:5.9",
				timestamp: STAMP,
			});
			await writeWarrantState(store, "mem_api-types", "probation", "enrolled", {
				now: () => STAMP,
			});

			expect(await store.read(CORE_MEMORY_PATH)).toBe(coreBefore);
			expect(await store.read(NOTES_MEMORY_PATH)).toBe(notesBefore);

			expect(await store.exists(TRIALS_ASSIGNMENTS_PATH)).toBe(true);
			expect(await store.exists(TRIALS_OUTCOMES_PATH)).toBe(true);
			expect(await store.exists(WARRANTS_HISTORY_PATH)).toBe(true);
		} finally {
			await cleanup();
		}
	});

	it("rejects invalid ledger rows before any write", async () => {
		const { store, cleanup } = await freshStore();
		try {
			await expect(
				appendAssignment(store, {
					id: "asg_bad",
					memoryId: "mem_api-types",
					task: "refactor",
					arm: "treatment-control",
					timestamp: STAMP,
				} as never),
			).rejects.toThrow();
			await expect(
				appendOutcome(store, {
					id: "out_bad",
					assignmentId: "asg_bad",
					memoryId: "mem_api-types",
					validator: "typecheck",
					passed: true,
					sourceState: "fresh",
					sourceFingerprint: "anchor:abc123",
					timestamp: STAMP,
				} as never),
			).rejects.toThrow();
			await expect(
				writeWarrantState(store, "mem_api-types", "probation", ""),
			).rejects.toThrow();

			expect(await store.exists(TRIALS_ASSIGNMENTS_PATH)).toBe(false);
			expect(await store.exists(TRIALS_OUTCOMES_PATH)).toBe(false);
			expect(await store.exists(WARRANTS_HISTORY_PATH)).toBe(false);
		} finally {
			await cleanup();
		}
	});

	it("fails closed on malformed ledger lines", async () => {
		const { store, cleanup } = await freshStore();
		try {
			await store.write(TRIALS_ASSIGNMENTS_PATH, '{"id": broken\n');
			await expect(readAssignments(store)).rejects.toThrow();
			expect(
				await readAssignments(store, { malformedLineMode: "skip" }),
			).toEqual([]);
		} finally {
			await cleanup();
		}
	});

	it("returns identical candidate reads for unwarranted memories", async () => {
		const { store, cleanup } = await freshStore();
		try {
			const first = await readWarrantState(store, "mem_new");
			const second = await readWarrantState(store, "mem_new");
			expect(first).toEqual(second);
			expect(first.state).toBe("candidate");
		} finally {
			await cleanup();
		}
	});

	it('reserves the "history" memory id for the history file', () => {
		expect(() => createWarrantPath("history")).toThrow();
		expect(createWarrantPath("history-lesson")).toContain("history-lesson");
	});
});
