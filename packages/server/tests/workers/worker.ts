import { InMemoryMemoryStore, MemoFS } from "@memofs/core";
import { createRuntimeFetchHandler } from "../../src/http/fetch-handler";

const runtime = new MemoFS({
	store: new InMemoryMemoryStore(),
	projectId: "worker-test",
	mode: "local",
});

const handler = createRuntimeFetchHandler({
	createRuntime: () => runtime,
	requireAuth: false,
});

export default {
	fetch: handler,
};
