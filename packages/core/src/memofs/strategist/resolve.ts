import type {
	EntityState,
	ResolvedEntity,
	ResolveGraphEdge,
	ResolveGraphNode,
} from "./types";

export function resolveEntities(
	nodes: ResolveGraphNode[],
	expandedTerms: string[],
): ResolvedEntity[] {
	if (expandedTerms.length === 0) return [];
	const termSet = new Set(expandedTerms.map((t) => t.toLowerCase()));
	const seen = new Set<string>();
	const out: ResolvedEntity[] = [];
	for (const node of nodes) {
		if (node.status !== undefined && node.status !== "active") continue;
		if (seen.has(node.id)) continue;
		const candidates = [node.label, ...(node.aliases ?? [])];
		let matched: string | undefined;
		for (const candidate of candidates) {
			const lower = candidate.toLowerCase();
			if (termSet.has(lower)) {
				matched = lower;
				break;
			}
			for (const term of termSet) {
				if (term.length < 3) continue;
				if (lower.includes(term)) {
					matched = term;
					break;
				}
			}
			if (matched !== undefined) break;
		}
		if (matched === undefined) continue;
		seen.add(node.id);
		out.push({
			nodeId: node.id,
			label: node.label,
			type: node.type,
			summary: node.summary ?? "",
			matchedTerm: matched,
		});
	}
	return out;
}

const STATEFUL_EDGE_TYPES = ["uses", "prefers", "depends_on", "supersedes"];

export function resolveEntityState(
	entities: ResolvedEntity[],
	edges: ResolveGraphEdge[],
	nodes: ReadonlyMap<string, ResolveGraphNode>,
): EntityState[] {
	const out: EntityState[] = [];
	for (const entity of entities) {
		const touching = edges.filter(
			(edge) =>
				(edge.from === entity.nodeId || edge.to === entity.nodeId) &&
				edge.status !== "deprecated" &&
				edge.status !== "deleted",
		);
		const stateParts: string[] = [];
		for (const type of STATEFUL_EDGE_TYPES) {
			for (const edge of touching) {
				if (edge.from !== entity.nodeId || edge.type !== type) continue;
				const neighbor = nodes.get(edge.to);
				const neighborLabel = neighbor?.label ?? edge.to;
				if (type === "supersedes") {
					stateParts.push(`supersedes ${neighborLabel}`);
				} else {
					stateParts.push(`${type} ${neighborLabel}`);
				}
			}
		}
		const activeEdgeCount = touching.length;
		const provenance = touching
			.flatMap((edge) => edge.sourceRefs ?? [])
			.map((ref) => ref.path ?? ref.title ?? ref.sourceId ?? ref.sourceType)
			.find((value): value is string => typeof value === "string");
		out.push({
			nodeId: entity.nodeId,
			label: entity.label,
			type: entity.type,
			currentState: dedupePreserveOrder(stateParts).join("; "),
			summary: entity.summary,
			activeEdgeCount,
			...(provenance === undefined ? {} : { provenance }),
		});
	}
	return out;
}

function dedupePreserveOrder(values: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
		if (seen.has(value)) continue;
		seen.add(value);
		out.push(value);
	}
	return out;
}
