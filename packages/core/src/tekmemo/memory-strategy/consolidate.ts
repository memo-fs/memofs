import type {
	ConsolidateMemoryInput,
	ConsolidateMemoryResult,
	GraphNodeInput,
	GraphEdgeInput,
} from "../types";

export function memoryConsolidateMemory(
	nodes: Map<string, GraphNodeInput>,
	edges: Map<string, GraphEdgeInput>,
	input: ConsolidateMemoryInput,
): ConsolidateMemoryResult {
	const apply = input.apply ?? true;
	const now = input.now ?? new Date().toISOString();
	const supersedingType = input.supersedingEdgeType ?? "supersedes";

	const byLabel = new Map<string, GraphNodeInput[]>();
	for (const node of nodes.values()) {
		if (node.status !== undefined && node.status !== "active") continue;
		const key = node.label.trim().toLowerCase();
		if (key.length === 0) continue;
		const bucket = byLabel.get(key) ?? [];
		bucket.push(node);
		byLabel.set(key, bucket);
	}
	const mergeCount = [...byLabel.values()].filter((b) => b.length >= 2).length;
	const supersededNodeIds = new Set<string>();
	for (const edge of edges.values()) {
		if (edge.type !== supersedingType) continue;
		if (edge.status !== undefined && edge.status !== "active") continue;
		supersededNodeIds.add(edge.to);
	}
	const retiredEdgeCount = [...edges.values()].filter(
		(e) =>
			e.status !== "deprecated" &&
			e.type !== supersedingType &&
			(supersededNodeIds.has(e.from) || supersededNodeIds.has(e.to)),
	).length;

	const changed =
		mergeCount > 0 || retiredEdgeCount > 0 || supersededNodeIds.size > 0;

	if (!apply || !changed) {
		return {
			plan: {
				merges: mergeCount,
				retiredEdges: retiredEdgeCount,
				retiredNodes: supersededNodeIds.size,
				changed,
				now,
			},
			mergesApplied: 0,
			retirementsApplied: 0,
			applied: false,
		};
	}

	let mergesApplied = 0;
	for (const bucket of byLabel.values()) {
		if (bucket.length < 2) continue;
		const sorted = [...bucket].sort((a, b) => a.id.localeCompare(b.id));
		const target = sorted[0];
		if (!target) continue;
		for (const source of sorted.slice(1)) {
			if (source === target) continue;
			nodes.delete(source.id);
			for (const [key, edge] of [...edges.entries()]) {
				if (edge.from !== source.id && edge.to !== source.id) continue;
				edges.delete(key);
				edges.set(key, {
					...edge,
					from: edge.from === source.id ? target.id : edge.from,
					to: edge.to === source.id ? target.id : edge.to,
				});
			}
			mergesApplied += 1;
		}
	}
	let retirementsApplied = 0;
	for (const [key, edge] of [...edges.entries()]) {
		if (edge.type === supersedingType) continue;
		if (edge.status === "deprecated") continue;
		if (!supersededNodeIds.has(edge.from) && !supersededNodeIds.has(edge.to))
			continue;
		edges.set(key, { ...edge, status: "deprecated" });
		retirementsApplied += 1;
	}
	for (const id of supersededNodeIds) {
		const node = nodes.get(id);
		if (!node) continue;
		nodes.set(id, { ...node, status: "deprecated" });
		retirementsApplied += 1;
	}

	return {
		plan: {
			merges: mergeCount,
			retiredEdges: retiredEdgeCount,
			retiredNodes: supersededNodeIds.size,
			changed,
			now,
		},
		mergesApplied,
		retirementsApplied,
		applied: true,
	};
}
