/**
 * Unit tests for cognitive decay — the time-driven `EXPIRY_DAYS` floor seam.
 *
 * Pure-function tests for the decay module — the kind-age compare seam that
 * powers `RecallItem.unverified` + `GraphFactStatus === "unverified"` +
 * `score *= 0.6` demotion. End-to-end coverage (write → backdate → recall)
 * lives in `decay-e2e.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { type GraphNodeInput, InMemoryGraphStore } from "../../src/index";
import {
	applyDecay,
	type MemoryDecayMeta,
	EXPIRY_DAYS,
	isMemoryDecayed,
	UNVERIFIED_DEMOTION_FACTOR,
	MS_PER_DAY,
} from "../../src/memofs/local-strategy/decay";
import type { MemoryKind, RecallItem } from "../../src/memofs/types";

function makeItem(overrides: Partial<RecallItem> = {}): RecallItem {
	return {
		id: "mem_test",
		text: "some memory text",
		score: 1,
		...overrides,
	};
}

function makeMeta(
	overrides: Partial<MemoryDecayMeta> = {},
): MemoryDecayMeta {
	return {
		kind: "note",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

function makeGraphNode(
	id: string,
	overrides: Partial<GraphNodeInput> = {},
): GraphNodeInput {
	return {
		id,
		type: "concept",
		label: id,
		status: "active",
		sourceRefs: [{ sourceType: "memory", sourceId: "mem_test" }],
		...overrides,
	};
}

describe("decay — EXPIRY_DAYS table", () => {
	it("covers all 7 MemoryKind values", () => {
		const kinds: MemoryKind[] = [
			"decision",
			"constraint",
			"goal",
			"preference",
			"reference",
			"summary",
			"note",
		];
		for (const kind of kinds) {
			expect(
				EXPIRY_DAYS[kind],
				`EXPIRY_DAYS must cover kind "${kind}"`,
			).toBeDefined();
		}
		expect(Object.keys(EXPIRY_DAYS).sort()).toEqual(
			[...kinds].sort(),
		);
	});

	it("matches the canonical per-kind expiry floor values", () => {
		expect(EXPIRY_DAYS.decision).toBe(365);
		expect(EXPIRY_DAYS.constraint).toBe(180);
		expect(EXPIRY_DAYS.goal).toBe(120);
		expect(EXPIRY_DAYS.preference).toBe(90);
		expect(EXPIRY_DAYS.reference).toBe(180);
		expect(EXPIRY_DAYS.summary).toBe(60);
		expect(EXPIRY_DAYS.note).toBe(30);
	});
});

describe("decay — isMemoryDecayed", () => {
	const now = Date.parse("2026-08-10T00:00:00.000Z");

	it("returns false at exactly the kind floor (boundary not crossed)", () => {
		const floor = EXPIRY_DAYS.note; // 30 days
		const createdAt = new Date(now - floor * MS_PER_DAY).toISOString();
		expect(isMemoryDecayed({ kind: "note", createdAt }, now)).toBe(false);
	});

	it("returns true one millisecond past the kind floor", () => {
		const floor = EXPIRY_DAYS.note;
		const createdAt = new Date(
			now - (floor * MS_PER_DAY + 1),
		).toISOString();
		expect(isMemoryDecayed({ kind: "note", createdAt }, now)).toBe(true);
	});

	it("respects per-kind floors (decision=365 is far)", () => {
		// 31 days old: note decays, decision does not.
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();
		expect(isMemoryDecayed({ kind: "note", createdAt }, now)).toBe(true);
		expect(
			isMemoryDecayed({ kind: "decision", createdAt }, now),
		).toBe(false);
	});

	it("returns false when kind is undefined (backward-compat)", () => {
		const createdAt = new Date(now - 9999 * MS_PER_DAY).toISOString();
		expect(
			isMemoryDecayed(
				{ kind: undefined, createdAt } as unknown as MemoryDecayMeta,
				now,
			),
		).toBe(false);
	});

	it("returns false when createdAt is undefined (backward-compat)", () => {
		expect(
			isMemoryDecayed(
				{ kind: "note", createdAt: undefined } as unknown as MemoryDecayMeta,
				now,
			),
		).toBe(false);
	});

	it("returns false when createdAt is not a valid ISO date", () => {
		expect(
			isMemoryDecayed(
				{ kind: "note", createdAt: "not-a-date" } as MemoryDecayMeta,
				now,
			),
		).toBe(false);
	});
});

describe("decay — applyDecay", () => {
	it("flags an aged item as unverified + demotes score *= 0.6 + sets metadata.unverified", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();
		const graphNodes = new Map<string, GraphNodeInput>();
		const graphNodesByMemoryId = new Map<string, string[]>();

		const item = makeItem({ id: "mem_aged", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_aged", { kind: "note", createdAt }],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes,
			graphNodesByMemoryId,
		});

		expect(item.unverified).toBe(true);
		expect(item.metadata?.unverified).toBe(true);
		expect(item.score).toBeCloseTo(UNVERIFIED_DEMOTION_FACTOR, 9);
	});

	it("does NOT flag a fresh item (age below floor)", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 1 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();

		const item = makeItem({ id: "mem_fresh", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_fresh", { kind: "note", createdAt }],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.unverified).toBeUndefined();
		expect(item.metadata?.unverified).toBeUndefined();
		expect(item.score).toBe(1);
	});

	it("demotes using the baseline score when score is undefined (treats as 1)", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();

		const item = makeItem({ id: "mem_noscore", score: undefined });
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_noscore", { kind: "note", createdAt }],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.score).toBeCloseTo(UNVERIFIED_DEMOTION_FACTOR, 9);
	});

	it("transitions the bound graph node to status unverified", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();
		const graphNodes = new Map<string, GraphNodeInput>();
		const graphNodesByMemoryId = new Map<string, string[]>();

		const node = makeGraphNode("node:aged-concept");
		graphNodes.set(node.id, node);
		graphNodesByMemoryId.set("mem_aged", [node.id]);

		const item = makeItem({ id: "mem_aged", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_aged", { kind: "note", createdAt }],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes,
			graphNodesByMemoryId,
		});

		expect(graphNodes.get(node.id)?.status).toBe("unverified");
		// The upsert propagated to the store too.
		const stored = await graphStore.getNode(node.id);
		expect(stored?.status).toBe("unverified");
	});

	it("skips the graph upsert when the node is already non-active (deprecated/deleted/stale/unverified)", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();

		// Verify each non-active status is skipped (no upsert).
		for (const status of ["deprecated", "deleted", "stale", "unverified"] as const) {
			const graphStore = new InMemoryGraphStore();
			const graphNodes = new Map<string, GraphNodeInput>();
			const graphNodesByMemoryId = new Map<string, string[]>();

			const node = makeGraphNode(`node:${status}`, { status });
			graphNodes.set(node.id, node);
			graphNodesByMemoryId.set("mem_aged", [node.id]);
			let upsertCalls = 0;
			const original = graphStore.upsertNodes.bind(graphStore);
			graphStore.upsertNodes = async (nodes) => {
				upsertCalls++;
				return original(nodes);
			};

			const item = makeItem({ id: "mem_aged", score: 1 });
			const meta = new Map<string, MemoryDecayMeta>([
				["mem_aged", { kind: "note", createdAt }],
			]);

			await applyDecay({
				items: [item],
				memoryMetaByMemoryId: meta,
				now,
				graphStore,
				graphNodes,
				graphNodesByMemoryId,
			});

			expect(upsertCalls, `status "${status}" must not trigger upsert`).toBe(0);
			expect(graphNodes.get(node.id)?.status, `status "${status}" must be preserved`).toBe(status);
		}
	});

	it("transitions a node with undefined status (treated as active)", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();
		const graphNodes = new Map<string, GraphNodeInput>();
		const graphNodesByMemoryId = new Map<string, string[]>();

		const node = makeGraphNode("node:nostatus", { status: undefined });
		graphNodes.set(node.id, node);
		graphNodesByMemoryId.set("mem_aged", [node.id]);

		const item = makeItem({ id: "mem_aged", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_aged", { kind: "note", createdAt }],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes,
			graphNodesByMemoryId,
		});

		expect(graphNodes.get(node.id)?.status).toBe("unverified");
	});

	it("compounds with stale: an item already stale gets unverified too + further demotion", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();

		// Simulate the anchor-drift seam having already run: stale=true,
		// score already halved.
		const item = makeItem({ id: "mem_both", score: 0.5, stale: true });
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_both", { kind: "note", createdAt }],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.stale).toBe(true);
		expect(item.unverified).toBe(true);
		expect(item.score).toBeCloseTo(0.5 * UNVERIFIED_DEMOTION_FACTOR, 9);
	});

	it("backward-compat: no meta entry → no-op (item untouched)", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const graphStore = new InMemoryGraphStore();

		const item = makeItem({ id: "mem_orphan", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>();

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.unverified).toBeUndefined();
		expect(item.metadata?.unverified).toBeUndefined();
		expect(item.score).toBe(1);
	});

	it("backward-compat: meta without kind → no-op", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 9999 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();

		const item = makeItem({ id: "mem_nokind", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_nokind", { kind: undefined, createdAt } as unknown as MemoryDecayMeta],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.unverified).toBeUndefined();
		expect(item.score).toBe(1);
	});

	it("backward-compat: meta with kind outside EXPIRY_DAYS → no-op", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 9999 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();

		const item = makeItem({ id: "mem_badkind", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>([
			[
				"mem_badkind",
				{ kind: "procedure" as unknown as MemoryKind, createdAt },
			],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.unverified).toBeUndefined();
		expect(item.score).toBe(1);
	});

	it("backward-compat: meta without createdAt → no-op", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const graphStore = new InMemoryGraphStore();

		const item = makeItem({ id: "mem_nots", score: 1 });
		const meta = new Map<string, MemoryDecayMeta>([
			[
				"mem_nots",
				{ kind: "note", createdAt: undefined } as unknown as MemoryDecayMeta,
			],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.unverified).toBeUndefined();
		expect(item.score).toBe(1);
	});

	it("preserves existing metadata when setting the unverified flag", async () => {
		const now = Date.parse("2026-08-10T00:00:00.000Z");
		const createdAt = new Date(now - 31 * MS_PER_DAY).toISOString();
		const graphStore = new InMemoryGraphStore();

		const item = makeItem({
			id: "mem_meta",
			score: 1,
			metadata: { source: "bm25", custom: "preserved" },
		});
		const meta = new Map<string, MemoryDecayMeta>([
			["mem_meta", { kind: "note", createdAt }],
		]);

		await applyDecay({
			items: [item],
			memoryMetaByMemoryId: meta,
			now,
			graphStore,
			graphNodes: new Map(),
			graphNodesByMemoryId: new Map(),
		});

		expect(item.metadata?.source).toBe("bm25");
		expect(item.metadata?.custom).toBe("preserved");
		expect(item.metadata?.unverified).toBe(true);
	});
});
