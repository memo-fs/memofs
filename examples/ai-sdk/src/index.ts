import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	buildTekMemoSystemPrompt,
	createLocalAiSdkRuntime,
	defineTekMemoTools,
} from "@tekmemo/adapters/ai-sdk";
import { createNodeFsMemoryStore } from "@tekmemo/fs";
import { bootstrapMemoryStore, writeCoreMemory } from "tekmemo";

const rootDir = await mkdtemp(join(tmpdir(), "tekmemo-ai-sdk-"));

try {
	const store = createNodeFsMemoryStore({
		rootDir,
		missingFileBehavior: "empty",
		createRoot: true,
	});
	await bootstrapMemoryStore(store, { projectId: "ai-sdk-example" });
	await writeCoreMemory(
		store,
		`# Core Memory
		 The app should retrieve TekMemo context before answering coding questions.
		`,
	);

	const access = { projectId: "ai-sdk-example", actorId: "assistant:demo" };
	const runtime = createLocalAiSdkRuntime({ workspace: store, access });
	const tools = defineTekMemoTools({
		runtime,
		access,
		allowWrites: true,
		allowCoreUpdates: false,
	});

	const { system, memory } = await buildTekMemoSystemPrompt({
		runtime,
		access,
		query: "coding questions",
		system: "You are a coding assistant.",
	});

	console.log({
		system,
		toolNames: Object.keys(tools),
		sections: memory.sections,
		warnings: memory.warnings,
	});
} finally {
	await rm(rootDir, { recursive: true, force: true });
}
