import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

interface Env {
	TEKMEMO_CLOUD_URL: string;
	TEKMEMO_API_KEY: string;
	TEKMEMO_PROJECT_ID: string;
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);
		const query = url.searchParams.get("q") ?? "current task";
		const client = createTekMemoCloudClient({
			baseUrl: env.TEKMEMO_CLOUD_URL,
			apiKey: env.TEKMEMO_API_KEY,
			defaultProjectId: env.TEKMEMO_PROJECT_ID,
		});
		return Response.json(await client.context.compose({ query, topK: 8 }));
	},
};
