import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

// Put this in app/api/tekmemo/context/route.ts in a real Next.js app.
export async function GET(request: Request) {
	const url = new URL(request.url);
	const query = url.searchParams.get("q") ?? "current task";
	const client = createTekMemoCloudClient({
		baseUrl: process.env.TEKMEMO_CLOUD_URL!,
		apiKey: process.env.TEKMEMO_API_KEY!,
		defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
	});
	return Response.json(await client.context.compose({ query, topK: 8 }));
}
