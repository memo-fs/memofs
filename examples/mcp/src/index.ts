import {
	createLocalTekMemoMcpRuntime,
	createTekMemoMcpProtocolServer,
} from "@tekmemo/mcp-server";

const config = {
	mcpServers: {
		tekmemo: {
			command: "npx",
			args: [
				"@tekmemo/mcp-server",
				"--runtime",
				"cloud",
				"--project-id",
				"proj_123",
			],
			env: {
				TEKMEMO_CLOUD_URL: "https://memo.tekbreed.com/api/v1",
				TEKMEMO_API_KEY: "tk_live_replace_me",
			},
		},
	},
};

console.log("Copy this into your MCP client configuration:");
console.log(JSON.stringify(config, null, 2));

const runtime = createLocalTekMemoMcpRuntime({ projectId: "mcp-example" });
const server = createTekMemoMcpProtocolServer({ runtime, readOnly: true });
const response = await server.handleJsonRpcText(
	JSON.stringify({
		jsonrpc: "2.0",
		id: 1,
		method: "tools/list",
	}),
);

console.log("Local MCP tools response:");
console.log(response);
