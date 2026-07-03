import { defineMemoryStoreContractTests } from "@tekmemo/testing/contracts";
import { InMemoryMemoryStore } from "../src/index";

defineMemoryStoreContractTests({
	name: "InMemoryMemoryStore",
	createStore: () => new InMemoryMemoryStore(),
	missingReadBehavior: "throw",
});
