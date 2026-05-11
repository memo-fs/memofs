import { createTekMemoCloudClient } from "@tekmemo/cloud-client";
import express from "express";

const app = express();

function client() {
	return createTekMemoCloudClient({
		baseUrl: process.env.TEKMEMO_CLOUD_URL!,
		apiKey: process.env.TEKMEMO_API_KEY!,
		defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
	});
}

app.get("/api/tekmemo/context", async (req, res, next) => {
	try {
		const query = String(req.query.q ?? "current task");
		res.json(await client().context.compose({ query, topK: 8 }));
	} catch (error) {
		next(error);
	}
});

app.listen(3000, () =>
	console.log("Express example listening on http://localhost:3000"),
);
