import {
	createInMemoryGraphStore,
	stableEdgeId,
	stableNodeId,
} from "@tekmemo/graph";

const graph = createInMemoryGraphStore();

const authNode = {
	id: stableNodeId("concept", "authentication"),
	type: "concept",
	label: "Authentication",
	summary: "How the app identifies users and protects sessions.",
	status: "active",
} as const;

const apiKeyNode = {
	id: stableNodeId("concept", "api keys"),
	type: "concept",
	label: "API keys",
	summary:
		"Server-side credentials used by cloud-client, CLI, MCP, and AI SDK.",
	status: "active",
} as const;

await graph.upsertNodes([authNode, apiKeyNode]);
await graph.upsertEdges([
	{
		id: stableEdgeId(authNode.id, "protects", apiKeyNode.id),
		from: authNode.id,
		to: apiKeyNode.id,
		type: "protects",
		directed: true,
		weight: 0.9,
		confidence: 0.95,
		status: "active",
	},
]);

const neighbors = await graph.neighbors({
	nodeId: authNode.id,
	direction: "out",
	depth: 1,
});
console.log({
	node: authNode.label,
	neighbors: neighbors.nodes.map((node) => node.label),
});
