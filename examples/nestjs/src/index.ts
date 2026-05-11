import { Injectable } from "@nestjs/common";
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

@Injectable()
export class TekMemoService {
	private readonly client = createTekMemoCloudClient({
		baseUrl: process.env.TEKMEMO_CLOUD_URL!,
		apiKey: process.env.TEKMEMO_API_KEY!,
		defaultProjectId: process.env.TEKMEMO_PROJECT_ID!,
	});

	context(query = "current task") {
		return this.client.context.compose({ query, topK: 8 });
	}

	rememberDecision(content: string) {
		return this.client.memory.createNote({
			kind: "decision",
			content,
			tags: ["nestjs"],
		});
	}
}
