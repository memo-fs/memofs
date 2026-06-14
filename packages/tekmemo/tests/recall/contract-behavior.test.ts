import { defineRecallStoreContractTests } from "@repo/test-utils/contracts";
import { createInMemoryRecallStore } from "../../src/index";

defineRecallStoreContractTests({
	name: "InMemoryRecallStore",
	createStore: () => createInMemoryRecallStore(),
	dimensions: 3,
	requiresProjectFilter: false,
});
