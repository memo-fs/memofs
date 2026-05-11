import {
	createTekMemoCloudClient,
	isTekMemoCloudError,
} from "@tekmemo/cloud-client";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value)
		throw new Error(
			`Missing ${name}. Copy examples/.env.example and set ${name}.`,
		);
	return value;
}

const client = createTekMemoCloudClient({
	baseUrl: requireEnv("TEKMEMO_CLOUD_URL"),
	apiKey: requireEnv("TEKMEMO_API_KEY"),
	defaultProjectId: requireEnv("TEKMEMO_PROJECT_ID"),
});

try {
	const health = await client.health();
	const context = await client.context.compose({
		query: "What should the agent know before coding?",
		topK: 5,
	});
	await client.memory.createNote({
		kind: "decision",
		content:
			"Use @tekmemo/cloud-client as the only package that talks to TekMemo Cloud.",
		tags: ["architecture", "cloud-client"],
	});

	console.log({
		health,
		contextPreview: context.text?.slice(0, 240) ?? context,
	});
} catch (error) {
	if (isTekMemoCloudError(error)) {
		console.error("TekMemo Cloud error", {
			code: error.code,
			message: error.message,
		});
		process.exitCode = 1;
	} else {
		throw error;
	}
}
