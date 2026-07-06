import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defineMemoryStoreContractTests } from "@memofs/testing/contracts";
import { createNodeFsMemoryStore } from "../../src/node-fs";

async function createStore() {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "tekmemo-fs-"));
	return createNodeFsMemoryStore({ rootDir });
}

async function cleanup() {
	// rootDir is internal to the store; nothing to clean up externally
}

defineMemoryStoreContractTests({
	name: "NodeFsMemoryStore",
	createStore,
	cleanup,
	missingReadBehavior: "throw",
});
