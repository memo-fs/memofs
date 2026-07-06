/**
 * Fixtures for the graph extraction + consolidation contracts.
 *
 * All shapes are structural subsets of the real graph types
 * (`GraphNode`/`GraphEdge`/`StoredGraphNode`/`StoredGraphEdge`/`GraphSnapshot`)
 * so they're assignable at the contract boundary without forcing this package
 * to depend on `@memofs/core`. Stored* fields (`status`, `createdAt`,
 * `updatedAt`) are filled with deterministic defaults so consolidation passes
 * are replayable across runs.
 */

export const EXTRACTION_FACTS_TEXT_FIXTURE =
	"TekMemo uses BM25\nTekMemo depends on TypeScript";

export const EXTRACTION_SUPERSEDES_TEXT_FIXTURE = "OAuth2 supersedes JWT";

export const EXTRACTION_NO_FACTS_TEXT_FIXTURE =
	"Just some prose with no relations.";

export const FIXED_NOW = "2026-06-21T00:00:00.000Z";

/**
 * Two active nodes that collide on the canonical label — the classic
 * "same concept written twice" duplicate consolidation should merge. The
 * earlier `createdAt` wins as the merge target.
 */
export function createDuplicateLabelNodesFixture(): ConsolidationNodeFixture[] {
	return [
		storedNode({
			id: "project:tekmemo-a",
			label: "TekMemo",
			createdAt: "2026-05-04T00:00:00.000Z",
		}),
		storedNode({
			id: "project:tekmemo-b",
			label: " tekmemo ", // case + whitespace differ; canonical key matches
			createdAt: "2026-05-05T00:00:00.000Z",
		}),
	];
}

/**
 * Two active nodes linked by an alias — B advertises A's id as an alias, so
 * consolidation should fold B into A.
 */
export function createAliasMergeNodesFixture(): ConsolidationNodeFixture[] {
	return [
		storedNode({ id: "project:tekmemo", label: "TekMemo", aliases: [] }),
		storedNode({
			id: "project:tekmemo-dup",
			label: "TekMemo copy",
			aliases: ["project:tekmemo"],
			createdAt: "2026-05-05T00:00:00.000Z",
		}),
	];
}

/**
 * The "we switched from JWT to OAuth" retirement fixture: a `supersedes` edge
 * plus an active `uses` edge that still references the superseded node.
 * Consolidation should retire both the JWT node and the `uses` edge while
 * preserving them as `deprecated` (audit trail).
 */
export function createSupersessionGraphFixture(): {
	nodes: ConsolidationNodeFixture[];
	edges: ConsolidationEdgeFixture[];
} {
	return {
		nodes: [
			storedNode({ id: "auth:jwt", label: "JWT" }),
			storedNode({ id: "auth:oauth", label: "OAuth2" }),
			storedNode({ id: "project:tekmemo", label: "TekMemo" }),
		],
		edges: [
			storedEdge({
				id: "edge:supersedes-jwt",
				from: "auth:oauth",
				to: "auth:jwt",
				type: "supersedes",
			}),
			storedEdge({
				id: "edge:uses-jwt",
				from: "project:tekmemo",
				to: "auth:jwt",
				type: "uses",
			}),
		],
	};
}

/**
 * A ready-to-run consolidation snapshot combining duplicates + a supersession,
 * for tests that want one fixture exercising every consolidation path.
 */
export function createConsolidationSnapshotFixture(): {
	nodes: ConsolidationNodeFixture[];
	edges: ConsolidationEdgeFixture[];
	now: string;
} {
	const duplicates = createDuplicateLabelNodesFixture();
	const { nodes: supersessionNodes, edges } = createSupersessionGraphFixture();
	return {
		nodes: [...duplicates, ...supersessionNodes],
		edges,
		now: FIXED_NOW,
	};
}

/** Minimal structural node shape (assignable to `StoredGraphNode`). */
export interface ConsolidationNodeFixture {
	id: string;
	type: string;
	label: string;
	aliases: string[];
	status: "active" | "deprecated" | "conflicted" | "deleted";
	confidence: number;
	importance: number;
	createdAt: string;
	updatedAt: string;
}

/** Minimal structural edge shape (assignable to `StoredGraphEdge`). */
export interface ConsolidationEdgeFixture {
	id: string;
	from: string;
	to: string;
	type: string;
	directed: boolean;
	weight: number;
	confidence: number;
	status: "active" | "deprecated" | "conflicted" | "deleted";
	createdAt: string;
	updatedAt: string;
}

export function storedNode(
	overrides?: Partial<ConsolidationNodeFixture> & { label: string },
): ConsolidationNodeFixture {
	return {
		id: overrides?.id ?? `node:${slug(overrides?.label ?? "node")}`,
		type: overrides?.type ?? "concept",
		label: overrides?.label ?? "node",
		aliases: overrides?.aliases ?? ["Tek Memo"],
		status: overrides?.status ?? "active",
		confidence: overrides?.confidence ?? 0.9,
		importance: overrides?.importance ?? 0.8,
		createdAt: overrides?.createdAt ?? "2026-05-04T00:00:00.000Z",
		updatedAt: overrides?.updatedAt ?? "2026-05-04T00:00:00.000Z",
	};
}

export function storedEdge(
	overrides?: Partial<ConsolidationEdgeFixture>,
): ConsolidationEdgeFixture {
	return {
		id: overrides?.id ?? "edge:1",
		from: overrides?.from ?? "project:tekmemo",
		to: overrides?.to ?? "concept:local-first",
		type: overrides?.type ?? "uses",
		directed: overrides?.directed ?? true,
		weight: overrides?.weight ?? 0.9,
		confidence: overrides?.confidence ?? 0.8,
		status: overrides?.status ?? "active",
		createdAt: overrides?.createdAt ?? "2026-05-04T00:00:00.000Z",
		updatedAt: overrides?.updatedAt ?? "2026-05-04T00:00:00.000Z",
	};
}

function slug(label: string): string {
	return label.toLowerCase().replace(/\s+/g, "-");
}
