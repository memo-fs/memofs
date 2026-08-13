/**
 * Cognitive decay — the time-driven `EXPIRY_DAYS` floor seam.
 *
 * The counterpart to `anchor-drift.ts`. Where drift detection compares a
 * stored file hash against the live file (code changed), decay detection
 * compares a memory's age against a kind-specific expiry floor (time
 * passed). Both seams run at query-time inside `localRecall`, after the
 * hybrid candidate merge, and both demote the score + transition the
 * bound graph node — but to DISTINCT `GraphFactStatus` values so the
 * downstream LLM re-verify path knows which trigger fired:
 *
 * - drift  → `status: "stale"`  + `RecallItem.stale     = true` + `score *= 0.5`
 * - decay  → `status: "unverified"` + `RecallItem.unverified = true` + `score *= 0.6`
 *
 * The demotion factor for decay (`0.6`) is milder than drift (`0.5`):
 * a time-aged fact is less suspicious than a fact whose code binding
 * demonstrably changed. When both apply to the same item the demotions
 * compound (`*= 0.5 * 0.6`), surfacing the item lowest of all.
 *
 * Three exported seams, each pure-or-near-pure so unit tests can drive
 * them directly:
 *
 * - {@link EXPIRY_DAYS} — the canonical `Record<MemoryKind, number>` table
 *   (days). The single source of truth for per-kind expiry floors.
 * - {@link isMemoryDecayed} — the single-shot pure helper. Returns `true`
 *   when `now - createdAt > EXPIRY_DAYS[kind]`. Cheap, no I/O.
 * - {@link applyDecay} — the recall-post-merge seam. Walks an array of
 *   {@link RecallItem}s, looks each `id` up in `memoryMetaByMemoryId`, and
 *   when the memory is past its kind floor sets `item.unverified = true`,
 *   `item.metadata.unverified = true`, `item.score *= 0.6`, and transitions
 *   the bound graph node(s) to `status: "unverified"` via the supplied
 *   graph store.
 *
 * Backward-compat: items without a meta entry, without `kind`, with a
 * `kind` outside `EXPIRY_DAYS`, or without `createdAt` are left untouched
 * (today's default behavior — no false-positive `unverified`).
 *
 * @internal
 */

import type { Logger } from "../../core/types/logger";
import type { GraphNode } from "../../graph/types";
import type { GraphNodeInput, MemoryKind, RecallItem } from "../types";
import type { LocalGraphStore } from "./types";

/**
 * Milliseconds per day — the unit conversion for the age computation.
 * `86_400_000 = 24 * 60 * 60 * 1000`.
 *
 * @internal
 */
export const MS_PER_DAY = 86_400_000;

/**
 * The canonical per-kind expiry floor in days. A memory whose age
 * (`now - createdAt`) exceeds its kind's floor transitions from
 * `status: "active"` to `status: "unverified"` at query time.
 *
 * Values cover today's 7 `MemoryKind` values (the aspirational
 * `identity|knowledge|logistics` kinds are out of scope — they never
 * existed in the enum). Zero enum churn.
 *
 * @internal
 */
export const EXPIRY_DAYS: Readonly<Record<MemoryKind, number>> = Object.freeze({
	decision: 365,
	constraint: 180,
	goal: 120,
	preference: 90,
	reference: 180,
	summary: 60,
	note: 30,
});

/**
 * Score demotion factor applied to decayed (`unverified`) items. Milder
 * than the drift (`stale`) factor of `0.5` — a time-aged fact is less
 * suspicious than one whose code binding changed. When both apply they
 * compound.
 *
 * @internal
 */
export const UNVERIFIED_DEMOTION_FACTOR = 0.6;

/**
 * The per-memory metadata needed by the decay seam: the memory's
 * `kind` (to look up its expiry floor) and `createdAt` (to compute its
 * age). Populated at `writeMemory` time and hydrated from
 * `memory-events.jsonl` at `ensureReady` time (cold-start recovery).
 *
 * @internal
 */
export interface MemoryDecayMeta {
	kind: MemoryKind;
	createdAt: string;
}

/**
 * Returns `true` when the memory's age exceeds its kind's expiry floor.
 * Pure, synchronous, no I/O — the single-shot helper used both internally
 * by {@link applyDecay} and directly by tests.
 *
 * Returns `false` (no false-positive `unverified`) when any of:
 * - `kind` is missing or not a key in {@link EXPIRY_DAYS}
 * - `createdAt` is missing or not a parseable date
 * - the age is exactly at the floor (boundary not crossed; `>` not `>=`)
 *
 * @internal
 */
export function isMemoryDecayed(meta: MemoryDecayMeta, now: number): boolean {
	if (meta.kind === undefined) return false;
	const floor = EXPIRY_DAYS[meta.kind];
	if (floor === undefined) return false;
	if (typeof meta.createdAt !== "string") return false;
	const createdMs = Date.parse(meta.createdAt);
	if (Number.isNaN(createdMs)) return false;
	return now - createdMs > floor * MS_PER_DAY;
}

/**
 * Walks an array of {@link RecallItem}s and applies cognitive decay
 * detection. For each item whose `id` appears in `memoryMetaByMemoryId`
 * AND whose age exceeds its kind's {@link EXPIRY_DAYS} floor:
 *
 * 1. `item.unverified = true`
 * 2. `item.metadata = { ...item.metadata, unverified: true }`
 * 3. `item.score = (item.score ?? 1) * UNVERIFIED_DEMOTION_FACTOR`
 * 4. For each graph-node id in `graphNodesByMemoryId.get(item.id)`:
 *    - Skip the upsert when the node is already `status: "unverified"`
 *      (idempotent — avoids a write on every recall).
 *    - Otherwise upsert the node with `status: "unverified"` and update
 *      the in-memory `graphNodes` index.
 *
 * Items without a meta entry, without `kind`, with a `kind` outside
 * `EXPIRY_DAYS`, or without a valid `createdAt` are left untouched
 * (backward-compat — today's default behavior).
 *
 * Demotion compounds with drift: if {@link applyAnchorDrift} already
 * set `item.stale = true` + `item.score *= 0.5`, this seam still sets
 * `item.unverified = true` + applies `*= 0.6` to the (already-halved)
 * score, so an item that is both drift-stale AND time-decayed surfaces
 * lowest of all with both flags set.
 *
 * @internal
 */
export async function applyDecay(args: {
	items: RecallItem[];
	memoryMetaByMemoryId: Map<string, MemoryDecayMeta>;
	now: number;
	graphStore: LocalGraphStore;
	graphNodes: Map<string, GraphNodeInput>;
	graphNodesByMemoryId: Map<string, string[]>;
	/** Optional structured logger — best-effort warning on graph-upsert failure. */
	logger?: Logger;
}): Promise<void> {
	const nodesToUpsert: GraphNodeInput[] = [];
	const nodeIdsToUpsert: string[] = [];

	for (const item of args.items) {
		const meta = args.memoryMetaByMemoryId.get(item.id);
		if (meta === undefined) continue;
		if (!isMemoryDecayed(meta, args.now)) continue;

		// Decay detected — flag + demote + set metadata marker.
		item.unverified = true;
		item.metadata = {
			...(item.metadata ?? {}),
			unverified: true,
		};
		item.score = (item.score ?? 1) * UNVERIFIED_DEMOTION_FACTOR;

		const nodeIds = args.graphNodesByMemoryId.get(item.id) ?? [];
		for (const nodeId of nodeIds) {
			const node = args.graphNodes.get(nodeId);
			if (node === undefined) continue;
			// Only transition nodes that are currently active (or have no
			// status — treated as active). Nodes already deprecated,
			// deleted, conflicted, stale, or unverified are left as-is:
			// a deliberately-retired or drift-flagged fact should not be
			// re-transitioned by the time-only decay floor.
			if (node.status !== undefined && node.status !== "active") continue;
			const updated: GraphNodeInput = { ...node, status: "unverified" };
			args.graphNodes.set(nodeId, updated);
			nodesToUpsert.push(updated);
			nodeIdsToUpsert.push(nodeId);
		}
	}

	if (nodesToUpsert.length === 0) return;

	try {
		// Cast GraphNodeInput[] → GraphNode[] matches the pattern at
		// `anchor-drift.ts:303`. The input/looser-typed fields were
		// originally produced by `toGraphNodeInput` from a valid GraphNode,
		// so the narrowing is sound.
		await args.graphStore.upsertNodes(nodesToUpsert as GraphNode[]);
	} catch (error) {
		args.logger?.warn("decay graph upsert failed", {
			error: error instanceof Error ? error.message : String(error),
			nodeIds: nodeIdsToUpsert,
		});
	}
}
