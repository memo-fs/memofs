import { defineMemoryStoreContractTests } from "@repo/test-utils/contracts";
import { InMemoryMemoryStore } from "../src/index";

defineMemoryStoreContractTests({
	name: "InMemoryMemoryStore",
	createStore: () => new InMemoryMemoryStore(),
	missingReadBehavior: "throw",
});
