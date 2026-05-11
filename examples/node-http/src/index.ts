import http from "node:http";
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
	baseUrl: process.env.TEKMEMO_CLOUD_URL!,
	apiKey: process.env.TEKMEMO_API_KEY!,
	defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
});

http
	.createServer(async (req, res) => {
		try {
			const url = new URL(req.url ?? "/", "http://localhost:3000");
			const query = url.searchParams.get("q") ?? "current task";
			const context = await client.context.compose({ query, topK: 8 });
			res.setHeader("content-type", "application/json");
			res.end(JSON.stringify(context));
		} catch (error) {
			res.statusCode = 500;
			res.end(
				JSON.stringify({
					error: error instanceof Error ? error.message : String(error),
				}),
			);
		}
	})
	.listen(3000, () =>
		console.log("Node HTTP example listening on http://localhost:3000"),
	);
