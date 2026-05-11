import {
	createPromptDefinitions,
	getTekMemoPrompt,
} from "../prompts/handlers.js";
import {
	createResourceDefinitions,
	readTekMemoResource,
} from "../resources/handlers.js";
import { createToolDefinitions } from "../tools/definitions.js";
import { callTekMemoTool } from "../tools/handlers.js";
import type { TekMemoMcpOptions } from "../types.js";

export interface StructuralMcpServer {
	registerTool?: (
		name: string,
		config: Record<string, unknown>,
		handler: (args: unknown) => Promise<unknown>,
	) => unknown;
	tool?: (
		name: string,
		description: string,
		schema: unknown,
		handler: (args: unknown) => Promise<unknown>,
	) => unknown;
	registerResource?: (
		name: string,
		uriOrTemplate: unknown,
		config: Record<string, unknown>,
		handler: (uri: URL | string, params?: unknown) => Promise<unknown>,
	) => unknown;
	registerPrompt?: (
		name: string,
		config: Record<string, unknown>,
		handler: (args: unknown) => Promise<unknown>,
	) => unknown;
	prompt?: (
		name: string,
		description: string,
		schema: unknown,
		handler: (args: unknown) => Promise<unknown>,
	) => unknown;
}

/**
 * Register TekMemo tools/resources/prompts on an official MCP SDK server instance.
 *
 * This adapter is intentionally structural so @tekmemo/mcp-server can compile without bundling
 * the MCP SDK. Install @modelcontextprotocol/sdk in the host app and pass the SDK server.
 */
export function registerTekMemoMcpCapabilities(
	server: StructuralMcpServer,
	options: TekMemoMcpOptions,
): void {
	for (const tool of createToolDefinitions(options.maxPageSize ?? 100)) {
		if (server.registerTool) {
			server.registerTool(
				tool.name,
				{
					title: tool.title,
					description: tool.description,
					inputSchema: tool.inputSchema,
					...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
					...(tool.annotations ? { annotations: tool.annotations } : {}),
				},
				async (args: unknown) => callTekMemoTool(options, tool.name, args),
			);
		} else if (server.tool) {
			server.tool(
				tool.name,
				tool.description,
				tool.inputSchema,
				async (args: unknown) => callTekMemoTool(options, tool.name, args),
			);
		}
	}

	for (const resource of createResourceDefinitions()) {
		if (server.registerResource) {
			server.registerResource(
				resource.name,
				resource.uri,
				{ description: resource.description, mimeType: resource.mimeType },
				async () => readTekMemoResource(options, resource.uri),
			);
		}
	}

	for (const prompt of createPromptDefinitions()) {
		if (server.registerPrompt) {
			server.registerPrompt(
				prompt.name,
				{
					title: prompt.title,
					description: prompt.description,
					argsSchema: prompt.arguments,
				},
				async (args: unknown) => getTekMemoPrompt(prompt.name, args),
			);
		} else if (server.prompt) {
			server.prompt(
				prompt.name,
				prompt.description,
				{},
				async (args: unknown) => getTekMemoPrompt(prompt.name, args),
			);
		}
	}
}
