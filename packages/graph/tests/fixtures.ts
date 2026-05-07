import type {
	GraphEdge,
	GraphNode,
	StoredGraphEdge,
	StoredGraphNode,
} from "../src/index";

export function node(overrides?: Partial<GraphNode>): GraphNode {
	return {
		id: "project:tekmemo",
		type: "project",
		label: "TekMemo",
		aliases: ["Tek Memo"],
		confidence: 0.9,
		importance: 0.8,
		metadata: { projectId: "proj_1" },
		...overrides,
	};
}

export function storedNode(
	overrides?: Partial<StoredGraphNode>,
): StoredGraphNode {
	return {
		...node(overrides),
		id: overrides?.id ?? "project:tekmemo",
		status: overrides?.status ?? "active",
		createdAt: overrides?.createdAt ?? "2026-05-04T00:00:00.000Z",
		updatedAt: overrides?.updatedAt ?? "2026-05-04T00:00:00.000Z",
	} as StoredGraphNode;
}

export function edge(overrides?: Partial<GraphEdge>): GraphEdge {
	return {
		from: "project:tekmemo",
		to: "concept:local-first",
		type: "uses",
		directed: true,
		weight: 0.9,
		confidence: 0.8,
		metadata: { projectId: "proj_1" },
		...overrides,
	};
}

export function storedEdge(
	overrides?: Partial<StoredGraphEdge>,
): StoredGraphEdge {
	return {
		...edge(overrides),
		id: overrides?.id ?? "edge:1",
		status: overrides?.status ?? "active",
		createdAt: overrides?.createdAt ?? "2026-05-04T00:00:00.000Z",
		updatedAt: overrides?.updatedAt ?? "2026-05-04T00:00:00.000Z",
	} as StoredGraphEdge;
}
