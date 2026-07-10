/**
 * Memory consolidation — the differentiator of v1 intelligence.
 *
 * @remarks
 * Consolidation is a local, deterministic pass over the graph that makes the
 * memory system *feel* smart: it quietly merges duplicate entities and retires
 * facts that have been superseded, **without ever deleting** (the audit trail
 * is preserved — facts are marked `deprecated`, never removed, exactly as
 * resolved for connector re-ingestion conflicts).
 *
 * The pass is built entirely on primitives that already exist:
 * - {@link invalidateSupersededEdges} — the invalidation primitive (the seam
 * named explicitly). Consolidation calls it as a building block.
 * - the `supersedes` edge type the rule-based extractor already emits.
 * - {@link GraphStore.mergeNodes} / `queryEdges` / `upsertEdges` — the store's
 * own invariants stay the source of truth; consolidation only computes a diff
 * and persists it.
 *
 * Why it operates on snapshots: the pure {@link consolidateGraph} function
 * takes `StoredGraphNode[]` / `StoredGraphEdge[]` (the {@link GraphSnapshot}
 * shape) and returns a plan describing what to merge and what to retire, with
 * no side effects — so it is trivially unit-testable and replayable. {@link
 * applyConsolidation} is the thin store adapter that runs the plan through the
 * real `GraphStore`. Separating "decide" from "apply" mirrors the
 * extract → persist split in `local-strategy.ts`.
 *
 * Supersession semantics: when an extractor emits `A supersedes B` (or reports
 * a contradiction `{ from: A, to: B }`), B is the *retired* entity. Every
 * active edge that *references* B (on either side, except the superseding
 * `supersedes` edge itself) is marked `deprecated` with a `validUntil` — so the
 * "we used JWT → we switched to OAuth" story retires the JWT fact
 * while keeping it auditable. This is node-level retirement, which is what real
 * extractor output demands: the existing {@link invalidateSupersededEdges}
 * matches `edge.id` against `edge.to`, but extractor `to` values are *node*
 * ids, so that primitive alone can't retire real facts — consolidation composes
 * it (for explicit edge→edge supersession) with node-level retirement.
 *
 * Duplicate-merge semantics: two active nodes are merge candidates when they
 * share a canonical label/alias (case-insensitive) or one's `id` appears in the
 * other's `aliases`. Merging is delegated to {@link GraphStore.mergeNodes},
 * which rewrites edges onto the surviving node and records the absorbed label
 * as an alias (see `in-memory-graph-store.ts`).
 *
 * @see {@link invalidateSupersededEdges} — the invalidation building block.
 * @see {@link GraphStore.mergeNodes} — the merge building block.
 *
 * @public
 */

import { invalidateSupersededEdges } from "../invalidation/invalidate-superseded-edges";
import type {
	GraphEdge,
	GraphNode,
	GraphStore,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";
import { nowIso } from "../utils/time";

/**
 * Input to {@link consolidateGraph}: a snapshot of the graph to reason over.
 *
 * @public
 */
export interface ConsolidationInput {
	/** All nodes currently in the graph (active + inactive). */
	nodes: StoredGraphNode[];
	/** All edges currently in the graph (active + inactive). */
	edges: StoredGraphEdge[];
	/**
	 * Edge type that expresses "A replaces B". Defaults to `"supersedes"` — the
	 * type the rule-based extractor and the contradiction normalization in
	 * `autoExtractGraph` both emit.
	 */
	supersedingEdgeType?: string;
	/** Override `now` for deterministic tests. */
	now?: string;
}

/**
 * A pair of nodes consolidation proposes to merge.
 *
 * @public
 */
export interface ConsolidationMerge {
	/** Node id that survives the merge (the canonical entity). */
	targetId: string;
	/** Node id absorbed into the target (recorded as an alias, then retired). */
	sourceId: string;
	/** Why the two were considered the same entity. */
	reason: "alias" | "label-collision";
}

/**
 * An edge (or node) consolidation proposes to retire.
 *
 * @public
 */
export interface ConsolidationRetirement {
	/** Id of the edge (or node) to mark deprecated. */
	id: string;
	/** Node whose supersession caused this retirement. */
	supersededNodeId: string;
	/** The `supersedes` edge that drove the retirement (provenance). */
	supersededBy: string;
}

/**
 * The outcome of a consolidation pass: what to merge and what to retire.
 *
 * @remarks
 * Pure data — no side effects. {@link applyConsolidation} consumes it.
 *
 * @public
 */
export interface ConsolidationResult {
	/** Node pairs to merge via {@link GraphStore.mergeNodes}. */
	merges: ConsolidationMerge[];
	/** Edges to mark `deprecated` (audit trail preserved — never deleted). */
	retiredEdges: ConsolidationRetirement[];
	/** Nodes to mark `deprecated` (the superseded entities themselves). */
	retiredNodes: ConsolidationRetirement[];
	/** Whether any change was proposed. */
	changed: boolean;
	/** The `now` timestamp applied to every retirement. */
	now: string;
}

/**
 * Decide what a consolidation pass should merge and retire.
 *
 * Pure: reads `nodes`/`edges`, returns a plan, mutates nothing. Call {@link
 * applyConsolidation} to persist the plan through a {@link GraphStore}.
 *
 * @param input - Snapshot of the graph + options.
 * @returns A {@link ConsolidationResult} plan.
 *
 * @public
 */
export function consolidateGraph(
	input: ConsolidationInput,
): ConsolidationResult {
	const now = input.now ?? nowIso();
	const supersedingType = input.supersedingEdgeType ?? "supersedes";

	const merges = findDuplicateMerges(input.nodes);
	const { retiredEdges, retiredNodes } = findRetirements(
		input.edges,
		supersedingType,
		now,
	);

	return {
		merges,
		retiredEdges,
		retiredNodes,
		changed:
			merges.length > 0 || retiredEdges.length > 0 || retiredNodes.length > 0,
		now,
	};
}

/**
 * Minimal store surface {@link applyConsolidation} consumes.
 *
 * Deliberately narrower than {@link GraphStore}: consolidation only merges
 * nodes, fetches existing records (to merge patches onto full nodes/edges), and
 * upserts. Accepting a slice type means the local strategy's store — which
 * doesn't implement `decayEdges`/`deleteNode`/etc — satisfies the contract
 * without widening its own type. Any full {@link GraphStore} satisfies this.
 *
 * @public
 */
export type ConsolidationStore = Pick<
	GraphStore,
	"mergeNodes" | "getEdge" | "getNode" | "upsertEdges" | "upsertNodes"
>;

/**
 * Apply a {@link ConsolidationResult} to a {@link GraphStore}.
 *
 * Merges run first (so edges get rewritten onto the surviving node before any
 * retirement), then retirements. Each step is best-effort at the plan level but
 * failures inside `mergeNodes`/`upsertEdges` propagate to the caller — callers
 * that want "never throw" semantics (the write fan-out) should wrap this in a
 * try/catch, exactly like `autoExtractGraph`.
 *
 * @returns The input plan (for chaining) plus the counts actually applied.
 *
 * @public
 */
export async function applyConsolidation(
	store: ConsolidationStore,
	plan: ConsolidationResult,
): Promise<{ mergesApplied: number; retirementsApplied: number }> {
	// 1. Merge duplicate nodes first so edge references are canonicalized before
	// any retirement marks land.
	let mergesApplied = 0;
	for (const merge of plan.merges) {
		try {
			// mergeNodes rewrites edges onto the target and (by default) deletes the
			// source node. We keep deleteSource at its default so the absorbed node
			// does not linger as a ghost active entity.
			await store.mergeNodes({
				sourceId: merge.sourceId,
				targetId: merge.targetId,
			});
			mergesApplied += 1;
		} catch {
			// A merge can fail if the source was itself absorbed in a prior step of
			// the same pass, or if the store rejects it. Skip and keep going — the
			// graph converges over successive passes.
		}
	}

	// 2. Retire superseded edges (node-level: every edge referencing a superseded
	// node is marked deprecated, preserving the audit trail). Fetch each edge
	// first: `upsertEdges` runs `normalizeEdge`, which requires `from`/`to`/
	// `type`, so the patch must be merged onto the existing record rather than
	// sent as a bare `{id, status}` fragment.
	let retirementsApplied = 0;
	const retiredEdgePatches: GraphEdge[] = [];
	for (const r of plan.retiredEdges) {
		const existing = await store.getEdge(r.id);
		if (!existing) continue;
		retiredEdgePatches.push({
			...existing,
			status: "deprecated",
			validUntil: plan.now,
			updatedAt: plan.now,
		});
	}
	if (retiredEdgePatches.length > 0) {
		try {
			await store.upsertEdges(retiredEdgePatches);
			retirementsApplied += retiredEdgePatches.length;
		} catch {
			// Fall through to node retirement.
		}
	}

	// 3. Retire the superseded nodes themselves (same fetch-then-merge as edges:
	// `upsertNodes` requires `type` and `label`, which only the existing
	// record carries).
	const retiredNodePatches: GraphNode[] = [];
	for (const r of plan.retiredNodes) {
		const existing = await store.getNode(r.id);
		if (!existing) continue;
		retiredNodePatches.push({
			...existing,
			status: "deprecated",
			validUntil: plan.now,
			updatedAt: plan.now,
		});
	}
	if (retiredNodePatches.length > 0) {
		try {
			await store.upsertNodes(retiredNodePatches);
			retirementsApplied += retiredNodePatches.length;
		} catch {
			// Best-effort.
		}
	}

	return { mergesApplied, retirementsApplied };
}

/**
 * Find active nodes that describe the same entity and should be merged.
 *
 * Two active nodes are candidates when:
 * - one's `id` appears in the other's `aliases`, or
 * - their canonical labels collide (case-insensitive, trimmed) — the classic
 * "same concept written twice" duplicate the extractor produces from prose.
 *
 * The earlier node (by `createdAt`, stable on `id` as a tiebreak) is kept as
 * the target so the canonical id is stable across runs.
 */
function findDuplicateMerges(nodes: StoredGraphNode[]): ConsolidationMerge[] {
	const active = nodes.filter((n) => n.status === "active");
	const merges: ConsolidationMerge[] = [];
	const seen = new Set<string>();

	// Alias-directed merges: id of A appears in aliases of B (or vice versa).
	for (const candidate of active) {
		for (const alias of candidate.aliases ?? []) {
			const match = active.find(
				(n) => n.id === alias && n.id !== candidate.id && !seen.has(n.id),
			);
			if (match) {
				const [target, source] = orderPair(match, candidate);
				merges.push({
					targetId: target.id,
					sourceId: source.id,
					reason: "alias",
				});
				seen.add(source.id);
			}
		}
	}

	// Label-collision merges: same canonical label, not already paired.
	const byLabel = new Map<string, StoredGraphNode[]>();
	for (const candidate of active) {
		if (seen.has(candidate.id)) continue;
		const key = canonicalLabel(candidate.label);
		if (key.length === 0) continue;
		const bucket = byLabel.get(key) ?? [];
		bucket.push(candidate);
		byLabel.set(key, bucket);
	}
	for (const bucket of byLabel.values()) {
		if (bucket.length < 2) continue;
		const [target, ...rest] = orderGroup(bucket);
		// `orderGroup` returns a non-empty array here (bucket.length >= 2), but
		// `noUncheckedIndexedAccess` types the first element as possibly undefined.
		if (!target) continue;
		for (const source of rest) {
			if (seen.has(source.id)) continue;
			merges.push({
				targetId: target.id,
				sourceId: source.id,
				reason: "label-collision",
			});
			seen.add(source.id);
		}
	}

	return merges;
}

/**
 * Find edges and nodes to retire based on `supersedes` edges.
 *
 * Composes the existing {@link invalidateSupersededEdges} primitive (which
 * handles explicit edge→edge supersession via `edge.id` matching) with
 * node-level retirement: every active edge that references a superseded node
 * (except the `supersedes` edge itself) is marked deprecated.
 */
function findRetirements(
	edges: StoredGraphEdge[],
	supersedingType: string,
	now: string,
): {
	retiredEdges: ConsolidationRetirement[];
	retiredNodes: ConsolidationRetirement[];
	supersededNodeIds: string[];
} {
	// First, the legacy primitive: edges whose `id` matches a `supersedes.to`.
	// Kept for parity with the documented seam (references it by name).
	const invalidated = invalidateSupersededEdges({
		edges,
		supersedingEdgeType: supersedingType,
		now,
	});

	// Collect every node id that some `supersedes` edge points *at* — that node
	// is the retired entity.
	const supersededNodeIds = new Set<string>();
	const supersededBy = new Map<string, string>();
	for (const edge of edges) {
		if (edge.type !== supersedingType) continue;
		if (edge.status !== "active") continue;
		supersededNodeIds.add(edge.to);
		supersededBy.set(edge.to, edge.from);
	}

	const retiredEdges: ConsolidationRetirement[] = [];
	const seenEdge = new Set<string>();

	// Edge-level: any active edge that references a superseded node (on either
	// side), except the superseding edge itself, is retired. This is what makes
	// "we switched from JWT to OAuth" actually retire the JWT fact.
	for (const edge of edges) {
		if (edge.status !== "active") continue;
		if (edge.type === supersedingType) continue;
		const ref = referencesAny(edge, supersededNodeIds);
		if (ref === undefined) continue;
		if (seenEdge.has(edge.id)) continue;
		seenEdge.add(edge.id);
		retiredEdges.push({
			id: edge.id,
			supersededNodeId: ref,
			supersededBy: supersededBy.get(ref) ?? "",
		});
	}

	// Also fold in the legacy primitive's newly-deprecated edges so the result
	// reflects both mechanisms.
	for (const edge of invalidated) {
		if (edge.status !== "deprecated") continue;
		if (seenEdge.has(edge.id)) continue;
		seenEdge.add(edge.id);
		// The legacy primitive keys on `edge.to`; surface it as the superseded node.
		retiredEdges.push({
			id: edge.id,
			supersededNodeId: edge.to,
			supersededBy: supersededBy.get(edge.to) ?? "",
		});
	}

	// Node-level: the superseded entities themselves are marked deprecated so
	// `resolveCurrentNodes` drops them from active results.
	const retiredNodes: ConsolidationRetirement[] = [];
	for (const nodeId of supersededNodeIds) {
		retiredNodes.push({
			id: nodeId,
			supersededNodeId: nodeId,
			supersededBy: supersededBy.get(nodeId) ?? "",
		});
	}

	return {
		retiredEdges,
		retiredNodes,
		supersededNodeIds: [...supersededNodeIds],
	};
}

/**
 * Return the superseded node id an edge references, or `undefined` if it
 * references none of the candidates.
 */
function referencesAny(
	edge: GraphEdge,
	candidates: Set<string>,
): string | undefined {
	if (candidates.has(edge.from)) return edge.from;
	if (candidates.has(edge.to)) return edge.to;
	return undefined;
}

function canonicalLabel(label: string): string {
	return label.trim().toLowerCase();
}

/** Order two nodes so the survivor is the earlier-created (stable across runs). */
function orderPair(
	a: StoredGraphNode,
	b: StoredGraphNode,
): [StoredGraphNode, StoredGraphNode] {
	return a.createdAt <= b.createdAt ? [a, b] : [b, a];
}

/** Order a group so the earliest node is first (the merge target). */
function orderGroup(group: StoredGraphNode[]): StoredGraphNode[] {
	return [...group].sort((a, b) =>
		a.createdAt === b.createdAt
			? a.id.localeCompare(b.id)
			: a.createdAt.localeCompare(b.createdAt),
	);
}
