/**
 * Next.js App Router route handler: POST /api/chat
 *
 * A memory-augmented chat endpoint using MemoFS + the Vercel AI SDK.
 *
 * Context-first: `buildRuntimeMemoryContext` reads core memory + recent notes
 * and runs a hybrid recall over the incoming message BEFORE generation.
 * Tool-augmented: `buildRuntimeMemoryToolDefinition` lets the model recall and
 * remember during the turn.
 *
 * Memory is scoped per conversation via `AiMemoryAccessContext`.
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
	buildRuntimeMemoryContext,
	buildRuntimeMemoryToolDefinition,
	createAiSdkRuntimeFromTekmemo,
} from "@memofs/adapter-ai-sdk";
import { Tekmemo } from "@memofs/core";
import { streamText } from "ai";

// In production, persist these per conversation (a Map keyed by conversationId,
// a DB row, etc.). One Tekmemo instance = one .memofs/ project dir.
function getMemo(_conversationId: string): Tekmemo {
	return new Tekmemo({ rootDir: "./.memofs", projectId: "next-app" });
}

interface ChatRequestBody {
	conversationId: string;
	userId?: string;
	message: string;
}

export async function POST(request: Request): Promise<Response> {
	const {
		conversationId,
		userId = "anonymous",
		message,
	} = (await request.json()) as ChatRequestBody;

	if (!conversationId || !message) {
		return new Response("Missing conversationId or message", { status: 400 });
	}

	const memo = getMemo(conversationId);
	const runtime = createAiSdkRuntimeFromTekmemo(memo);
	const access = { projectId: "next-app", userId, conversationId };

	// 1. Context-first — ground the model in memory before generation.
	const { text: system } = await buildRuntimeMemoryContext({
		runtime,
		access,
		query: message,
		baseInstructions:
			"You are a helpful assistant with persistent MemoFS memory. " +
			"Use the `memory` tool to recall or remember during the turn. " +
			"Only persist durable, non-secret facts.",
	});

	const openai = createOpenAI();

	// 2. Tool-augmented — stream the response; the model can recall/remember.
	const result = streamText({
		model: openai("gpt-4.1-mini"),
		system,
		prompt: message,
		tools: {
			memory: buildRuntimeMemoryToolDefinition({
				runtime,
				access,
				allowWrites: true,
			}),
		},
	});

	return result.toTextStreamResponse();
}
