import { InMemoryMemoryStore, Tekmemo } from "@tekmemo/core";
import { createRuntimeFetchHandler } from "../../src/http/fetch-handler";

const runtime = new Tekmemo({
	store: new InMemoryMemoryStore(),
	projectId: "worker-test",
	mode: "memory",
});

const handler = createRuntimeFetchHandler({
	createRuntime: () => runtime,
	requireAuth: false,
});

export default {
	fetch: handler,
};
