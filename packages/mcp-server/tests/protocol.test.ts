import { InMemoryMemoryStore } from "@memofs/core";
import { describe, expect, it } from "vitest";
import {
	createMemoFSMcpProtocolServer,
	createMemoFSMcpRuntimeFromConfig,
} from "../src/index";

function makeServer() {
	return createMemoFSMcpProtocolServer({
		runtime: createMemoFSMcpRuntimeFromConfig({
			mode: "local",
			store: new InMemoryMemoryStore(),
		}),
		defaultPageSize: 2,
		maxPageSize: 5,
	});
}

type Obj = Record<string, unknown>;

describe("MCP protocol", () => {
	it("negotiates protocol and exposes server capabilities", async () => {
		const server = makeServer();
		const response = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2025-11-25",
				clientInfo: { name: "test", version: "0" },
				capabilities: {},
			},
		})) as unknown as Obj;
		expect(Array.isArray(response)).toBe(false);
		expect(response.jsonrpc).toBe("2.0");
		expect(response.id).toBe(1);
		expect("result" in response).toBe(true);
		const result = response.result as Obj;
		expect(result.protocolVersion).toBe("2025-11-25");
		const caps = result.capabilities as Record<string, Obj>;
		expect(caps.tools?.listChanged).toBe(false);
		expect(caps.resources?.subscribe).toBe(false);
	});

	it("notifications do not emit responses", async () => {
		const server = makeServer();
		const response = await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			method: "notifications/initialized",
			params: {},
		});
		expect(response).toBeUndefined();
	});

	it("tools/list is paginated with opaque cursors", async () => {
		const server = makeServer();
		const first = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: "a",
			method: "tools/list",
			params: {},
		})) as unknown as Obj;
		expect("result" in first).toBe(true);
		const firstResult = first.result as Obj;
		const firstTools = firstResult.tools as unknown[];
		expect(firstTools.length).toBe(2);
		expect(typeof firstResult.nextCursor).toBe("string");
		const second = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: "b",
			method: "tools/list",
			params: { cursor: firstResult.nextCursor },
		})) as unknown as Obj;
		const secondResult = second.result as Obj;
		expect((secondResult.tools as unknown[]).length).toBe(2);
	});

	it("tools/call returns tool-level errors instead of protocol errors for invalid tool input", async () => {
		const server = makeServer();
		const response = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: { name: "memofs.recall", arguments: { query: "" } },
		})) as unknown as Obj;
		expect("result" in response).toBe(true);
		const result = response.result as Obj;
		expect(result.isError).toBe(true);
		const content = result.content as Array<{ text: string }>;
		expect(content[0]?.text).toMatch(/MCP_VALIDATION_ERROR/);
	});

	it("unknown protocol method returns JSON-RPC method-not-found error", async () => {
		const server = makeServer();
		const response = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 3,
			method: "nope",
			params: {},
		})) as unknown as Obj;
		expect("error" in response).toBe(true);
		const error = response.error as Obj;
		expect(error.code).toBe(-32601);
	});

	it("batch requests are supported and notifications are omitted", async () => {
		const server = makeServer();
		const response = (await server.handleJsonRpcMessage([
			{ jsonrpc: "2.0", id: 1, method: "ping", params: {} },
			{ jsonrpc: "2.0", method: "notifications/initialized", params: {} },
			{ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
		])) as unknown[];
		expect(Array.isArray(response)).toBe(true);
		expect(response.length).toBe(2);
	});

	it("invalid JSON text returns JSON-RPC parse error", async () => {
		const server = makeServer();
		const responseText = await server.handleJsonRpcText("{bad json");
		expect(typeof responseText).toBe("string");
		const response = JSON.parse(responseText as string);
		expect(response.error.code).toBe(-32700);
	});

	it("empty batch returns invalid request error", async () => {
		const server = makeServer();
		const response = (await server.handleJsonRpcMessage([])) as unknown as Obj;
		const error = response.error as Obj;
		expect(error.code).toBe(-32600);
	});

	it("invalid list cursor returns protocol invalid params error", async () => {
		const server = makeServer();
		const response = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/list",
			params: { cursor: "not-a-cursor" },
		})) as unknown as Obj;
		const error = response.error as Obj;
		expect(error.code).toBe(-32602);
	});

	it("prompts/list and prompts/get return reusable prompt messages", async () => {
		const server = makeServer();
		const list = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 11,
			method: "prompts/list",
			params: {},
		})) as unknown as Obj;
		const listResult = list.result as Obj;
		expect((listResult.prompts as unknown[]).length).toBe(2);
		const prompt = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 12,
			method: "prompts/get",
			params: {
				name: "memofs-recall-context",
				arguments: { query: "MemoFS graph" },
			},
		})) as unknown as Obj;
		const promptResult = prompt.result as Obj;
		const messages = promptResult.messages as Array<{
			content: { text: string };
		}>;
		expect(messages[0]?.content.text).toMatch(/MemoFS graph/);
	});

	it("graph neighbors can be read via runtime methods after node and edge upserts", async () => {
		const runtime = createMemoFSMcpRuntimeFromConfig({
			mode: "local",
			store: new InMemoryMemoryStore(),
		});
		const server = createMemoFSMcpProtocolServer({ runtime });
		// graph_upsert_nodes/edges and graph_neighbors were demoted to runtime
		// methods. Seed + read the graph directly through
		// the runtime to prove the capability is intact end-to-end.
		// biome-ignore lint/style/noNonNullAssertion: local factory always wires graph methods
		await runtime.upsertGraphNodes!({
			nodes: [
				{ id: "a", type: "concept", label: "A" },
				{ id: "b", type: "concept", label: "B" },
			],
		});
		// biome-ignore lint/style/noNonNullAssertion: local factory always wires graph methods
		await runtime.upsertGraphEdges!({
			edges: [{ from: "a", to: "b", type: "related_to", weight: 0.9 }],
		});
		// biome-ignore lint/style/noNonNullAssertion: local factory always wires graph methods
		const result = await runtime.graphNeighbors!({
			nodeId: "a",
			direction: "out",
			limit: 5,
		});
		expect(result.items[0]?.node.id).toBe("b");
		// The protocol server still works alongside the runtime (smoke check).
		const ping = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 13,
			method: "ping",
			params: {},
		})) as unknown as Obj;
		expect("result" in ping).toBe(true);
	});
});
