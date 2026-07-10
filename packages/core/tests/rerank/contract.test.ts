import type { MinimalReranker } from "@memofs/testing/contracts";
import { defineRerankerContractTests } from "@memofs/testing/contracts";
import { FakeReranker } from "../../src/rerank/testing";

function createReranker(): MinimalReranker {
	return new FakeReranker() as unknown as MinimalReranker;
}

defineRerankerContractTests({
	name: "Rerank",
	createReranker,
});
