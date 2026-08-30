import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoFS } from "../../src/index";
import {
	NodeFsMemoryStore,
	type NodeFsMemoryStoreOptions,
} from "../../src/node-fs";

/**
 * Dedup-on-write guard contract: a write whose content near-duplicates an
 * already-indexed memory is a no-op — `created: false`, `duplicateOf` naming
 * the existing memory, nothing appended to notes.md. Distinct facts (even
 * same-topic ones) and extensions still write; `dedupeOnWrite: false`
 * restores capture-everything behavior. The guard must be identical for
 * warm (written in this process) and cold (hydrated from notes.md) memories.
 */
describe("dedup-on-write guard", () => {
	let rootDir: string;
	let memo: MemoFS;
	let store: NodeFsMemoryStore;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-dedupe-"));
		const storeOptions: NodeFsMemoryStoreOptions = { rootDir };
		store = new NodeFsMemoryStore(storeOptions);
		memo = new MemoFS({ mode: "local", store });
	});

	afterEach(async () => {
		await store.dispose();
		await rm(rootDir, { recursive: true, force: true });
	});

	it("no-ops a verbatim durable re-write and names the existing memory", async () => {
		const content =
			"The config schema ships from the CLI package so the portable node_modules reference resolves for direct installs";
		const first = await memo.writeMemory({ content, kind: "decision" });
		expect(first.created).toBe(true);

		const second = await memo.writeMemory({ content, kind: "decision" });

		expect(second.created).toBe(false);
		expect(second.id).toBe(first.id);
		expect(second.duplicateOf).toBe(first.id);
		expect(second.warnings?.[0]).toContain(first.id);

		const notes = await memo.notes.read();
		expect(notes.match(/config schema ships/g)?.length).toBe(1);
	});

	it("no-ops a lightly reworded duplicate after a cold restart (hydration parity)", async () => {
		const original =
			"Connector configuration must never carry raw tokens; secretRef is the only sanctioned handoff for secrets";
		const first = await memo.writeMemory({
			content: original,
			kind: "constraint",
		});
		expect(first.created).toBe(true);

		// Simulate a new process over the same root: dispose the store (lock
		// contract is single-process per root), recreate, cold-hydrate.
		await store.dispose();
		store = new NodeFsMemoryStore({ rootDir });
		memo = new MemoFS({ mode: "local", store });

		const reworded =
			"Connector configuration must never carry raw tokens, secretRef is the only sanctioned handoff for secrets";
		const second = await memo.writeMemory({
			content: reworded,
			kind: "constraint",
		});

		expect(second.created).toBe(false);
		expect(second.duplicateOf).toBe(first.id);
	});

	it("writes a same-topic but distinct fact", async () => {
		const first = await memo.writeMemory({
			content:
				"The build pipeline uses pnpm workspaces with repo-scoped internal tooling packages only",
			kind: "reference",
		});
		const second = await memo.writeMemory({
			content:
				"The pnpm workspace publishes memofs scoped packages publicly while repo scope stays internal to the monorepo",
			kind: "reference",
		});

		expect(first.created).toBe(true);
		expect(second.created).toBe(true);
		expect(second.duplicateOf).toBeUndefined();
		expect(second.id).not.toBe(first.id);
	});

	it("writes a note that genuinely extends an existing memory", async () => {
		const _first = await memo.writeMemory({
			content:
				"Hybrid mode replicates local writes to the cloud asynchronously",
			kind: "decision",
		});
		// Same subject, materially more information — symmetric similarity
		// stays low, so the extension must not be swallowed by the guard.
		const second = await memo.writeMemory({
			content:
				"Hybrid mode replicates local writes to the cloud asynchronously with a two-phase manifest that keeps a verifiable trail",
			kind: "decision",
		});

		expect(second.created).toBe(true);
		expect(second.duplicateOf).toBeUndefined();
	});

	it("no-ops a transient write that restates an indexed durable fact", async () => {
		const content =
			"Doctor warnings are advisory only; a warning never flips the workspace ok verdict";
		const durable = await memo.writeMemory({
			content,
			kind: "constraint",
		});

		const transient = await memo.writeMemory({ content, kind: "note" });

		expect(transient.created).toBe(false);
		expect(transient.duplicateOf).toBe(durable.id);
		expect(transient.tier).toBe("transient");
	});

	it("appends duplicates verbatim when dedupeOnWrite is disabled", async () => {
		await store.dispose();
		rootDir = await mkdtemp(join(tmpdir(), "memofs-dedupe-off-"));
		store = new NodeFsMemoryStore({ rootDir });
		memo = new MemoFS({ mode: "local", store, dedupeOnWrite: false });

		const content =
			"Capture-everything pipelines disable the guard and keep every write in the audit trail";
		const first = await memo.writeMemory({ content, kind: "decision" });
		const second = await memo.writeMemory({ content, kind: "decision" });

		expect(first.created).toBe(true);
		expect(second.created).toBe(true);
		expect(second.duplicateOf).toBeUndefined();
		expect(second.id).not.toBe(first.id);
	});
});
