import { performance } from "node:perf_hooks";
import { createInMemoryGraphStore } from "../dist/src/index.js";

const NODE_COUNT = Number(process.env.NODE_COUNT ?? 500);
const EDGE_COUNT = Number(process.env.EDGE_COUNT ?? 2500);
const QUERY_COUNT = Number(process.env.QUERY_COUNT ?? 250);

const graph = createInMemoryGraphStore({ edgeIdentityMode: "source-aware" });

function time(label, fn) {
	const started = performance.now();
	return Promise.resolve(fn()).then((value) => {
		const ended = performance.now();
		console.log(`${label}: ${(ended - started).toFixed(2)}ms`);
		return value;
	});
}

await time(`upsert ${NODE_COUNT} nodes`, async () => {
	await graph.upsertNodes(
		Array.from({ length: NODE_COUNT }, (_, index) => ({
			id: `node:${index}`,
			type: "concept",
			label: `Node ${index}`,
			metadata: { shard: index % 10 },
		})),
	);
});

await time(`upsert ${EDGE_COUNT} edges`, async () => {
	await graph.upsertEdges(
		Array.from({ length: EDGE_COUNT }, (_, index) => ({
			from: `node:${index % NODE_COUNT}`,
			to: `node:${(index * 7 + 13) % NODE_COUNT}`,
			type: index % 3 === 0 ? "uses" : "related_to",
			weight: ((index % 90) + 10) / 100,
			sourceRefs: [{ sourceType: "event", sourceId: `event:${index}` }],
		})),
	);
});

await time(`${QUERY_COUNT} neighbor queries`, async () => {
	for (let index = 0; index < QUERY_COUNT; index += 1) {
		await graph.neighbors({
			nodeId: `node:${index % NODE_COUNT}`,
			direction: "both",
			limit: 100,
		});
	}
});

await time(`${QUERY_COUNT} indexed edge queries`, async () => {
	for (let index = 0; index < QUERY_COUNT; index += 1) {
		await graph.queryEdges({ from: `node:${index % NODE_COUNT}`, limit: 100 });
	}
});

await time("weighted path sample", async () => {
	await graph.weightedShortestPath({
		from: "node:0",
		to: `node:${Math.min(NODE_COUNT - 1, 250)}`,
		maxDepth: 8,
	});
});
