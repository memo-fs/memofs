import type { MinimalRerankDocument } from "../types/contracts";

export function createRerankDocumentsFixture(): MinimalRerankDocument[] {
	return [
		{
			id: "doc_core",
			text: "TekMemo starts with local .tekmemo files.",
			metadata: { memoryType: "core" },
		},
		{
			id: "doc_billing",
			text: "Billing and quota enforcement belong in TekMemo Cloud.",
			metadata: { memoryType: "cloud" },
		},
		{
			id: "doc_recall",
			text: "Recall uses vector search and reranking.",
			metadata: { memoryType: "recall" },
		},
	];
}
