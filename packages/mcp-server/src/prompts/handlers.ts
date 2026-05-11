import { McpNotFoundError } from "../errors.js";
import type { McpPromptDefinition, McpPromptResult } from "../types.js";
import { asObject } from "../utils/json.js";
import {
	optionalBoolean,
	optionalString,
	requiredString,
} from "../utils/validation.js";

export function createPromptDefinitions(): McpPromptDefinition[] {
	return [
		{
			name: "tekmemo-recall-context",
			title: "Recall TekMemo Context",
			description:
				"Turn a user question into a grounded TekMemo recall instruction.",
			arguments: [
				{
					name: "query",
					description: "The user question or task.",
					required: true,
				},
				{
					name: "workspaceId",
					description: "Optional workspace id.",
					required: false,
				},
				{
					name: "includeGraph",
					description: "Whether to ask for graph-aware recall.",
					required: false,
				},
			],
		},
		{
			name: "tekmemo-memory-review",
			title: "Review Memory Candidate",
			description:
				"Review whether a text should become durable TekMemo memory.",
			arguments: [
				{
					name: "content",
					description: "Potential memory content.",
					required: true,
				},
				{
					name: "workspaceId",
					description: "Optional workspace id.",
					required: false,
				},
			],
		},
	];
}

export function getTekMemoPrompt(
	name: string,
	rawArgs: unknown,
): McpPromptResult {
	const args =
		rawArgs === undefined ? {} : asObject(rawArgs, "prompt arguments");
	switch (name) {
		case "tekmemo-recall-context": {
			const query = requiredString(args.query, "query", 4096);
			const workspaceId = optionalString(args.workspaceId, "workspaceId", 256);
			const includeGraph =
				optionalBoolean(args.includeGraph, "includeGraph") ?? true;
			return {
				description: "Grounded recall workflow for TekMemo.",
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Use TekMemo recall to answer this request. Query: ${query}\nWorkspace: ${workspaceId ?? "runtime default"}\nGraph-aware recall: ${includeGraph ? "yes" : "no"}\nReturn grounded context first, then the answer.`,
						},
					},
				],
			};
		}
		case "tekmemo-memory-review": {
			const content = requiredString(args.content, "content", 100_000);
			const workspaceId = optionalString(args.workspaceId, "workspaceId", 256);
			return {
				description: "Durable memory review workflow for TekMemo.",
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Review this candidate memory before writing it to TekMemo.\nWorkspace: ${workspaceId ?? "runtime default"}\n\nCandidate:\n${content}\n\nClassify it as durable, short-lived, sensitive, redundant, or unsafe. Explain whether it should be saved.`,
						},
					},
				],
			};
		}
		default:
			throw new McpNotFoundError(`Unknown prompt: ${name}.`);
	}
}
