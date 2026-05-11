import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

// Put this in +server.ts or a server-only load module in a real SvelteKit app.
export async function GET({
	request,
	platform,
}: {
	request: Request;
	platform?: { env?: Record<string, string> };
}) {
	const env = platform?.env ?? process.env;
	const url = new URL(request.url);
	const query = url.searchParams.get("q") ?? "current task";
	const client = createTekMemoCloudClient({
		baseUrl: env.TEKMEMO_CLOUD_URL!,
		apiKey: env.TEKMEMO_API_KEY!,
		defaultProjectId: env.TEKMEMO_PROJECT_ID!,
	});
	return Response.json(await client.context.compose({ query, topK: 8 }));
}
