import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

// Keep this in a server function/loader. Do not call it from browser code with a secret API key.
export async function loadTekMemoContext(query = "current task") {
	const client = createTekMemoCloudClient({
		baseUrl: process.env.TEKMEMO_CLOUD_URL!,
		apiKey: process.env.TEKMEMO_API_KEY!,
		defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
	});
	return client.context.compose({ query, topK: 8 });
}
