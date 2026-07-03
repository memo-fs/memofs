/**
 * Model Context Protocol (MCP) official SDK registry adapter.
 * Supports registering tools, prompts, and resources structurally on @modelcontextprotocol/sdk servers.
 *
 * @module index
 */

import { createPromptDefinitions, getTekMemoPrompt } from "../prompts/handlers";
import {
	createResourceDefinitions,
	readTekMemoResource,
} from "../resources/handlers";
import { createToolDefinitions } from "../tools/definitions";
import { callTekMemoTool } from "../tools/handlers";
import type { TekMemoMcpOptions } from "../types";

/**
 * Structural interface matching the registration APIs of @modelcontextprotocol/sdk Server classes.
 * Allows integration without forcing a direct compile-time peer dependency on the SDK package.
 */
export interface StructuralMcpServer {
	/**
	 * Registers a custom tool on the MCP server instance.
	 */
	registerTool?: (
		name: string,
		config: Record<string, unknown>,
		handler: (args: unknown) => Promise<unknown>,
	) => unknown;
	/**
	 * Registers a tool on newer FastMCP Server instances.
	 */
	tool?: (
		name: string,
		description: string,
		schema: unknown,
		handler: (args: unknown) => Promise<unknown>,
	) => unknown;
	/**
	 * Registers a dynamic/static resource template on the MCP server.
	 */
	registerResource?: (
		name: string,
		uriOrTemplate: unknown,
		config: Record<string, unknown>,
		handler: (uri: URL | string, params?: unknown) => Promise<unknown>,
	) => unknown;
	/**
	 * Registers a dynamic prompt template on the MCP server.
	 */
	registerPrompt?: (
		name: string,
		config: Record<string, unknown>,
		handler: (args: unknown) => Promise<unknown>,
	) => unknown;
	/**
	 * Registers a prompt on newer FastMCP Server instances.
	 */
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
 * This adapter is intentionally structural so @tekmemo/core/mcp can compile without bundling
 * the MCP SDK. Install @modelcontextprotocol/sdk in the host app and pass the SDK server.
 *
 * @param server - The instantiated MCP SDK or FastMCP server object.
 * @param options - Configuration options for the TekMemo MCP capabilities.
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
