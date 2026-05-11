import { createTekMemoCloudClient } from "@tekmemo/cloud-client";
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/api/tekmemo/context", async (request) => {
	const query = String((request.query as { q?: string }).q ?? "current task");
	const client = createTekMemoCloudClient({
		baseUrl: process.env.TEKMEMO_CLOUD_URL!,
		apiKey: process.env.TEKMEMO_API_KEY!,
		defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
	});
	return client.context.compose({ query, topK: 8 });
});

await app.listen({ port: 3000 });
