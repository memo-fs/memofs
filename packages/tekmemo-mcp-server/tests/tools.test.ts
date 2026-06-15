import { describe, expect, it } from "vitest";
import {
	callTekMemoTool,
	createCloudTekMemoMcpRuntime,
	createInMemoryTekMemoRuntime,
	createTekMemoMcpProtocolServer,
} from "../src/index";

function makeFakeClient(calls: string[], extra?: Record<string, unknown>) {
	return {
		async health() {
			calls.push("health");
			return { ok: true, name: "fake", version: "0", capabilities: [] };
		},
		memory: {
			async readCore() {
				calls.push("memory.readCore");
				return { content: "# Core" };
			},
			async updateCore(input: Record<string, unknown>) {
				calls.push("memory.updateCore");
				return { content: input.content };
			},
			async listNotes() {
				calls.push("memory.listNotes");
				return { items: [] };
			},
			async createNote(input: Record<string, unknown>) {
				calls.push("memory.createNote");
				return {
					id: "cloud_1",
					kind: input.kind ?? "note",
					content: input.content,
				};
			},
		},
		recall: {
			async query() {
				calls.push("recall.query");
				return { items: [] };
			},
			async index() {
				calls.push("recall.index");
				return { status: "queued" };
			},
		},
		sync: {
			async push() {
				calls.push("sync.push");
				return {
					accepted: [],
					duplicates: [],
					rejected: [],
					conflicts: [],
					serverVersion: 1,
				};
			},
			async pull() {
				calls.push("sync.pull");
				return { events: [], serverVersion: 1 };
			},
			async status(input?: Record<string, unknown>) {
				calls.push(`sync.status:${input?.clientId ?? "unknown"}`);
				return { serverVersion: 7, clients: [], openConflicts: 0 };
			},
			async resolveConflict(input: Record<string, unknown>) {
				calls.push("sync.resolveConflict");
				return { conflictId: input.conflictId, resolved: true };
			},
		},
		...extra,
	};
}

describe("MCP tools", () => {
	it("write tool can be blocked by authorization policy", async () => {
		const result = await callTekMemoTool(
			{
				runtime: createInMemoryTekMemoRuntime(),
				authorize: ({ safety }) => safety === "read",
			},
			"tekmemo.remember",
			{ content: "Save this durable preference" },
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/MCP_AUTHORIZATION_ERROR/);
	});

	it("source refs reject path traversal and non-http URLs", async () => {
		const result = await callTekMemoTool(
			{ runtime: createInMemoryTekMemoRuntime() },
			"tekmemo.remember",
			{
				content: "hello",
				sourceRefs: [
					{
						sourceType: "document",
						path: "../secret",
						url: "file:///tmp/nope",
					},
				],
			},
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/path/);
	});

	it("graph node upsert rejects duplicate batch ids", async () => {
		const result = await callTekMemoTool(
			{ runtime: createInMemoryTekMemoRuntime() },
			"tekmemo.graph_upsert_nodes",
			{
				nodes: [
					{ id: "a", type: "project", label: "A" },
					{ id: "a", type: "project", label: "A again" },
				],
			},
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/Duplicate node id/);
	});

	it("output text is truncated safely when max output bytes is small", async () => {
		const runtime = createInMemoryTekMemoRuntime();
		const write = await callTekMemoTool({ runtime }, "tekmemo.remember", {
			content: "a".repeat(5000),
		});
		expect(write.isError).toBeUndefined();
		const result = await callTekMemoTool(
			{ runtime, maxOutputBytes: 500 },
			"tekmemo.recall",
			{ query: "aaa", limit: 5 },
		);
		expect(result.content[0]?.type).toBe("text");
		if (result.content[0]?.type === "text") {
			expect(result.content[0]?.text).toMatch(/Output truncated/);
		}
	});

	it("resources/read exposes graph nodes as JSON content", async () => {
		const server = createTekMemoMcpProtocolServer({
			runtime: createInMemoryTekMemoRuntime(),
		});
		await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: {
				name: "tekmemo.graph_upsert_nodes",
				arguments: {
					nodes: [{ id: "node1", type: "project", label: "Node 1" }],
				},
			},
		});
		const response = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 2,
			method: "resources/read",
			params: { uri: "tekmemo://graph/nodes?limit=10" },
		})) as unknown as Record<string, unknown>;
		const result = response.result as Record<string, unknown>;
		const contents = result.contents as Array<{ text: string }>;
		expect(contents[0]?.text).toMatch(/node1/);
	});

	it("cloud runtime delegates remember to project-scoped cloud memory API", async () => {
		const calls: string[] = [];
		const client = makeFakeClient(calls);
		const runtime = createCloudTekMemoMcpRuntime({
			client: client as never,
			projectId: "proj_1",
		});
		const result = await callTekMemoTool({ runtime }, "tekmemo.remember", {
			content: "save this",
		});
		expect(result.isError).toBeUndefined();
		expect(calls).toEqual(["memory.createNote"]);
		expect((result.structuredContent as Record<string, unknown>).id).toBe(
			"cloud_1",
		);
	});

	it("cloud runtime exposes sync status through project-scoped sync API", async () => {
		const calls: string[] = [];
		const client = makeFakeClient(calls);
		const runtime = createCloudTekMemoMcpRuntime({
			client: client as never,
			projectId: "proj_1",
		});
		const result = await callTekMemoTool({ runtime }, "tekmemo.sync_status", {
			clientId: "cli_1",
		});
		expect(result.isError).toBeUndefined();
		expect(
			(result.structuredContent as Record<string, unknown>).serverVersion,
		).toBe(7);
		expect(calls).toEqual(["sync.status:cli_1"]);
	});

	it("cloud graph tools fail clearly while cloud graph is not wired", async () => {
		const calls: string[] = [];
		const client = makeFakeClient(calls);
		const runtime = createCloudTekMemoMcpRuntime({
			client: client as never,
			projectId: "proj_1",
		});
		const result = await callTekMemoTool(
			{ runtime },
			"tekmemo.graph_neighbors",
			{ nodeId: "node1" },
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/Cloud graph APIs are not available yet/);
	});
});
