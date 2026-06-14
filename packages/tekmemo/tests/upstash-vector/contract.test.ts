import { defineRecallStoreContractTests } from "@repo/test-utils/contracts";
import { createUpstashRecallStore, FakeUpstashIndex } from "../../src/index";

defineRecallStoreContractTests({
	name: "UpstashRecallStore",
	createStore: () => {
		const index = new FakeUpstashIndex();
		return createUpstashRecallStore(index, {
			environment: "test",
			dimension: 3,
			resolveChunkIdsBySource: async (input) => {
				const bucket = index.pointsByNamespace.get(input.namespace);
				if (bucket === undefined) return [];

				return Array.from(bucket.values())
					.filter(
						(point) =>
							point.metadata?.projectId === input.projectId &&
							point.metadata?.sourceType === input.sourceType &&
							point.metadata?.sourceId === input.sourceId,
					)
					.map((point) => point.id);
			},
		});
	},
	dimensions: 3,
	requiresProjectFilter: false,
});
