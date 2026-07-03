import { defineRecallStoreContractTests } from "@tekmemo/testing/contracts";
import { createInMemoryRecallStore } from "../../src/index";

defineRecallStoreContractTests({
	name: "InMemoryRecallStore",
	createStore: () => createInMemoryRecallStore(),
	dimensions: 3,
	requiresProjectFilter: false,
});
