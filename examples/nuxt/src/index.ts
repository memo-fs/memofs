import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

// Put this in server/api/tekmemo/context.get.ts in a real Nuxt app.
export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	const query = getQuery(event).q?.toString() ?? "current task";
	const client = createTekMemoCloudClient({
		baseUrl: config.tekmemoCloudUrl,
		apiKey: config.tekmemoApiKey,
		defaultProjectId: config.tekmemoProjectId,
	});
	return client.context.compose({ query, topK: 8 });
});
