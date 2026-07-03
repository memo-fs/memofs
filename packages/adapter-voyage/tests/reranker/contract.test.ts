import { defineRerankerContractTests } from "@tekmemo/testing/contracts";
import { createVoyageReranker } from "../../src";
import { createFakeVoyageRerankClient } from "../../src/reranker/testing";

defineRerankerContractTests({
	name: "VoyageRerank",
	createReranker: () =>
		createVoyageReranker({ client: createFakeVoyageRerankClient() }),
});
