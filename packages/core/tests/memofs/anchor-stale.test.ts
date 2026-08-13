/**
 * End-to-end test for code-anchor drift detection — the demoable.
 *
 * Write a memory with `anchor` for a non-TS file at t0 → mutate the file's
 * bytes at t1 → `memofs.recall` returns the memory with `stale: true` AND
 * `score * 0.5` ranking demotion. Also verifies the chained lifecycle
 * contracts: backward-compat (no anchor ⇒ no stale), stable file ⇒ no
 * drift, and cold-start recovery via `memory-events.jsonl`.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type AnchorRef,
	MemoFS,
	NOTES_MEMORY_PATH,
	readMemoryEvents,
	sha256Hex,
} from "../../src/index";
import { STALE_REVERIFY_MESSAGE } from "../../src/memofs/helpers/renderers";
import { NodeFsMemoryStore } from "../../src/node-fs";

/**
 * Writes a file under `rootDir` and returns the SHA-256 of its contents.
 * Used to seed an `AnchorRef.hash` matching the file's t0 bytes.
 */
async function writeFileAndHash(
	rootDir: string,
	relPath: string,
	content: string,
): Promise<AnchorRef> {
	const abs = join(rootDir, relPath);
	await writeFile(abs, content, "utf8");
	const hash = await sha256Hex(content);
	return { file: relPath, hash };
}

describe("code-anchor + drift-detect end-to-end", () => {
	let rootDir: string;
	let memo: MemoFS;
	let store: NodeFsMemoryStore;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-anchor-e2e-"));
		store = new NodeFsMemoryStore({ rootDir });
		memo = new MemoFS({ mode: "local", store, rootDir });
	});

	afterEach(async () => {
		await store.dispose();
		await rm(rootDir, { recursive: true, force: true });
	});

	it("flags a drifted file as stale + demotes score *= 0.5 (the demoable)", async () => {
		// t0: write a memory anchored to a non-TS file with its current hash.
		const anchor = await writeFileAndHash(rootDir, "auth.py", "# original\n");
		const content = "Auth uses Supabase with custom JWT validation in auth.py.";
		const result = await memo.writeMemory({
			content,
			title: "Auth via Supabase",
			kind: "decision",
			anchor,
		});
		expect(result.id).toMatch(/^mem_/);

		// Sanity: a clean recall right after write surfaces the memory; no drift yet.
		const cleanRecall = await memo.recall("Auth Supabase", { limit: 5 });
		const cleanHit = cleanRecall.items.find((i) => i.id === result.id);
		expect(
			cleanHit,
			"expected the freshly-written memory in recall results",
		).toBeDefined();
		expect(cleanHit?.stale).toBeUndefined();
		expect(cleanHit?.anchor).toEqual(anchor);

		// t1: mutate the anchored file's bytes — drift.
		await writeFile(
			join(rootDir, "auth.py"),
			"# drifted — refactor broke the binding\n",
			"utf8",
		);

		// Query-time drift detection runs inside recall.
		const drifted = await memo.recall("Auth Supabase", { limit: 5 });
		const driftedHit = drifted.items.find((i) => i.id === result.id);
		expect(
			driftedHit,
			"expected the anchored memory in drift recall results",
		).toBeDefined();
		expect(driftedHit?.stale).toBe(true);
		expect(driftedHit?.anchor).toEqual(anchor);

		// Score-demotion contract: `score *= 0.5`. Without a baseline score
		// from mergeHybridCandidates the runtime treats it as 1, so the
		// demoted score is exactly 0.5. (The cheap lexical write path here
		// yields a non-zero baseline; the assert uses `<= baseline/2`.)
		const cleanScore = cleanHit?.score ?? 1;
		const driftedScore = driftedHit?.score ?? 0;
		expect(driftedScore).toBeLessThanOrEqual(cleanScore * 0.5 + 1e-9);
		expect(driftedScore).toBeGreaterThan(0);
	});

	it("leaves anchored items untouched when the file is unchanged", async () => {
		const anchor = await writeFileAndHash(
			rootDir,
			"config.yml",
			"name: stable\n",
		);
		const result = await memo.writeMemory({
			content: "Config schema is stable.",
			anchor,
		});

		const recall = await memo.recall("config schema", { limit: 5 });
		const hit = recall.items.find((i) => i.id === result.id);
		expect(hit, "expected the anchored memory in recall results").toBeDefined();
		expect(hit?.stale).toBeUndefined();
		expect(hit?.anchor).toEqual(anchor);
	});

	it("flags as stale when the anchored file is deleted", async () => {
		const anchor = await writeFileAndHash(rootDir, "auth.py", "# original\n");
		const result = await memo.writeMemory({
			content: "Auth file deletion drift case.",
			anchor,
		});

		// Delete the anchored file.
		await rm(join(rootDir, "auth.py"));

		const recall = await memo.recall("Auth file deletion", { limit: 5 });
		const hit = recall.items.find((i) => i.id === result.id);
		expect(hit, "expected the anchored memory in recall results").toBeDefined();
		expect(hit?.stale).toBe(true);
		expect(hit?.anchor).toEqual(anchor);
	});

	it("persists the anchor in notes.md metadata AND memory-events.jsonl", async () => {
		const anchor = await writeFileAndHash(rootDir, "auth.py", "# original\n");
		const result = await memo.writeMemory({
			content: "Anchor persistence across note + event.",
			anchor,
		});

		// 1) The note's metadata block carries `anchor` (free-form JSON in notes.md).
		const notes = await store.read(NOTES_MEMORY_PATH);
		expect(notes).toContain(result.id);
		expect(notes).toContain('"anchor"');
		expect(notes).toContain(anchor.file);
		expect(notes).toContain(anchor.hash);

		// 2) The memory-event metadata carries `anchor` (structured recovery).
		const events = await readMemoryEvents(store);
		const target = events.find(
			(e) => e.type === "memory.created" && e.metadata?.id === result.id,
		);
		expect(
			target,
			"expected a memory.created event for the anchored write",
		).toBeDefined();
		expect(target?.metadata?.anchor).toEqual(anchor);
	});

	it("recovers anchored memories from memory-events.jsonl on cold start", async () => {
		// Phase 1: write anchored memory in one MemoFS instance.
		const anchor = await writeFileAndHash(rootDir, "auth.py", "# original\n");
		const result = await memo.writeMemory({
			content: "Cold-start anchor recovery target.",
			anchor,
		});
		const firstMemoId = result.id;

		// Phase 2: dispose the original store + spin up a fresh MemoFS
		// against the same rootDir. The notes + events are on disk; the
		// fresh process must hydrate `anchorByMemoryId` from events.
		await store.dispose();
		const coldStore = new NodeFsMemoryStore({ rootDir });
		const coldMemo = new MemoFS({ mode: "local", store: coldStore, rootDir });

		// Mutate the file so the cold-started process will see drift.
		await writeFile(
			join(rootDir, "auth.py"),
			"# changed after cold start\n",
			"utf8",
		);

		try {
			const recall = await coldMemo.recall("Cold-start anchor recovery", {
				limit: 5,
			});
			const hit = recall.items.find((i) => i.id === firstMemoId);
			expect(
				hit,
				"expected cold-started recall to surface the anchored memory",
			).toBeDefined();
			expect(hit?.stale).toBe(true);
			expect(hit?.anchor).toEqual(anchor);
		} finally {
			await coldStore.dispose();
		}
	});

	it("leaves today's behavior unchanged for writeMemory calls without an anchor (backward-compat)", async () => {
		const result = await memo.writeMemory({
			content: "An unanchored observation.",
		});

		// Nothing on disk mentions "anchor" for this write.
		const notes = await store.read(NOTES_MEMORY_PATH);
		const unanchoredSection = notes
			.split("\n\n")
			.find((s) => s.includes(result.id));
		expect(unanchoredSection).toBeDefined();
		expect(unanchoredSection?.includes('"anchor"')).toBe(false);

		const events = await readMemoryEvents(store);
		const target = events.find((e) => e.metadata?.id === result.id);
		expect(target?.metadata?.anchor).toBeUndefined();

		// Recall returns the memory with no `anchor` / `stale` fields.
		const recall = await memo.recall("unanchored observation", { limit: 5 });
		const hit = recall.items.find((i) => i.id === result.id);
		expect(hit).toBeDefined();
		expect(hit?.anchor).toBeUndefined();
		expect(hit?.stale).toBeUndefined();
	});

	it("persists the hash cache to .memofs/manifest.json and warm-starts a fresh process", async () => {
		// Phase 1: write an anchored memory against a stable file, then
		// recall. The recall populates the in-process cache and flushes
		// it to .memofs/manifest.json (cross-session warm start).
		const anchor = await writeFileAndHash(rootDir, "auth.py", "# stable v1\n");
		await memo.writeMemory({
			content: "Manifest-persisted anchor cache entry.",
			anchor,
		});
		await memo.recall("Manifest-persisted", { limit: 5 });

		// Assert the cache entry IS on disk in the manifest.
		const MANIFEST_PATH = ".memofs/manifest.json";
		const manifestText = await store.read(MANIFEST_PATH);
		const manifest = JSON.parse(manifestText) as {
			anchorHashCache?: Record<string, { hash: string; ts: number }>;
		};
		expect(
			manifest.anchorHashCache,
			"manifest.anchorHashCache must be populated after recall",
		).toBeDefined();
		// The cache is keyed by the ABSOLUTE path (resolveAnchorFilePath
		// resolved the repo-relative `auth.py` against rootDir).
		const relKey = Object.keys(manifest.anchorHashCache ?? {}).find((k) =>
			k.endsWith("auth.py"),
		);
		expect(
			relKey,
			"anchored file's cache entry must be in the manifest",
		).toBeDefined();
		expect(manifest.anchorHashCache?.[relKey ?? ""]?.hash).toBe(anchor.hash);
		expect(manifest.anchorHashCache?.[relKey ?? ""]?.ts).toBeGreaterThan(0);

		// Phase 2: dispose + cold-start a fresh MemoFS against the same
		// rootDir. The fresh process hydrates the cache from manifest
		// (warm start) so the file's hash does NOT need to be recomputed
		// on first recall — and the recall still surfaces the memory
		// without drift (file unchanged).
		await store.dispose();
		const coldStore = new NodeFsMemoryStore({ rootDir });
		const coldMemo = new MemoFS({ mode: "local", store: coldStore, rootDir });

		try {
			const recall = await coldMemo.recall("Manifest-persisted", {
				limit: 5,
			});
			const hit = recall.items.find((i) => i.anchor?.file === anchor.file);
			expect(
				hit,
				"cold-started recall must surface the anchored memory",
			).toBeDefined();
			expect(hit?.stale, "file unchanged → not stale").toBeUndefined();
			expect(hit?.anchor).toEqual(anchor);
		} finally {
			await coldStore.dispose();
		}
	});

	it("surfaces drift in the rendered context text via [stale] banner + per-item markers", async () => {
		// t0: write a memory anchored to a non-TS file.
		const anchor = await writeFileAndHash(rootDir, "auth.py", "# original\n");
		const result = await memo.writeMemory({
			content: "Auth uses Supabase with custom JWT validation in auth.py.",
			title: "Auth via Supabase",
			kind: "decision",
			anchor,
		});

		// Clean context: the anchored memory is surfaced WITH its binding
		// site, but NOT flagged stale (file still matches the stored hash).
		const cleanContext = await memo.context({
			query: "Auth Supabase",
			limit: 5,
		});
		expect(cleanContext.text).toContain(`[anchor: ${anchor.file}]`);
		expect(cleanContext.text).not.toContain("[stale]");

		// t1: mutate the anchored file's bytes — drift.
		await writeFile(
			join(rootDir, "auth.py"),
			"# drifted — refactor broke the binding\n",
			"utf8",
		);

		// Drifted context: the strategist now prepends a stale banner to the
		// recall section AND each drifted item carries a [stale] marker.
		const driftedContext = await memo.context({
			query: "Auth Supabase",
			limit: 5,
		});
		expect(
			driftedContext.text,
			"banner must announce stale fragment count to the reading agent",
		).toMatch(/\[stale\] \d+ of \d+ recall fragments/);
		expect(driftedContext.text).toContain(`[anchor: ${anchor.file}]`);
		expect(driftedContext.text).toContain(`[stale] ${STALE_REVERIFY_MESSAGE}`);

		// The structured items[] still carry the typed fields for programmatic
		// consumers (the banner is the rendered-text counterpart, not a
		// replacement for the typed payload).
		const driftedHit = driftedContext.items?.find((i) => i.id === result.id);
		expect(driftedHit?.stale).toBe(true);
		expect(driftedHit?.anchor).toEqual(anchor);
	});
});
