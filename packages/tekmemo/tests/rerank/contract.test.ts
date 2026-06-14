import type { MinimalReranker } from "@repo/test-utils/contracts";
import { defineRerankerContractTests } from "@repo/test-utils/contracts";
import { FakeReranker } from "../../src/rerank/testing";

function createReranker(): MinimalReranker {
	return new FakeReranker() as unknown as MinimalReranker;
}

defineRerankerContractTests({
	name: "Rerank",
	createReranker,
});
