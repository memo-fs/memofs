import { describe, expect, it } from "vitest";
import {
	applyConsolidation,
	consolidateGraph,
	createInMemoryGraphStore,
} from "../../src/index";
import { storedEdge, storedNode } from "./fixtures";

/**
 * Pure `consolidateGraph`: the "decide" half of consolidation. Reads a graph
 * snapshot, returns a plan, mutates nothing.
 *
 * @see ADR 0004 — v1 intelligence = extraction + consolidation.
 */
describe("consolidateGraph (pure decision)", () => {
	it("returns an empty, unchanged plan when there are no duplicates or supersessions", () => {
		const plan = consolidateGraph({
			nodes: [storedNode()],
			edges: [storedEdge()],
		});
		expect(plan.changed).toBe(false);
		expect(plan.merges).toEqual([]);
		expect(plan.retiredEdges).toEqual([]);
		expect(plan.retiredNodes).toEqual([]);
		expect(typeof plan.now).toBe("string");
	});

	it("stamps a deterministic `now` when one is supplied", () => {
		const plan = consolidateGraph({
			nodes: [storedNode()],
			edges: [storedEdge()],
			now: "2026-06-21T00:00:00.000Z",
		});
		expect(plan.now).toBe("2026-06-21T00:00:00.000Z");
	});

	it("merges duplicate nodes that collide on canonical label", () => {
		const a = storedNode({
			id: "project:memofs-a",
			label: "MemoFS",
			createdAt: "2026-05-04T00:00:00.000Z",
		});
		const b = storedNode({
			id: "project:memofs-b",
			label: " memofs ", // case + whitespace differ; canonical key matches
			createdAt: "2026-05-05T00:00:00.000Z",
		});
		const plan = consolidateGraph({
			nodes: [a, b],
			edges: [storedEdge()],
		});
		expect(plan.merges).toHaveLength(1);
		expect(plan.merges[0]).toMatchObject({
			targetId: "project:memofs-a", // earlier createdAt wins
			sourceId: "project:memofs-b",
			reason: "label-collision",
		});
	});

	it("merges nodes linked by an alias", () => {
		const target = storedNode({
			id: "project:memofs",
			label: "MemoFS",
			aliases: [],
		});
		// B advertises the target's id as one of its aliases — same entity.
		const source = storedNode({
			id: "project:memofs-dup",
			label: "MemoFS copy",
			aliases: ["project:memofs"],
			createdAt: "2026-05-05T00:00:00.000Z",
		});
		const plan = consolidateGraph({
			nodes: [target, source],
			edges: [],
		});
		expect(plan.merges).toHaveLength(1);
		expect(plan.merges[0]?.reason).toBe("alias");
		expect(plan.merges[0]?.sourceId).toBe("project:memofs-dup");
	});

	it("ignores inactive nodes when finding duplicates", () => {
		// Two active-looking nodes, but one is already deprecated — not a duplicate.
		const active = storedNode({ id: "a", label: "Same" });
		const retired = storedNode({
			id: "b",
			label: "Same",
			status: "deprecated",
		});
		const plan = consolidateGraph({
			nodes: [active, retired],
			edges: [],
		});
		expect(plan.merges).toHaveLength(0);
	});

	it("retires the superseded node and every active edge that references it", () => {
		// "we switched from JWT to OAuth" — JWT is superseded.
		const jwt = storedNode({ id: "auth:jwt", label: "JWT" });
		const oauth = storedNode({ id: "auth:oauth", label: "OAuth2" });
		const superseding = storedEdge({
			id: "edge:supersedes-jwt",
			from: "auth:oauth",
			to: "auth:jwt",
			type: "supersedes",
		});
		const fact = storedEdge({
			id: "edge:uses-jwt",
			from: "project:memofs",
			to: "auth:jwt",
			type: "uses",
		});
		const plan = consolidateGraph({
			nodes: [
				jwt,
				oauth,
				storedNode({ id: "project:memofs", label: "MemoFS" }),
			],
			edges: [superseding, fact],
		});
		// The superseded node itself is retired...
		expect(plan.retiredNodes.map((r) => r.id)).toContain("auth:jwt");
		// ...and so is the active edge still pointing at it.
		expect(plan.retiredEdges.map((r) => r.id)).toContain("edge:uses-jwt");
		// The `supersedes` edge itself is *not* retired (it is the provenance).
		expect(plan.retiredEdges.map((r) => r.id)).not.toContain(
			"edge:supersedes-jwt",
		);
	});

	it("respects a custom supersedingEdgeType", () => {
		const a = storedNode({ id: "a", label: "A" });
		const b = storedNode({ id: "b", label: "B" });
		const edge = storedEdge({
			id: "edge:replaces",
			from: "a",
			to: "b",
			type: "replaces",
		});
		const plan = consolidateGraph({
			nodes: [a, b],
			edges: [edge],
			supersedingEdgeType: "replaces",
		});
		expect(plan.retiredNodes.map((r) => r.id)).toContain("b");
	});
});

/**
 * `applyConsolidation`: the "persist" half. Runs a plan through a real store.
 * Best-effort at the plan level: a failing merge/retire never breaks the pass.
 */
describe("applyConsolidation (store-backed)", () => {
	it("merges duplicate nodes through the real GraphStore", async () => {
		const store = createInMemoryGraphStore();
		await store.upsertNodes([
			storedNode({
				id: "project:memofs",
				label: "MemoFS",
				createdAt: "2026-05-04T00:00:00.000Z",
			}),
			storedNode({
				id: "project:memofs-dup",
				label: "MemoFS",
				createdAt: "2026-05-05T00:00:00.000Z",
			}),
		]);
		const plan = consolidateGraph({
			nodes: await store.queryNodes({ includeInactive: true }),
			edges: [],
			now: "2026-06-21T00:00:00.000Z",
		});
		const applied = await applyConsolidation(store, plan);
		expect(applied.mergesApplied).toBe(1);
		// The absorbed node is gone; the survivor remains.
		expect(await store.getNode("project:memofs-dup")).toBeUndefined();
		expect((await store.getNode("project:memofs"))?.id).toBe(
			"project:memofs",
		);
	});

	it("marks superseded edges and nodes deprecated without deleting them", async () => {
		const store = createInMemoryGraphStore();
		await store.upsertNodes([
			storedNode({ id: "auth:oauth", label: "OAuth2" }),
			storedNode({ id: "auth:jwt", label: "JWT" }),
			storedNode({ id: "project:memofs", label: "MemoFS" }),
		]);
		await store.upsertEdges([
			storedEdge({
				id: "edge:supersedes-jwt",
				from: "auth:oauth",
				to: "auth:jwt",
				type: "supersedes",
			}),
			storedEdge({
				id: "edge:uses-jwt",
				from: "project:memofs",
				to: "auth:jwt",
				type: "uses",
			}),
		]);
		const plan = consolidateGraph({
			nodes: await store.queryNodes({ includeInactive: true }),
			edges: await store.queryEdges({ includeInactive: true }),
			now: "2026-06-21T00:00:00.000Z",
		});
		const applied = await applyConsolidation(store, plan);
		expect(applied.retirementsApplied).toBe(2); // edge + node

		// Audit trail preserved: nothing deleted, both marked deprecated.
		const edge = await store.getEdge("edge:uses-jwt");
		expect(edge?.status).toBe("deprecated");
		expect(edge?.validUntil).toBe("2026-06-21T00:00:00.000Z");

		const node = await store.getNode("auth:jwt");
		expect(node?.status).toBe("deprecated");
	});

	it("reports zero applied when the store rejects a missing merge source", async () => {
		// A plan whose source node doesn't exist in the store: mergeNodes throws
		// GraphNotFoundError, which applyConsolidation swallows (best-effort).
		const store = createInMemoryGraphStore();
		await store.upsertNodes([
			storedNode({ id: "project:memofs", label: "MemoFS" }),
		]);
		const plan = consolidateGraph({
			nodes: [
				storedNode({ id: "project:memofs", label: "MemoFS" }),
				storedNode({
					id: "project:ghost",
					label: "MemoFS",
					createdAt: "2026-05-05T00:00:00.000Z",
				}),
			],
			edges: [],
		});
		const applied = await applyConsolidation(store, plan);
		expect(applied.mergesApplied).toBe(0);
	});
});
