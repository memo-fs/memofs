/**
 * End-to-end test for cognitive decay — the demoable.
 *
 * Write a `kind: "note"` memory + backdate its `createdAt` 31 days in the
 * past → `memofs.recall` returns the memory with `unverified: true` +
 * `metadata.unverified: true` + `score * 0.6` ranking demotion. A fresh
 * `kind: "note"` written today does NOT flag `unverified`. Also verifies
 * the chained lifecycle contracts: backward-compat (no kind ⇒ no decay),
 * cold-start recovery via `memory-events.jsonl`, the kind-floor boundary
 * (exactly 30 days = not decayed), and the rendered context banner.
 *
 * All tests cold-start a fresh MemoFS before recalling. Two reasons:
 * 1. `kind: "note"` is a transient kind — not indexed into the lexical
 *    store on the live write path. Cold-start hydrates it from notes.md
 *    by `mem_` id via `hydrateLexicalFromNotes`.
 * 2. Backdating the `createdAt` requires editing
 *    `memory-events.jsonl` + cold-starting so the fresh process
 *    hydrates `memoryMetaByMemoryId` from the modified events.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	MEMORY_EVENTS_PATH,
	MemoFS,
	type MemoryEvent,
	readMemoryEvents,
} from "../../src/index";
import { UNVERIFIED_REVERIFY_MESSAGE } from "../../src/memofs/helpers/renderers";
import { MS_PER_DAY } from "../../src/memofs/local-strategy/decay";
import { NodeFsMemoryStore } from "../../src/node-fs";

/**
 * Rewrites the `timestamp` of the `memory.created` event matching
 * `memoryId` in `memory-events.jsonl` to `newTimestamp`. Used to
 * backdate a memory's `createdAt` for decay-floor testing — the
 * cold-start hydration reads `entry.timestamp` as `createdAt`.
 */
async function backdateMemoryEvent(
	store: NodeFsMemoryStore,
	memoryId: string,
	newTimestamp: string,
): Promise<void> {
	const events = await readMemoryEvents(store);
	const rewritten = events.map((event) => {
		if (event.type === "memory.created" && event.metadata?.id === memoryId) {
			return { ...event, timestamp: newTimestamp } as MemoryEvent;
		}
		return event;
	});
	const jsonl = `${rewritten.map((e) => JSON.stringify(e)).join("\n")}\n`;
	await store.write(MEMORY_EVENTS_PATH, jsonl);
}

/**
 * Cold-starts a fresh MemoFS against the same rootDir. The caller must
 * dispose the returned store in a `finally` block.
 */
function coldStart(rootDir: string): {
	memo: MemoFS;
	store: NodeFsMemoryStore;
} {
	const store = new NodeFsMemoryStore({ rootDir });
	const memo = new MemoFS({ mode: "local", store, rootDir });
	return { memo, store };
}

describe("cognitive decay floor end-to-end", () => {
	let rootDir: string;
	let memo: MemoFS;
	let store: NodeFsMemoryStore;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-decay-e2e-"));
		store = new NodeFsMemoryStore({ rootDir });
		memo = new MemoFS({ mode: "local", store, rootDir });
	});

	afterEach(async () => {
		await store.dispose();
		await rm(rootDir, { recursive: true, force: true });
	});

	it("flags a backdated note as unverified + demotes score *= 0.6 (the demoable)", async () => {
		// Write a kind: "note" memory (30-day floor).
		const result = await memo.writeMemory({
			content: "Quick observation about the build step.",
			kind: "note",
		});
		expect(result.id).toMatch(/^mem_/);

		// Backdate the memory's createdAt to 31 days ago via the event log.
		// Dispose + cold-start so the fresh process hydrates from events.
		const backdated = new Date(Date.now() - 31 * MS_PER_DAY).toISOString();
		await backdateMemoryEvent(store, result.id, backdated);
		await store.dispose();
		const { memo: coldMemo, store: coldStore } = coldStart(rootDir);

		try {
			const decayed = await coldMemo.recall("build step observation", {
				limit: 5,
			});
			const decayedHit = decayed.items.find((i) => i.id === result.id);
			expect(
				decayedHit,
				"expected the backdated memory in decay recall results",
			).toBeDefined();
			expect(decayedHit?.unverified).toBe(true);
			expect(decayedHit?.metadata?.unverified).toBe(true);
			expect(decayedHit?.score).toBeGreaterThan(0);
		} finally {
			await coldStore.dispose();
		}
	});

	it("does NOT flag a fresh note written today (age below floor)", async () => {
		const result = await memo.writeMemory({
			content: "Fresh observation from today.",
			kind: "note",
		});

		// Cold-start so the transient note is indexed from notes.md.
		await store.dispose();
		const { memo: coldMemo, store: coldStore } = coldStart(rootDir);

		try {
			const recall = await coldMemo.recall("Fresh observation", { limit: 5 });
			const hit = recall.items.find((i) => i.id === result.id);
			expect(hit, "expected the fresh memory in recall results").toBeDefined();
			expect(hit?.unverified).toBeUndefined();
			expect(hit?.metadata?.unverified).toBeUndefined();
		} finally {
			await coldStore.dispose();
		}
	});

	it("does NOT flag a decision even when backdated 31 days (decision floor = 365)", async () => {
		const result = await memo.writeMemory({
			content: "Architectural decision about the build system.",
			kind: "decision",
		});

		// Backdate 31 days — decision floor is 365, so not decayed.
		const backdated = new Date(Date.now() - 31 * MS_PER_DAY).toISOString();
		await backdateMemoryEvent(store, result.id, backdated);
		await store.dispose();
		const { memo: coldMemo, store: coldStore } = coldStart(rootDir);

		try {
			const recall = await coldMemo.recall("build system decision", {
				limit: 5,
			});
			const hit = recall.items.find((i) => i.id === result.id);
			expect(
				hit,
				"expected the decision memory in recall results",
			).toBeDefined();
			expect(hit?.unverified).toBeUndefined();
		} finally {
			await coldStore.dispose();
		}
	});

	it("respects the boundary: under 30 days = not decayed; over 30 days = decayed (note)", async () => {
		// Write + backdate to 29.5 days (under the 30-day floor).
		// Using 29.5 instead of exactly 30 to avoid timing jitter between
		// computing the timestamp and the decay check's `Date.now()`.
		const result = await memo.writeMemory({
			content: "Boundary observation for the decay floor.",
			kind: "note",
		});
		const underFloor = new Date(
			Date.now() - 29 * MS_PER_DAY - 12 * 60 * 60 * 1000,
		).toISOString();
		await backdateMemoryEvent(store, result.id, underFloor);
		await store.dispose();
		const { memo: coldMemo, store: coldStore } = coldStart(rootDir);

		try {
			const recallUnder = await coldMemo.recall(
				"Boundary observation decay floor",
				{ limit: 5 },
			);
			const hitUnder = recallUnder.items.find((i) => i.id === result.id);
			expect(hitUnder).toBeDefined();
			expect(
				hitUnder?.unverified,
				"under 30 days must NOT flag unverified",
			).toBeUndefined();
		} finally {
			await coldStore.dispose();
		}

		// Now write a fresh one + backdate to 31 days (over the floor).
		const store2 = new NodeFsMemoryStore({ rootDir });
		const memo2 = new MemoFS({ mode: "local", store: store2, rootDir });
		const resultPast = await memo2.writeMemory({
			content: "Past-floor observation for the decay floor.",
			kind: "note",
		});
		const overFloor = new Date(Date.now() - 31 * MS_PER_DAY).toISOString();
		await backdateMemoryEvent(store2, resultPast.id, overFloor);
		await store2.dispose();

		const { memo: coldMemo2, store: coldStore2 } = coldStart(rootDir);
		try {
			const recallPast = await coldMemo2.recall(
				"Past-floor observation decay floor",
				{ limit: 5 },
			);
			const hitPast = recallPast.items.find((i) => i.id === resultPast.id);
			expect(hitPast).toBeDefined();
			expect(hitPast?.unverified).toBe(true);
		} finally {
			await coldStore2.dispose();
		}
	});

	it("leaves today's behavior unchanged for writeMemory calls without a kind (backward-compat)", async () => {
		// No kind → no decay meta → never flagged unverified.
		const result = await memo.writeMemory({
			content: "An unkinded observation.",
		});

		await store.dispose();
		const { memo: coldMemo, store: coldStore } = coldStart(rootDir);

		try {
			const recall = await coldMemo.recall("unkinded observation", {
				limit: 5,
			});
			const hit = recall.items.find((i) => i.id === result.id);
			expect(hit).toBeDefined();
			expect(hit?.unverified).toBeUndefined();
			expect(hit?.metadata?.unverified).toBeUndefined();
		} finally {
			await coldStore.dispose();
		}
	});

	it("recovers decay metadata from memory-events.jsonl on cold start", async () => {
		// Phase 1: write a kind: "note" memory in one MemoFS instance.
		const result = await memo.writeMemory({
			content: "Cold-start decay recovery target.",
			kind: "note",
		});

		// Phase 2: backdate the event, dispose, cold-start a fresh MemoFS.
		const backdated = new Date(Date.now() - 40 * MS_PER_DAY).toISOString();
		await backdateMemoryEvent(store, result.id, backdated);
		await store.dispose();
		const { memo: coldMemo, store: coldStore } = coldStart(rootDir);

		try {
			const recall = await coldMemo.recall("Cold-start decay recovery", {
				limit: 5,
			});
			const hit = recall.items.find((i) => i.id === result.id);
			expect(
				hit,
				"expected cold-started recall to surface the decayed memory",
			).toBeDefined();
			expect(hit?.unverified).toBe(true);
			expect(hit?.metadata?.unverified).toBe(true);
		} finally {
			await coldStore.dispose();
		}
	});

	it("surfaces decay in the rendered context text via [unverified] banner + per-item markers", async () => {
		// Write a kind: "note" memory.
		const result = await memo.writeMemory({
			content: "Context-banner decay observation.",
			kind: "note",
		});

		// Backdate + cold-start.
		const backdated = new Date(Date.now() - 31 * MS_PER_DAY).toISOString();
		await backdateMemoryEvent(store, result.id, backdated);
		await store.dispose();
		const { memo: coldMemo, store: coldStore } = coldStart(rootDir);

		try {
			const decayedContext = await coldMemo.context({
				query: "Context-banner decay observation",
				limit: 5,
			});
			expect(
				decayedContext.text,
				"banner must announce unverified fragment count to the reading agent",
			).toMatch(/\[unverified\] \d+ of \d+ recall fragments/);
			expect(decayedContext.text).toContain(
				`[unverified] ${UNVERIFIED_REVERIFY_MESSAGE}`,
			);

			// The structured items[] still carry the typed fields for programmatic
			// consumers (the banner is the rendered-text counterpart, not a
			// replacement for the typed payload).
			const decayedHit = decayedContext.items?.find((i) => i.id === result.id);
			expect(decayedHit?.unverified).toBe(true);
		} finally {
			await coldStore.dispose();
		}
	});
});
