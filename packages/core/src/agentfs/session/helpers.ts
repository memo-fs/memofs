import { randomUUID } from "node:crypto";
import type { MemoryStore, MemoryPath } from "../../index";
import type { AgentfsLikeClient } from "../client/agentfs-like";
import { AgentfsClientError } from "../errors/agentfs-error";
import { isNotFoundError } from "../utils/is-not-found-error";

export function createDefaultSessionId(): string {
	const timestamp = new Date()
		.toISOString()
		.replaceAll(":", "-")
		.replaceAll(".", "-");
	return `session_${timestamp}_${randomUUID().slice(0, 8)}`;
}

export async function readMemoryFile(
	memory: MemoryStore,
	path: MemoryPath,
): Promise<string> {
	try {
		return await memory.read(path);
	} catch (error) {
		if (isNotFoundError(error)) {
			return "";
		}
		throw error;
	}
}

export async function readAgentfsFile(
	client: AgentfsLikeClient,
	path: string,
): Promise<string> {
	try {
		const content = await client.readText(path);
		if (typeof content !== "string") {
			throw new AgentfsClientError(
				"AgentFS readText returned non-string content.",
				{
					path,
					valueType: typeof content,
				},
			);
		}
		return content;
	} catch (error) {
		if (isNotFoundError(error)) {
			return "";
		}
		throw error;
	}
}

export async function writeWorkspaceScaffold(
	client: AgentfsLikeClient,
	path: string,
	content: string,
	overwrite: boolean,
): Promise<void> {
	if (!overwrite && (await agentfsPathExists(client, path))) {
		return;
	}
	await client.writeText(path, content);
}

export async function agentfsPathExists(
	client: AgentfsLikeClient,
	path: string,
): Promise<boolean> {
	if (client.exists) {
		return client.exists(path);
	}

	try {
		await client.readText(path);
		return true;
	} catch (error) {
		if (isNotFoundError(error)) {
			return false;
		}
		throw error;
	}
}

export function stripScaffoldHeading(content: string, heading: string): string {
	const trimmed = content.trim();
	const headingText = `# ${heading}`;
	if (!trimmed.startsWith(headingText)) {
		return trimmed;
	}

	const body = trimmed.slice(headingText.length).trim();
	return isDefaultScaffoldBody(heading, body) ? "" : body;
}

export function isDefaultScaffoldBody(heading: string, body: string): boolean {
	const placeholders: Record<string, string> = {
		Changes: "Record notable file changes and rationale here.",
		"Durable Memory":
			"Write only durable facts, decisions, preferences, and reusable patterns here.",
		Errors: "Record failures, causes, and fixes here.",
		"Follow-ups": "Write follow-up tasks here.",
		Summary: "Write the end-of-session summary here.",
	};

	return body === (placeholders[heading] ?? "");
}

export function formatDurableMemoryNote(
	sessionId: string,
	durableMemory: string,
): string {
	return [
		"",
		"",
		`## Agent session ${sessionId}`,
		"",
		durableMemory.trim(),
		"",
	].join("\n");
}
