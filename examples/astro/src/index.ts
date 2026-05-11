import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

// Put this in src/pages/api/tekmemo/context.ts in a real Astro app.
export async function GET({ request }: { request: Request }) {
	const url = new URL(request.url);
	const query = url.searchParams.get("q") ?? "current task";
	const client = createTekMemoCloudClient({
		baseUrl: import.meta.env.TEKMEMO_CLOUD_URL,
		apiKey: import.meta.env.TEKMEMO_API_KEY,
		defaultProjectId: import.meta.env.TEKMEMO_PROJECT_ID,
	});
	return Response.json(await client.context.compose({ query, topK: 8 }));
}
