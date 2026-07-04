import type { LocalStrategyContext } from "./types";
import {
	createTekMemoAgentSession,
	createAgentWorkspacePaths,
	extractSessionMemory,
	type JsonObject,
} from "../../index";
import type {
	AgentSessionStartInput,
	AgentSessionResult,
	AgentSessionFileInput,
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
} from "../types";

export function assertWritableAgentSessionPath(filePath: string): void {
	if (!filePath.includes("/working/") && !filePath.includes("/output/")) {
		throw new Error(
			"Only working/ and output/ agent session files are writable.",
		);
	}
}

export async function startAgentSession(
	ctx: LocalStrategyContext,
	input: AgentSessionStartInput,
	signal?: AbortSignal,
): Promise<AgentSessionResult> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	const session = createTekMemoAgentSession({
		client: ctx.agentfsClient,
		memory: ctx.options.store,
		task: input.task,
		projectId: input.projectId ?? ctx.options.projectId,
		actorId: input.actorId,
		sessionId: input.sessionId,
	});
	await session.prepare();
	return {
		sessionId: session.sessionId,
		root: session.paths.root,
		paths: session.paths as unknown as JsonObject,
	};
}

export async function readAgentSessionFile(
	ctx: LocalStrategyContext,
	input: AgentSessionFileInput,
	signal?: AbortSignal,
): Promise<{ content: string }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	return { content: await ctx.agentfsClient.readText(input.path) };
}

export async function writeAgentSessionFile(
	ctx: LocalStrategyContext,
	input: AgentSessionFileInput,
	signal?: AbortSignal,
): Promise<{ written: true; path: string }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	assertWritableAgentSessionPath(input.path);
	await ctx.agentfsClient.writeText(input.path, input.content ?? "");
	return { written: true, path: input.path };
}

export async function appendAgentSessionFile(
	ctx: LocalStrategyContext,
	input: AgentSessionFileInput,
	signal?: AbortSignal,
): Promise<{ appended: true; path: string }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	assertWritableAgentSessionPath(input.path);
	await ctx.agentfsClient.appendText?.(input.path, input.content ?? "");
	return { appended: true, path: input.path };
}

export async function extractAgentSession(
	ctx: LocalStrategyContext,
	input: { sessionId: string; workspaceId?: string; projectId?: string },
	signal?: AbortSignal,
): Promise<AgentSessionExtractResult> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	const paths = createAgentWorkspacePaths(input.sessionId);
	const extracted = await extractSessionMemory(ctx.agentfsClient, paths);
	return {
		sessionId: input.sessionId,
		extracted: extracted as unknown as JsonObject,
	};
}

export async function completeAgentSession(
	ctx: LocalStrategyContext,
	input: AgentSessionCompleteInput,
	signal?: AbortSignal,
): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	const session = createTekMemoAgentSession({
		client: ctx.agentfsClient,
		memory: ctx.options.store,
		task: "Agent session",
		projectId: input.projectId ?? ctx.options.projectId,
		sessionId: input.sessionId,
	});
	const result = await session.complete({
		extractDurableMemory: input.extractDurableMemory,
		checkpointLabel: input.checkpointLabel,
	});
	return {
		sessionId: input.sessionId,
		extracted: result.extracted as unknown as JsonObject,
		durableMemoryWritten: result.durableMemoryWritten,
	};
}
