/**
 * Runnable example: a memory-augmented agent built with the OpenAI Agents SDK
 * for TypeScript (`@openai/agents`).
 *
 * Run it:
 *   pnpm --filter @memofs/examples openai-agents:agent
 *
 * Requires:
 *   OPENAI_API_KEY — for the model
 *
 * What it shows:
 *  - MemoFS memory surfaced as OpenAI Agents SDK `tool()`s — `recall_memory`
 *    and `remember` — so the model can read durable context and record new
 *    facts during a run.
 *  - An `instructions` prompt that bakes project-wide core memory + a recent
 *    note into the agent's system context BEFORE generation (the "context-first"
 *    pattern).
 *  - Every recall flows through the MemoFS hybrid engine (BM25 + fuzzy +
 *    embeddings + recency + reranker) via `createAiSdkRuntimeFromTekmemo`'s
 *    underlying Tekmemo instance — not a naive search.
 *
 * The OpenAI Agents SDK is the `Agent` + `tool()` + `run()` framework from
 * openai-agents-js. It is distinct from the Cloudflare Agents SDK.
 */

import { Agent, run, tool } from "@openai/agents";
import { Tekmemo } from "@memofs/core";
import { z } from "zod";

const memo = new Tekmemo({ rootDir: "./.memofs", projectId: "demo" });

// --- Tools: give the agent safe, scoped access to MemoFS memory -------------

const recallMemory = tool({
	name: "recall_memory",
	description:
		"Search MemoFS memory for durable facts relevant to the query. " +
		"Call this before answering if the question references prior context, " +
		"decisions, or preferences. Returns ranked memory hits.",
	parameters: z.object({
		query: z.string().min(1).describe("Natural-language search over memory."),
		limit: z.number().int().min(1).max(20).default(5).optional(),
	}),
	async execute({ query, limit }) {
		const { items } = await memo.recall(query, { limit: limit ?? 5 });
		return items.map((hit) => ({ score: hit.score, text: hit.text }));
	},
});

const remember = tool({
	name: "remember",
	description:
		"Persist a durable, non-secret fact to MemoFS memory. Only call this " +
		"when a genuine decision, constraint, or preference was established. " +
		"Let ephemeral state die — do not record it.",
	parameters: z.object({
		content: z.string().min(1).describe("The fact to remember."),
	}),
	async execute({ content }) {
		await memo.notes.record({ content, kind: "note" });
		return { ok: true };
	},
});

// --- Instructions: bake existing memory into the system prompt ---------------

async function buildInstructions(): Promise<string> {
	const core = await memo.core.read();
	const recent = await memo.listRecentMemories({ limit: 3 });
	const recentLines = recent.items
		.map((item) => `- ${item.summary ?? item.id}`)
		.join("\n");

	return [
		"You are a senior engineer with persistent MemoFS memory.",
		"Use the `recall_memory` tool before answering when prior context matters.",
		"Only persist durable, non-secret facts via `remember`; let ephemeral state die.",
		"",
		"## Project core memory",
		core.trim() || "(empty)",
		"",
		"## Recent notes",
		recentLines || "(none)",
	].join("\n");
}

// --- Agent + run -------------------------------------------------------------

const memoryAgent = new Agent({
	name: "MemoFS agent",
	instructions: await buildInstructions(),
	tools: [recallMemory, remember],
});

async function main(): Promise<void> {
	const prompt =
		process.argv[2] ??
		"What do you remember about this project? Summarize, then record a one-line note describing your first impression.";

	console.log("=== User ===");
	console.log(prompt);
	console.log();

	const result = await run(memoryAgent, prompt);

	console.log("=== Agent ===");
	console.log(result.finalOutput);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
