import { defineMemoryStoreContractTests } from "@repo/test-utils/contracts";
import { createAgentfsMemoryStore } from "../../src/index";
import { InMemoryAgentfsClient } from "./test-utils";

async function createStore() {
	const client = new InMemoryAgentfsClient();
	return createAgentfsMemoryStore(client, {
		scope: "project",
		projectId: "proj_123",
	});
}

defineMemoryStoreContractTests({
	name: "AgentfsMemoryStore",
	createStore,
	missingReadBehavior: "throw",
});
