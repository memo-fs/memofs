import type { MinimalReranker } from "@tekbreed/tekmemo-testing/contracts";
import { defineRerankerContractTests } from "@tekbreed/tekmemo-testing/contracts";
import { FakeReranker } from "../../src/rerank/testing";

function createReranker(): MinimalReranker {
	return new FakeReranker() as unknown as MinimalReranker;
}

defineRerankerContractTests({
	name: "Rerank",
	createReranker,
});
