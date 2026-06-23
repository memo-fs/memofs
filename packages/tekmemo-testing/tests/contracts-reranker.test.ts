import { createFakeReranker, defineRerankerContractTests } from "../src";

defineRerankerContractTests({
	name: "FakeReranker",
	createReranker() {
		return createFakeReranker();
	},
});
