import { createFakeRecallStore, defineRecallStoreContractTests } from "../src";

defineRecallStoreContractTests({
	name: "FakeRecallStore",
	dimensions: 3,
	requiresProjectFilter: false,
	createStore() {
		return createFakeRecallStore();
	},
});
