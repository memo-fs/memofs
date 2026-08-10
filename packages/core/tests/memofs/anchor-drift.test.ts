/**
 * Unit tests for code-anchor drift detection.
 *
 * Pure-function tests for the anchor-drift module — the file-hash compare
 * seam that powers `RecallItem.stale` + `GraphFactStatus === "stale"` +
 * `score *= 0.5` demotion. End-to-end coverage (write → mutate → recall)
 * lives in `anchor-stale.test.ts`.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type AnchorRef,
	type GraphNodeInput,
	InMemoryGraphStore,
} from "../../src/index";
import {
	ANCHOR_HASH_CACHE_TTL_MS,
	applyAnchorDrift,
	createAnchorHashCache,
	getCachedFileHash,
	isAnchorStale,
	recomputeFileHash,
} from "../../src/memofs/local-strategy/anchor-drift";
import type { RecallItem } from "../../src/memofs/types";

describe("anchor-drift — recomputeFileHash", () => {
	let rootDir: string;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-anchor-drift-"));
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	it("returns the SHA-256 of the file's current bytes", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "export function verifyJwt() {}\n", "utf8");

		const hash = await recomputeFileHash(filePath);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("returns undefined when the file does not exist (deleted)", async () => {
		const hash = await recomputeFileHash(join(rootDir, "missing.ts"));
		expect(hash).toBeUndefined();
	});

	it("returns different hashes when the file bytes change", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "v1\n", "utf8");
		const hash1 = await recomputeFileHash(filePath);

		await writeFile(filePath, "v2 — drifted\n", "utf8");
		const hash2 = await recomputeFileHash(filePath);

		expect(hash1).not.toBe(hash2);
	});
});

describe("anchor-drift — getCachedFileHash (mtime-aware 5-min TTL)", () => {
	let rootDir: string;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-anchor-cache-"));
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	it("computes the hash on first call (cold cache)", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "v1\n", "utf8");
		const cache = createAnchorHashCache();

		const result = await getCachedFileHash({
			file: filePath,
			cache,
			now: Date.now(),
		});

		expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(result.fromCache).toBe(false);
		expect(cache.get(filePath)?.hash).toBe(result.hash);
	});

	it("serves from cache when the file is stable (no mtime change) within TTL", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "v1\n", "utf8");
		const cache = createAnchorHashCache();

		// Use real wall-clock timestamps — `cache.ts` must be ≥ file's
		// `mtimeMs` for a cache hit, so synthetic epoch-1970 values would
		// always invalidate the entry (file mtime is "today").
		const t0 = Date.now();
		const first = await getCachedFileHash({
			file: filePath,
			cache,
			now: t0,
		});
		const second = await getCachedFileHash({
			file: filePath,
			cache,
			now: t0 + 1_000, // 1s later, file unchanged, inside 5-min TTL
		});

		expect(second.fromCache).toBe(true);
		expect(second.hash).toBe(first.hash);
	});

	it("invalidates when the file mutated mid-TTL (mtime advanced past cache.ts)", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "v1\n", "utf8");
		const cache = createAnchorHashCache();

		const t0 = Date.now();
		const first = await getCachedFileHash({
			file: filePath,
			cache,
			now: t0,
		});

		// Mutate the file — mtime advances past cache.ts.
		await writeFile(filePath, "v2 — drift, cache must invalidate\n", "utf8");

		const second = await getCachedFileHash({
			file: filePath,
			cache,
			now: t0 + 1_000, // within 5-min TTL, but mtime gate fires
		});

		expect(second.fromCache).toBe(false);
		expect(second.hash).not.toBe(first.hash); // new bytes → new hash
		expect(cache.get(filePath)?.hash).toBe(second.hash);
	});

	it("recomputes after the TTL expires even when the file is stable", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "v1\n", "utf8");
		const cache = createAnchorHashCache();

		const t0 = Date.now();
		const first = await getCachedFileHash({
			file: filePath,
			cache,
			now: t0,
		});

		const second = await getCachedFileHash({
			file: filePath,
			cache,
			now: t0 + ANCHOR_HASH_CACHE_TTL_MS + 1, // 5 min + 1ms past TTL
		});

		expect(second.fromCache).toBe(false);
		expect(second.hash).toBe(first.hash); // file unchanged, same hash
		expect(cache.get(filePath)?.ts).toBe(t0 + ANCHOR_HASH_CACHE_TTL_MS + 1);
	});

	it("returns undefined with fromCache=false when the file is deleted", async () => {
		const filePath = join(rootDir, "missing.ts");
		const cache = createAnchorHashCache();

		const result = await getCachedFileHash({
			file: filePath,
			cache,
			now: Date.now(),
		});

		expect(result.hash).toBeUndefined();
		expect(result.fromCache).toBe(false);
		expect(cache.has(filePath)).toBe(false);
	});
});

describe("anchor-drift — isAnchorStale", () => {
	it("returns false when the anchor's stored hash matches the current hash", async () => {
		const rootDir = await mkdtemp(join(tmpdir(), "memofs-anchor-stale-match-"));
		try {
			const filePath = join(rootDir, "auth.ts");
			await writeFile(filePath, "stable bytes\n", "utf8");
			const hash = await recomputeFileHash(filePath);
			const anchor: AnchorRef = { file: filePath, hash: hash ?? "" };

			expect(await isAnchorStale(anchor, { now: Date.now(), rootDir })).toBe(
				false,
			);
		} finally {
			await rm(rootDir, { recursive: true, force: true });
		}
	});

	it("returns true when the file bytes drifted (hash mismatch)", async () => {
		const rootDir = await mkdtemp(join(tmpdir(), "memofs-anchor-stale-drift-"));
		try {
			const filePath = join(rootDir, "auth.ts");
			await writeFile(filePath, "v1\n", "utf8");
			const anchor: AnchorRef = {
				file: filePath,
				hash: "0".repeat(64), // wrong on purpose
			};

			expect(await isAnchorStale(anchor, { now: Date.now(), rootDir })).toBe(
				true,
			);
		} finally {
			await rm(rootDir, { recursive: true, force: true });
		}
	});

	it("returns true when the anchored file is deleted (file-deleted drift)", async () => {
		const anchor: AnchorRef = {
			file: join(tmpdir(), "memofs-anchor-stale-deleted-DOES-NOT-EXIST.ts"),
			hash: "0".repeat(64),
		};

		expect(await isAnchorStale(anchor, { now: Date.now() })).toBe(true);
	});
});

describe("anchor-drift — applyAnchorDrift (end-to-end seam)", () => {
	let rootDir: string;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-anchor-apply-"));
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	it("marks RecallItem as stale + demotes score *= 0.5 when the anchored file drifted", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "v1\n", "utf8");
		const originalHash = await recomputeFileHash(filePath);

		const anchor: AnchorRef = {
			file: "auth.ts", // repo-relative — resolved against rootDir
			hash: originalHash ?? "",
		};
		const memoryId = "mem_abc";
		const anchorByMemoryId = new Map<string, AnchorRef>([[memoryId, anchor]]);

		// Mutate the file → drift.
		await writeFile(filePath, "v2 — drifted\n", "utf8");

		const items: RecallItem[] = [
			{
				id: memoryId,
				text: "Auth uses Supabase with custom JWT validation in src/auth.ts",
				score: 1,
			},
		];

		const graphStore = new InMemoryGraphStore();
		// Seed a graph node bound to the memory id via sourceRefs.
		const seededNode: GraphNodeInput = {
			id: "node_auth",
			type: "concept",
			label: "Auth",
			status: "active",
			sourceRefs: [{ sourceType: "memory", sourceId: memoryId }],
		};
		await graphStore.upsertNodes([seededNode]);
		const graphNodes = new Map<string, GraphNodeInput>([
			[seededNode.id, seededNode],
		]);
		const graphNodesByMemoryId = new Map<string, string[]>([
			[memoryId, [seededNode.id]],
		]);

		await applyAnchorDrift({
			items,
			anchorByMemoryId,
			cache: createAnchorHashCache(),
			now: Date.now(),
			rootDir,
			graphStore,
			graphNodes,
			graphNodesByMemoryId,
		});

		expect(items[0]?.stale).toBe(true);
		expect(items[0]?.score).toBe(0.5);
		expect(items[0]?.anchor).toEqual(anchor);

		// Graph node's status transitioned to "stale" and persisted.
		const stored = await graphStore.getNode(seededNode.id);
		expect(stored?.status).toBe("stale");
		expect(graphNodes.get(seededNode.id)?.status).toBe("stale");
	});

	it("leaves un-anchored items untouched (backward-compat)", async () => {
		const items: RecallItem[] = [
			{ id: "mem_unanchored", text: "no anchor here", score: 0.8 },
		];
		const anchorByMemoryId = new Map<string, AnchorRef>();
		const graphStore = new InMemoryGraphStore();

		await applyAnchorDrift({
			items,
			anchorByMemoryId,
			cache: createAnchorHashCache(),
			now: Date.now(),
			rootDir,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(items[0]?.stale).toBeUndefined();
		expect(items[0]?.score).toBe(0.8);
		expect(items[0]?.anchor).toBeUndefined();
	});

	it("leaves anchored items whose file still matches untouched", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "stable bytes\n", "utf8");
		const hash = await recomputeFileHash(filePath);
		const anchor: AnchorRef = { file: "auth.ts", hash: hash ?? "" };
		const memoryId = "mem_stable";

		const items: RecallItem[] = [
			{ id: memoryId, text: "Stable fact", score: 0.9 },
		];
		const anchorByMemoryId = new Map<string, AnchorRef>([[memoryId, anchor]]);
		const graphStore = new InMemoryGraphStore();

		await applyAnchorDrift({
			items,
			anchorByMemoryId,
			cache: createAnchorHashCache(),
			now: Date.now(),
			rootDir,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		// Score untouched, but anchor is copied through (typed-field contract).
		expect(items[0]?.stale).toBeUndefined();
		expect(items[0]?.score).toBe(0.9);
		expect(items[0]?.anchor).toEqual(anchor);
	});

	it("demotes score *= 0.5 from a baseline of 1 when score was undefined", async () => {
		const filePath = join(rootDir, "auth.ts");
		await writeFile(filePath, "v1\n", "utf8");
		const staleHash = "0".repeat(64);
		const anchor: AnchorRef = { file: "auth.ts", hash: staleHash };
		const memoryId = "mem_noscore";

		const items: RecallItem[] = [{ id: memoryId, text: "no score yet" }];
		const anchorByMemoryId = new Map<string, AnchorRef>([[memoryId, anchor]]);
		const graphStore = new InMemoryGraphStore();

		await applyAnchorDrift({
			items,
			anchorByMemoryId,
			cache: createAnchorHashCache(),
			now: Date.now(),
			rootDir,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(items[0]?.stale).toBe(true);
		expect(items[0]?.score).toBe(0.5);
	});
});
