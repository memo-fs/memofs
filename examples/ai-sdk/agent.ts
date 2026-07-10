/**
 * Runnable example: a memory-augmented agent built with the Vercel AI SDK.
 *
 * Run it:
 *   pnpm --filter @memofs/examples ai-sdk:agent
 *
 * Requires:
 *   OPENAI_API_KEY  — for the model
 *
 * What it shows:
 *  - Context-first: `buildRuntimeMemoryContext` grounds the model in existing
 *    memory before generation.
 *  - Tool-augmented: `buildRuntimeMemoryToolDefinition` lets the model recall
 *    and remember during multi-step reasoning.
 *  - The runtime is built with `createAiSdkRuntimeFromMemoFS`, so every
 *    recall goes through the MemoFS hybrid engine (BM25 + fuzzy + embeddings +
 *    recency + reranker) — not a naive search.
 */

import { openai } from "@ai-sdk/openai";
import {
	buildRuntimeMemoryContext,
	buildRuntimeMemoryToolDefinition,
	createAiSdkRuntimeFromMemoFS,
} from "@memofs/adapter-ai-sdk";
import { MemoFS } from "@memofs/core";
import { generateText, stepCountIs } from "ai";

const memo = new MemoFS({ rootDir: "./.memofs", projectId: "demo" });
const runtime = createAiSdkRuntimeFromMemoFS(memo);
const access = { projectId: "demo", userId: "user_demo" };

async function agentTurn(userPrompt: string): Promise<string> {
	// 1. Context-first — read core memory + recent notes, run a hybrid recall
	//    over the user's message, and compile it into a system prompt.
	const { text: system } = await buildRuntimeMemoryContext({
		runtime,
		access,
		query: userPrompt,
		baseInstructions:
			"You are a senior engineer. Use memory before answering. " +
			"Only persist durable, non-secret decisions; let ephemeral state die.",
	});

	// 2. Tool-augmented — let the model recall more, read core memory, and
	//    record durable facts across up to 6 reasoning steps.
	const { text } = await generateText({
		model: openai("gpt-4.1-mini"),
		system,
		prompt: userPrompt,
		tools: {
			memory: buildRuntimeMemoryToolDefinition({
				runtime,
				access,
				allowWrites: true,
			}),
		},
		stopWhen: stepCountIs(6),
	});

	return text;
}

async function main(): Promise<void> {
	const prompt =
		process.argv[2] ??
		"What do you remember about this project? Summarize, then record a one-line note describing your first impression.";

	console.log("=== User ===");
	console.log(prompt);
	console.log();

	const reply = await agentTurn(prompt);

	console.log("=== Agent ===");
	console.log(reply);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
