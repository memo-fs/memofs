import { createFakeMemoryStore, defineMemoryStoreContractTests } from "../src";

defineMemoryStoreContractTests({
	name: "FakeMemoryStore",
	createStore() {
		return createFakeMemoryStore();
	},
});
