import { createTekMemoCloudClient } from "@tekmemo/cloud-client";
import { Hono } from "hono";

type Env = {
	Bindings: {
		TEKMEMO_CLOUD_URL: string;
		TEKMEMO_API_KEY: string;
		TEKMEMO_PROJECT_ID: string;
	};
};

const app = new Hono<Env>();

app.get("/api/tekmemo/context", async (c) => {
	const query = c.req.query("q") ?? "current task";
	const client = createTekMemoCloudClient({
		baseUrl: c.env.TEKMEMO_CLOUD_URL,
		apiKey: c.env.TEKMEMO_API_KEY,
		defaultProjectId: c.env.TEKMEMO_PROJECT_ID,
	});
	return c.json(await client.context.compose({ query, topK: 8 }));
});

export default app;
